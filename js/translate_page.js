// FILE: /js/translate_page.js
// FINAL – FULL VERSION (NO PATCHES)

import { BASE_DOMAIN } from "/js/config.js";
const $ = (id) => document.getElementById(id);

/* ===========================
   TOAST
=========================== */
function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>t.classList.remove("show"), 2200);
}

/* ===========================
   LANG LIST (40+)
=========================== */
const LANGS = [
  { code:"tr", name:"Türkçe", speech:"tr-TR", tts:"tr-TR" },
  { code:"en", name:"English", speech:"en-US", tts:"en-US" },
  { code:"en_gb", name:"English (UK)", speech:"en-GB", tts:"en-GB" },
  { code:"de", name:"Deutsch", speech:"de-DE", tts:"de-DE" },
  { code:"fr", name:"Français", speech:"fr-FR", tts:"fr-FR" },
  { code:"es", name:"Español", speech:"es-ES", tts:"es-ES" },
  { code:"it", name:"Italiano", speech:"it-IT", tts:"it-IT" },
  { code:"pt", name:"Português (BR)", speech:"pt-BR", tts:"pt-BR" },
  { code:"nl", name:"Nederlands", speech:"nl-NL", tts:"nl-NL" },
  { code:"sv", name:"Svenska", speech:"sv-SE", tts:"sv-SE" },
  { code:"ru", name:"Русский", speech:"ru-RU", tts:"ru-RU" },
  { code:"ar", name:"العربية", speech:"ar-SA", tts:"ar-SA" },
  { code:"fa", name:"فارسی", speech:"fa-IR", tts:"fa-IR" },
  { code:"hi", name:"हिन्दी", speech:"hi-IN", tts:"hi-IN" },
  { code:"ur", name:"اردو", speech:"ur-PK", tts:"ur-PK" },
  { code:"th", name:"ไทย", speech:"th-TH", tts:"th-TH" },
  { code:"vi", name:"Tiếng Việt", speech:"vi-VN", tts:"vi-VN" },
  { code:"id", name:"Bahasa Indonesia", speech:"id-ID", tts:"id-ID" },
  { code:"zh_cn", name:"中文 (简体)", speech:"zh-CN", tts:"zh-CN" },
  { code:"zh_tw", name:"中文 (繁體)", speech:"zh-TW", tts:"zh-TW" },
  { code:"ja", name:"日本語", speech:"ja-JP", tts:"ja-JP" },
  { code:"ko", name:"한국어", speech:"ko-KR", tts:"ko-KR" }
];

/* ===========================
   SLOGAN
=========================== */
const SLOGANS = {
  tr:"Yapay Zekânın Geleneksel Aklı",
  en:"The Traditional Mind of AI",
  de:"Der traditionelle Verstand der KI",
  fr:"L’esprit traditionnel de l’IA",
  es:"La mente tradicional de la IA",
  ar:"عقل الذكاء الاصطناعي التقليدي",
  ru:"Традиционный разум ИИ"
};
const sloganFor = (c)=> SLOGANS[c] || SLOGANS.tr;

/* ===========================
   HELPERS
=========================== */
const normLang = (c)=> String(c||"").toLowerCase().split("_")[0];
const speechLocale = (c)=> LANGS.find(x=>x.code===c)?.speech || "en-US";
const ttsLocale    = (c)=> LANGS.find(x=>x.code===c)?.tts || "en-US";

/* ===========================
   TRANSLATE API
=========================== */
async function translateText(text, fromLang, toLang){
  if(!BASE_DOMAIN) return text;
  try{
    const r = await fetch(`${BASE_DOMAIN}/api/translate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        text,
        from_lang: normLang(fromLang),
        to_lang: normLang(toLang)
      })
    });
    const j = await r.json();
    return j.translated || text;
  }catch{
    return text;
  }
}

/* ===========================
   SPEECH
=========================== */
function makeRecognizer(lang){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const r = new SR();
  r.lang = speechLocale(lang);
  r.interimResults = true;
  r.continuous = false;
  return r;
}

/* ===========================
   UI HELPERS
=========================== */
const follow = { top:true, bot:true };
function nearBottom(el){
  return (el.scrollHeight - el.scrollTop - el.clientHeight) < 120;
}
function hookScroll(side, el){
  el.addEventListener("scroll", ()=> follow[side] = nearBottom(el), { passive:true });
}
function scrollIfNeeded(side, el){
  if(follow[side]) el.scrollTop = el.scrollHeight;
}

function addBubble(side, cls, text){
  const box = document.createElement("div");
  box.className = `bubble ${cls}`;
  box.textContent = text;
  const wrap = $(side==="top"?"topBody":"botBody");
  wrap.appendChild(box);
  scrollIfNeeded(side, wrap);
}

/* ===========================
   AUDIO (AUTO)
=========================== */
const mute = { top:false, bot:false };
function speak(text, lang, side){
  if(mute[side]) return;
  if(!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = ttsLocale(lang);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/* ===========================
   DROPDOWN
=========================== */
function buildDropdown(rootId, btnId, txtId, menuId, def, onChange){
  const root=$(rootId), btn=$(btnId), txt=$(txtId), menu=$(menuId);
  let cur=def;

  menu.innerHTML = LANGS.map(l=>`<div class="dd-item" data="${l.code}">${l.name}</div>`).join("");

  menu.querySelectorAll(".dd-item").forEach(i=>{
    i.onclick=()=>{
      cur=i.getAttribute("data");
      txt.textContent=LANGS.find(x=>x.code===cur)?.name||cur;
      root.classList.remove("open");
      onChange?.(cur);
    };
  });

  btn.onclick=(e)=>{
    e.stopPropagation();
    document.querySelectorAll(".dd.open").forEach(x=>x.classList.remove("open"));
    root.classList.toggle("open");
  };
  document.addEventListener("click",()=>root.classList.remove("open"));

  txt.textContent=LANGS.find(x=>x.code===def)?.name||def;
  return { get:()=>cur };
}

/* ===========================
   MIC LOGIC
=========================== */
let active=null, topRec=null, botRec=null;

function stopAll(){
  try{ topRec?.stop(); }catch{}
  try{ botRec?.stop(); }catch{}
  topRec=botRec=null;
  active=null;
  $("frameRoot").classList.remove("listening");
}

async function onFinal(side, src, dst, text){
  addBubble(side,"them",text);
  const out = await translateText(text, src, dst);
  const other = side==="top"?"bot":"top";
  addBubble(other,"me",out);
  speak(out,dst,other);
}

function start(side, getSrc, getDst){
  if(active && active!==side) stopAll();
  const rec = makeRecognizer(getSrc());
  if(!rec){ toast("Mikrofon desteklenmiyor"); return; }
  active=side;
  $("frameRoot").classList.add("listening");

  let finalTxt="", live="";
  rec.onresult=e=>{
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t=e.results[i][0].transcript;
      e.results[i].isFinal ? finalTxt+=t+" " : live+=t+" ";
    }
  };
  rec.onend=async()=>{
    $("frameRoot").classList.remove("listening");
    const txt=(finalTxt||live).trim();
    if(txt) await onFinal(side,getSrc(),getDst(),txt);
    active=null;
  };
  rec.onerror=()=>{ toast("Mikrofon hatası"); stopAll(); };
  side==="top"?topRec=rec:botRec=rec;
  rec.start();
}

/* ===========================
   INIT
=========================== */
document.addEventListener("DOMContentLoaded",()=>{
  $("backBtn").onclick=()=>history.length>1?history.back():location.href="/pages/chat.html";

  hookScroll("top",$("topBody"));
  hookScroll("bot",$("botBody"));

  const topDD=buildDropdown("ddTop","ddTopBtn","ddTopTxt","ddTopMenu","en",(c)=>$("sloganTop").textContent=sloganFor(c));
  const botDD=buildDropdown("ddBot","ddBotBtn","ddBotTxt","ddBotMenu","tr",(c)=>$("sloganBot").textContent=sloganFor(c));

  $("sloganTop").textContent=sloganFor(topDD.get());
  $("sloganBot").textContent=sloganFor(botDD.get());

  $("topSpeak").onclick=()=>{ mute.top=!mute.top; toast(mute.top?"Ses kapalı":"Ses açık"); };
  $("botSpeak").onclick=()=>{ mute.bot=!mute.bot; toast(mute.bot?"Ses kapalı":"Ses açık"); };

  $("topMic").onclick=()=>start("top",()=>topDD.get(),()=>botDD.get());
  $("botMic").onclick=()=>start("bot",()=>botDD.get(),()=>topDD.get());

  $("topBody").innerHTML="";
  $("botBody").innerHTML="";
});
