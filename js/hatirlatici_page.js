// FILE: /js/hatirlatici_page.js
// Hatırlatıcı: custom reminders + profile-based specials (read-only import)
// ✅ NEW: repeat (once/daily/weekdays/weekly)
// ✅ Demo notifier: page open -> checks every 20s, shows toast at time

import { STORAGE_KEY } from "/js/config.js";
import { initMenuHistoryUI } from "/js/menu_history_ui.js";

const $ = (id)=>document.getElementById(id);

function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function setJson(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

function toast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2600);
}

function getUser(){
  const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
  return u && Object.keys(u).length ? u : safeJson(localStorage.getItem("caynana_user_v1"), {});
}

function userKey(){
  const u = getUser();
  const uid = String(u.user_id || u.id || u.email || "guest").toLowerCase().trim();
  return uid || "guest";
}

function storeKey(){
  return `caynana_reminders:${userKey()}`;
}

function loadReminders(){
  return safeJson(localStorage.getItem(storeKey()), []);
}
function saveReminders(arr){
  setJson(storeKey(), arr || []);
}

// --------- profile specials (read only) ----------
function profileSpecials(profile){
  const items = [];
  const push = (title, date)=>{
    if(!date) return;
    items.push({ title, date, time:"09:00", type:"profile", source:"profile", repeat:"yearly" });
  };

  push("Eş Doğum Günü", profile.spouse_birth_date || profile.spouseBirthday || profile.spouse_birthday);
  push("Evlilik Yıldönümü", profile.wedding_anniversary || profile.weddingAnniversary || profile.evlilik_yildonumu);
  push("Nişan Yıldönümü", profile.engagement_anniversary || profile.engagementAnniversary || profile.nisan_yildonumu);

  const c1 = profile.child_birth_dates || profile.childBirthDates || profile.children_birthdays || profile.childBirthdays;
  if(Array.isArray(c1)){
    c1.forEach((d,i)=> push(`Çocuk ${i+1} Doğum Günü`, d));
  }else if(c1 && typeof c1 === "object"){
    Object.entries(c1).forEach(([k,v])=> push(`${k} Doğum Günü`, v));
  }else if(typeof c1 === "string" && c1.trim()){
    push("Çocuk Doğum Günü", c1.trim());
  }

  const s = profile.special_days || profile.specialDays;
  if(Array.isArray(s)){
    s.forEach((x)=>{
      if(x && typeof x === "object"){
        push(x.title || "Özel Gün", x.date || x.when);
      }
    });
  }

  return items;
}

// --------- helpers ----------
function pad2(n){ return String(n).padStart(2,"0"); }
function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function nowHM(){
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function weekday(d=new Date()){
  // 0=Sun..6=Sat
  return d.getDay();
}
function fmt(date, time){
  const d = String(date||"").trim();
  const t = String(time||"").trim();
  return (d ? d : "—") + (t ? ` • ${t}` : "");
}
function repeatLabel(rep){
  const m = {
    once: "Tek sefer",
    daily: "Her gün",
    weekdays: "Hafta içi",
    weekly: "Haftalık",
    yearly: "Yıllık"
  };
  return m[rep] || rep || "Tek sefer";
}

// --------- render ----------
function render(){
  const box = $("list");
  const profile = getUser();
  const customs = loadReminders();
  const prof = profileSpecials(profile);

  const all = [
    ...prof.map(x => ({ ...x, id:`p:${x.title}:${x.date}`, readonly:true })),
    ...customs
  ];

  // sort: date/time (for display)
  all.sort((a,b)=> (String(a.date)+String(a.time)).localeCompare(String(b.date)+String(b.time)));

  if(!all.length){
    box.innerHTML = `<div style="font-weight:900;color:rgba(255,255,255,.70);">Henüz hatırlatıcı yok evladım 🙂</div>`;
    return;
  }

  box.innerHTML = all.map(it=>{
    const tags = [];
    tags.push(it.source === "profile" ? `<div class="tag sys">PROFİL</div>` : `<div class="tag user">SENİN</div>`);
    tags.push(`<div class="tag rep">🔁 ${repeatLabel(it.repeat)}</div>`);

    const delBtn = it.readonly ? "" : `<div class="del" data-del="${it.id}">×</div>`;

    return `
      <div class="item">
        <div class="l">
          <div class="t1">${it.title}</div>
          <div class="t2">${fmt(it.date, it.time)}</div>
          <div class="tags">${tags.join("")}</div>
        </div>
        ${delBtn}
      </div>
    `;
  }).join("");

  box.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-del");
      const arr = loadReminders().filter(x => String(x.id) !== String(id));
      saveReminders(arr);
      toast("Sildim evladım.");
      render();
    });
  });
}

// --------- add ----------
function add(){
  const title = String($("title").value||"").trim();
  const date = String($("date").value||"").trim();
  const time = String($("time").value||"").trim();
  const type = String($("type").value||"custom").trim();
  const repeat = String($("repeat").value||"once").trim();

  if(!title) return toast("Evladım başlık yaz.");
  if(!time) return toast("Evladım saat seç. İlaç saati şakaya gelmez 🙂");

  // repeat=once ise tarih şart; repeat!=once ise tarih opsiyonel (başlangıç tarihi)
  if(repeat === "once" && !date) return toast("Tek sefer için tarih seç evladım.");
  const useDate = date || todayISO();

  const id = "r_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const arr = loadReminders();
  arr.unshift({ id, title, date: useDate, time, type, source:"custom", repeat });

  saveReminders(arr);

  $("title").value = "";
  toast("Eklendi evladım.");
  render();
}

// --------- notifier (demo) ----------
function shouldFire(item, nowDate, nowTime){
  const rep = item.repeat || "once";

  if(rep === "once"){
    return item.date === nowDate && item.time === nowTime;
  }
  if(rep === "daily"){
    return item.time === nowTime;
  }
  if(rep === "weekdays"){
    const wd = weekday();
    const isWeekday = wd >= 1 && wd <= 5;
    return isWeekday && item.time === nowTime;
  }
  if(rep === "weekly"){
    // weekly: same weekday as item's date
    const base = new Date(item.date + "T00:00:00");
    const wd0 = base.getDay();
    return weekday() === wd0 && item.time === nowTime;
  }
  if(rep === "yearly"){
    // match month-day
    const mdNow = nowDate.slice(5);
    const mdIt = String(item.date||"").slice(5);
    return mdIt === mdNow && item.time === nowTime;
  }
  return false;
}

function firedKey(uid, itemId, nowDate, nowTime){
  return `caynana_rem_fired:${uid}:${itemId}:${nowDate}:${nowTime}`;
}

function startNotifier(){
  const uid = userKey();

  setInterval(()=>{
    const nowDate = todayISO();
    const nowTime = nowHM();

    const profile = getUser();
    const customs = loadReminders();
    const prof = profileSpecials(profile).map(x => ({ ...x, id:`p:${x.title}:${x.date}`, readonly:true }));

    const all = [...prof, ...customs];

    all.forEach(it=>{
      if(!it.time) return;
      if(!shouldFire(it, nowDate, nowTime)) return;

      const k = firedKey(uid, it.id, nowDate, nowTime);
      if(localStorage.getItem(k) === "1") return;

      localStorage.setItem(k, "1");
      toast(`⏰ ${it.title} (${it.time})`);
    });
  }, 20000);
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

  $("add")?.addEventListener("click", add);
  $("goProfile")?.addEventListener("click", ()=> location.href="/pages/profil.html");

  // Defaults: date today
  try{ $("date").value = todayISO(); }catch{}

  render();
  startNotifier();
});
