// FILE: /js/menu_history_ui.js
import { ChatStore } from "./chat_store.js";

const $ = (id) => document.getElementById(id);

function esc(s=""){
  return String(s).replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function short15(s=""){
  const t = String(s).trim();
  if(!t) return "";
  return t.length > 15 ? t.slice(0,15) + "…" : t;
}

function confirmDelete(){
  return confirm("Sohbetiniz kalıcı olarak silenecek. Emin misin evladım?");
}

/* =========================================================
   PROFİL OKU (gender / team)
   ========================================================= */
function getProfile(){
  try{
    return JSON.parse(localStorage.getItem("caynana_user_v1") || "{}");
  }catch{
    return {};
  }
}

/* =========================================================
   MENÜYE EKSİKSE EKLE
   ========================================================= */
function hasMenuItem(root, href){
  if(!root) return false;
  return Array.from(root.querySelectorAll(".menu-action"))
    .some(el => (el.getAttribute("data-href") || "").includes(href));
}

function addMenuItem(root, ico, label, href){
  if(!root || hasMenuItem(root, href)) return;

  const div = document.createElement("div");
  div.className = "menu-action";
  div.setAttribute("data-href", href);
  div.innerHTML = `
    <div class="ico">${ico}</div>
    <div><div>${esc(label)}</div></div>
  `;
  div.addEventListener("click", ()=>{
    ChatStore.setCurrent(ChatStore.currentId);
    location.href = href;
  });
  root.appendChild(div);
}

/* =========================================================
   FALLBACK + DİNAMİK MENÜLER
   ========================================================= */
function renderFallbackMenus(){
  const asistan = $("menuAsistan");
  const astro   = $("menuAstro");
  const kur     = $("menuKurumsal");

  const p = getProfile();
  const gender = String(p.gender || p.cinsiyet || "").toLowerCase();
  const team   = String(p.team || "").trim();

  const isFemale = ["kadın","kadin","female","woman","f"].includes(gender);

  /* ---- ASİSTAN ---- */
  if(asistan){
    addMenuItem(asistan, "💬", "Sohbet", "/pages/chat.html");
    addMenuItem(asistan, "🛍️", "Alışveriş", "/pages/alisveris.html");
    addMenuItem(asistan, "🌍", "Tercüman", "/pages/translate.html");
    addMenuItem(asistan, "🗣️", "Dedikodu Kazanı", "/pages/gossip.html");
    addMenuItem(asistan, "🥗", "Diyet", "/pages/diyet.html");
    addMenuItem(asistan, "❤️", "Sağlık", "/pages/health.html");

    // ✅ Regl (sadece kadın)
    if(isFemale){
      addMenuItem(asistan, "🩸", "Regl Takip", "/pages/regl.html");
    }

    // ✅ Takım (profilde varsa, adıyla)
    if(team){
      addMenuItem(asistan, "⚽", team, "/pages/clup.html");
    }
  }

  /* ---- ASTRO ---- */
  if(astro){
    addMenuItem(astro, "☕", "Kahve Falı", "/pages/fal.html");
    addMenuItem(astro, "🃏", "Tarot", "/pages/tarot.html");
    addMenuItem(astro, "👁️", "Rüya Tabiri", "/pages/dream.html");
    addMenuItem(astro, "♈", "Günlük Burç", "/pages/astro.html");
  }

  /* ---- KURUMSAL ---- */
  if(kur){
    addMenuItem(kur, "⭐", "Üyelik", "/pages/membership.html");
    addMenuItem(kur, "ℹ️", "Hakkımızda", "/pages/hakkimizda.html");
    addMenuItem(kur, "❓", "Sık Sorulan Sorular", "/pages/sss.html");
    addMenuItem(kur, "🔒", "Gizlilik", "/pages/gizlilik.html");
    addMenuItem(kur, "☎️", "İletişim", "/pages/iletisim.html");
  }
}

/* =========================================================
   GEÇMİŞ SOHBETLER
   ========================================================= */
function renderHistory(){
  const listEl = $("historyList");
  if(!listEl) return;

  const items = ChatStore.list();
  listEl.innerHTML = "";

  items.forEach((c)=>{
    const row = document.createElement("div");
    row.className = "history-row";
    row.dataset.chatId = c.id;

    row.innerHTML = `
      <div class="history-title">${esc(short15(c.title) || "Sohbet")}</div>
      <div style="display:flex; gap:8px;">
        <div class="history-del" data-act="edit">✏️</div>
        <div class="history-del" data-act="del">🗑️</div>
      </div>
    `;

    row.addEventListener("click",(e)=>{
      const act = e.target.getAttribute("data-act");
      if(act) return;
      ChatStore.setCurrent(c.id);
      location.href = "/pages/chat.html";
    });

    row.querySelector('[data-act="edit"]').onclick = (e)=>{
      e.stopPropagation();
      const nt = prompt("Sohbet başlığını yaz:", c.title || "");
      if(nt) ChatStore.renameChat(c.id, nt);
    };

    row.querySelector('[data-act="del"]').onclick = (e)=>{
      e.stopPropagation();
      if(!confirmDelete()) return;
      ChatStore.deleteChat(c.id);
    };

    listEl.appendChild(row);
  });
}

/* =========================================================
   INIT
   ========================================================= */
export function initMenuHistoryUI(){
  ChatStore.init();

  renderFallbackMenus();
  renderHistory();

  // Yeni sohbet
  const btn = $("newChatBtn");
  if(btn){
    btn.onclick = ()=>{
      ChatStore.newChat();
      location.href = "/pages/chat.html";
    };
  }

  // 🔴 CANLI GÜNCELLEME
  window.addEventListener("caynana:chats-updated", ()=>{
    renderHistory();
  });
}
