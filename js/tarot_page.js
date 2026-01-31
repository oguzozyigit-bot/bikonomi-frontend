// FILE: /js/tarot_page.js
// 78 cards, 3-column vertical grid
// ✅ Back design: Navy + white frame + red "C" monogram
// ✅ Daily limit: 1/3/5 spreads each once per day
// ✅ After reading: hide deck + kaynana joke "fal dakika başı değişmez, yarın gel"

import { initMenuHistoryUI } from "/js/menu_history_ui.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id) => document.getElementById(id);
const sleep = (ms)=>new Promise(r=>setTimeout(r, ms));

function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2200);
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

const POS = {
  1:["Günlük mesaj"],
  3:["Geçmiş","Şimdi","Gelecek"],
  5:["Durum","Engel","Tavsiye","Dış Etki","Sonuç"]
};

// ---------- FULL DECK 78 ----------
const MAJOR = [
  "Deli (0)","Büyücü (I)","Başrahibe (II)","İmparatoriçe (III)","İmparator (IV)","Aziz (V)",
  "Aşıklar (VI)","Savaş Arabası (VII)","Güç (VIII)","Ermiş (IX)","Kader Çarkı (X)","Adalet (XI)",
  "Asılan Adam (XII)","Dönüşüm (XIII)","Denge (XIV)","Şeytan (XV)","Kule (XVI)","Yıldız (XVII)",
  "Ay (XVIII)","Güneş (XIX)","Mahkeme (XX)","Dünya (XXI)"
];

const SUITS = [
  { key:"asalar", name:"Asalar", sym:"🪵", accent:"#ffb300" },
  { key:"kupalar", name:"Kupalar", sym:"🏺", accent:"#00c2ff" },
  { key:"kiliclar", name:"Kılıçlar", sym:"⚔️", accent:"#ff5252" },
  { key:"tilsimlar", name:"Tılsımlar", sym:"🪙", accent:"#bef264" },
];

const RANKS = [
  { key:"as",  name:"As",  sym:"✶" },
  ...Array.from({length:9},(_,i)=>({ key:String(i+2), name:String(i+2), sym:"•" })), // 2..10
  { key:"vale",    name:"Vale",    sym:"♟️" },
  { key:"sovalye", name:"Şövalye", sym:"🏇" },
  { key:"kralice", name:"Kraliçe", sym:"👑" },
  { key:"kral",    name:"Kral",    sym:"👑" },
];

function buildDeck(){
  const deck = [];
  MAJOR.forEach((nm, idx)=>{
    deck.push({ id:`major_${idx}`, type:"major", name:nm, suit:null, rank:null, seed:`major:${idx}:${nm}` });
  });
  SUITS.forEach(s=>{
    RANKS.forEach(r=>{
      deck.push({ id:`minor_${s.key}_${r.key}`, type:"minor", name:`${s.name} - ${r.name}`, suit:s, rank:r, seed:`minor:${s.key}:${r.key}` });
    });
  });
  return deck;
}
const FULL_DECK = buildDeck();

// ---------- Back SVG (NAVY + WHITE FRAME + RED C) ----------
function backSVG(seed){
  return `
  <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="nv" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0b1430" stop-opacity="1"/>
        <stop offset="1" stop-color="#111b3d" stop-opacity="1"/>
      </linearGradient>
      <radialGradient id="shine" cx="50%" cy="35%" r="70%">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect x="0" y="0" width="100" height="140" rx="16" fill="url(#nv)"/>
    <rect x="6" y="8" width="88" height="124" rx="14" fill="rgba(0,0,0,.18)"/>
    <rect x="10" y="12" width="80" height="116" rx="12" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <rect x="14" y="16" width="72" height="108" rx="10" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2"/>
    <circle cx="50" cy="64" r="34" fill="url(#shine)"/>

    <!-- Red C monogram -->
    <path d="M66 90c-6 7-13 11-22 11-16 0-29-13-29-29s13-29 29-29c9 0 16 4 22 11"
          fill="none" stroke="#ff2d2d" stroke-width="7" stroke-linecap="round" opacity="0.92"/>

    <path d="M66 90c-6 7-13 11-22 11-16 0-29-13-29-29s13-29 29-29c9 0 16 4 22 11"
          fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2" stroke-linecap="round"/>

    <text x="50" y="124" text-anchor="middle"
          font-family="system-ui, -apple-system, Segoe UI, Arial"
          font-size="9" font-weight="900"
          fill="rgba(255,255,255,.70)">Caynana Tarot</text>
  </svg>`;
}

// ---------- Face SVG (stronger contrast) ----------
function faceSVG(card, rev){
  const accent = card.suit?.accent || "#ffb300";
  const sym = card.type === "major" ? "✶" : (card.suit?.sym || "✶");
  const rankSym = card.rank?.sym || "✶";
  const rot = rev ? `transform="rotate(180 60 60)"` : "";

  return `
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g" cx="50%" cy="45%" r="70%">
        <stop offset="0" stop-color="${accent}" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <g ${rot}>
      <rect x="10" y="10" width="100" height="100" rx="18"
            fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
      <rect x="14" y="14" width="92" height="92" rx="16"
            fill="rgba(10,10,10,.78)" stroke="rgba(255,255,255,.10)" stroke-width="2"/>
      <circle cx="60" cy="58" r="38" fill="url(#g)"/>

      <path d="M24 60 C40 34, 80 34, 96 60" stroke="rgba(255,255,255,.20)" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M24 60 C40 86, 80 86, 96 60" stroke="rgba(255,255,255,.12)" stroke-width="3" fill="none" stroke-linecap="round"/>

      <circle cx="60" cy="60" r="22" fill="rgba(0,0,0,.25)" stroke="rgba(255,255,255,.16)" stroke-width="2"/>
      <text x="60" y="72" text-anchor="middle"
            font-family="Apple Color Emoji, Segoe UI Emoji, system-ui"
            font-size="32">${sym}</text>

      <text x="22" y="28" font-family="system-ui, -apple-system, Segoe UI, Arial"
            font-size="12" font-weight="1000" fill="${accent}" opacity="0.98">${rankSym}</text>
      <text x="98" y="100" text-anchor="end" font-family="system-ui, -apple-system, Segoe UI, Arial"
            font-size="12" font-weight="1000" fill="${accent}" opacity="0.88">${rankSym}</text>
    </g>
  </svg>`;
}

// ---------- Daily Limit ----------
function todayKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function limitKey(spreadN){
  return `caynana_tarot_daily:${spreadN}:${todayKey()}`;
}
function isUsedToday(spreadN){
  return (localStorage.getItem(limitKey(spreadN)) || "") === "1";
}
function markUsedToday(spreadN){
  localStorage.setItem(limitKey(spreadN), "1");
}

// ---------- State ----------
const state = {
  need: 1,
  ready: false,
  used: new Set(),
  picked: []
};

function showThinking(on){
  $("thinking").classList.toggle("show", !!on);
}

function renderPicked(){
  const box = $("picked");
  box.innerHTML = "";
  state.picked.forEach(p=>{
    const div = document.createElement("div");
    div.className = "picked-card";
    div.innerHTML = `
      <div class="picked-pos">${p.posLabel}</div>
      <div class="picked-name">${p.card.name}</div>
      <div class="picked-tag ${p.rev ? "rev" : ""}">${p.rev ? "TERS" : "DÜZ"}</div>
    `;
    box.appendChild(div);
  });
}

function makeResultText(){
  const lines = [];
  lines.push(`<b>Evladım…</b> bak şimdi. Bu iş “dakika başı fal” değil.`);
  lines.push(`<br><br><b>Seçtiklerin:</b>`);
  state.picked.forEach(p=>{
    lines.push(`<br>• <b>${p.posLabel}:</b> ${p.card.name} (${p.rev ? "ters" : "düz"})`);
  });
  lines.push(`<br><br><b>Kaynana hükmü:</b>`);
  lines.push(`Fal dakika başı değişmez evladım. Bugünlük bu kadar. Yarın gel, yine bakarız.`);
  lines.push(`<br><br><b>Not:</b> Günde bir kere bakıyorum. Ben de insanım, gözüm yoruluyor 🙂`);
  return lines.join("");
}

async function runReadingAndLock(){
  showThinking(true);
  await sleep(6500);
  showThinking(false);

  // kartları gizle (3 ekran kartları kaldır)
  $("deckGrid").style.display = "none";

  // sonucu göster
  const box = $("resultBox");
  box.innerHTML = makeResultText();
  box.classList.add("show");

  // günlük limit işaretle
  markUsedToday(state.need);

  toast("Bugünlük bitti evladım. Yarın gel 🙂");
}

function resetUIOnly(){
  // UI temizle ama günlük kilidi aşamaz
  state.ready = false;
  state.used = new Set();
  state.picked = [];
  renderPicked();

  $("resultBox").classList.remove("show");
  $("resultBox").innerHTML = "";

  // kartları geri getir
  $("deckGrid").style.display = "grid";

  // flip reset
  document.querySelectorAll(".flip").forEach(el=>{
    el.classList.remove("flipped");
    el.classList.remove("disabled");
  });

  toast("Sıfırlandı (UI). Ama günlük limit geçmez evladım.");
}

// ---------- Build Grid 78 ----------
function buildDeckGrid(){
  const grid = $("deckGrid");
  grid.innerHTML = "";

  FULL_DECK.forEach((card, idx)=>{
    const flip = document.createElement("div");
    flip.className = "flip";
    flip.dataset.id = card.id;

    flip.innerHTML = `
      <div class="inner">
        <div class="face back">
          <div class="backsvg">${backSVG(card.seed + ":" + idx)}</div>
        </div>
        <div class="face front">
          <div class="frame" data-art></div>
          <div class="title" data-title>—</div>
          <div class="meta">
            <span class="tag" data-pos>—</span>
            <span class="tag" data-rev>—</span>
          </div>
        </div>
      </div>
    `;

    flip.querySelector(".back").addEventListener("click", ()=> onPick(flip, card));
    grid.appendChild(flip);
  });
}

// ---------- Pick ----------
function onPick(flipEl, card){
  // günlük limit kontrol (kart seçimine başlamadan)
  if(isUsedToday(state.need)){
    toast("Evladım bugün bu açılıma zaten baktık. Fal dakika başı değişmez. Yarın gel.");
    return;
  }

  if(!state.ready){
    toast("Önce karıştır evladım.");
    return;
  }
  if(state.picked.length >= state.need){
    toast("Yeter evladım. Fazlası kafa karıştırır.");
    return;
  }
  if(state.used.has(card.id)) return;

  const posLabel = POS[state.need][state.picked.length] || `Kart ${state.picked.length+1}`;
  const rev = Math.random() < 0.38;

  state.used.add(card.id);
  state.picked.push({ card, rev, posLabel });

  const art = flipEl.querySelector("[data-art]");
  const title = flipEl.querySelector("[data-title]");
  const pos = flipEl.querySelector("[data-pos]");
  const revEl = flipEl.querySelector("[data-rev]");

  art.innerHTML = faceSVG(card, rev);
  title.textContent = card.name;
  pos.textContent = posLabel;
  revEl.textContent = rev ? "TERS" : "DÜZ";
  revEl.classList.toggle("rev", !!rev);

  flipEl.classList.add("flipped");
  flipEl.classList.add("disabled");

  renderPicked();

  if(state.picked.length === state.need){
    runReadingAndLock();
  }
}

// ---------- Controls ----------
function bindSpreads(){
  document.querySelectorAll("#spreads .seg").forEach(seg=>{
    seg.addEventListener("click", ()=>{
      document.querySelectorAll("#spreads .seg").forEach(x=>x.classList.remove("active"));
      seg.classList.add("active");
      state.need = parseInt(seg.getAttribute("data-n"),10);

      // yeni açılım seçince UI reset (ama limit kontrolü devam)
      resetUIOnly();
    });
  });
}

function bindButtons(){
  $("btnShuffle").addEventListener("click", async ()=>{
    if(isUsedToday(state.need)){
      toast("Evladım bugün bu açılımı yaptık. Fal sabit. Yarın gel 🙂");
      return;
    }
    state.ready = true;
    toast("Karıştırdım evladım. Seç bakalım.");
  });

  $("btnReset").addEventListener("click", resetUIOnly);
}

// ---------- Boot ----------
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
  buildDeckGrid();
  renderPicked();
  bindSpreads();
  bindButtons();

  // açılım başında günlük limit uyarısı (gösterme)
  if(isUsedToday(state.need)){
    toast("Bugün tek karta baktınsa, yarın gel evladım 🙂");
  }
});
