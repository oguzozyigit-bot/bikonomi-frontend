// FILE: /js/teacher_page.js
// FINAL (No exam button)
// - "1. Ders" göster
// - Teacher says word ONCE (native, rate=1.0)
// - After teacher speaks => auto start listening (student does NOT need to tap mic)
// - Skip exists; skipped words come back before lesson ends
// - Big green tick + "Congratulations!" 2s on correct

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

/* 1. Ders = 20 kelime (EN) */
const LESSON = [
  { tr:"elma", en:"apple" },
  { tr:"su", en:"water" },
  { tr:"ekmek", en:"bread" },
  { tr:"menü", en:"menu" },
  { tr:"fiyat", en:"price" },
  { tr:"evet", en:"yes" },
  { tr:"hayır", en:"no" },
  { tr:"merhaba", en:"hello" },
  { tr:"güle güle", en:"goodbye" },
  { tr:"teşekkürler", en:"thank you" },
  { tr:"lütfen", en:"please" },
  { tr:"affedersiniz", en:"excuse me" },
  { tr:"anlamıyorum", en:"i don't understand" },
  { tr:"yardım", en:"help" },
  { tr:"tuvalet", en:"toilet" },
  { tr:"hesap", en:"the bill" },
  { tr:"çok güzel", en:"very good" },
  { tr:"sıcak", en:"hot" },
  { tr:"soğuk", en:"cold" },
  { tr:"bugün", en:"today" },
];

const STORE = "caynana_teacher_lesson1_v1";

const state = (()=>{
  let s = {};
  try{ s = JSON.parse(localStorage.getItem(STORE) || "{}"); }catch{}
  return {
    lang: "en",
    pos: Number.isInteger(s.pos) ? s.pos : 0,
    learned: s.learned || {},   // index -> true
    skipped: s.skipped || {},   // index -> true
    speaking: false,
    listening: false,
    bound: false
  };
})();

function save(){
  try{
    localStorage.setItem(STORE, JSON.stringify({
      pos: state.pos,
      learned: state.learned,
      skipped: state.skipped
    }));
  }catch{}
}

function remainingIndices(){
  const out = [];
  for(let i=0;i<LESSON.length;i++){
    if(!state.learned[i]) out.push(i);
  }
  return out;
}

function pickNextIndex(){
  // Önce öğrenilmemiş ama atlanmamış
  for(let i=0;i<LESSON.length;i++){
    if(!state.learned[i] && !state.skipped[i]) return i;
  }
  // Sonra atlananlardan dön
  for(let i=0;i<LESSON.length;i++){
    if(!state.learned[i] && state.skipped[i]) return i;
  }
  return null; // hepsi bitti
}

function cur(){
  return LESSON[state.pos];
}

function updateUI(){
  const item = cur();
  $("wTarget").textContent = item.en;
  $("repeatTxt").textContent = item.en;

  // ✅ Türkçeyi daha büyük yaz (teacher.html’de CSS ile büyütebilirsin)
  $("wTr").textContent = `Türkçesi: ${item.tr}`;

  const done = Object.keys(state.learned).length;
  $("lessonInfo").textContent = `1. Ders • ${done}/20`;
  $("modeInfo").textContent = "Ders";
  $("progBar").style.width = `${Math.round((done/20)*100)}%`;

  $("heardBox").textContent = "Söylediğin burada görünecek…";
  $("resultMsg").textContent = "—";
  $("resultMsg").className = "status";
  $("scoreTop").textContent = "—";
  $("teacherStatus").textContent = "—";
  $("studentTop").textContent = "Dinleyeceğim… sen tekrar et.";
}

async function showCongrats(){
  const el = $("bigCheck");
  if(!el) return;
  el.classList.add("show");
  await new Promise(r=>setTimeout(r, 2000));
  el.classList.remove("show");
}

async function teacherSpeakAndListen(){
  if(state.speaking || state.listening) return;

  const item = cur();
  state.speaking = true;
  $("teacherStatus").textContent = "🔊";
  await speakOnce(item.en, state.lang);
  $("teacherStatus").textContent = "—";
  state.speaking = false;

  // ✅ konuşma biter bitmez otomatik dinle
  await startListen();
}

async function startListen(){
  if(state.listening) return;

  const rec = makeRecognizer(state.lang);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  state.listening = true;
  $("btnMic")?.classList.add("listening");

  const expected = cur().en;

  rec.onresult = async (e)=>{
    const heard = e.results?.[0]?.[0]?.transcript || "";
    $("heardBox").textContent = heard ? `Söyledin: ${heard}` : "Duyamadım…";

    state.listening = false;
    $("btnMic")?.classList.remove("listening");

    if(!heard.trim()){
      toast("Duyamadım. Tekrar.");
      await teacherSpeakAndListen();
      return;
    }

    const sc = similarity(expected, heard);
    $("scoreTop").textContent = `Skor: ${Math.round(sc*100)}%`;

    if(sc >= 0.92){
      $("resultMsg").textContent = "Doğru ✅";
      $("resultMsg").className = "status ok";

      // ✅ büyük tik + congratulations
      await showCongrats();

      // learned
      state.learned[state.pos] = true;
      delete state.skipped[state.pos];
      save();

      const next = pickNextIndex();
      if(next === null){
        toast("Tebrikler! 1. Ders bitti.");
        // burada sınav akışı daha sonra (sen sınav başlat butonu istemiyorsun)
        // şimdilik ders bitti mesajı
        return;
      }

      state.pos = next;
      save();
      updateUI();
      await teacherSpeakAndListen();
    }else{
      $("resultMsg").textContent = "Yanlış ❌ Tekrar et";
      $("resultMsg").className = "status bad";
      toast("Tekrar et");
      await teacherSpeakAndListen();
    }
  };

  rec.onerror = async ()=>{
    state.listening = false;
    $("btnMic")?.classList.remove("listening");
    toast("Mikrofon hatası (izin/HTTPS).");
    // tekrar dene
    await teacherSpeakAndListen();
  };

  rec.onend = ()=>{
    if(state.listening){
      state.listening = false;
      $("btnMic")?.classList.remove("listening");
    }
  };

  try{ rec.start(); }
  catch{
    state.listening = false;
    $("btnMic")?.classList.remove("listening");
    toast("Mikrofon açılamadı.");
  }
}

function skip(){
  // Atla: bu kelimeyi sona bırak
  state.skipped[state.pos] = true;
  save();

  const next = pickNextIndex();
  if(next === null){
    toast("Atlayacak kelime kalmadı.");
    return;
  }
  state.pos = next;
  save();
  updateUI();
  teacherSpeakAndListen();
}

function bindOnce(){
  if(state.bound) return;
  state.bound = true;

  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/chat.html";
  });

  $("langSel")?.addEventListener("change", ()=>{
    // Şimdilik sadece EN ders var. Dil seçimi UI dursun, sonra diğer dillerin 1. dersini ekleriz.
    toast("Şimdilik 1. ders İngilizce evladım.");
    $("langSel").value = "en";
  });

  $("btnSpeak")?.addEventListener("pointerdown", (e)=>{
    e.preventDefault(); e.stopPropagation();
    teacherSpeakAndListen();
  });

  // mic button: zorunlu değil ama kullanıcı isterse yeniden dinletir
  $("btnMic")?.addEventListener("pointerdown", (e)=>{
    e.preventDefault(); e.stopPropagation();
    if(state.listening || state.speaking) return;
    startListen();
  });

  $("btnSkip")?.addEventListener("pointerdown", (e)=>{
    e.preventDefault(); e.stopPropagation();
    if(state.listening || state.speaking) return;
    skip();
  });
}

document.addEventListener("DOMContentLoaded", async ()=>{
  bindOnce();

  // İlk açılışta pos geçersizse düzelt
  const rem = remainingIndices();
  if(rem.length && !rem.includes(state.pos)) state.pos = rem[0];
  if(rem.length === 0) state.pos = 0;

  updateUI();

  // Otomatik başlat: öğretmen söyler → dinler
  await teacherSpeakAndListen();
});
