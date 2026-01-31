// FILE: /js/health_page.js
// DESIGN-FIRST DEMO (no real sensors yet)

import { STORAGE_KEY } from "/js/config.js";
import { initMenuHistoryUI } from "/js/menu_history_ui.js";

const $ = (id)=>document.getElementById(id);
function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }

function getUser(){
  return safeJson(localStorage.getItem(STORAGE_KEY), {});
}
function setUser(u){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(u||{}));
  localStorage.setItem("caynana_user_v1", JSON.stringify(u||{}));
}

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 1800);
}

function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

function syncSP(){
  const u = getUser();
  const s = clamp(parseInt(u?.sp_score ?? 10,10)||10, 0, 100);
  if($("ypFill")) $("ypFill").style.width = `${s}%`;
  if($("ypNum")) $("ypNum").textContent = `${s}/100`;
}

function setConn(connected){
  const pill = $("connPill");
  if(!pill) return;
  pill.textContent = connected ? "Bağlı (Demo)" : "Bağlı Değil";
  pill.style.borderColor = connected ? "rgba(190,242,100,.35)" : "rgba(255,255,255,.10)";
  pill.style.color = connected ? "rgba(190,242,100,.95)" : "rgba(255,255,255,.75)";
  pill.style.background = connected ? "rgba(190,242,100,.10)" : "rgba(255,255,255,.04)";
}

function fmtTime(d){
  if(!d) return "—";
  const dt = new Date(d);
  const hh = String(dt.getHours()).padStart(2,"0");
  const mm = String(dt.getMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}

function fmtDur(ms){
  if(!ms || ms<0) return "—";
  const m = Math.round(ms/60000);
  const h = Math.floor(m/60);
  const mm = m%60;
  return `${h}sa ${mm}dk`;
}

function updateCards(state){
  const steps = state.steps|0;
  const goal = state.goalSteps|0;
  $("vSteps").textContent = steps.toLocaleString("tr-TR");
  $("vGoalSteps").textContent = goal.toLocaleString("tr-TR");

  const distKm = (steps * 0.00075); // kaba
  $("vDist").textContent = `${distKm.toFixed(1)} km`;

  const cal = Math.round(steps * 0.04); // kaba
  $("vCal").textContent = `${cal} kcal`;

  const actMin = Math.round(steps / 200); // kaba
  $("vActMin").textContent = `${actMin} dk`;
  $("vActive").textContent = `${actMin} dk`;

  // sleep
  if(state.sleepOn){
    $("sleepState").textContent = "Kayıt Açık";
    $("sleepStart").textContent = fmtTime(state.sleepStart);
    $("sleepEnd").textContent = "—";
    $("sleepDur").textContent = fmtDur(Date.now() - state.sleepStart);
    $("vSleep").textContent = "Devam";
    $("btnSleepToggle").textContent = "UYKU KAYDINI DURDUR (Demo)";
  }else{
    $("sleepState").textContent = "Kapalı";
    $("sleepStart").textContent = fmtTime(state.sleepStartDone);
    $("sleepEnd").textContent = fmtTime(state.sleepEndDone);
    $("sleepDur").textContent = state.sleepDurDone ? fmtDur(state.sleepDurDone) : "—";
    $("vSleep").textContent = state.sleepDurDone ? fmtDur(state.sleepDurDone) : "—";
    $("btnSleepToggle").textContent = "UYKU KAYDINI BAŞLAT (Demo)";
  }

  // goals text
  $("goalStepsTxt").textContent = goal.toLocaleString("tr-TR");
  $("goalActiveTxt").textContent = String(state.goalActive|0);
  $("goalSleepTxt").textContent = String(state.goalSleep|0);
  $("vGoalActive").textContent = `${state.goalActive|0} dk`;
}

function loadState(){
  const u = getUser();
  const key = "caynana_health_state";
  const st = safeJson(localStorage.getItem(key), {});
  const out = {
    steps: st.steps ?? 0,
    goalSteps: st.goalSteps ?? 8000,
    goalActive: st.goalActive ?? 30,
    goalSleep: st.goalSleep ?? 7,
    connected: !!st.connected,

    sleepOn: !!st.sleepOn,
    sleepStart: st.sleepStart ?? null,

    sleepStartDone: st.sleepStartDone ?? null,
    sleepEndDone: st.sleepEndDone ?? null,
    sleepDurDone: st.sleepDurDone ?? null,

    // hr placeholders
    hr: st.hr ?? null
  };
  // plan chip UI
  if($("planChip")) $("planChip").textContent = String(u?.plan || "FREE").toUpperCase();
  return out;
}

function saveState(st){
  localStorage.setItem("caynana_health_state", JSON.stringify(st||{}));
}

function setTab(tab){
  document.querySelectorAll(".seg").forEach(el=>{
    el.classList.toggle("active", el.getAttribute("data-tab") === tab);
  });
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
  $("tab-" + tab)?.classList.add("active");
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

  syncSP();

  let st = loadState();
  setConn(st.connected);
  updateCards(st);

  // tabs
  document.querySelectorAll(".seg").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      setTab(btn.getAttribute("data-tab"));
    });
  });

  $("btnMockWalk")?.addEventListener("click", ()=>{
    st.steps = (st.steps|0) + 500;
    saveState(st);
    updateCards(st);
    toast("+500 adım (demo)");
  });

  $("btnSleepToggle")?.addEventListener("click", ()=>{
    if(!st.sleepOn){
      st.sleepOn = true;
      st.sleepStart = Date.now();
      saveState(st);
      updateCards(st);
      toast("Uyku kaydı başladı (demo)");
    }else{
      st.sleepOn = false;
      const end = Date.now();
      st.sleepStartDone = st.sleepStart;
      st.sleepEndDone = end;
      st.sleepDurDone = end - st.sleepStart;
      st.sleepStart = null;
      saveState(st);
      updateCards(st);
      toast("Uyku kaydı bitti (demo)");
    }
  });

  $("btnGoalPreset")?.addEventListener("click", ()=>{
    st.goalSteps = 10000;
    st.goalActive = 45;
    st.goalSleep = 8;
    saveState(st);
    updateCards(st);
    toast("Hedefler güncellendi (demo)");
  });

  $("btnConnectMock")?.addEventListener("click", ()=>{
    st.connected = !st.connected;
    saveState(st);
    setConn(st.connected);
    toast(st.connected ? "Bağlandı (demo)" : "Bağlantı kapalı (demo)");
  });
});
