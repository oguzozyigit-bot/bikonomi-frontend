// FILE: /js/dream_page.js
// Speech-to-text (continuous) until user says "bitti"
// Typewriter transcript + daily limit (once/day)
// Design-first: final interpretation is demo text for now.

import { initMenuHistoryUI } from "/js/menu_history_ui.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);
const sleep = (ms)=>new Promise(r=>setTimeout(r, ms));

function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2400);
}

function syncTopUI(){
  try{
    const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
    const s = clamp(parseInt(u.sp_score ?? 10,10)||10, 0, 100);
    if($("ypFill")) $("ypFill").style.width = `${s}%`;
    if($("ypNum")) $("ypNum").textContent = `${s}/100`;
    if($("planChip")) $("planChip").textContent = String(u.plan || "FREE").toUpperCase();
  }catch{}
}

// Daily limit
function todayKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function limitKey(){ return `caynana_dream_daily:${todayKey()}`; }
function isUsedToday(){ return (localStorage.getItem(limitKey())||"") === "1"; }
function markUsed(){ localStorage.setItem(limitKey(),"1"); }

function showThinking(on){
  $("thinking")?.classList.toggle("show", !!on);
}

const state = {
  listening: false,
  finalText: "",
  buffer: "",          // transcript buffer
  typing: false,
  rec: null
};

function setMicUI(on){
  const b = $("micBtn");
  if(!b) return;
  b.classList.toggle("listening", !!on);
  $("hintTxt").innerHTML = on
    ? `<b>Seni dinliyorum evladım…</b> “bitti” deyince duracağım. Sen bitmeden ben bitmem 🙂`
    : `<b>Rüyanı bana anlat evladım.</b> Seni dinliyorum. <br> “<b>bitti</b>” diyene kadar açık kalır. Sen bitmeden ben bitmem 🙂`;
}

async function typewriterAppend(text){
  // transcript'e daktilo
  const box = $("transcript");
  if(!box) return;

  const s = String(text||"");
  if(!s.trim()) return;

  // ilk boşsa —
  if(box.textContent.trim() === "—") box.textContent = "";

  state.typing = true;

  for(let i=0;i<s.length;i++){
    box.textContent += s[i];
    // auto scroll
    box.scrollTop = box.scrollHeight;
    await sleep(18); // okunabilir yavaşlık
  }

  state.typing = false;
}

function normalizeTR(s){
  return String(s||"").toLowerCase()
    .replaceAll("ı","i").replaceAll("İ","i")
    .replaceAll("ş","s").replaceAll("ğ","g").replaceAll("ç","c").replaceAll("ö","o").replaceAll("ü","u");
}

function containsBitti(text){
  // "bitti" kelimesini yakala (yaklaşık)
  const t = normalizeTR(text);
  return /\bbitti\b/.test(t);
}

function stopListening(){
  try{ state.rec?.stop?.(); }catch{}
  state.rec = null;
  state.listening = false;
  setMicUI(false);
}

async function runInterpretation(){
  // günlük limit
  if(isUsedToday()){
    toast("Evladım bugün rüya tabirini yaptık. Rüya da fal da dakika başı değişmez… Yarın gel 🙂");
    return;
  }

  const txt = String(state.buffer||"").trim();
  if(!txt){
    toast("Evladım rüya yoksa tabir de yok. Bir daha dene 🙂");
    return;
  }

  markUsed();
  showThinking(true);
  await sleep(6500);
  showThinking(false);

  const box = $("resultBox");
  box.innerHTML = `
    <b>Evladım…</b> rüyanda geçen detaylar “zihninin yükünü” gösteriyor. <br><br>
    <b>1)</b> Son günlerde kafanı kurcalayan bir mesele var; rüyada sembolleşmiş. <br>
    <b>2)</b> Korku/kaçış hissi gördüysem: ertelediğin iş var. “Yarın yaparım” deme. <br>
    <b>3)</b> Eğer su/deniz/yağmur geçtiyse: ferahlama geliyor, ama önce içini dökmen lazım. <br><br>
    <b>Kaynana hükmü:</b> Rüya tabiri dakika başı değişmez evladım 😄 Bugünlük bu kadar. Yarın yine gel, yine bakarız.
  `;
  box.classList.add("show");
  toast("Tabir bitti evladım. Yarın gel 🙂");
}

function startListening(){
  if(isUsedToday()){
    toast("Evladım bugün rüya tabiri hakkın doldu. Yarın gel 🙂");
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    toast("Tarayıcı bu cihazda konuşmayı yazıya çevirmiyor evladım.");
    return;
  }

  // güvenlik: önce kapat
  stopListening();

  const rec = new SR();
  state.rec = rec;
  state.listening = true;
  setMicUI(true);

  rec.lang = "tr-TR";
  rec.interimResults = true;
  rec.continuous = true;

  rec.onresult = async (e)=>{
    let finalChunk = "";
    let interimChunk = "";

    for(let i=e.resultIndex; i<e.results.length; i++){
      const res = e.results[i];
      const t = res?.[0]?.transcript || "";
      if(res.isFinal) finalChunk += t + " ";
      else interimChunk += t + " ";
    }

    // interim'i ekrana basmayalım (zıplar). final gelince daktilo bas.
    if(finalChunk.trim()){
      state.buffer += finalChunk;
      await typewriterAppend(finalChunk);

      // "bitti" yakala
      if(containsBitti(finalChunk)){
        stopListening();
        // "bitti" kelimesini buffer'dan temizle
        state.buffer = state.buffer.replace(/bitti/gi, "").trim();
        toast("Tamam evladım. ‘Bitti’ dediysen bitti 🙂");
        await runInterpretation();
      }
    }
  };

  rec.onerror = (err)=>{
    // bazen "no-speech" olur; kaynana gibi tatlı sert uyar
    toast("Evladım ses gelmedi. Mikrofona konuş da duyayım.");
  };

  rec.onend = ()=>{
    // kullanıcı bitirmediyse tekrar başlat (kaynana şakası)
    if(state.listening){
      try{ rec.start(); }catch{}
    }
  };

  try{ rec.start(); }catch(e){ toast("Mikrofon açılamadı evladım."); stopListening(); }
}

function clearAll(){
  stopListening();
  state.buffer = "";
  $("transcript").textContent = "—";
  $("resultBox").classList.remove("show");
  $("resultBox").innerHTML = "";
  toast("Temizledim evladım.");
}

document.addEventListener("DOMContentLoaded", ()=>{
  const token = (localStorage.getItem("google_id_token") || "").trim();
  if(!token){ location.href="/index.html"; return; }

  try{ initMenuHistoryUI(); }catch{}
  $("hambBtn")?.addEventListener("click", ()=> $("menuOverlay")?.classList.add("open"));
  $("menuOverlay")?.addEventListener("click", (e)=>{
    const sidebar = e.currentTarget?.querySelector?.(".menu-sidebar");
    if(sidebar && sidebar.contains(e.target)) return;
    e.currentTarget.classList.remove("open");
  });

  syncTopUI();

  $("micBtn")?.addEventListener("click", ()=>{
    if(state.listening){
      toast("Evladım ‘bitti’ demeden kapatmam dedim ama… hadi tamam 🙂");
      stopListening();
      return;
    }
    $("resultBox").classList.remove("show");
    $("resultBox").innerHTML = "";
    startListening();
  });

  $("btnClear")?.addEventListener("click", clearAll);

  $("btnForceEnd")?.addEventListener("click", async ()=>{
    if(!state.listening){
      toast("Dinlemiyorum ki evladım. Mikrofona bas önce 🙂");
      return;
    }
    stopListening();
    toast("‘Bitti’ dedin sayıyorum evladım 🙂");
    await runInterpretation();
  });

  if(isUsedToday()){
    toast("Bugün rüya tabiri yaptın evladım. Yarın gel 🙂");
  }
});
