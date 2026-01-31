// FILE: /js/teacher_page.js
// Teacher says the target word ONCE (rate=1.0) – no slow, no syllable, no extra talk.
// Strict pronunciation: similarity >= 0.92
// Correct => auto next word, Wrong => repeat same word (teacher says once again)

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
      u.rate = 1.0;   // ✅ sabit, asla bozma
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

/* A1 starter – büyütürüz */
const DATA = {
  en: [
    { tr:"elma", target:"apple" },
    { tr:"su", target:"water" },
    { tr:"ekmek", target:"bread" },
    { tr:"teşekkürler", target:"thank you" },
    { tr:"lütfen", target:"please" },
    { tr:"menü", target:"menu" },
    { tr:"fiyat", target:"price" },
    { tr:"evet", target:"yes" },
    { tr:"hayır", target:"no" },
    { tr:"merhaba", target:"hello" },
  ],
  de: [
    { tr:"elma", target:"apfel" },
    { tr:"su", target:"wasser" },
    { tr:"ekmek", target:"brot" },
    { tr:"teşekkürler", target:"danke" },
    { tr:"lütfen", target:"bitte" },
    { tr:"menü", target:"speisekarte" },
  ],
  fr: [
    { tr:"elma", target:"pomme" },
    { tr:"su", target:"eau" },
    { tr:"ekmek", target:"pain" },
    { tr:"teşekkürler", target:"merci" },
    { tr:"lütfen", target:"s'il vous plaît" },
    { tr:"menü", target:"menu" },
  ],
  it: [
    { tr:"elma", target:"mela" },
    { tr:"su", target:"acqua" },
    { tr:"ekmek", target:"pane" },
    { tr:"teşekkürler", target:"grazie" },
    { tr:"lütfen", target:"per favore" },
    { tr:"menü", target:"menu" },
  ],
};

let lang = "en";
let idx = 0;
let listening = false;

function list(){ return DATA[lang] || DATA.en; }
function cur(){ return list()[idx]; }

function setUI(){
  const item = cur();
  $("wTarget").textContent = item.target;
  $("wTr").textContent = `Türkçesi: ${item.tr}`;
  $("repeatTxt").textContent = item.target;

  $("teacherStatus").textContent = "—";
  $("heardBox").textContent = "Söylediğin burada görünecek…";
  $("resultMsg").textContent = "—";
  $("resultMsg").className = "status";
  $("scoreTop").textContent = "—";
}

async function teacherSpeak(){
  const item = cur();
  $("teacherStatus").textContent = "🔊";
  await speakOnce(item.target, lang);
  $("teacherStatus").textContent = "—";
}

async function onWrong(score){
  $("resultMsg").textContent = "Yanlış ❌ Tekrar et";
  $("resultMsg").className = "status bad";
  $("scoreTop").textContent = `Skor: ${Math.round(score*100)}%`;
  toast("Tekrar et");
  await teacherSpeak(); // ✅ yine aynı kelime, tek sefer
}

async function onCorrect(score){
  $("resultMsg").textContent = "Doğru ✅";
  $("resultMsg").className = "status ok";
  $("scoreTop").textContent = `Skor: ${Math.round(score*100)}%`;
  toast("Aferin");

  // otomatik sonraki kelime
  idx++;
  if(idx >= list().length) idx = 0;

  setUI();
  await teacherSpeak();
}

async function startListen(){
  if(listening) return;

  const rec = makeRecognizer(lang);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  listening = true;
  $("btnMic").classList.add("listening");
  $("studentTop").textContent = "Dinliyorum…";

  const expected = cur().target;

  rec.onresult = async (e)=>{
    const heard = e.results?.[0]?.[0]?.transcript || "";
    $("heardBox").textContent = heard ? `Söyledin: ${heard}` : "Duyamadım…";

    listening = false;
    $("btnMic").classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";

    if(!heard.trim()){
      toast("Duyamadım. Tekrar söyle.");
      await teacherSpeak();
      return;
    }

    const sc = similarity(expected, heard);
    if(sc >= 0.92){
      await onCorrect(sc);
    }else{
      await onWrong(sc);
    }
  };

  rec.onerror = async ()=>{
    listening = false;
    $("btnMic").classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";
    toast("Mikrofon hatası (izin/HTTPS)");
    await teacherSpeak();
  };

  rec.onend = ()=>{
    if(listening){
      listening = false;
      $("btnMic").classList.remove("listening");
      $("studentTop").textContent = "Mikrofona bas ve söyle.";
    }
  };

  try{ rec.start(); }
  catch{
    listening = false;
    $("btnMic").classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";
    toast("Mikrofon açılamadı.");
  }
}

document.addEventListener("DOMContentLoaded", async ()=>{
  $("backBtn").addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/chat.html";
  });

  $("langSel").addEventListener("change", async ()=>{
    lang = $("langSel").value || "en";
    idx = 0;
    setUI();
    await teacherSpeak();
  });

  $("btnSpeak").addEventListener("click", teacherSpeak);
  $("btnMic").addEventListener("click", startListen);

  setUI();
  await teacherSpeak();
});
