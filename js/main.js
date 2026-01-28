// FILE: /js/main.js
// VERSION: vFINAL+2 (REBUILD - tek dosya, eksiksiz; menu + history + chat + login gate + logout)
// NOTE: Senin main.js kaybolmuş; bu dosya sıfırdan, senin verdiğin modüllerle uyumlu olarak yeniden yazıldı.
// UYUMLU MODÜLLER: config.js, auth.js, notif.js, chat.js, chat_store.js, menu_history_ui.js (+ opsiyonel fal.js)
// AMAÇ: Hamburger menü dolu, chat çalışır, S.P görünür, logout çalışır, Türkçe bozulmaz, giriş akışı auth.js üzerinden.

import { BASE_DOMAIN, STORAGE_KEY, GOOGLE_CLIENT_ID } from "./config.js";
import { initAuth, handleLogin, logout, acceptTerms, waitForGsi } from "./auth.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter } from "./chat.js";
import { ChatStore } from "./chat_store.js";
import { initMenuHistoryUI } from "./menu_history_ui.js";

// fal.js yoksa import patlamasın diye opsiyonel bağla
let openFalPanel = null, closeFalPanel = null, handleFalPhoto = null;
(async () => {
  try {
    const m = await import("./fal.js");
    openFalPanel = m.openFalPanel;
    closeFalPanel = m.closeFalPanel;
    handleFalPhoto = m.handleFalPhoto;
  } catch {}
})();

// CONFIG BRIDGE (index.html dahil)
window.CAYNANA_GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
window.CAYNANA_API_BASE = BASE_DOMAIN;
window.CAYNANA_STORAGE_KEY = STORAGE_KEY;

const $ = (id) => document.getElementById(id);
function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getUser() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }

function termsKey(email=""){
  return `caynana_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}

function isLoggedUser(u){
  return !!(u?.isSessionActive && (u?.id || u?.user_id) && u?.provider && u?.provider !== "guest");
}

function show(el){ if(el){ el.style.display = "flex"; el.classList.add("active"); } }
function hide(el){ if(el){ el.classList.remove("active"); el.style.display = "none"; } }

function refreshPremiumBars() {
  const u = getUser();
  const logged = isLoggedUser(u);
  document.body.classList.toggle("is-logged", logged);

  const yp = Number(u?.yp_percent ?? 19);
  const p = Math.max(5, Math.min(100, yp));
  if ($("ypNum")) $("ypNum").textContent = `${p}%`;
  if ($("ypFill")) $("ypFill").style.width = `${p}%`;

  // Menü profil adı / avatar
  try {
    const name = (u.fullname || u.name || u.display_name || u.email || "—");
    const nm = $("profileShortcutName");
    if(nm) nm.textContent = name;

    const pic = u.picture || u.avatar || u.avatar_url;
    const ico = $("profileShortcutIco");
    if(ico && pic) ico.innerHTML = `<img src="${pic}" alt="avatar">`;
  } catch {}
}

function bindHamburger(){
  const hamb = $("hambBtn");
  const overlay = $("menuOverlay");
  if(!hamb || !overlay) return;

  hamb.addEventListener("click", ()=> overlay.classList.add("open"));
  overlay.addEventListener("click", (e)=> { if(e.target === overlay) overlay.classList.remove("open"); });
}

function bindBottomBar(){
  document.querySelectorAll(".assistant-item").forEach(el=>{
    el.addEventListener("click", ()=>{
      const go = el.getAttribute("data-go");
      if(go) location.href = go;
    });
  });
}

function bindLogoutAndDelete(){
  const logoutBtn = $("logoutBtn");
  if(logoutBtn){
    logoutBtn.addEventListener("click", ()=> {
      // auth.js içindeki confirmli logout kullan
      try { logout(); } catch { location.reload(); }
    });
  }

  const del = $("deleteAccountBtn");
  if(del){
    del.addEventListener("click", ()=>{
      alert("Hesap silme yakında evladım. 🙂 Şimdilik Güvenli Çıkış yapabilirsin.");
    });
  }
}

function gateAuthAndTerms(){
  const loginOverlay = $("loginOverlay");
  const termsOverlay = $("termsOverlay");

  const u = getUser();
  const logged = isLoggedUser(u);

  // login yoksa: loginOverlay açık kalsın, initAuth çalışsın
  if(!logged){
    if(loginOverlay){ loginOverlay.classList.add("active"); loginOverlay.style.display = "flex"; }
    if(termsOverlay){ termsOverlay.classList.remove("active"); termsOverlay.style.display = "none"; }
    // Google butonu render (auth.js)
    try { initAuth(); } catch {}
    return false;
  }

  // login var: sözleşme kontrol
  const email = String(u?.email || "").toLowerCase().trim();
  const accepted = email ? !!localStorage.getItem(termsKey(email)) : !!u?.terms_accepted_at;

  if(!accepted){
    if(termsOverlay){ termsOverlay.classList.add("active"); termsOverlay.style.display = "flex"; }
    if(loginOverlay){ loginOverlay.classList.remove("active"); loginOverlay.style.display = "none"; }
    return false;
  }

  // her şey tamam
  if(loginOverlay){ loginOverlay.classList.remove("active"); loginOverlay.style.display = "none"; }
  if(termsOverlay){ termsOverlay.classList.remove("active"); termsOverlay.style.display = "none"; }
  return true;
}

function bindTermsOverlay(){
  const termsOverlay = $("termsOverlay");
  if(!termsOverlay) return;

  const closeBtn = $("closeTermsBtn");
  const check = $("termsCheck");
  const acceptBtn = $("termsAcceptBtn");

  if(closeBtn){
    closeBtn.addEventListener("click", ()=> {
      // sözleşmeyi kapatanı logout yapalım (senin kural: onay olmadan giriş yok)
      try { logout(); } catch { location.reload(); }
    });
  }

  if(check && acceptBtn){
    const sync = ()=>{
      const ok = !!check.checked;
      acceptBtn.disabled = !ok;
      acceptBtn.style.opacity = ok ? "1" : "0.65";
    };
    sync();
    check.addEventListener("change", sync);

    acceptBtn.addEventListener("click", async ()=>{
      if(!check.checked) return;
      const ok = await acceptTerms();
      if(ok){
        // sözleşme onaylandı → app’a devam
        termsOverlay.classList.remove("active");
        termsOverlay.style.display = "none";
        refreshPremiumBars();
      }
    });
  }
}

function bindChatUI(){
  const input = $("msgInput");
  const sendBtn = $("sendBtn");
  const chatEl = $("chat");

  if(!input || !sendBtn || !chatEl) return;

  // mevcut history'yi ekrana bas
  try{
    ChatStore.init();
    const hist = ChatStore.history();
    if(Array.isArray(hist) && hist.length){
      chatEl.innerHTML = ""; // boş placeholder varsa temizle
      hist.forEach(m=>{
        if(m.role === "user") addUserBubble(m.content);
        else if(m.role === "assistant") typeWriter(m.content);
      });
    }
  }catch{}

  async function sendMessage(){
    const text = String(input.value || "").trim();
    if(!text) return;

    input.value = "";
    input.style.height = "auto";

    addUserBubble(text);

    const res = await fetchTextResponse(text, "chat");
    if(res?.text){
      typeWriter(res.text);
    }
  }

  // enter gönder, shift+enter satır
  input.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener("click", sendMessage);

  // textarea auto-grow
  input.addEventListener("input", ()=>{
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  // + (camBtn) dosya seçsin (chat.html’de fileInput varsa)
  const camBtn = $("camBtn");
  const fileInput = $("fileInput");
  const filePreview = $("filePreview");
  const fileName = $("fileName");
  const fileClear = $("fileClearBtn");

  if(camBtn && fileInput){
    camBtn.addEventListener("click", ()=> fileInput.click());
  }
  if(fileInput){
    fileInput.addEventListener("change", ()=>{
      const f = fileInput.files && fileInput.files[0];
      if(!f){
        if(filePreview) filePreview.classList.remove("show");
        return;
      }
      if(fileName) fileName.textContent = f.name;
      if(filePreview) filePreview.classList.add("show");
      // Fal paneli varsa foto işi oraya devredilebilir
      // şimdilik sadece preview
    });
  }
  if(fileClear){
    fileClear.addEventListener("click", ()=>{
      if(fileInput) fileInput.value = "";
      if(filePreview) filePreview.classList.remove("show");
    });
  }

  // mic (şimdilik: tarayıcı speech varsa)
  const micBtn = $("micBtn");
  if(micBtn && "webkitSpeechRecognition" in window){
    const Rec = window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang = "tr-TR";
    rec.continuous = false;
    rec.interimResults = false;

    micBtn.addEventListener("click", ()=>{
      try { rec.start(); } catch {}
    });

    rec.onresult = (ev)=>{
      const t = ev.results?.[0]?.[0]?.transcript || "";
      if(!t) return;
      input.value = t;
      sendMessage();
    };
  }
}

function bindNewChatButton(){
  const btn = $("newChatBtn");
  if(!btn) return;

  btn.addEventListener("click", ()=>{
    ChatStore.newChat();
    // chat alanını temizle
    const chatEl = $("chat");
    if(chatEl) chatEl.innerHTML = "";
    // history list’i yenile
    try { initMenuHistoryUI(); } catch {}
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // temel UI
  bindHamburger();
  bindBottomBar();
  bindLogoutAndDelete();
  bindTermsOverlay();

  // Menü + geçmiş listesi (ChatStore üzerinden)
  try { initMenuHistoryUI(); } catch {}

  // auth gate
  const ok = gateAuthAndTerms();
  refreshPremiumBars();

  // bildirim
  try { initNotif(); } catch {}

  // chat ancak login+terms onaylıysa
  if(ok){
    bindChatUI();
    bindNewChatButton();
  }
});
