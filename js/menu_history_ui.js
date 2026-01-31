// FILE: /js/menu_history_ui.js
// FINAL (NO DUP MENU) ✅
// - Menü grid’lerini HER init’te temizler ve yeniden render eder -> asla çiftlenmez
// - Chat’e dokunmaz
// - Profil kısayolu isim+resim garanti
// - History: open/edit/delete (confirm)
// - Regl / Özel günler / Takım koşullu

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

function getProfile(){
  try{ return JSON.parse(localStorage.getItem("caynana_user_v1") || "{}"); }
  catch{ return {}; }
}

function paintProfileShortcut(){
  const p = getProfile();
  const name = String(p.fullname || p.name || p.display_name || p.email || "—").trim() || "—";
  const pic  = String(p.picture || p.avatar || p.avatar_url || "").trim();

  const nm = $("profileShortcutName");
  if(nm) nm.textContent = name;

  const ico = $("profileShortcutIco");
  if(ico){
    if(pic) ico.innerHTML = `<img src="${pic}" alt="avatar">`;
    else ico.textContent = "👤";
  }

  const btn = $("profileShortcutBtn");
  if(btn && !btn.dataset.__bound){
    btn.dataset.__bound = "1";
    btn.addEventListener("click", ()=> location.href="/pages/profil.html");
  }
}

/* =========================================================
   MENÜ RENDER (TEK SEFER, DUP YOK)
   ========================================================= */
function buildMenus(){
  const p = getProfile();
  const gender = String(p.gender || p.cinsiyet || "").toLowerCase().trim();
  const team   = String(p.team || "").trim();

  const isFemale = ["kadın","kadin","female","woman","f"].includes(gender);

  // Özel günler: eş/evlilik/nişan/çocuk doğum günü gibi alanlar doluysa göster
  const hasSpecial =
    !!(p.spouse_birth_date || p.spouseBirthday || p.anniversary_date || p.wedding_anniversary ||
       p.engagement_anniversary || p.child_birth_dates || p.childBirthDates || p.specialdays);

  const asistanItems = [
    { ico:"💬", label:"Sohbet", href:"/pages/chat.html" },
    { ico:"🛍️", label:"Alışveriş", href:"/pages/translate.html" },   // ✅ senin kuralın
    { ico:"🌍", label:"Tercüman", href:"/pages/profil.html" },        // ✅ senin kuralın
    { ico:"🗣️", label:"Dedikodu Kazanı", href:"/pages/gossip.html" },
    { ico:"🥗", label:"Diyet", href:"/pages/diyet.html" },
    { ico:"❤️", label:"Sağlık", href:"/pages/health.html" },
  ];

  if(isFemale) asistanItems.push({ ico:"🩸", label:"Regl Takip", href:"/pages/regl.html" });
  if(hasSpecial) asistanItems.push({ ico:"🎉", label:"Özel Günler", href:"/pages/specialdays.html" });
  if(team) asistanItems.push({ ico:"⚽", label: team, href:"/pages/clup.html" });

  const astroItems = [
    { ico:"☕", label:"Kahve Falı", href:"/pages/fal.html" },
    { ico:"🃏", label:"Tarot", href:"/pages/tarot.html" },
    { ico:"👁️", label:"Rüya Tabiri", href:"/pages/dream.html" },
    { ico:"♈", label:"Günlük Burç", href:"/pages/astro.html" },
  ];

  const kurumsalItems = [
    { ico:"⭐", label:"Üyelik", href:"/pages/membership.html" },
    { ico:"ℹ️", label:"Hakkımızda", href:"/pages/hakkimizda.html" },
    { ico:"❓", label:"Sık Sorulan Sorular", href:"/pages/sss.html" },
    { ico:"🔒", label:"Gizlilik", href:"/pages/gizlilik.html" },
    { ico:"☎️", label:"İletişim", href:"/pages/iletisim.html" },
  ];

  return { asistanItems, astroItems, kurumsalItems };
}

function renderMenuGrid(rootEl, items){
  if(!rootEl) return;

  // ✅ KRİTİK: önce temizle -> asla çiftlenmez
  rootEl.innerHTML = "";

  items.forEach(it=>{
    const div = document.createElement("div");
    div.className = "menu-action";
    div.setAttribute("data-href", it.href);
    div.innerHTML = `
      <div class="ico">${esc(it.ico)}</div>
      <div><div>${esc(it.label)}</div></div>
    `;
    div.addEventListener("click", ()=> location.href = it.href);
    rootEl.appendChild(div);
  });
}

/* =========================================================
   HISTORY
   ========================================================= */
let editingId = null;

function renderHistory(){
  const listEl = $("historyList");
  if(!listEl) return;

  const items = ChatStore.list();
  listEl.innerHTML = "";

  items.forEach((c)=>{
    const row = document.createElement("div");
    row.className = "history-row";
    row.dataset.chatId = c.id;

    const isEditing = (editingId === c.id);

    row.innerHTML = `
      <div style="flex:1;min-width:0;">
        ${
          isEditing
            ? `<input data-edit="${c.id}" value="${esc(c.title || "")}"
                 style="width:100%; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.10);
                        color:#fff; border-radius:12px; padding:10px 10px; font-weight:900; outline:none;" />`
            : `<div class="history-title" title="${esc(c.title || "")}">${esc(short15(c.title) || "Sohbet")}</div>`
        }
      </div>
      <div style="display:flex; gap:8px; flex-shrink:0;">
        <div class="history-del" data-act="edit" title="Başlığı Düzenle">✏️</div>
        <div class="history-del" data-act="del" title="Sohbeti Sil">🗑️</div>
      </div>
    `;

    // sohbet aç
    row.addEventListener("click",(e)=>{
      const act = e.target?.getAttribute?.("data-act");
      const isInp = e.target?.getAttribute?.("data-edit");
      if(act || isInp) return;

      ChatStore.setCurrent(c.id);
      $("menuOverlay")?.classList.remove("open");
      location.href = "/pages/chat.html";
    });

    // edit toggle (inline)
    row.querySelector('[data-act="edit"]')?.addEventListener("click",(e)=>{
      e.stopPropagation();
      editingId = (editingId === c.id) ? null : c.id;
      renderHistory();
      setTimeout(()=>{
        const inp = listEl.querySelector(`input[data-edit="${c.id}"]`);
        inp?.focus?.(); inp?.select?.();
      }, 20);
    });

    // delete (confirm + force)
    row.querySelector('[data-act="del"]')?.addEventListener("click",(e)=>{
      e.stopPropagation();
      if(!confirmDelete()) return;
      ChatStore.deleteChat(c.id, true);
      renderHistory();
    });

    listEl.appendChild(row);

    // input enter/esc
    if(isEditing){
      setTimeout(()=>{
        const inp = listEl.querySelector(`input[data-edit="${c.id}"]`);
        if(!inp) return;
        inp.addEventListener("keydown",(ev)=>{
          if(ev.key === "Escape"){ editingId = null; renderHistory(); }
          if(ev.key === "Enter"){
            ev.preventDefault();
            const v = String(inp.value || "").trim();
            if(v) ChatStore.renameChat(c.id, v);
            editingId = null;
            renderHistory();
          }
        });
      }, 0);
    }
  });
}

/* =========================================================
   INIT
   ========================================================= */
function getUIState(){
  if(!window.__CAYNANA_MENU_UI__) window.__CAYNANA_MENU_UI__ = { bound:false };
  return window.__CAYNANA_MENU_UI__;
}

export function initMenuHistoryUI(){
  try { ChatStore.init(); } catch {}

  paintProfileShortcut();

  // ✅ MENÜLERİ TEK SEFERDE YENİDEN BAS (dup bitti)
  const { asistanItems, astroItems, kurumsalItems } = buildMenus();
  renderMenuGrid($("menuAsistan"), asistanItems);
  renderMenuGrid($("menuAstro"), astroItems);
  renderMenuGrid($("menuKurumsal"), kurumsalItems);

  renderHistory();

  // Yeni sohbet butonu
  const btn = $("newChatBtn");
  if(btn && !btn.dataset.__bound){
    btn.dataset.__bound = "1";
    btn.addEventListener("click", ()=>{
      ChatStore.newChat();
      $("menuOverlay")?.classList.remove("open");
      location.href = "/pages/chat.html";
    });
  }

  // canlı güncelleme: sadece 1 kere
  const st = getUIState();
  if(!st.bound){
    st.bound = true;
    window.addEventListener("caynana:chats-updated", ()=>{
      try { ChatStore.init(); } catch {}
      paintProfileShortcut();
      renderHistory(); // menü sabit, history değişir
    });
  }
}
