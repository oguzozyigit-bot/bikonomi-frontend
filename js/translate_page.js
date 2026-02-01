// FILE: /js/teacher_page.js
// Teacher AI (per-language progress)
// - Language from URL ?lang=en|de|fr|it
// - 1. Ders: 20 kelime
// - Speak: teacher says target ONCE (native) when user taps speaker
// - Student must press mic to answer
// - Correct => big green tick + Congratulations 2s => next remaining word
// - Skip exists; skipped return before lesson ends
// - Lesson done => ask "Ders bitti. Sınava hazır mısın? (Yes/No)"
// - Exam: 10 questions, pass >= 8
// - Fail: ask retry Yes/No; if No => keep exam pending and resume later
// - 3rd fail => reset lesson + motivational text

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 1800);
}

const LOCALES = { en:"en-US", de:"de-DE", fr:"fr-FR", it:"it-IT" };

function getLang(){
  const u = new URL(location.href);
  const q = (u.searchParams.get("lang") || "en").toLowerCase().trim();
  return ["en","de","fr","it"].includes(q) ? q : "en";
}

const LANG_LABEL = { en:"🇬🇧 İngilizce Öğren", de:"🇩🇪 Almanca Öğren", fr:"🇫🇷 Fransızca Öğren", it:"🇮🇹 İtalyanca Öğren" };

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
    if(!("speechSynthesis" in window)){ resolve(false); return; }
    try{
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(word||""));
      u.lang = LOCALES[lang] || "en-US";
      u.rate = 1.0;
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

/* 20 kelimelik Ders1 — her dil için (paralel) */
const LESSON1 = {
  en: [
    { tr:"elma", t:"apple" }, { tr:"su", t:"water" }, { tr:"ekmek", t:"bread" }, { tr:"menü", t:"menu" }, { tr:"fiyat", t:"price" },
    { tr:"evet", t:"yes" }, { tr:"hayır", t:"no" }, { tr:"merhaba", t:"hello" }, { tr:"güle güle", t:"goodbye" }, { tr:"teşekkürler", t:"thank you" },
    { tr:"lütfen", t:"please" }, { tr:"affedersiniz", t:"excuse me" }, { tr:"anlamıyorum", t:"i don't understand" }, { tr:"yardım", t:"help" }, { tr:"tuvalet", t:"toilet" },
    { tr:"hesap", t:"the bill" }, { tr:"çok güzel", t:"very good" }, { tr:"sıcak", t:"hot" }, { tr:"soğuk", t:"cold" }, { tr:"bugün", t:"today" },
  ],
  de: [
    { tr:"elma", t:"apfel" }, { tr:"su", t:"wasser" }, { tr:"ekmek", t:"brot" }, { tr:"menü", t:"speisekarte" }, { tr:"fiyat", t:"preis" },
    { tr:"evet", t:"ja" }, { tr:"hayır", t:"nein" }, { tr:"merhaba", t:"hallo" }, { tr:"güle güle", t:"tschüss" }, { tr:"teşekkürler", t:"danke" },
    { tr:"lütfen", t:"bitte" }, { tr:"affedersiniz", t:"entschuldigung" }, { tr:"anlamıyorum", t:"ich verstehe nicht" }, { tr:"yardım", t:"hilfe" }, { tr:"tuvalet", t:"toilette" },
    { tr:"hesap", t:"die rechnung" }, { tr:"çok güzel", t:"sehr gut" }, { tr:"sıcak", t:"heiß" }, { tr:"soğuk", t:"kalt" }, { tr:"bugün", t:"heute" },
  ],
  fr: [
    { tr:"elma", t:"pomme" }, { tr:"su", t:"eau" }, { tr:"ekmek", t:"pain" }, { tr:"menü", t:"menu" }, { tr:"fiyat", t:"prix" },
    { tr:"evet", t:"oui" }, { tr:"hayır", t:"non" }, { tr:"merhaba", t:"bonjour" }, { tr:"güle güle", t:"au revoir" }, { tr:"teşekkürler", t:"merci" },
    { tr:"lütfen", t:"s'il vous plaît" }, { tr:"affedersiniz", t:"excusez-moi" }, { tr:"anlamıyorum", t:"je ne comprends pas" }, { tr:"yardım", t:"aide" }, { tr:"tuvalet", t:"toilettes" },
    { tr:"hesap", t:"l'addition" }, { tr:"çok güzel", t:"très bien" }, { tr:"sıcak", t:"chaud" }, { tr:"soğuk", t:"froid" }, { tr:"bugün", t:"aujourd'hui" },
  ],
  it: [
    { tr:"elma", t:"mela" }, { tr:"su", t:"acqua" }, { tr:"ekmek", t:"pane" }, { tr:"menü", t:"menu" }, { tr:"fiyat", t:"prezzo" },
    { tr:"evet", t:"sì" }, { tr:"hayır", t:"no" }, { tr:"merhaba", t:"ciao" }, { tr:"güle güle", t:"arrivederci" }, { tr:"teşekkürler", t:"grazie" },
    { tr:"lütfen", t:"per favore" }, { tr:"affedersiniz", t:"scusi" }, { tr:"anlamıyorum", t:"non capisco" }, { tr:"yardım", t:"aiuto" }, { tr:"tuvalet", t:"bagno" },
    { tr:"hesap", t:"il conto" }, { tr:"çok güzel", t:"molto bene" }, { tr:"sıcak", t:"caldo" }, { tr:"soğuk", t:"freddo" }, { tr:"bugün", t:"oggi" },
  ],
};

const lang = getLang();
const STORE = `caynana_teacher_${lang}_lesson1_v1`;

function loadState(){
  try{ return JSON.parse(localStorage.getItem(STORE) || "{}"); }catch{ return {}; }
}
function saveState(s){
  try{ localStorage.setItem(STORE, JSON.stringify(s||{})); }catch{}
}

const S = (() => {
  const x = loadState();
  return {
    pos: Number.isInteger(x.pos) ? x.pos : 0,
    learned: x.learned || {},      // index->true
    skipped: x.skipped || {},      // index->true
    exam: x.exam || { pending:false, failCount:0, q:[], qi:0, score:0 }, // q: indices
    speaking:false,
    listening:false,
    bound:false
  };
})();

function lesson(){ return LESSON1[lang] || LESSON1.en; }
function total(){ return lesson().length; }
function cur(){ return lesson()[S.pos]; }

function learnedCount(){ return Object.keys(S.learned).length; }

function pickNextIndex(){
  // first: not learned, not skipped
  for(let i=0;i<total();i++){
    if(!S.learned[i] && !S.skipped[i]) return i;
  }
  // then: skipped ones
  for(let i=0;i<total();i++){
    if(!S.learned[i] && S.skipped[i]) return i;
  }
  return null;
}

function updateUI(){
  $("langPill").textContent = LANG_LABEL[lang] || "Teacher";
  $("wTarget").textContent = cur().t;
  $("wTr").textContent = `Türkçesi: ${cur().tr}`;
  $("repeatTxt").textContent = cur().t;

  const done = learnedCount();
  $("lessonInfo").textContent = `1. Ders • ${done}/20`;
  $("modeInfo").textContent = (S.exam?.pending ? "Sınav Bekliyor" : "Ders");
  $("progBar").style.width = `${Math.round((done/total())*100)}%`;

  $("heardBox").textContent = "Söylediğin burada görünecek…";
  $("resultMsg").textContent = "—";
  $("resultMsg").className = "status";
  $("scoreTop").textContent = "—";
  $("teacherStatus").textContent = "—";

  $("studentTop").textContent = "Mikrofona bas ve söyle.";
}

async function showCongrats(){
  const el = $("bigCheck");
  el.classList.add("show");
  await new Promise(r=>setTimeout(r, 2000));
  el.classList.remove("show");
}

async function teacherSpeak(){
  if(S.speaking) return;
  S.speaking = true;
  $("teacherStatus").textContent = "🔊";
  await speakOnce(cur().t, lang);
  $("teacherStatus").textContent = "—";
  S.speaking = false;
}

function persist(){
  saveState({
    pos: S.pos,
    learned: S.learned,
    skipped: S.skipped,
    exam: S.exam
  });
}

function askExamReady(){
  // Yes/No
  const ok = confirm("Ders bitti. Sınava hazır mısın?");
  if(ok){
    startExam(true);
  }else{
    S.exam.pending = true;
    persist();
    toast("Sınav beklemede.");
  }
}

function buildExamQuestions(){
  // 10 soru: tüm 20 içinden random
  const idx = [...Array(total()).keys()];
  const q = [];
  while(idx.length && q.length < 10){
    const k = Math.floor(Math.random()*idx.length);
    q.push(idx.splice(k,1)[0]);
  }
  return q;
}

function startExam(reset){
  if(reset){
    S.exam.q = buildExamQuestions();
    S.exam.qi = 0;
    S.exam.score = 0;
  }
  S.exam.pending = true;
  persist();
  showExamQuestion();
}

function showExamQuestion(){
  const q = S.exam.q;
  if(!q || !q.length){
    S.exam.q = buildExamQuestions();
    S.exam.qi = 0;
    S.exam.score = 0;
  }
  const qi = S.exam.qi || 0;
  const idx = S.exam.q[qi];

  // exam mode UI uses same screen
  $("modeInfo").textContent = `Sınav ${qi+1}/10`;
  $("lessonInfo").textContent = `Skor ${S.exam.score}/10`;

  const item = lesson()[idx];
  $("wTarget").textContent = item.t;
  $("wTr").textContent = `Türkçesi: ${item.tr}`;
  $("repeatTxt").textContent = item.t;

  $("teacherStatus").textContent = "—";
  $("heardBox").textContent = "Söylediğin burada görünecek…";
  $("resultMsg").textContent = "Sınav: doğru söyle.";
  $("resultMsg").className = "status";
  $("scoreTop").textContent = "—";

  // teacher speak is on speaker button (kullanıcı isterse dinler)
  persist();
}

async function finishExam(){
  const score = S.exam.score || 0;

  if(score >= 8){
    alert("🎉 Tebrikler! Bu dersten geçtin.");
    // Ders 2'yi sonra ekleyeceğiz; şimdilik progress sıfırla ama “geçti” flag’i at
    // Burada: lesson1 completed flag koyalım
    localStorage.setItem(`caynana_teacher_${lang}_lesson1_passed`, "1");
    // reset current lesson progress for demo:
    localStorage.removeItem(STORE);
    location.reload();
    return;
  }

  // fail
  S.exam.failCount = (S.exam.failCount || 0) + 1;

  if(S.exam.failCount >= 3){
    alert(
      "Üzgünüm… Bu dersten kaldın.\n\n" +
      "Ama sorun değil evladım.\n" +
      "Sen zeki bir çocuksun.\n" +
      "Sadece biraz daha odaklanacağız.\n\n" +
      "Dersi yeniden öğreneceğiz."
    );

    // reset lesson progress + exam state
    S.pos = 0;
    S.learned = {};
    S.skipped = {};
    S.exam = { pending:false, failCount:0, q:[], qi:0, score:0 };
    persist();
    updateUI();
    await teacherSpeak();
    return;
  }

  const again = confirm(
    "Üzgünüz, sınavı geçemedin.\n" +
    "Sınavı geçmeden ilerleyemezsin.\n\n" +
    "Tekrar sınava girmek ister misin?"
  );

  if(again){
    // restart exam fresh
    startExam(true);
  }else{
    // keep pending, resume later from current question
    S.exam.pending = true;
    persist();
    toast("Sınav beklemede. Sonraki girişte devam edeceğiz.");
  }
}

async function handleExamAnswer(heard){
  const qi = S.exam.qi || 0;
  const idx = S.exam.q[qi];
  const expected = lesson()[idx].t;

  const sc = similarity(expected, heard);
  $("scoreTop").textContent = `Skor: ${Math.round(sc*100)}%`;

  if(sc >= 0.92){
    S.exam.score++;
    $("resultMsg").textContent = "Doğru ✅";
    $("resultMsg").className = "status ok";
  }else{
    $("resultMsg").textContent = "Yanlış ❌";
    $("resultMsg").className = "status bad";
  }

  // advance question
  S.exam.qi = qi + 1;
  persist();

  if(S.exam.qi >= 10){
    await finishExam();
    return;
  }

  showExamQuestion();
}

async function startListen(){
  if(S.listening || S.speaking) return;

  const rec = makeRecognizer(lang);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  S.listening = true;
  $("btnMic")?.classList.add("listening");
  $("studentTop").textContent = "Dinliyorum…";

  const expected = (S.exam?.pending ? $("wTarget").textContent : cur().t);

  rec.onresult = async (e)=>{
    const heard = e.results?.[0]?.[0]?.transcript || "";
    $("heardBox").textContent = heard ? `Söyledin: ${heard}` : "Duyamadım…";

    S.listening = false;
    $("btnMic")?.classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";

    if(!heard.trim()){
      toast("Duyamadım. Tekrar söyle.");
      return;
    }

    // EXAM mode?
    if(S.exam?.pending && (learnedCount() >= total())){
      await handleExamAnswer(heard);
      return;
    }

    // LESSON mode
    const sc = similarity(cur().t, heard);
    $("scoreTop").textContent = `Skor: ${Math.round(sc*100)}%`;

    if(sc >= 0.92){
      $("resultMsg").textContent = "Doğru ✅";
      $("resultMsg").className = "status ok";

      await showCongrats();

      S.learned[S.pos] = true;
      delete S.skipped[S.pos];
      persist();

      const next = pickNextIndex();
      if(next === null){
        // lesson complete => exam prompt
        askExamReady();
        return;
      }

      S.pos = next;
      persist();
      updateUI();
      await teacherSpeak();
    }else{
      $("resultMsg").textContent = "Yanlış ❌ Tekrar et";
      $("resultMsg").className = "status bad";
      toast("Tekrar et");
      await teacherSpeak();
    }
  };

  rec.onerror = ()=>{
    S.listening = false;
    $("btnMic")?.classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";
    toast("Mikrofon hatası (izin/HTTPS).");
  };

  rec.onend = ()=>{
    if(S.listening){
      S.listening = false;
      $("btnMic")?.classList.remove("listening");
      $("studentTop").textContent = "Mikrofona bas ve söyle.";
    }
  };

  try{ rec.start(); }
  catch{
    S.listening = false;
    $("btnMic")?.classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";
    toast("Mikrofon açılamadı.");
  }
}

function skip(){
  // Skip is only for lesson mode; exam skip yok
  if(S.exam?.pending && learnedCount() >= total()){
    toast("Sınavda atlama yok evladım.");
    return;
  }

  S.skipped[S.pos] = true;
  persist();

  const next = pickNextIndex();
  if(next === null){
    askExamReady();
    return;
  }
  S.pos = next;
  persist();
  updateUI();
  teacherSpeak();
}

function bindOnce(){
  if(S.bound) return;
  S.bound = true;

  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/chat.html";
  });

  $("btnSpeak")?.addEventListener("pointerdown", (e)=>{
    e.preventDefault(); e.stopPropagation();
    teacherSpeak();
  });

  $("btnMic")?.addEventListener("pointerdown", (e)=>{
    e.preventDefault(); e.stopPropagation();
    startListen();
  });

  $("btnSkip")?.addEventListener("pointerdown", (e)=>{
    e.preventDefault(); e.stopPropagation();
    skip();
  });
}

document.addEventListener("DOMContentLoaded", async ()=>{
  bindOnce();

  // init UI
  updateUI();

  // if lesson completed and exam pending, ask to continue (or resume where left)
  if(learnedCount() >= total()){
    // if exam not started yet, ask ready
    if(!S.exam?.pending){
      askExamReady();
    }else{
      // exam pending: ask to continue where left
      const ok = confirm("Sınav bekliyor. Devam edelim mi?");
      if(ok){
        // resume exam from where left
        showExamQuestion();
      }else{
        toast("Sınav beklemede.");
      }
    }
  }else{
    // normal lesson start
    await teacherSpeak();
  }
});
