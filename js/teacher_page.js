// FILE: /js/teacher_page.js
// Teacher UI = translator style (no top/bottom bars, only back)
// Strict pronunciation: correct >= 0.92
// Teacher TTS says ONLY the word (no extra sentences)
// Flow: Speak -> Student Mic -> STT -> check -> next or repeat

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

// Levenshtein-lite similarity 0..1
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

function speakWord(word, lang, rate=1.0){
  return new Promise((resolve)=>{
    if(!("speechSynthesis" in window)){
      resolve(false); return;
    }
    try{
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(word||""));
      u.lang = LOCALES[lang] || "en-US";
      u.rate = rate;
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

/* A1 word blocks (small starter – büyütürüz) */
const DATA = {
  en: [
    { tr:"elma", target:"apple", slow:"apple", syll:"ap ple" },
    { tr:"su", target:"water", slow:"water", syll:"wa ter" },
    { tr:"ekmek", target:"bread", slow:"bread", syll:"bread" },
    { tr:"teşekkürler", target:"thank you", slow:"thank you", syll:"thank you" },
    { tr:"lütfen", target:"please", slow:"please", syll:"please" },
    { tr:"menü", target:"menu", slow:"menu", syll:"me nu" },
    { tr:"fiyat", target:"price", slow:"price", syll:"price" },
    { tr:"evet", target:"yes", slow:"yes", syll:"yes" },
    { tr:"hayır", target:"no", slow:"no", syll:"no" },
    { tr:"merhaba", target:"hello", slow:"hello", syll:"hel lo" },
  ],
  de: [
    { tr:"elma", target:"apfel", slow:"apfel", syll:"ap fel" },
    { tr:"su", target:"wasser", slow:"wasser", syll:"was ser" },
    { tr:"ekmek", target:"brot", slow:"brot", syll:"brot" },
    { tr:"teşekkürler", target:"danke", slow:"danke", syll:"dan ke" },
    { tr:"lütfen", target:"bitte", slow:"bitte", syll:"bit te" },
    { tr:"menü", target:"speisekarte", slow:"speisekarte", syll:"spei se kar te" },
  ],
  fr: [
    { tr:"elma", target:"pomme", slow:"pomme", syll:"pom me" },
    { tr:"su", target:"eau", slow:"eau", syll:"eau" },
    { tr:"ekmek", target:"pain", slow:"pain", syll:"pain" },
    { tr:"teşekkürler", target:"merci", slow:"merci", syll:"mer ci" },
    { tr:"lütfen", target:"s'il vous plaît", slow:"s'il vous plaît", syll:"sil vu ple" },
    { tr:"menü", target:"menu", slow:"menu", syll:"me nu" },
  ],
  it: [
    { tr:"elma", target:"mela", slow:"mela", syll:"me la" },
    { tr:"su", target:"acqua", slow:"acqua", syll:"ac qua" },
    { tr:"ekmek", target:"pane", slow:"pane", syll:"pa ne" },
    { tr:"teşekkürler", target:"grazie", slow:"grazie", syll:"gra zie" },
    { tr:"lütfen", target:"per favore", slow:"per favore", syll:"per fa vo re" },
    { tr:"menü", target:"menu", slow:"menu", syll:"me nu" },
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
  // Öğretmen SADECE kelimeyi söyler:
  await speakWord(item.target, lang, 1.0);
  await speakWord(item.target, lang, 0.78);
  // hece hece hissi: kelimeyi bölerek ama yine kelime:
  await speakWord(item.syll || item.target, lang, 0.62);
  $("teacherStatus").textContent = "—";
}

async function onWrong(){
  $("resultMsg").textContent = "Yanlış ❌ Tekrar et";
  $("resultMsg").className = "status bad";
  toast("Tekrar et");
  await teacherSpeak();
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

  const item = cur();
  const expected = item.target;

  rec.onresult = async (e)=>{
    const heard = e.results?.[0]?.[0]?.transcript || "";
    $("heardBox").textContent = heard ? `Söyledin: ${heard}` : "Duyamadım…";

    listening = false;
    $("btnMic").classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";

    const sc = similarity(expected, heard);
    if(sc >= 0.92){
      await onCorrect(sc);
    }else{
      $("scoreTop").textContent = `Skor: ${Math.round(sc*100)}%`;
      await onWrong();
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

/* Boot */
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
