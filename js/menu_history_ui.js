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

/* ✅ Profil okuma (Regl + Takım) */
function safeJson(s, fb={}){ try{ return JSON.parse(s||""); }catch{ return fb; } }
function getUser(){ return safeJson(localStorage.getItem("caynana_user_v1"), {}); }
function norm(s){ return String(s||"").trim().toLowerCase(); }
function isFemaleGender(g){
  const x = norm(g);
  return x === "kadın" || x === "kadin" || x === "female" || x === "woman";
}
function getGender(u){
  return u.gender || u.formGender || u.inpGender || u.cinsiyet || u.sex || "";
}
function getTeamName(u){
  return String(u.team || u.formTeam || u.takim || u.form_team || u.team_name || "").trim();
}

/* ✅ Menüde var mı? (href ile kontrol) */
function menuHasHref(container, href){
  if(!container) return false;
  const nodes = container.querySelectorAll(".menu-action");
  for(const n of nodes){
    const on = n.getAttribute("onclick") || "";
    if(on.includes(`'${href}'`) || on.includes(`"${href}"`) || on.includes(href)) return true;
  }
  return false;
}

/* ✅ Menüye eleman ekle */
function appendMenuAction(container, icon, title, href){
  if(!container) return;
  const div = document.createElement("div");
  div.className = "menu-action";
  div.setAttribute("onclick", `location.href='${href}'`);
  div.innerHTML = `<div class="ico">${icon}</div><div><div>${esc(title)}</div></div>`;
  container.appendChild(div);
}

/* ✅ Menü overlay kapat */
function closeMenuOverlay(){
  const overlay = $("menuOverlay");
  if(overlay) overlay.classList.remove("open");
}

/* ✅ Chat sayfasına geç */
function goChat(){
  closeMenuOverlay();
  // her koşulda chat sayfasına götür
  location.href = "/pages/chat.html";
}

/* ✅ Boşsa bas, doluysa eksikleri ekle */
function ensureAsistanMenus(){
  const asistan = $("menuAsistan");
  if(!asistan) return;

  const u = getUser();
  const female = isFemaleGender(getGender(u));
  const team = getTeamName(u);

  // Eğer tamamen boşsa temel menüyü yaz
  if(asistan.children.length === 0){
    asistan.innerHTML = `
      <div class="menu-action" onclick="location.href='/pages/chat.html'"><div class="ico">💬</div><div><div>Sohbet</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/translate.html'"><div class="ico">🛍️</div><div><div>Alışveriş</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/profil.html'"><div class="ico">🌍</div><div><div>Tercüman</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/gossip.html'"><div class="ico">🗣️</div><div><div>Dedikodu Kazanı</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/diyet.html'"><div class="ico">🥗</div><div><div>Diyet</div></div></div>
      <div class="menu-action" onclick="location.href='/pages/health.html'"><div class="ico">❤️</div><div><div>Sağlık</div></div></div>
    `;
  }

  // Dolu olsa bile: eksikleri ekle
  if(!menuHasHref(asistan, "/pages/translate.html")){
    appendMenuAction(asistan, "🛍️", "Alışveriş", "/pages/translate.html");
  }

  if(female && !menuHasHref(asistan, "/pages/regl.html")){
    appendMenuAction(asistan, "🌸", "Regl Takip", "/pages/regl.html");
  }

  if(team && !menuHasHref(asistan, "/pages/clup.html")){
    appendMenuAction(asistan, "⚽", team, "/pages/clup.html");
  }
}

function renderFallbackMenus(){
  const astro = $("menuAstro");
  const kur = $("menuKurumsal");

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

/* ✅ History list: tıklayınca chat.html’ye gitsin */
function renderHistory(){
  const listEl = $("historyList");
  if(!listEl) return;

  const items = ChatStore.list();
  listEl.innerHTML = "";
  if(!items.length) return;

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

    // ✅ tıkla: currentId seç + chat’e git
    row.addEventListener("click", (e)=>{
      const act = e.target?.getAttribute?.("data-act");
      if(act) return;
      ChatStore.currentId = c.id;
      goChat();
    });

    // edit
    row.querySelector('[data-act="edit"]').addEventListener("click",(e)=>{
      e.stopPropagation();
      const curTitle = c.title || "";
      const newTitle = prompt("Sohbet başlığını yaz (Enter ile kaydet):", curTitle);
      if(newTitle === null) return;

      const cleaned = String(newTitle).trim();
      if(!cleaned) return;

      // ChatStore.renameChat varsa kullan
      if(typeof ChatStore.renameChat === "function"){
        ChatStore.renameChat(c.id, cleaned);
      } else {
        // eski key fallback
        try{
          const idx = JSON.parse(localStorage.getItem("caynana_chat_index") || "[]");
          const i = idx.findIndex(x=>x.id===c.id);
          if(i>=0){
            idx[i].title = cleaned;
            idx[i].updated_at = new Date().toISOString();
            localStorage.setItem("caynana_chat_index", JSON.stringify(idx));
          }
        }catch{}
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
  try { ChatStore.init(); } catch {}

  renderFallbackMenus();
  ensureAsistanMenus();   // ✅ kadın/team dahil burada garanti

  renderHistory();

  // ✅ Yeni sohbet butonu: yeni chat aç + chat’e git
  const newBtn = $("newChatBtn");
  if(newBtn){
    newBtn.addEventListener("click", ()=>{
      ChatStore.newChat();
      try { ChatStore.clearCurrent(); } catch {}
      goChat();
    });
  }
}
