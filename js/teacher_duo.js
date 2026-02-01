// FILE: /js/teacher_duo.js
// FINAL v5
// ✅ Correct => full-panel green check on that side (2s) + pleasant ding
// ✅ Wrong  => full-panel red X on that side (2s) + buzzer/horn style sound
// ✅ Teacher reads first (wave green)
// ✅ Turkish meaning shown
// ✅ 10 rounds, single attempt each turn
// ✅ lang from URL: ?lang=en|de|fr|it

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 1400);
}

function getLang(){
  const u = new URL(location.href);
  const q = (u.searchParams.get("lang") || "en").toLowerCase().trim();
  return ["en","de","fr","it"].includes(q) ? q : "en";
}
const lang = getLang();

const LOCALES = { en:"en-US", de:"de-DE", fr:"fr-FR", it:"it-IT" };
const LANG_LABEL = { en:"🇬🇧 Duo Practice", de:"🇩🇪 Duo Practice", fr:"🇫🇷 Duo Practice", it:"🇮🇹 Duo Practice" };

const WORDS = {
  en: [
    { t:"apple", tr:"elma" }, { t:"water", tr:"su" }, { t:"bread", tr:"ekmek" }, { t:"menu", tr:"menü" }, { t:"price", tr:"fiyat" },
    { t:"yes", tr:"evet" }, { t:"no", tr:"hayır" }, { t:"hello", tr:"merhaba" }, { t:"goodbye", tr:"güle güle" }, { t:"thank you", tr:"teşekkürler" },
    { t:"please", tr:"lütfen" }, { t:"help", tr:"yardım" }, { t:"toilet", tr:"tuvalet" }, { t:"the bill", tr:"hesap" }, { t:"hot", tr:"sıcak" },
    { t:"cold", tr:"soğuk" }, { t:"today", tr:"bugün" }, { t:"excuse me", tr:"affedersiniz" }, { t:"very good", tr:"çok güzel" }, { t:"i don't understand", tr:"anlamıyorum" }
  ],
  de: [
    { t:"apfel", tr:"elma" }, { t:"wasser", tr:"su" }, { t:"brot", tr:"ekmek" }, { t:"speisekarte", tr:"menü" }, { t:"preis", tr:"fiyat" },
    { t:"ja", tr:"evet" }, { t:"nein", tr:"hayır" }, { t:"hallo", tr:"merhaba" }, { t:"tschüss", tr:"güle güle" }, { t:"danke", tr:"teşekkürler" },
    { t:"bitte", tr:"lütfen" }, { t:"hilfe", tr:"yardım" }, { t:"toilette", tr:"tuvalet" }, { t:"die rechnung", tr:"hesap" }, { t:"heiß", tr:"sıcak" },
    { t:"kalt", tr:"soğuk" }, { t:"heute", tr:"bugün" }, { t:"entschuldigung", tr:"affedersiniz" }, { t:"sehr gut", tr:"çok güzel" }, { t:"ich verstehe nicht", tr:"anlamıyorum" }
  ],
  fr: [
    { t:"pomme", tr:"elma" }, { t:"eau", tr:"su" }, { t:"pain", tr:"ekmek" }, { t:"menu", tr:"menü" }, { t:"prix", tr:"fiyat" },
    { t:"oui", tr:"evet" }, { t:"non", tr:"hayır" }, { t:"bonjour", tr:"merhaba" }, { t:"au revoir", tr:"güle güle" }, { t:"merci", tr:"teşekkürler" },
    { t:"s'il vous plaît", tr:"lütfen" }, { t:"aide", tr:"yardım" }, { t:"toilettes", tr:"tuvalet" }, { t:"l'addition", tr:"hesap" }, { t:"chaud", tr:"sıcak" },
    { t:"froid", tr:"soğuk" }, { t:"aujourd'hui", tr:"bugün" }, { t:"excusez-moi", tr:"affedersiniz" }, { t:"très bien", tr:"çok güzel" }, { t:"je ne comprends pas", tr:"anlamıyorum" }
  ],
  it: [
    { t:"mela", tr:"elma" }, { t:"acqua", tr:"su" }, { t:"pane", tr:"ekmek" }, { t:"menu", tr:"menü" }, { t:"prezzo", tr:"fiyat" },
    { t:"sì", tr:"evet" }, { t:"no", tr:"hayır" }, { t:"ciao", tr:"merhaba" }, { t:"arrivederci", tr:"güle güle" }, { t:"grazie", tr:"teşekkürler" },
    { t:"per favore", tr:"lütfen" }, { t:"aiuto", tr:"yardım" }, { t:"bagno", tr:"tuvalet" }, { t:"il conto", tr:"hesap" }, { t:"caldo", tr:"sıcak" },
    { t:"freddo", tr:"soğuk" }, { t:"oggi", tr:"bugün" }, { t:"scusi", tr:"affedersiniz" }, { t:"molto bene", tr:"çok güzel" }, { t:"non capisco", tr:"anlamıyorum" }
  ],
};

function norm(s){
  return String(s||"")
    .toLowerCase()
    .trim()
    .replace(/[’']/g,"'")
    .replace(/[.,!?;:]/g,"")
    .replace(/\s+/g," ");
}

function similarity(a,b){
  a=norm(a); b=norm(b);
  if(!a || !b) return 0;
  if(a===b) return 1;

  const m=a.length,n=b.length;
  const dp=[...Array(m+1)].map(()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++)dp[i][0]=i;
  for(let j=0;j<=n;j++)dp[0][j]=j;

  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const c=a[i-1]===b[j-1]?0:1;
      dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+c);
    }
  }
  return 1-dp[m][n]/Math.max(m,n);
}

function makeRec(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const r = new SR();
  r.lang = LOCALES[lang] || "en-US";
  r.interimResults = false;
  r.continuous = false;
  return r;
}

function speakTeacher(text){
  return new Promise((resolve)=>{
    if(!("speechSynthesis" in window)){ resolve(false); return; }
    try{
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text||""));
      u.lang = LOCALES[lang] || "en-US";
      u.rate = 0.95;
      u.pitch = 1.0;
      u.onend = ()=> resolve(true);
      u.onerror = ()=> resolve(false);
      window.speechSynthesis.speak(u);
    }catch{
      resolve(false);
    }
  });
}

function setWaveMode(mode){
  const w = $("waveBox");
  if(!w) return;
  w.classList.remove("teaching","listening");
  if(mode) w.classList.add(mode);
}
function setWaveLabel(txt){
  const l = $("waveLabel");
  if(l) l.textContent = txt;
}

function setButtonsEnabled(enabled){
  $("micA").disabled = !enabled;
  $("micB").disabled = !enabled;
}

/* ✅ WebAudio SFX (ding / buzzer) */
let __audioCtx = null;
function ensureAudio(){
  if(__audioCtx) return __audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  __audioCtx = new AC();
  return __audioCtx;
}
function playTone(freq, durMs, type="sine", gain=0.06){
  const ctx = ensureAudio();
  if(!ctx) return;
  try{
    if(ctx.state === "suspended") ctx.resume().catch(()=>{});
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{ try{o.stop();}catch{} }, durMs);
  }catch{}
}
function sfxOk(){
  // tatlı ding: iki nota
  playTone(880, 90, "sine", 0.07);
  setTimeout(()=> playTone(1320, 120, "sine", 0.06), 110);
}
function sfxBad(){
  // buzzer: hızlı düşük frekans + kare
  playTone(180, 120, "square", 0.05);
  setTimeout(()=> playTone(140, 140, "square", 0.05), 140);
}

function showPanelOverlay(side, ok, msg){
  const ov = $(side==="A" ? "overlayA" : "overlayB");
  const ico = $(side==="A" ? "overlayIcoA" : "overlayIcoB");
  const txt = $(side==="A" ? "overlayTxtA" : "overlayTxtB");
  if(!ov || !ico || !txt) return;

  ov.classList.remove("ok","bad","show");
  ov.classList.add(ok ? "ok" : "bad");
  ico.textContent = ok ? "✅" : "❌";
  txt.textContent = msg || (ok ? "Great!" : "Nope!");
  ov.classList.add("show");

  clearTimeout(ov.__t);
  ov.__t = setTimeout(()=> ov.classList.remove("show"), 2000);
}

function funnyWrong(){
  const pool = [
    "Oops… not quite 😄",
    "Nope. Try again next round!",
    "Teacher says: absolutely not 😅",
    "That pronunciation took a vacation 🧳",
    "Close… but the word refused."
  ];
  return pool[Math.floor(Math.random()*pool.length)];
}

let turn = "A";
let scoreA = 0, scoreB = 0;
let round = 0;
let cur = null;
let busy = false;

function updateScores(){
  $("scoreA").textContent = String(scoreA);
  $("scoreB").textContent = String(scoreB);
}

function setHints(){
  $("hintA").textContent = (turn==="A") ? `Sıran sende. Tek hak. (${round+1}/10)` : "Sıra karşı tarafta.";
  $("hintB").textContent = (turn==="B") ? `Sıran sende. Tek hak. (${round+1}/10)` : "Sıra karşı tarafta.";
}

function pickWord(){
  const arr = WORDS[lang] || WORDS.en;
  cur = arr[Math.floor(Math.random()*arr.length)];

  $("wordA").textContent = cur.t;
  $("wordB").textContent = cur.t;

  $("meaningA").textContent = cur.tr;
  $("meaningB").textContent = cur.tr;
}

async function teacherPhase(){
  setButtonsEnabled(false);
  setWaveLabel("Öğretmen okuyor…");
  setWaveMode("teaching");
  await speakTeacher(cur.t);
  setWaveMode(null);
  setWaveLabel(turn==="A" ? "Sıra Oyuncu A" : "Sıra Oyuncu B");
  setButtonsEnabled(true);
}

function endMatch(){
  const winner =
    scoreA===scoreB ? "Berabere 😄" :
    (scoreA>scoreB ? "Oyuncu A kazandı 🏆" : "Oyuncu B kazandı 🏆");

  alert(`Bitti evladım!\nSkor A:${scoreA}  B:${scoreB}\n${winner}`);

  round = 0;
  scoreA = 0;
  scoreB = 0;
  turn = "A";
}

async function nextTurn(){
  round++;
  if(round >= 10){
    endMatch();
    pickWord();
    setHints();
    updateScores();
    await teacherPhase();
    return;
  }

  turn = (turn==="A") ? "B" : "A";
  pickWord();
  setHints();
  updateScores();
  await teacherPhase();
}

function listenFor(player){
  if(busy) return;
  if(player !== turn){
    toast("Sıra sende değil.");
    return;
  }

  const rec = makeRec();
  if(!rec){
    alert("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  busy = true;
  setButtonsEnabled(false);
  setWaveLabel("Dinliyorum…");
  setWaveMode("listening");

  rec.onresult = async (e)=>{
    const said = e.results?.[0]?.[0]?.transcript || "";
    const sc = similarity(cur.t, said);
    const ok = sc >= 0.92;

    setWaveMode(null);

    if(ok){
      if(player==="A") scoreA++; else scoreB++;
      sfxOk();
      showPanelOverlay(player, true, "Great! ✅");
    }else{
      sfxBad();
      showPanelOverlay(player, false, funnyWrong());
    }

    updateScores();
    busy = false;
    setButtonsEnabled(true);

    await nextTurn();
  };

  rec.onerror = async ()=>{
    setWaveMode(null);
    sfxBad();
    showPanelOverlay(player, false, "Mic trouble… next round 😅");
    busy = false;
    setButtonsEnabled(true);
    await nextTurn();
  };

  rec.onend = ()=>{
    setWaveMode(null);
    if(busy){
      busy = false;
      setButtonsEnabled(true);
      toast("Duyamadım.");
    }
  };

  try{ rec.start(); }
  catch{
    setWaveMode(null);
    busy = false;
    setButtonsEnabled(true);
    toast("Mikrofon açılamadı.");
  }
}

document.addEventListener("DOMContentLoaded", async ()=>{
  $("langPill").textContent = LANG_LABEL[lang] || "🆚 Duo Practice";

  $("backBtn").addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href="/pages/chat.html";
  });

  $("micA").addEventListener("click", ()=> listenFor("A"));
  $("micB").addEventListener("click", ()=> listenFor("B"));

  pickWord();
  setHints();
  updateScores();
  await teacherPhase();
});
