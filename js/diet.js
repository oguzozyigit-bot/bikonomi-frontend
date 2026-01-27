import { BASE_DOMAIN, STORAGE_KEY } from "/js/config.js";

const DIET_ENDPOINT = "/api/diet/today";
const $ = (id) => document.getElementById(id);

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function norm(s){ return String(s || "").trim(); }

function trDayName(d = new Date()){
  const days = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
  return days[d.getDay()];
}

function todayStr(){
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}

function setChip(el, text, kind=""){
  if(!el) return;
  el.classList.remove("ok","warn","bad");
  if(kind) el.classList.add(kind);
  el.textContent = text;
}

function statusKind(status=""){
  const s = String(status||"").toLowerCase();
  if(s.includes("normal")) return "ok";
  if(s.includes("kilolu")) return "warn";
  if(s.includes("obez")) return "bad";
  return "";
}

function buildShareText(data){
  const day = `${trDayName()} • ${todayStr()}`;
  const bmi = data?.bmi != null ? String(data.bmi) : "—";
  const st = data?.status || "—";
  const plan = data?.plan || {};

  const lines = [
    `🍽️ Diyet Menüsü (${day})`,
    `VKİ: ${bmi} | Durum: ${st}`,
    "",
    `Kahvaltı: ${plan.kahvalti || "-"}`,
    `Ara Öğün: ${plan.ara || "-"}`,
    `Öğle: ${plan.ogle || "-"}`,
    `Akşam: ${plan.aksam || "-"}`,
    "",
    "@CaynanaAI"
  ];
  return lines.join("\n");
}

function renderMeals(plan){
  const grid = $("mealsGrid");
  if(!grid) return;
  grid.innerHTML = "";

  const items = [
    { key:"kahvalti", title:"Kahvaltı", icon:"🥣" },
    { key:"ara",      title:"Ara Öğün", icon:"🍎" },
    { key:"ogle",     title:"Öğle",     icon:"🍽️" },
    { key:"aksam",    title:"Akşam",    icon:"🌙" },
  ];

  items.forEach(it=>{
    const div = document.createElement("div");
    div.className = "meal";
    div.innerHTML = `
      <div class="meal-head">
        <div class="mttl">${it.icon} ${it.title}</div>
      </div>
      <div class="meal-body">${(plan?.[it.key] || "—").trim()}</div>
    `;
    grid.appendChild(div);
  });
}

function renderPrint(plan, meta){
  const printGrid = $("printGrid");
  if(!printGrid) return;
  printGrid.innerHTML = "";

  const items = [
    { key:"kahvalti", title:"Kahvaltı" },
    { key:"ara",      title:"Ara Öğün" },
    { key:"ogle",     title:"Öğle" },
    { key:"aksam",    title:"Akşam" },
  ];

  items.forEach(it=>{
    const b = document.createElement("div");
    b.className = "print-box";
    b.innerHTML = `
      <div class="h">${it.title}</div>
      <div class="b">${(plan?.[it.key] || "—").trim()}</div>
    `;
    printGrid.appendChild(b);
  });

  const bmi = meta?.bmi != null ? `VKİ: ${meta.bmi}` : "VKİ: —";
  const st  = meta?.status ? `Durum: ${meta.status}` : "Durum: —";
  const dt  = meta?.date ? `Tarih: ${meta.date}` : `Tarih: ${todayStr()}`;

  $("printBmi").textContent = bmi;
  $("printStatus").textContent = st;
  $("printDate").textContent = dt;
  $("printDayLine").textContent = `${trDayName()} • ${todayStr()}`;

  const kind = statusKind(meta?.status || "");
  ["printBmi","printStatus","printDate"].forEach(id=>{
    const el = $(id);
    if(el){
      el.classList.remove("ok","warn","bad");
      if(kind) el.classList.add(kind);
    }
  });
}

// ✅ DÜZELTİLEN FONKSİYON BURADA
function scheduleMidnightRefresh(){
  // TR saatinde gece 00:00 sonrası otomatik yenile
  // Not: Kullanıcı sayfada kaldığı sürece çalışır.

  // TR saatini JS içinde yakalamak için Intl kullanıyoruz
  const getTrNow = () => {
    // "Europe/Istanbul" timezone desteği modern tarayıcılarda var
    const parts = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false
    }).formatToParts(new Date());

    const map = {};
    for(const p of parts) map[p.type] = p.value;
    // map: {year, month, day, hour, minute, second}
    // formatToParts string döndürür, Date constructor için uygun formata çeviriyoruz
    return new Date(`${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`);
  };

  const scheduleNext = () => {
    const trNow = getTrNow();

    // Bir sonraki TR 00:00:05’e kur (00:00 tamında olası yarışları azaltır)
    const next = new Date(trNow);
    next.setHours(24, 0, 5, 0);

    const ms = Math.max(1000, next.getTime() - trNow.getTime());

    // Önceki timer varsa temizle
    if(window.__DIET_MIDNIGHT_TIMER__) clearTimeout(window.__DIET_MIDNIGHT_TIMER__);

    window.__DIET_MIDNIGHT_TIMER__ = setTimeout(async () => {
      try{
        // NOT: fetchDiet() fonksiyonunun bu dosyanın erişebileceği bir yerde (örneğin yukarıda veya import edilerek) tanımlı olması gerekir.
        if (typeof fetchDiet === 'function') {
            await fetchDiet();
        } else {
            console.warn("fetchDiet fonksiyonu bulunamadı, yenileme yapılamadı.");
        }
      }catch(e){
        // sessiz
      }finally{
        // bir sonraki geceye tekrar kur
        scheduleNext();
      }
    }, ms);
  };

  scheduleNext();
}
