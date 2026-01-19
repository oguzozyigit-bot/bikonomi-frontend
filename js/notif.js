// js/notif.js
import { BASE_DOMAIN, STORAGE_KEY } from "./config.js";

function escapeHtml(s=""){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function iconFor(type){
  if(type==="match") return "⚽";
  if(type==="horoscope") return "♈";
  if(type==="diet") return "🥗";
  if(type==="spouse_bday") return "🎂";
  if(type==="child_bday") return "🧒";
  if(type==="wedding") return "💍";
  if(type==="engagement") return "💐";
  if(type==="met") return "✨";
  if(type==="period_check") return "🌙";
  return "🔔";
}

function timeLabel(daysLeft){
  if(daysLeft === 0) return "Bugün";
  if(daysLeft === 1) return "1 gün kaldı";
  if(daysLeft === 2) return "2 gün kaldı";
  if(daysLeft === 3) return "3 gün kaldı";
  return "";
}

async function fetchNotificationsToday(){
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  if(!user?.id) return [];

  try{
    const url = `${BASE_DOMAIN}/api/reminders/today?user_id=${encodeURIComponent(user.id)}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return data?.items || [];
  }catch(e){
    console.log("notif fetch err:", e);
    return [];
  }
}

function renderNotifications(items){
  const badge = document.getElementById("notifBadge");
  const list = document.getElementById("notifList");
  if(!badge || !list) return;

  badge.style.display = items.length ? "block" : "none";

  if(!items.length){
    list.innerHTML = `
      <div class="notif-item">
        <div class="notif-icon">🧿</div>
        <div class="notif-content">
          <div class="notif-title">Bugün sakin</div>
          <div class="notif-desc">Evladım bugün hatırlatmam yok. Ben yine buradayım.</div>
          <div class="notif-time">—</div>
        </div>
      </div>`;
    return;
  }

  list.innerHTML = items.map(it => {
    const clickable = it.action_url ? "cursor:pointer;" : "";
    const onclick = it.action_url ? `location.href='${it.action_url}'` : "";
    return `
      <div class="notif-item" style="${clickable}" onclick="${onclick}">
        <div class="notif-icon">${iconFor(it.type)}</div>
        <div class="notif-content">
          <div class="notif-title">${escapeHtml(it.title || "")}</div>
          <div class="notif-desc">${escapeHtml(it.message || "")}</div>
          <div class="notif-time">${timeLabel(it.days_left)}</div>
        </div>
      </div>
    `;
  }).join("");
}

export async function loadNotifPartial({ containerId = "notifMount" } = {}){
  const mount = document.getElementById(containerId);
  if(!mount) return;
  const res = await fetch("partials/notif.html", { cache: "no-cache" });
  mount.innerHTML = await res.text();
}

export async function initNotifications(){
  async function refresh(){
    const items = await fetchNotificationsToday();
    renderNotifications(items);
  }

  // İlk yük + periyodik yenile
  await refresh();
  setInterval(refresh, 60_000);

  // Dropdown açıldığında da tazele (kullanıcı “hemen” görsün)
  const btn = document.getElementById("notifBtn");
  if(btn){
    btn.addEventListener("click", () => setTimeout(refresh, 50));
  }
}
