// FILE: /js/tarot_page.js
// DESIGN-FIRST: spread selection + shuffle + pick cards + thinking + long reading
// (Motor later: backend + AI)

import { initMenuHistoryUI } from "/js/menu_history_ui.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);
function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2100);
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

const MAJOR = [
  { n:"Deli (0)", k:["başlangıç","cesaret","risk"], u:"Yeni bir sayfa açılıyor. Cesaret et.", r:"Acelecilik ve dağınıklık. Ayağını yere bas." },
  { n:"Büyücü (I)", k:["niyet","beceri","fırsat"], u:"Elindeki imkanlar yeter. Başlat.", r:"Kendini kandırma. Planı netleştir." },
  { n:"Başrahibe (II)", k:["sezgi","sır","sabır"], u:"İç sesin doğru söylüyor. Biraz sus, dinle.", r:"Kuruntuya kapılma. Kanıt ara." },
  { n:"İmparatoriçe (III)", k:["bereket","şefkat","üretim"], u:"Bereket var. Üret, büyüt.", r:"Aşırı konfor, tembellik." },
  { n:"İmparator (IV)", k:["düzen","otorite","sınır"], u:"Düzen kur. Sınır koy.", r:"Kontrolcülük, inat." },
  { n:"Aziz (V)", k:["gelenek","öğüt","kural"], u:"Bir büyüğün sözü işe yarar. Kurala uy.", r:"Körü körüne inanma. Sorgula." },
  { n:"Aşıklar (VI)", k:["seçim","uyum","bağ"], u:"Bir seçim var. Kalbini ve aklını aynı yere koy.", r:"Kararsızlık, ikilem." },
  { n:"Savaş Arabası (VII)", k:["irade","zafer","hız"], u:"Gazı ver. Disiplinle kazanırsın.", r:"Dağılma. Hırsın gözünü kör etmesin." },
  { n:"Güç (VIII)", k:["sabır","yumuşak güç","özdenetim"], u:"Sertlik değil; sabırla çöz.", r:"Öfke, kontrol kaybı." },
  { n:"Ermiş (IX)", k:["içgörü","yalnızlık","bilgelik"], u:"Bir adım geri çekil. Netleşince dön.", r:"İçe kapanma, kopma." },
  { n:"Kader Çarkı (X)", k:["dönüm","şans","döngü"], u:"Dönüm noktası. Şans kapıda.", r:"Aynı hatayı tekrar etme." },
  { n:"Adalet (XI)", k:["denge","hak","sonuç"], u:"Ne ektiysen onu biçersin. Dürüst ol.", r:"Haksızlık, dengesizlik." },
  { n:"Asılan Adam (XII)", k:["bekleme","fedakârlık","bakış açısı"], u:"Bekle. Farklı açıdan bak.", r:"Boşa fedakârlık, kurban psikolojisi." },
  { n:"Ölüm (XIII)", k:["bitış","dönüşüm","yenilenme"], u:"Kapanış var ama hayırlı. Yenisi gelecek.", r:"Değişimden kaçma." },
  { n:"Denge (XIV)", k:["ölçü","şifa","uyum"], u:"Orta yolu bul. Şifa var.", r:"Aşırılık, dengesizlik." },
  { n:"Şeytan (XV)", k:["bağımlılık","tutku","bağ"], u:"Tutku yüksek ama zinciri gör.", r:"Saplantı, kaçış." },
  { n:"Kule (XVI)", k:["sarsıntı","gerçek","temizlenme"], u:"Sarsar ama temizler. Gerçek ortaya çıkar.", r:"Direnme. Ders çıkar." },
  { n:"Yıldız (XVII)", k:["umut","ilham","ferahlık"], u:"Umut var. Ferahlık geliyor.", r:"Umudu erteleme; adım at." },
  { n:"Ay (XVIII)", k:["belirsizlik","rüya","korku"], u:"Her şey net değil. Korkunu büyütme.", r:"Yanılsama. Gerçeği kontrol et." },
  { n:"Güneş (XIX)", k:["neşe","başarı","açıklık"], u:"Aydınlık. Başarı ve rahatlama.", r:"Ego şişmesi. Payını bil." },
  { n:"Mahkeme (XX)", k:["uyanış","karar","çağrı"], u:"Karar ver. Eski dosya kapanıyor.", r:"Erteleme. Çağrıya kulak ver." },
  { n:"Dünya (XXI)", k:["tamamlama","ödül","sonuç"], u:"Tamamlanma. Emek karşılığı geliyor.", r:"Bitirmeden bırakma." },
];

const POS = {
  1:["Günlük mesaj"],
  3:["Geçmiş","Şimdi","Gelecek"],
  5:["Durum","Engel","Tavsiye","Dış Etki","Sonuç"]
};

const state = {
  need: 1,
  ready: false,
  picked: [], // {card, rev, posLabel}
  used: new Set()
};

function setPill(text, good=true){
  const p = $("statePill");
  if(!p) return;
  p.textContent = text;
  p.style.borderColor = good ? "rgba(190,242,100,.25)" : "rgba(255,82,82,.25)";
  p.style.background  = good ? "rgba(190,242,100,.10)" : "rgba(255,82,82,.10)";
  p.style.color       = good ? "rgba(190,242,100,.95)" : "rgba(255,82,82,.95)";
}

function renderNeed(){
  $("needTxt").textContent = `Seçilecek: ${state.need} kart`;
}

function buildGrid(){
  const grid = $("grid");
  grid.innerHTML = "";
  // 16 kart arka yüz gösterelim (tasarım için yeter)
  for(let i=0;i<16;i++){
    const d = document.createElement("div");
    d.className = "card-back";
    d.dataset.idx = String(i);
    d.title = "Kart seç";
    d.addEventListener("click", ()=> onPick(d));
    grid.appendChild(d);
  }
}

function renderPicked(){
  const box = $("picked");
  box.innerHTML = "";
  state.picked.forEach((p,i)=>{
    const div = document.createElement("div");
    div.className = "picked-card";
    div.innerHTML = `
      <div class="picked-title">${p.posLabel}</div>
      <div class="picked-title" style="margin-top:6px;opacity:.92;">${p.card.n}</div>
      <div class="picked-tag ${p.rev?"rev":""}">${p.rev ? "TERS" : "DÜZ"}</div>
    `;
    box.appendChild(div);
  });
}

function resetAll(){
  state.ready = false;
  state.picked = [];
  state.used = new Set();
  $("resultBox").classList.remove("show");
  $("resultBox").innerHTML = "";
  buildGrid();
  renderPicked();
  setPill("Hazır", true);
  toast("Sıfırlandı evladım.");
}

function chooseRandomCard(){
  // tekrarsız
  for(let t=0;t<200;t++){
    const idx = Math.floor(Math.random()*MAJOR.length);
    const card = MAJOR[idx];
    if(!state.used.has(card.n)){
      state.used.add(card.n);
      return card;
    }
  }
  // fallback
  return MAJOR[Math.floor(Math.random()*MAJOR.length)];
}

function disableGrid(){
  document.querySelectorAll(".card-back").forEach(el=>{
    el.classList.add("disabled");
  });
}
function enableGrid(){
  document.querySelectorAll(".card-back").forEach(el=>{
    el.classList.remove("disabled");
    el.classList.remove("selected");
  });
}

function showThinking(on){
  $("thinking").classList.toggle("show", !!on);
}

function makeLongReading(){
  const lines = [];
  lines.push(`<b>Evladım…</b> açılımını okudum. Şimdi “kaynana gibi” net konuşacağım.`);
  lines.push(`<br><br><b>Seçimlerin:</b>`);
  state.picked.forEach(p=>{
    const txt = p.rev ? p.card.r : p.card.u;
    lines.push(`<br>• <b>${p.posLabel}:</b> ${p.card.n} (${p.rev?"ters":"düz"}) — ${txt}`);
  });

  lines.push(`<br><br><b>Özet:</b>`);
  const revCount = state.picked.filter(x=>x.rev).length;
  if(revCount>=Math.ceil(state.need/2)){
    lines.push(`Biraz ters enerji var. Yani “inat etme, düzelt” diyor kartlar. Sabır, ölçü ve plan şart.`);
  }else{
    lines.push(`Genel enerji iyi. Doğru adımı atarsan işin açılır. Ama “şımarmak yok” 🙂`);
  }

  lines.push(`<br><br><b>Kaynana tavsiyesi:</b>`);
  lines.push(`Bugün tek bir hedef seç. Bitir. Sonra ikinciye geç. Kartlar “dağılma” diyor.`);

  lines.push(`<br><br><b>Kapanış:</b>`);
  lines.push(`Neyse halin çıksın falın… ama ben sende toparlanma görüyorum evladım.`);

  return lines.join("");
}

async function runReading(){
  showThinking(true);
  await new Promise(r=>setTimeout(r, 7000)); // 7 saniye düşünme
  showThinking(false);

  const box = $("resultBox");
  box.innerHTML = makeLongReading();
  box.classList.add("show");
}

function onPick(el){
  if(!state.ready){
    toast("Önce karıştır evladım.");
    return;
  }
  if(state.picked.length >= state.need){
    toast("Yeter evladım. Fazlası kafa karıştırır.");
    return;
  }

  // kart seç
  const card = chooseRandomCard();
  const rev = Math.random() < 0.35; // %35 ters
  const posLabel = POS[state.need][state.picked.length] || `Kart ${state.picked.length+1}`;

  state.picked.push({ card, rev, posLabel });

  // UI
  el.classList.add("selected");
  el.classList.add("disabled");
  renderPicked();

  if(state.picked.length === state.need){
    setPill("Okunuyor…", true);
    disableGrid();
    runReading();
  }
}

function bindSpreads(){
  document.querySelectorAll("#spreads .seg").forEach(seg=>{
    seg.addEventListener("click", ()=>{
      document.querySelectorAll("#spreads .seg").forEach(x=>x.classList.remove("active"));
      seg.classList.add("active");
      state.need = parseInt(seg.getAttribute("data-n"),10);
      renderNeed();
      resetAll();
    });
  });
}

function bindButtons(){
  $("btnShuffle").addEventListener("click", ()=>{
    state.ready = true;
    setPill("Karıştı", true);
    enableGrid();
    toast("Karıştırdım evladım. Seç bakalım.");
  });
  $("btnReset").addEventListener("click", resetAll);
}

document.addEventListener("DOMContentLoaded", ()=>{
  // login guard
  const token = (localStorage.getItem("google_id_token") || "").trim();
  if(!token){ location.href="/index.html"; return; }

  // menu + hamburger
  try{ initMenuHistoryUI(); }catch{}
  $("hambBtn")?.addEventListener("click", ()=> $("menuOverlay")?.classList.add("open"));
  $("menuOverlay")?.addEventListener("click", (e)=>{
    const sidebar = e.currentTarget?.querySelector?.(".menu-sidebar");
    if(sidebar && sidebar.contains(e.target)) return;
    e.currentTarget.classList.remove("open");
  });

  syncTopUI();
  buildGrid();
  bindSpreads();
  bindButtons();
  renderNeed();
  setPill("Hazır", true);

  // deck pile küçük animasyon hissi
  $("deckPile").addEventListener("click", ()=>{
    toast("Karıştır butonuna bas evladım 🙂");
  });
});
