// FILE: /js/teacher_page.js
// Lesson-based learning (min 20 items) + exam lock (no exam => no progress)
// - Teacher says target word ONCE (native, rate=1.0) no slow no syllable
// - Student must pronounce correct to mark item as learned
// - After 20/20 learned => Exam unlock
// - Exam: 10 random questions from lesson
// - Must pass >= 8/10 to unlock next lesson (no pass => restart same lesson)

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 1600);
}

const LOCALES = { en:"en-US", de:"de-DE", fr:"fr-FR", it:"it-IT" };

function norm(s){
  return String(s||"")
    .toLowerCase()
    .trim()
    .replace(/[’']/g,"'")
    .replace(/[.,!?;:]/g,"")
    .replace(/\s+/g," ");
}

function similarity(a,b){
  a = norm(a); b = norm(b);
  if(!a || !b) return 0;
  if(a === b) return 1;
  const m=a.length, n=b.length;
  const dp = Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost = a[i-1]===b[j-1] ? 0 : 1;
      dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  const dist = dp[m][n];
  return 1 - (dist / Math.max(m,n));
}

function speakOnce(word, lang){
  return new Promise((resolve)=>{
    if(!("speechSynthesis" in window)){
      resolve(false); return;
    }
    try{
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(word||""));
      u.lang = LOCALES[lang] || "en-US";
      u.rate = 1.0;   // ✅ sabit
      u.pitch = 1.0;
      u.onend = ()=> resolve(true);
      u.onerror = ()=> resolve(false);
      window.speechSynthesis.speak(u);
    }catch{
      resolve(false);
    }
  });
}

function makeRecognizer(lang){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = LOCALES[lang] || "en-US";
  rec.interimResults = false;
  rec.continuous = false;
  return rec;
}

/* 6 aylık içerik burada data ile büyütülecek.
   Şimdilik Ders1: 20 kelime EN. Diğer diller iskelet. */
const LESSONS = {
  en: [
    // LESSON 1 (20)
    [
      { tr:"elma", target:"apple" },
      { tr:"su", target:"water" },
      { tr:"ekmek", target:"bread" },
      { tr:"menü", target:"menu" },
      { tr:"fiyat", target:"price" },
      { tr:"evet", target:"yes" },
      { tr:"hayır", target:"no" },
      { tr:"merhaba", target:"hello" },
      { tr:"güle güle", target:"goodbye" },
      { tr:"teşekkürler", target:"thank you" },
      { tr:"lütfen", target:"please" },
      { tr:"affedersiniz", target:"excuse me" },
      { tr:"anlamıyorum", target:"i don't understand" },
      { tr:"yardım", target:"help" },
      { tr:"tuvalet", target:"toilet" },
      { tr:"hesap", target:"the bill" },
      { tr:"çok güzel", target:"very good" },
      { tr:"sıcak", target:"hot" },
      { tr:"soğuk", target:"cold" },
      { tr:"bugün", target:"today" },
    ],
  ],
  de: [ [ {tr:"elma",target:"apfel"} ] ],
  fr: [ [ {tr:"elma",target:"pomme"} ] ],
  it: [ [ {tr:"elma",target:"mela"} ] ],
};

const STORAGE_KEY = "caynana_teacher_progress_v1";

function loadProgress(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch{ return {}; }
}
function saveProgress(p){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(p||{})); }catch{}
}

const state = (()=>{
  if(!window.__CAYNANA_TEACHER2__) window.__CAYNANA_TEACHER2__ = {
    bound:false,
    lang:"en",
    lessonIndex: 0,
    mode:"lesson", // "lesson" | "exam"
    pos: 0,
    learned: new Set(), // indices learned in lesson
    speaking:false,
    listening:false,
    examList: [],
    examPos: 0,
    examScore: 0,
  };
  return window.__CAYNANA_TEACHER2__;
})();

function lessons(){ return LESSONS[state.lang] || LESSONS.en; }
function lesson(){ return lessons()[state.lessonIndex] || lessons()[0]; }
function lessonSize(){ return lesson().length; }

function progressKey(){
  return `${state.lang}:${state.lessonIndex}`;
}
function hydrateFromStorage(){
  const p = loadProgress();
  const k = progressKey();
  const learnedArr = Array.isArray(p?.[k]?.learned) ? p[k].learned : [];
  state.learned = new Set(learnedArr);
  state.pos = clampInt(p?.[k]?.pos, 0, lessonSize()-1);
}
function persistToStorage(){
  const p = loadProgress();
  const k = progressKey();
  p[k] = {
    pos: state.pos,
    learned: Array.from(state.learned)
  };
  saveProgress(p);
}

function clampInt(v, a, b){
  const n = parseInt(v,10);
  if(isNaN(n)) return a;
  return Math.max(a, Math.min(b, n));
}

function currentItem(){
  if(state.mode === "exam") return state.examList[state.examPos];
  return lesson()[state.pos];
}

function setUI(){
  const item = currentItem();
  $("wTarget").textContent = item?.target || "—";
  $("wTr").textContent = item?.tr ? `Türkçesi: ${item.tr}` : "Türkçesi: —";
  $("repeatTxt").textContent = item?.target || "—";

  $("heardBox").textContent = "Söylediğin burada görünecek…";
  $("resultMsg").textContent = "—";
  $("resultMsg").className = "status";
  $("scoreTop").textContent = "—";
  $("teacherStatus").textContent = "—";

  const done = state.learned.size;
  const total = lessonSize();

  if(state.mode === "lesson"){
    $("modeInfo").textContent = "Ders";
    $("lessonInfo").textContent = `Ders ${state.lessonIndex+1} • ${done}/${total}`;
    $("progBar").style.width = `${Math.round((done/total)*100)}%`;
  }else{
    $("modeInfo").textContent = `Sınav ${state.examPos+1}/${state.examList.length}`;
    $("lessonInfo").textContent = `Skor ${state.examScore}/${state.examList.length}`;
    $("progBar").style.width = `${Math.round((state.examPos/state.examList.length)*100)}%`;
  }

  // Exam unlock
  const examUnlocked = (done >= total);
  $("btnExam").disabled = !examUnlocked || (state.mode==="exam");
  $("btnExam").classList.toggle("primary", examUnlocked && state.mode!=="exam");
  $("btnExam").textContent = examUnlocked ? "Sınav Başlat" : `Sınav kilitli (${done}/${total})`;
}

async function teacherSpeak(){
  const item = currentItem();
  if(!item?.target) return;

  if(state.speaking) return;
  state.speaking = true;
  $("teacherStatus").textContent = "🔊";

  await speakOnce(item.target, state.lang);

  $("teacherStatus").textContent = "—";
  state.speaking = false;
}

function isCorrect(expected, heard){
  const sc = similarity(expected, heard);
  return { ok: sc >= 0.92, score: sc };
}

function pickNextUnlearned(){
  // Find next index not learned, starting from current+1
  const total = lessonSize();
  for(let step=1; step<=total; step++){
    const j = (state.pos + step) % total;
    if(!state.learned.has(j)) return j;
  }
  return null;
}

async function onLessonCorrect(score){
  state.learned.add(state.pos);
  persistToStorage();

  $("resultMsg").textContent = "Doğru ✅";
  $("resultMsg").className = "status ok";
  $("scoreTop").textContent = `Skor: ${Math.round(score*100)}%`;
  toast("Aferin");

  // go to next unlearned or stay if finished
  const next = pickNextUnlearned();
  if(next === null){
    setUI();
    toast("Ders bitti. Sınav açıldı.");
    return;
  }
  state.pos = next;
  persistToStorage();
  setUI();
  await teacherSpeak();
}

async function onLessonWrong(score){
  $("resultMsg").textContent = "Yanlış ❌ Tekrar et";
  $("resultMsg").className = "status bad";
  $("scoreTop").textContent = `Skor: ${Math.round(score*100)}%`;
  toast("Tekrar et");
  await teacherSpeak();
}

function buildExam(){
  // 10 random questions from lesson (only learned ones)
  const total = lessonSize();
  const learnedIdx = Array.from(state.learned);
  // if user somehow not fully learned, still only from learned list
  const pool = learnedIdx.length ? learnedIdx : [...Array(total).keys()];
  const pickCount = Math.min(10, pool.length);

  const tmp = [...pool];
  const picked = [];
  while(tmp.length && picked.length < pickCount){
    const k = Math.floor(Math.random()*tmp.length);
    const idxPicked = tmp.splice(k,1)[0];
    picked.push(lesson()[idxPicked]);
  }

  state.examList = picked;
  state.examPos = 0;
  state.examScore = 0;
  state.mode = "exam";
}

async function startExam(){
  buildExam();
  setUI();
  toast("Sınav başladı. Geçmeden ilerleme yok.");
  await teacherSpeak();
}

async function passExam(){
  toast("Sınav geçti. Yeni ders açıldı.");
  // next lesson
  state.lessonIndex = Math.min(state.lessonIndex + 1, lessons().length - 1);
  state.mode = "lesson";
  state.pos = 0;
  state.learned = new Set();
  persistToStorage();
  setUI();
  await teacherSpeak();
}

async function failExam(){
  toast("Sınav kaldı. Aynı dersi tekrar.");
  // reset lesson progress
  state.mode = "lesson";
  state.pos = 0;
  state.learned = new Set();
  persistToStorage();
  setUI();
  await teacherSpeak();
}

async function onExamCorrect(score){
  state.examScore++;
  $("resultMsg").textContent = "Doğru ✅";
  $("resultMsg").className = "status ok";
  $("scoreTop").textContent = `Skor: ${Math.round(score*100)}%`;
  toast("Doğru");

  state.examPos++;
  if(state.examPos >= state.examList.length){
    // pass >= 8/10
    if(state.examScore >= 8) await passExam();
    else await failExam();
    return;
  }
  setUI();
  await teacherSpeak();
}

async function onExamWrong(score){
  $("resultMsg").textContent = "Yanlış ❌";
  $("resultMsg").className = "status bad";
  $("scoreTop").textContent = `Skor: ${Math.round(score*100)}%`;
  toast("Yanlış");

  state.examPos++;
  if(state.examPos >= state.examList.length){
    if(state.examScore >= 8) await passExam();
    else await failExam();
    return;
  }
  setUI();
  await teacherSpeak();
}

async function startListen(){
  if(state.listening) return;

  const rec = makeRecognizer(state.lang);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  state.listening = true;
  $("btnMic").classList.add("listening");
  $("studentTop").textContent = "Dinliyorum…";

  const item = currentItem();
  const expected = item?.target || "";

  rec.onresult = async (e)=>{
    const heard = e.results?.[0]?.[0]?.transcript || "";
    $("heardBox").textContent = heard ? `Söyledin: ${heard}` : "Duyamadım…";

    state.listening = false;
    $("btnMic").classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";

    if(!heard.trim()){
      toast("Duyamadım. Tekrar.");
      await teacherSpeak();
      return;
    }

    const { ok, score } = isCorrect(expected, heard);

    if(state.mode === "lesson"){
      if(ok) await onLessonCorrect(score);
      else await onLessonWrong(score);
    }else{
      // exam: 1 attempt per question
      if(ok) await onExamCorrect(score);
      else await onExamWrong(score);
    }
  };

  rec.onerror = async ()=>{
    state.listening = false;
    $("btnMic").classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";
    toast("Mikrofon hatası (izin/HTTPS)");
    await teacherSpeak();
  };

  rec.onend = ()=>{
    if(state.listening){
      state.listening = false;
      $("btnMic").classList.remove("listening");
      $("studentTop").textContent = "Mikrofona bas ve söyle.";
    }
  };

  try{ rec.start(); }
  catch{
    state.listening = false;
    $("btnMic").classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";
    toast("Mikrofon açılamadı.");
  }
}

function bindOnce(){
  if(state.bound) return;
  state.bound = true;

  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/chat.html";
  });

  $("langSel")?.addEventListener("change", async ()=>{
    state.lang = $("langSel").value || "en";
    state.lessonIndex = 0;
    state.mode = "lesson";
    state.pos = 0;
    state.learned = new Set();
    persistToStorage();
    setUI();
    await teacherSpeak();
  });

  $("btnSpeak")?.addEventListener("pointerdown", async (e)=>{
    e.preventDefault(); e.stopPropagation();
    await teacherSpeak();
  });

  $("btnMic")?.addEventListener("pointerdown", async (e)=>{
    e.preventDefault(); e.stopPropagation();
    await startListen();
  });

  $("btnExam")?.addEventListener("pointerdown", async (e)=>{
    e.preventDefault(); e.stopPropagation();
    if($("btnExam").disabled) return;
    await startExam();
  });
}

document.addEventListener("DOMContentLoaded", async ()=>{
  bindOnce();
  hydrateFromStorage();
  setUI();
  await teacherSpeak();
});
