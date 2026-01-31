// FILE: /js/translate_page.js
// FINAL – Dropdown search + scroll hidden + favorites on top

import { BASE_DOMAIN } from "/js/config.js";
const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 2000);
}

function setWaveListening(on){
  $("frameRoot")?.classList.toggle("listening", !!on);
}

const SLOGAN_TR = "Yapay Zekânın Geleneksel Aklı";
const SLOGAN_MAP = {
  tr: SLOGAN_TR,
  en: "The Traditional Mind of AI",
  de: "Der traditionelle Verstand der KI",
  fr: "L’esprit traditionnel de l’IA",
  es: "La mente tradicional de la IA",
  ar: "عقل الذكاء الاصطناعي التقليدي",
  ru: "Традиционный разум ИИ"
};
const sloganFor = (code)=> SLOGAN_MAP[code] || SLOGAN_TR;

// ✅ En sık kullanılanlar en üstte (Türkçe birinci)
const FAV = [
  { code:"tr", name:"Türkçe", speech:"tr-TR", tts:"tr-TR" },
  { code:"en", name:"İngilizce", speech:"en-US", tts:"en-US" },
  { code:"de", name:"Almanca", speech:"de-DE", tts:"de-DE" },
  { code:"fr", name:"Fransızca", speech:"fr-FR", tts:"fr-FR" },
  { code:"es", name:"İspanyolca", speech:"es-ES", tts:"es-ES" },
  { code:"it", name:"İtalyanca", speech:"it-IT", tts:"it-IT" },
  { code:"ar", name:"Arapça", speech:"ar-SA", tts:"ar-SA" },
  { code:"ru", name:"Rusça", speech:"ru-RU", tts:"ru-RU" },
];

// ✅ Diğer diller (Türkçe adlarla)
const OTHERS = [
  { code:"en_gb", name:"İngilizce (UK)", speech:"en-GB", tts:"en-GB" },
  { code:"pt", name:"Portekizce (BR)", speech:"pt-BR", tts:"pt-BR" },
  { code:"pt_pt", name:"Portekizce (PT)", speech:"pt-PT", tts:"pt-PT" },
  { code:"nl", name:"Hollandaca", speech:"nl-NL", tts:"nl-NL" },
  { code:"sv", name:"İsveççe", speech:"sv-SE", tts:"sv-SE" },
  { code:"no", name:"Norveççe", speech:"nb-NO", tts:"nb-NO" },
  { code:"da", name:"Danca", speech:"da-DK", tts:"da-DK" },
  { code:"fi", name:"Fince", speech:"fi-FI", tts:"fi-FI" },
  { code:"pl", name:"Lehçe", speech:"pl-PL", tts:"pl-PL" },
  { code:"cs", name:"Çekçe", speech:"cs-CZ", tts:"cs-CZ" },
  { code:"sk", name:"Slovakça", speech:"sk-SK", tts:"sk-SK" },
  { code:"hu", name:"Macarca", speech:"hu-HU", tts:"hu-HU" },
  { code:"ro", name:"Romence", speech:"ro-RO", tts:"ro-RO" },
  { code:"bg", name:"Bulgarca", speech:"bg-BG", tts:"bg-BG" },
  { code:"el", name:"Yunanca", speech:"el-GR", tts:"el-GR" },
  { code:"uk", name:"Ukraynaca", speech:"uk-UA", tts:"uk-UA" },
  { code:"he", name:"İbranice", speech:"he-IL", tts:"he-IL" },
  { code:"fa", name:"Farsça", speech:"fa-IR", tts:"fa-IR" },
  { code:"hi", name:"Hintçe", speech:"hi-IN", tts:"hi-IN" },
  { code:"ur", name:"Urduca", speech:"ur-PK", tts:"ur-PK" },
  { code:"bn", name:"Bengalce", speech:"bn-BD", tts:"bn-BD" },
  { code:"ta", name:"Tamilce", speech:"ta-IN", tts:"ta-IN" },
  { code:"te", name:"Teluguca", speech:"te-IN", tts:"te-IN" },
  { code:"mr", name:"Marathi", speech:"mr-IN", tts:"mr-IN" },
  { code:"th", name:"Tayca", speech:"th-TH", tts:"th-TH" },
  { code:"vi", name:"Vietnamca", speech:"vi-VN", tts:"vi-VN" },
  { code:"id", name:"Endonezce", speech:"id-ID", tts:"id-ID" },
  { code:"ms", name:"Malayca", speech:"ms-MY", tts:"ms-MY" },
  { code:"tl", name:"Filipince", speech:"fil-PH", tts:"fil-PH" },
  { code:"zh_cn", name:"Çince (Basitleştirilmiş)", speech:"zh-CN", tts:"zh-CN" },
  { code:"zh_tw", name:"Çince (Geleneksel)", speech:"zh-TW", tts:"zh-TW" },
  { code:"ja", name:"Japonca", speech:"ja-JP", tts:"ja-JP" },
  { code:"ko", name:"Korece", speech:"ko-KR", tts:"ko-KR" },
  { code:"af", name:"Afrikanca", speech:"af-ZA", tts:"af-ZA" },
  { code:"sw", name:"Svahili", speech:"sw-KE", tts:"sw-KE" },
  { code:"zu", name:"Zulu", speech:"zu-ZA", tts:"zu-ZA" },
];

// Birleştir (favs üstte)
const LANGS = [...FAV, ...OTHERS];

const normLang = (c)=> String(c||"").toLowerCase().split("_")[0];
function speechLocale(code){ return LANGS.find(x=>x.code===code)?.speech || "en-US"; }
function ttsLocale(code){ return LANGS.find(x=>x.code===code)?.tts || "en-US"; }
function apiBase(){ return String(BASE_DOMAIN || "").replace(/\/+$/,""); }

/* ✅ Backend translate: {text, from_lang, to_lang} */
async function translateViaApi(text, fromLang, toLang){
  const base = apiBase();
  if(!base) return text;

  const payload = {
    text: String(text || ""),
    from_lang: fromLang ? normLang(fromLang) : null,
    to_lang: normLang(toLang || "en")
  };

  try{
    const r = await fetch(`${base}/api/translate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json", "accept":"application/json" },
      body: JSON.stringify(payload)
    });
    if(!r.ok){
      const t = await r.text().catch(()=> "");
      throw new Error(`translate ${r.status} ${t}`);
    }
    const data = await r.json().catch(()=> ({}));
    return String(data?.translated || "").trim() || text;
  }catch(e){
    console.warn("translateViaApi failed:", e);
    return text;
  }
}

/* Auto speak toggle (mute) */
const mute = { top:false, bot:false };
function setMute(side, on){
  mute[side] = !!on;
  const btn = $(side === "top" ? "topSpeak" : "botSpeak");
  btn?.classList.toggle("muted", mute[side]);
}
function speakAuto(text, langCode, side){
  if(mute[side]) return;
  const t = String(text||"").trim();
  if(!t) return;
  if(!("speechSynthesis" in window)) return;

  try{
    const u = new SpeechSynthesisUtterance(t);
    u.lang = ttsLocale(langCode);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch{}
}

/* Auto-follow per side */
const follow = { top:true, bot:true };
function isNearBottom(el, slack=140){
  try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }
  catch{ return true; }
}
function hookScrollFollow(sideName, el){
  el.addEventListener("scroll", ()=>{ follow[sideName] = isNearBottom(el); }, { passive:true });
}
function scrollIfNeeded(sideName, el){
  if(follow[sideName]) el.scrollTop = el.scrollHeight;
}

/* Bubbles */
function addBubble(sideName, kind, text){
  const wrap = $(sideName === "top" ? "topBody" : "botBody");
  const b = document.createElement("div");
  b.className = `bubble ${kind}`;
  b.textContent = text || "—";
  wrap.appendChild(b);
  scrollIfNeeded(sideName, wrap);
}

/* Speech recognition */
function buildRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = speechLocale(langCode);
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

let active = null;
let topRec = null;
let botRec = null;

function setMicUI(side, on){
  const mic = $(side === "top" ? "topMic" : "botMic");
  mic?.classList.toggle("listening", !!on);
  setWaveListening(!!on);
}
function stopAll(){
  try{ topRec?.stop?.(); }catch{}
  try{ botRec?.stop?.(); }catch{}
  topRec = null;
  botRec = null;
  active = null;
  setMicUI("top", false);
  setMicUI("bot", false);
  setWaveListening(false);
}

async function onFinal(side, srcCode, dstCode, finalText){
  const otherSide = (side === "top") ? "bot" : "top";

  addBubble(side, "them", finalText);

  const out = await translateViaApi(finalText, srcCode, dstCode);
  addBubble(otherSide, "me", out);

  speakAuto(out, dstCode, otherSide);
}

function startSide(side, getLang, getOtherLang){
  if(active && active !== side){
    stopAll();
  }

  const srcCode = getLang();
  const dstCode = getOtherLang();

  const rec = buildRecognizer(srcCode);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  active = side;
  setMicUI(side, true);

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
  };

  rec.onerror = ()=>{
    toast("Mikrofon izin/HTTPS/cihaz sıkıntısı olabilir.");
    stopAll();
  };

  rec.onend = async ()=>{
    const txt = (finalText || live || "").trim();
    setMicUI(side, false);

    if(!txt){
      active = null;
      return;
    }

    await onFinal(side, srcCode, dstCode, txt);
    active = null;
  };

  if(side === "top") topRec = rec;
  else botRec = rec;

  try{ rec.start(); }
  catch{
    toast("Mikrofon açılamadı.");
    stopAll();
  }
}

/* ✅ Dropdown with search + favorites header */
function buildDropdown(ddId, btnId, txtId, menuId, defCode, onChange){
  const dd = $(ddId);
  const btn = $(btnId);
  const txt = $(txtId);
  const menu = $(menuId);

  let current = defCode;

  function closeAll(){
    document.querySelectorAll(".dd.open").forEach(x=> x.classList.remove("open"));
  }

  function setValue(code){
    current = code;
    txt.textContent = (LANGS.find(l=>l.code===code)?.name || code);
    onChange?.(code);
  }

  // menu build
  const favCodes = new Set(FAV.map(x=>x.code));

  menu.innerHTML = `
    <div class="dd-search-wrap">
      <input class="dd-search" type="text" placeholder="Dil ara..." />
    </div>
    <div class="dd-items"></div>
  `;

  const itemsWrap = menu.querySelector(".dd-items");

  function renderItems(){
    const q = String(menu.querySelector(".dd-search").value || "").trim().toLowerCase();

    const match = (name)=> !q || String(name||"").toLowerCase().includes(q);

    const favItems = LANGS.filter(l=>favCodes.has(l.code) && match(l.name));
    const otherItems = LANGS.filter(l=>!favCodes.has(l.code) && match(l.name));

    const sepFav = favItems.length ? `<div class="dd-sep">Sık kullanılan</div>` : "";
    const sepOther = otherItems.length ? `<div class="dd-sep">Diğer diller</div>` : "";

    const html =
      sepFav +
      favItems.map(l=>`<div class="dd-item" data-code="${l.code}">${l.name}</div>`).join("") +
      sepOther +
      otherItems.map(l=>`<div class="dd-item" data-code="${l.code}">${l.name}</div>`).join("");

    itemsWrap.innerHTML = html || `<div class="dd-item">Sonuç yok</div>`;

    itemsWrap.querySelectorAll(".dd-item[data-code]").forEach(it=>{
      it.addEventListener("click", ()=>{
        const code = it.getAttribute("data-code");
        closeAll();
        setValue(code);
      });
    });
  }

  // search
  const search = menu.querySelector(".dd-search");
  search.addEventListener("input", renderItems);

  // open/close
  btn.addEventListener("click", (e)=>{
    e.stopPropagation();
    const open = dd.classList.contains("open");
    closeAll();
    dd.classList.toggle("open", !open);
    if(!open){
      renderItems();
      setTimeout(()=>{ try{ search.focus(); }catch{} }, 0);
    }
  });

  // menu scroll event should not bubble (mobile)
  menu.addEventListener("touchmove", (e)=> e.stopPropagation(), { passive:true });
  menu.addEventListener("wheel", (e)=> e.stopPropagation(), { passive:true });

  document.addEventListener("click", ()=> closeAll());

  setValue(defCode);

  return { get: ()=> current };
}

/* Boot */
document.addEventListener("DOMContentLoaded", ()=>{
  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/chat.html";
  });

  hookScrollFollow("top", $("topBody"));
  hookScrollFollow("bot", $("botBody"));

  // Default: üst EN, alt TR
  const topDD = buildDropdown("ddTop","ddTopBtn","ddTopTxt","ddTopMenu","en", (code)=>{
    $("sloganTop").textContent = sloganFor(normLang(code));
  });
  const botDD = buildDropdown("ddBot","ddBotBtn","ddBotTxt","ddBotMenu","tr", (code)=>{
    $("sloganBot").textContent = sloganFor(normLang(code));
  });

  $("sloganTop").textContent = sloganFor(normLang(topDD.get()));
  $("sloganBot").textContent = sloganFor(normLang(botDD.get()));

  $("topBody").innerHTML = "";
  $("botBody").innerHTML = "";

  $("topSpeak")?.addEventListener("click", ()=>{ setMute("top", !mute.top); toast(mute.top ? "Ses kapalı" : "Ses açık"); });
  $("botSpeak")?.addEventListener("click", ()=>{ setMute("bot", !mute.bot); toast(mute.bot ? "Ses kapalı" : "Ses açık"); });

  setMute("top", false);
  setMute("bot", false);

  $("topMic")?.addEventListener("click", ()=> startSide("top", ()=>topDD.get(), ()=>botDD.get()));
  $("botMic")?.addEventListener("click", ()=> startSide("bot", ()=>botDD.get(), ()=>topDD.get()));

  setWaveListening(false);
});
