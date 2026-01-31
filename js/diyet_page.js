// FILE: /js/diyet_page.js
// FINAL - Only middle module logic (bars untouched)

import { BASE_DOMAIN, STORAGE_KEY } from "/js/config.js";
import { initMenuHistoryUI } from "/js/menu_history_ui.js";

const DIET_API = "/api/diet/today";
const $ = (id) => document.getElementById(id);

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function baseUrl(){ return (BASE_DOMAIN || "").replace(/\/+$/, ""); }
function todayStr(){ return new Date().toISOString().split("T")[0]; }
function pad2(n){ return String(n).padStart(2,"0"); }

function getUserLocal(){
  const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
  return u && Object.keys(u).length ? u : safeJson(localStorage.getItem("caynana_user_v1"), {});
}
function setUserLocal(obj){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  localStorage.setItem("caynana_user_v1", JSON.stringify(obj));
}
function getUserId(){
  const u = getUserLocal();
  return (u.user_id || u.id || u.email || "guest");
}

function show(elId){
  $("profileSetup").style.display = "none";
  $("dietDashboard").style.display = "none";
  $(elId).style.display = "block";
}

function showNotif(){
  const n = $("dietNotif");
  if(!n) return;
  n.style.display = "block";
  setTimeout(()=> n.style.display="none", 4500);
}

async function postDiet(payload){
  const res = await fetch(`${baseUrl()}${DIET_API}`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  });
  const txt = await res.text().catch(()=> "");
  let data = {};
  try{ data = JSON.parse(txt || "{}"); }catch{}
  return data;
}

function daysInMonth(year, month){
  return new Date(Number(year), Number(month), 0).getDate();
}

function buildDobOptions(){
  const yearSel = $("dobYear");
  const monthSel = $("dobMonth");
  const daySel = $("dobDay");
  if(!yearSel || !monthSel || !daySel) return;

  const nowY = new Date().getFullYear();
  const minY = nowY - 90;
  const maxY = nowY - 10;

  yearSel.innerHTML = `<option value="">Yıl</option>`;
  for(let y=maxY; y>=minY; y--){
    yearSel.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`);
  }

  monthSel.innerHTML = `<option value="">Ay</option>`;
  for(let m=1; m<=12; m++){
    monthSel.insertAdjacentHTML("beforeend", `<option value="${m}">${pad2(m)}</option>`);
  }

  function refreshDays(){
    const y = yearSel.value || maxY;
    const m = monthSel.value || 1;
    const maxD = daysInMonth(y, m);
    const prev = daySel.value;

    daySel.innerHTML = `<option value="">Gün</option>`;
    for(let d=1; d<=maxD; d++){
      daySel.insertAdjacentHTML("beforeend", `<option value="${d}">${pad2(d)}</option>`);
    }
    if(prev && Number(prev) <= maxD) daySel.value = prev;
  }

  yearSel.addEventListener("change", refreshDays);
  monthSel.addEventListener("change", refreshDays);
  refreshDays();
}

function getDobFromSelects(){
  const y = $("dobYear")?.value;
  const m = $("dobMonth")?.value;
  const d = $("dobDay")?.value;
  if(!y || !m || !d) return "";
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function setDobSelectsFromISO(iso){
  try{
    const [y,m,d] = String(iso||"").split("-");
    if(y) $("dobYear").value = y;
    if(m) $("dobMonth").value = String(Number(m));
    $("dobMonth").dispatchEvent(new Event("change"));
    if(d) $("dobDay").value = String(Number(d));
  }catch{}
}

function bmiLabelAndTalk(bmi){
  const v = Number(bmi);
  if(v >= 30) return { cls:"bad", label:"OBEZ", talk:"<b>Obezsin evladım.</b> Her gün sana ne yemen lazım onu vereceğim." };
  if(v >= 25) return { cls:"warn", label:"KİLOLU", talk:"<b>Kilolusun evladım.</b> Düzenli gidersen toparlarız. Her gün menü vereceğim." };
  if(v < 18.5) return { cls:"warn", label:"ZAYIF", talk:"<b>Zayıfsın evladım.</b> Sağlıklı toparlayalım. Her gün menü vereceğim." };
  return { cls:"ok", label:"NORMAL", talk:"<b>Normalsin evladım.</b> Formu koruyalım. Her gün menü vereceğim." };
}

function calculateAndShowBMI(u){
  const h = Number(u.height_cm)/100;
  const w = Number(u.weight_kg);
  const bmi = (w/(h*h)).toFixed(1);

  $("bmiVal").textContent = bmi;

  const meta = bmiLabelAndTalk(bmi);
  const st = $("bmiStatus");
  st.className = `bmi-status ${meta.cls}`;
  st.textContent = meta.label;

  $("bmiTalk").innerHTML = meta.talk;

  const circle = $("bmiCircle");
  const maxVal = 40;
  const dash = 175;
  const offset = dash - ((Math.min(Number(bmi), maxVal)/maxVal)*dash);
  setTimeout(()=>{
    circle.style.strokeDashoffset = offset;
    circle.style.stroke = (meta.cls==="bad") ? "var(--red)" : (meta.cls==="warn" ? "var(--gold)" : "var(--pistachio)");
  }, 40);

  return bmi;
}

function extractCalories(text) {
  const m = String(text || "").match(/\((\s*\d+\s*(?:-\s*\d+)?\s*kcal)\s*\)/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}
function cleanText(text) {
  return String(text || "").replace(/\(\s*\d+\s*(?:-\s*\d+)?\s*kcal\s*\)/ig, "").trim();
}
function currentMealStartIndex(){
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return 0;
  if (h >= 10 && h < 12) return 1;
  if (h >= 12 && h < 16) return 2;
  if (h >= 16 && h < 18) return 3;
  if (h >= 18 && h < 22) return 4;
  return 5;
}

function renderMeals(plan){
  const list = $("mealList");
  list.innerHTML = "";

  const start = currentMealStartIndex();
  const items = [
    { k:"kahvalti", t:"Kahvaltı", i:"🍳", cal:"350-400 kcal", time:"08:30" },
    { k:"ara",      t:"Ara Öğün", i:"🍏", cal:"100-150 kcal", time:"11:00" },
    { k:"ogle",     t:"Öğle",     i:"🥗", cal:"450-500 kcal", time:"13:30" },
    { k:"ara2",     t:"Ara Öğün", i:"🍏", cal:"100-150 kcal", time:"16:30" },
    { k:"aksam",    t:"Akşam",    i:"🌙", cal:"300-350 kcal", time:"19:30" },
    { k:"su",       t:"Su",       i:"💧", cal:"0 kcal",       time:"Gün boyu" }
  ];

  items.slice(start).forEach(item=>{
    let val = "—";
    if (item.k === "ara" || item.k === "ara2") {
      val = plan?.ara_ogun || plan?.ara || "—";
    } else {
      val = plan?.[item.k] || plan?.[item.k + "_ogun"] || "—";
    }

    const cal = extractCalories(val);
    val = cleanText(val);

    const html = `
      <div class="meal-card">
        <div class="meal-icon">${item.i}</div>
        <div style="flex:1">
          <div class="meal-name">${item.t}</div>
          <div class="meal-desc">${val}</div>
          <div class="meal-meta">
            <span class="time">${item.time}</span>
            <span class="cal">${cal ? cal : item.cal}</span>
          </div>
        </div>
      </div>
    `;
    list.insertAdjacentHTML("beforeend", html);
  });
}

function scheduleDailyRefresh(runFn){
  const now = new Date();
  const target = new Date();
  target.setHours(6,0,0,0);
  if(now > target) target.setDate(target.getDate()+1);

  const ms = target - now;
  setTimeout(async ()=>{
    localStorage.removeItem("caynana_last_diet");
    await runFn();
    scheduleDailyRefresh(runFn);
  }, ms);
}

async function runAutoDietFetch(){
  try{
    const userId = getUserId();
    const today = todayStr();
    const data = await postDiet({ user_id: userId, date: today });
    if(data?.ok){
      data.date = today;
      localStorage.setItem("caynana_last_diet", JSON.stringify(data));
      renderMeals(data.plan);
      showNotif();
    }
  }catch{}
}

function syncSPChipFromLocal(){
  // sadece UI: sp_score varsa 0-100
  try{
    const u = getUserLocal();
    const s = Math.max(0, Math.min(100, parseInt(u.sp_score ?? 10, 10) || 10));
    const fill = $("ypFill");
    const num  = $("ypNum");
    if(fill) fill.style.width = `${s}%`;
    if(num)  num.textContent = `${s}/100`;
  }catch{}
}

document.addEventListener("DOMContentLoaded", async ()=>{
  // login guard
  const token = (localStorage.getItem("google_id_token") || "").trim();
  if(!token){
    location.href = "/index.html";
    return;
  }

  // menü render
  try { initMenuHistoryUI(); } catch {}

  // hamburger
  $("hambBtn")?.addEventListener("click", ()=> $("menuOverlay")?.classList.add("open"));
  $("menuOverlay")?.addEventListener("click", (e)=>{
    const sidebar = e.currentTarget?.querySelector?.(".menu-sidebar");
    if(sidebar && sidebar.contains(e.target)) return;
    e.currentTarget.classList.remove("open");
  });

  // SP chip
  syncSPChipFromLocal();

  // DOB dropdown
  buildDobOptions();

  const u = getUserLocal();

  // doldur
  if(u?.height_cm) $("inpHeight").value = u.height_cm;
  if(u?.weight_kg) $("inpWeight").value = u.weight_kg;
  if(u?.gender) $("inpGender").value = u.gender;
  if(u?.birth_date) setDobSelectsFromISO(u.birth_date);

  // kilitle (dob+gender varsa)
  const hasDob = !!u?.birth_date;
  const hasGender = !!u?.gender;
  $("dobYear").disabled = hasDob;
  $("dobMonth").disabled = hasDob;
  $("dobDay").disabled = hasDob;
  $("inpGender").disabled = hasGender;

  const isComplete = u.height_cm && u.weight_kg && u.birth_date && u.gender;

  if(!isComplete){
    show("profileSetup");
  }else{
    show("dietDashboard");
    calculateAndShowBMI(u);

    const today = todayStr();
    const lastDiet = safeJson(localStorage.getItem("caynana_last_diet"), {});
    if(lastDiet && lastDiet.ok && lastDiet.date === today){
      renderMeals(lastDiet.plan);
    }else{
      await runAutoDietFetch();
    }
  }

  scheduleDailyRefresh(runAutoDietFetch);

  $("btnCalc").onclick = async ()=>{
    const h = $("inpHeight").value;
    const w = $("inpWeight").value;
    if(!h || !w) return alert("Boy ve kiloyu gir evladım.");

    const userId = getUserId();
    const payload = { user_id: userId, height_cm: Number(h), weight_kg: Number(w), date: todayStr() };

    // DOB sadece yoksa al
    if(!u.birth_date){
      const dob = getDobFromSelects();
      if(!dob) return alert("Doğum tarihini seç evladım.");
      payload.birth_date = dob;
    }
    // Gender sadece yoksa al
    if(!u.gender){
      const g = $("inpGender").value;
      if(!g) return alert("Cinsiyet seç evladım.");
      payload.gender = g;
    }

    // local güncelle
    const updated = { ...u, ...payload };
    delete updated.date;
    setUserLocal(updated);

    try{
      const data = await postDiet(payload);
      if(data?.ok){
        data.date = todayStr();
        localStorage.setItem("caynana_last_diet", JSON.stringify(data));
        show("dietDashboard");
        calculateAndShowBMI(updated);
        renderMeals(data.plan);
        showNotif();
      }else{
        alert(data?.message || "Hata oluştu.");
      }
    }catch{
      alert("Bağlantı hatası evladım.");
    }
  };

  $("btnGenerate").onclick = async ()=>{
    const btn = $("btnGenerate");
    const old = btn.textContent;
    btn.textContent = "Hazırlanıyor...";
    btn.disabled = true;

    const userId = getUserId();
    try{
      const data = await postDiet({ user_id: userId, date: todayStr() });
      if(data?.ok){
        data.date = todayStr();
        localStorage.setItem("caynana_last_diet", JSON.stringify(data));
        renderMeals(data.plan);
        showNotif();
      }else{
        alert("Menü çıkmadı evladım: " + (data?.message || "Bilinmiyor"));
      }
    }catch{
      alert("Bağlantı hatası evladım.");
    }finally{
      btn.disabled = false;
      btn.textContent = old;
    }
  };
});
