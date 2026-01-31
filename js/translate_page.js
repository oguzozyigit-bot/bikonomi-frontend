// FILE: /js/translate_page.js
// Two-sided pro tabletop translator
// - Two independent mic buttons (one per side)
// - Each side picks its speaking language
// - When speech ends: show transcript on same side + translated text on other side
// - Translation API stub: POST /api/translate (to your backend) -> fallback demo if missing

import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 2400);
}

const LANGS = [
  { code:"tr", name:"Türkçe", speech:"tr-TR" },
  { code:"en", name:"English", speech:"en-US" },
  { code:"de", name:"Deutsch", speech:"de-DE" },
  { code:"fr", name:"Français", speech:"fr-FR" },
  { code:"es", name:"Español", speech:"es-ES" },
  { code:"ar", name:"العربية", speech:"ar-SA" },
  { code:"ru", name:"Русский", speech:"ru-RU" },
];

function fillSelect(sel, def){
  sel.innerHTML = LANGS.map(l=>`<option value="${l.code}">${l.name}</option>`).join("");
  sel.value = def;
}

function getSpeechLang(code){
  const f = LANGS.find(x=>x.code===code);
  return f?.speech || "en-US";
}

function setSideUI(side, on){
  $(side.micId).classList.toggle("listening", !!on);
  $(side.statusId).textContent = on ? "Dinliyor…" : "Hazır";
}

async function translateViaApi(text, source, target){
  const base = (BASE_DOMAIN || "").replace(/\/+$/,"");
  if(!base){
    return `[${target.toUpperCase()}] ${text}`;
  }
  try{
    const r = await fetch(`${base}/api/translate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text, source, target })
    });
    if(!r.ok) throw new Error("api");
    const data = await r.json();
    // expected: { ok:true, text:"..." } OR { translation:"..." }
    const out = String(data?.text || data?.translation || data?.translated || "").trim();
    return out || `[${target.toUpperCase()}] ${text}`;
  }catch{
    // fallback demo
    return `[${target.toUpperCase()}] ${text}`;
  }
}

function buildRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = getSpeechLang(langCode);
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

let active = null; // "top" | "bot" | null
let topRec = null;
let botRec = null;

const TOP = {
  name: "top",
  langSel: "topLang",
  micId: "topMic",
  statusId: "topStatus",
  heardId: "topHeard",
  translatedId: "topTranslated"
};

const BOT = {
  name: "bot",
  langSel: "botLang",
  micId: "botMic",
  statusId: "botStatus",
  heardId: "botHeard",
  translatedId: "botTranslated"
};

// Who speaks -> translate to other side language
function otherSide(side){
  return side.name === "top" ? BOT : TOP;
}

async function handleFinal(side, finalText){
  const srcCode = $(side.langSel).value;
  const dstCode = $(otherSide(side).langSel).value;

  // show transcript on same side
  $(side.heardId).textContent = finalText || "—";

  // translate and show on other side
  $(otherSide(side).statusId).textContent = "Çeviriyor…";
  const out = await translateViaApi(finalText, srcCode, dstCode);
  $(otherSide(side).translatedId).textContent = out || "—";
  $(otherSide(side).statusId).textContent = "Hazır";
}

function stopAll(){
  try{ topRec?.stop?.(); }catch{}
  try{ botRec?.stop?.(); }catch{}
  topRec = null;
  botRec = null;
  active = null;
  setSideUI(TOP,false);
  setSideUI(BOT,false);
}

function startSide(side){
  // only one active at a time (same phone mic)
  if(active && active !== side.name){
    stopAll();
  }

  const lang = $(side.langSel).value;
  const rec = buildRecognizer(lang);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor evladım.");
    return;
  }

  active = side.name;
  setSideUI(side,true);

  let live = "";
  let finalText = "";

  rec.onresult = (e)=>{
    let chunk = "";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t = e.results[i]?.[0]?.transcript || "";
      if(e.results[i].isFinal) finalText += t + " ";
      else chunk += t + " ";
    }
    live = (finalText + chunk).trim();
    // live transcript on same side
    $(side.heardId).textContent = live || "…";
  };

  rec.onerror = ()=>{
    toast("Mikrofon izin/HTTPS/cihaz sıkıntısı olabilir.");
    stopAll();
  };

  rec.onend = async ()=>{
    // finalize
    const txt = (finalText || live || "").trim();
    setSideUI(side,false);

    if(!txt){
      $(side.heardId).textContent = "—";
      active = null;
      return;
    }

    // show translating status
    $(otherSide(side).statusId).textContent = "Çeviriyor…";
    await handleFinal(side, txt);
    active = null;
  };

  // assign
  if(side.name === "top") topRec = rec;
  else botRec = rec;

  try{
    rec.start();
  }catch{
    toast("Mikrofon açılamadı. (İzin verildi mi?)");
    stopAll();
  }
}

function bind(){
  // back
  $("backBtn").addEventListener("click", ()=>{
    // simple: go back or chat
    if(history.length>1) history.back();
    else location.href = "/pages/chat.html";
  });

  // fill language selects
  fillSelect($("botLang"), "tr"); // I speak TR
  fillSelect($("topLang"), "en"); // other speaks EN by default

  // buttons
  $("botMic").addEventListener("click", ()=> startSide(BOT));
  $("topMic").addEventListener("click", ()=> startSide(TOP));

  // changing language while listening -> stop
  $("botLang").addEventListener("change", ()=> { if(active==="bot") stopAll(); });
  $("topLang").addEventListener("change", ()=> { if(active==="top") stopAll(); });

  // initial hints
  $("botHeard").textContent = "Mikrofona bas, konuş.";
  $("topHeard").textContent = "Mikrofona bas, konuş.";
  $("botTranslated").textContent = "—";
  $("topTranslated").textContent = "—";
}

document.addEventListener("DOMContentLoaded", bind);
