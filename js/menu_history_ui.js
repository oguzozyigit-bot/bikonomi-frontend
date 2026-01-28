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
  return t.length > 15 ? t.slice(0,15) : t;
}

function confirmDelete(){
  return confirm("Sohbetiniz kalıcı olarak silenecek. Eminmisin evladım?");
}

function renderFallbackMenus(){
  // Eğer main.js zaten dolduruyorsa elleme:
  const asistan = $("menuAsistan");
  const astro = $("menuAstro");
  const kur = $("menuKurumsal");

  if(asistan && asistan.children.length === 0){
    asistan.innerHTML = `
      <div class="menu-action" onclick="location.href='/pages/chat.html'"><div class="ico">💬</div><div><div>Sohbet</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/diyet.html'"><div class="ico">🥗</div><div><div>Diyet</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/health.html'"><div class="ico">❤️</div><div><div>Sağlık</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/translate.html'"><div class="ico">🌍</div><div><div>Tercüman</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/gossip.html'"><div class="ico">🗣️</div><div><div>Dedikodu Kazanı</div></div></div>
    `;
  }

  if(astro && astro.children.length === 0){
    astro.innerHTML = `
      <div class="menu-action" onclick="location.href='/pages/fal.html'"><div class="ico">☕</div><div><div>Kahve Falı</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/tarot.html'"><div class="ico">🃏</div><div><div>Tarot</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/dream.html'"><div class="ico">👁️</div><div><div>Rüya Tabiri</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/astro.html'"><div class="ico">♈</div><div><div>Günlük Burç</div></div></div>
    `;
  }

  if(kur && kur.children.length === 0){
    kur.innerHTML = `
      <div class="menu-action" onclick="location.href='/pages/membership.html'"><div class="ico">⭐</div><div><div>Üyelik</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/hakkimizda.html'"><div class="ico">ℹ️</div><div><div>Hakkımızda</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/sss.html'"><div class="ico">❓</div><div><div>Sık Sorulan Sorular</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/gizlilik.html'"><div class="ico">🔒</div><div><div>Gizlilik</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/iletisim.html'"><div class="ico">☎️</div><div><div>İletişim</div></div></div>
    `;
  }
}

function renderHistory(){
  const listEl = $("historyList");
  if(!listEl) return;

  const items = ChatStore.list(); // son 10

  listEl.innerHTML = "";
  if(!items.length) return; // "Yeni sohbet" gibi boş başlık göstermiyoruz

  items.forEach((c)=>{
    const isActive = ChatStore.currentId === c.id;

    const title = short15(c.title || "");
    const row = document.createElement("div");
    row.className = "history-row";
    row.dataset.chatId = c.id;

    row.innerHTML = `
      <div class="history-title" title="${esc(c.title||"")}">${esc(title || "Sohbet")}</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <div class="history-del" data-act="edit" title="Başlığı Düzenle">✏️</div>
        <div class="history-del" data-act="del" title="Sohbeti Sil">🗑️</div>
      </div>
    `;

    if(isActive){
      row.style.borderColor = "rgba(190,242,100,.45)";
    }

    // tıkla: sohbete geç
    row.addEventListener("click", (e)=>{
      const act = e.target?.getAttribute?.("data-act");
      if(act) return; // edit/del ayrı
      ChatStore.currentId = c.id;
      renderHistory();
      // chat ekranını temizleyip history'yi tekrar basmak main.js/chat.js tarafında olacak
      // burada sadece state değiştiriyoruz.
    });

    // edit
    row.querySelector('[data-act="edit"]').addEventListener("click",(e)=>{
      e.stopPropagation();

      const curTitle = c.title || "";
      const newTitle = prompt("Sohbet başlığını yaz (Enter ile kaydet):", curTitle);
      if(newTitle === null) return;

      const cleaned = String(newTitle).trim();
      if(!cleaned) return;

      // ChatStore'da rename yok -> index'e direkt yazıyoruz:
      const idx = JSON.parse(localStorage.getItem("caynana_chat_index") || "[]");
      const i = idx.findIndex(x=>x.id===c.id);
      if(i>=0){
        idx[i].title = cleaned;
        idx[i].updated_at = new Date().toISOString();
        localStorage.setItem("caynana_chat_index", JSON.stringify(idx));
      }
      renderHistory();
    });

    // delete
    row.querySelector('[data-act="del"]').addEventListener("click",(e)=>{
      e.stopPropagation();
      if(!confirmDelete()) return;
      ChatStore.deleteChat(c.id);
      renderHistory();
    });

    listEl.appendChild(row);
  });
}

export function initMenuHistoryUI(){
  // chat list state
  try { ChatStore.init(); } catch {}

  renderFallbackMenus();
  renderHistory();

  // Yeni sohbet butonu
  const newBtn = $("newChatBtn");
  if(newBtn){
    newBtn.addEventListener("click", ()=>{
      ChatStore.newChat();
      renderHistory();
      // chat ekranını temizlemek main.js/chat.js’de yapılır; burada sadece store temiz
      try { ChatStore.clearCurrent(); } catch {}
    });
  }
}
