// js/main.js (FINAL - FIXED v2)
// ✅ Profil Resmi ve İsmi Düzeltildi (pName, pAvatar uyumu sağlandı)
// ✅ Google Login Syntax hataları giderildi.

import { BASE_DOMAIN, STORAGE_KEY } from "./config.js";
import { initAuth, handleLogin, logout, acceptTerms, waitForGsi } from "./auth.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter } from "./chat.js";
import { openFalPanel, closeFalPanel, handleFalPhoto } from "./fal.js";
import { ChatStore } from "./chat_store.js";

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const API_TOKEN_KEY = "caynana_api_token";

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getUser() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }

function termsKey(email=""){
  return `caynana_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}

function getApiToken(){ return (localStorage.getItem(API_TOKEN_KEY) || "").trim(); }
function setApiToken(t){ if(t) localStorage.setItem(API_TOKEN_KEY, t); }
function clearApiToken(){ localStorage.removeItem(API_TOKEN_KEY); }

// --------------------
// ✅ GSI / AUTH KİLİTLERİ
// --------------------
function getBootState(){
  if(!window.CAYNANA_BOOT) window.CAYNANA_BOOT = {
    gsiReady: false,
    authInited: false,
    loginInFlight: false,
    lastLoginAt: 0
  };
  return window.CAYNANA_BOOT;
}

// --- backend token al ---
async function ensureBackendSessionToken(){
  const existing = getApiToken();
  if(existing) return existing;

  const googleIdToken = (localStorage.getItem("google_id_token") || "").trim();
  if(!googleIdToken) throw new Error("google_id_token missing");

  const r = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      google_id_token: googleIdToken,
      id_token: googleIdToken,
      token: googleIdToken
    })
  });

  const txt = await r.text().catch(()=> "");
  if(!r.ok) throw new Error(`auth/google failed: ${r.status} ${txt}`);

  let data = {};
  try { data = JSON.parse(txt || "{}"); } catch(e) {}

  const token = 
    (data.token || 
     data.access_token || 
     data.api_token || 
     data.jwt || 
     data.session_token || 
     data.auth_token || 
     data.bearer || 
     data.accessToken || 
     "").trim();

  if(!token) throw new Error("auth/google token not found in response");
  setApiToken(token);
  return token;
}

// --------------------
// GLOBAL HOOKS
// --------------------
window.enterApp = () => {
  $("loginOverlay")?.classList.remove("active");
  if ($("loginOverlay")) $("loginOverlay").style.display = "none";
  refreshPremiumBars();
};

window.showTermsOverlay = () => {
  const t = $("termsOverlay");
  if (!t) return;
  t.classList.add("active");
  t.style.display = "flex";
};

window.showGoogleButtonFallback = (reason = "unknown") => {
  const hint = $("loginHint");
  if (hint) hint.textContent = `Google girişi açılamadı (${reason}). Sayfayı yenileyip tekrar dene.`;
};

// --------------------
// UI STATE (PROFIL RESMİ BURADA GÜNCELLENİYOR)
// --------------------
function refreshPremiumBars() {
  const u = getUser();
  const logged = !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");
  document.body.classList.toggle("is-logged", logged);

  // 1. Üst Bar İsim (varsa)
  const nameShort = (u.hitap || (u.fullname || "").split(/\s+/)[0] || u.email || "MİSAFİR").toUpperCase();
  const bw = $("brandWrapper"); // eski yapıdan kalma, varsa doldur
  if (bw) bw.dataset.user = logged ? nameShort : "MİSAFİR";

  // 2. Samimiyet Barı
  const yp = Number((u?.yp_percent ?? 19));
  const p = Math.max(5, Math.min(100, yp));
  
  if ($("spVal")) $("spVal").textContent = `${p}%`; // Yeni ID
  if ($("spFill")) $("spFill").style.width = `${p}%`; // Yeni ID
  if ($("ypNum")) $("ypNum").textContent = `${p}%`; // Eski ID desteği
  if ($("ypFill")) $("ypFill").style.width = `${p}%`; // Eski ID desteği

  // 3. ✅ MENÜDEKİ PROFİL KARTI (RESİM VE İSİM)
  const fullName = (u.fullname || u.name || u.display_name || "Misafir").trim();
  const pic = (u.picture || u.avatar || u.avatar_url || u.photo_url || "").trim();

  // İsim alanı (pName)
  const pNameEl = $("pName");
  if(pNameEl) pNameEl.textContent = logged ? fullName : "Misafir";

  // Avatar alanı (pAvatar)
  const pAvatarEl = $("pAvatar");
  if(pAvatarEl){
    if(logged && pic){
      // Resmi kutuya tam sığdır
      pAvatarEl.innerHTML = `<img src="${pic}" style="width:100%;height:100%;object-fit:cover;" alt="user">`;
      pAvatarEl.style.fontSize = "0"; // emoji arkada kalmasın
    } else {
      pAvatarEl.innerHTML = "👤";
      pAvatarEl.style.fontSize = "20px";
    }
  }
}

// --------------------
// SMALL UI HELPERS
// --------------------
function setChatVisibilityFromStore(){
  const chatEl = $("chatArea"); // Yeni ID chatArea
  if(!chatEl) return;

  let h = [];
  try { h = ChatStore.history() || []; } catch(e){ h = []; }

  // Eğer geçmiş boşsa "chat-empty" classı ekle (CSS'te placeholder göstermek için)
  // Ama yeni tasarımda chatArea içinde statik HTML var, o yüzden display none yapmıyoruz.
}

function ensureChatVisible(){
  // Yeni tasarımda chat hep açık, sadece scroll aşağı insin
  const chatEl = $("chatArea");
  if(chatEl) {
    const emptyMsg = chatEl.querySelector(".empty-msg");
    if(emptyMsg) emptyMsg.style.display = "none";
  }
}

function isNearBottom(el, slack = 80){
  try{
    return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack;
  }catch(e){
    return true;
  }
}

function makeChatTitleFromFirstMsg(text=""){
  const s = String(text || "").trim().replace(/\s+/g, " ");
  if(!s) return "Sohbet";
  return s.slice(0, 15);
}

function trySetChatTitle(title){
  const t = String(title || "").trim();
  if(!t) return;
  try{
    if(typeof ChatStore.setTitle === "function") ChatStore.setTitle(ChatStore.currentId, t);
    else if(typeof ChatStore.renameChat === "function") ChatStore.renameChat(ChatStore.currentId, t);
  }catch(e){}
}

function ensureTitleOnFirstUserMessage(userText){
  try{
    const list = ChatStore.list?.() || [];
    const curId = ChatStore.currentId;
    const cur = list.find(x => x.id === curId);
    const curTitle = String(cur?.title || "").trim();
    if(curTitle) return;
    const title = makeChatTitleFromFirstMsg(userText);  
    trySetChatTitle(title);
  }catch(e){}
}

function goProfile(){
  location.href = "/pages/profil.html";
}

function goDiet(){
  location.href = "/pages/diyet.html";
}

// --------------------
// MENU
// --------------------
// (Menü HTML'i statik olarak index.html'de var, dinamik basmaya gerek yok ama eventler lazım)

function openMenu() { 
  $("menuOverlay")?.classList.add("active"); 
}
function closeMenu() { 
  $("menuOverlay")?.classList.remove("active"); 
}

function goPage(key){
  const map = {
    hakkimizda: "/pages/hakkimizda.html",
    iletisim:   "/pages/iletisim.html",
    gizlilik:   "/pages/gizlilik.html",
    sozlesme:   "/pages/sozlesme.html",
    sss:        "/pages/sss.html",
    uyelik:     "/pages/uyelik.html",
  };
  const url = map[key];
  if (url) location.href = url;
}

// --------------------
// CHAT
// --------------------
let currentMode = "chat";
let chatHistory = [];

function syncFromStore(){
  try{
    const h = ChatStore.history() || [];
    chatHistory = h.map(m => ({ role: m.role, content: m.content }));
  }catch(e){
    chatHistory = [];
  }
}

function renderChatFromStore(){
  const chatEl = $("chatArea");
  if(!chatEl) return;

  const follow = isNearBottom(chatEl);
  
  // Önce temizle, ama empty-msg varsa kalsın mı? Hayır, doluysa temizle.
  chatEl.innerHTML = ""; 
  
  let h = [];
  try { h = ChatStore.history() || []; } catch(e){ h = []; }

  if(h.length === 0) {
    chatEl.innerHTML = `<div class="empty-msg">Kaynana burada evladım...<br>Hadi bir şeyler yaz da laflayalım.</div>`;
    return;
  }

  h.forEach(m => {
    const role = String(m?.role || "").toLowerCase();
    const content = String(m?.content || "");
    if(!content) return;

    const bubble = document.createElement("div");  
    bubble.className = `bubble ${role === "user" ? "user" : "bot"}`;  
    bubble.textContent = content;  
    chatEl.appendChild(bubble);
  });

  if(follow) chatEl.scrollTop = chatEl.scrollHeight;
  syncFromStore();
}

function storeAddOnce(role, content){
  try{
    const h = ChatStore.history() || [];
    const last = h[h.length - 1];
    const r = String(role || "").toLowerCase();
    const c = String(content || "");
    if(last && String(last.role||"").toLowerCase() === r && String(last.content||"") === c) return;
    ChatStore.add(r, c);
  }catch(e){
    try{ ChatStore.add(role, content); }catch(_){}
  }
}

async function doSend(forcedText = null) {
  const input = $("msgInput");
  const txt = String(forcedText ?? input?.value ?? "").trim();
  if (!txt) return;

  ensureChatVisible();

  // Kullanıcı balonu
  const uBub = document.createElement("div");
  uBub.className = "bubble user";
  uBub.textContent = txt;
  $("chatArea").appendChild(uBub);
  
  if (input && forcedText === null) input.value = "";
  $("chatArea").scrollTop = $("chatArea").scrollHeight;

  storeAddOnce("user", txt);
  ensureTitleOnFirstUserMessage(txt);
  syncFromStore();

  // Loading
  const holder = document.createElement("div");
  holder.className = "bubble bot loading";
  holder.textContent = "…";
  $("chatArea")?.appendChild(holder);
  $("chatArea").scrollTop = $("chatArea").scrollHeight;

  let reply = "Evladım bir şeyler ters gitti.";
  try {
    const out = await fetchTextResponse(txt, currentMode, chatHistory);
    reply = out?.text || reply;
  } catch (e) {}

  try { holder.remove(); } catch (e) {}

  // Bot balonu (Typewriter efekti chat.js'de varsa onu kullanır, yoksa direkt bas)
  if(typeof typeWriter === "function") {
     // chat.js target ID'si "chat" ise onu "chatArea" olarak güncellemek gerekebilir
     // ama şimdilik direkt ekleyelim, chat.js'i bozmayalım.
     const bBub = document.createElement("div");
     bBub.className = "bubble bot";
     bBub.textContent = reply;
     $("chatArea").appendChild(bBub);
  } else {
     const bBub = document.createElement("div");
     bBub.className = "bubble bot";
     bBub.textContent = reply;
     $("chatArea").appendChild(bBub);
  }
  
  $("chatArea").scrollTop = $("chatArea").scrollHeight;

  storeAddOnce("assistant", reply);
  syncFromStore();
}

// --------------------
// FAL
// --------------------
function bindFalUI(){
  // Index.html'de bu ID'ler yoksa hata vermesin diye kontrol
  $("closeFalBtn") && ($("closeFalBtn").onclick = () => closeFalPanel());
  const fi = $("falInput");
  if (fi) fi.onchange = () => handleFalPhoto(fi);
}

// --------------------
// DELETE ACCOUNT
// --------------------
async function deleteAccount(){
  const u0 = getUser();
  const uid = (u0?.id || "").trim();
  const email = (u0?.email || uid).trim().toLowerCase();

  if(!uid) return alert("Önce giriş yap evladım.");
  if(!confirm("Hesabını silmek istiyor musun? Bu işlem geri alınamaz.")) return;

  try{
    let apiToken = await ensureBackendSessionToken();

    const callSet = async (token) => {  
      return fetch(`${BASE_DOMAIN}/api/profile/set`, {  
        method: "POST",  
        headers: {  
          "Content-Type":"application/json",  
          "Authorization": `Bearer ${token}`  
        },  
        body: JSON.stringify({  
          user_id: uid,  
          meta: { email, deleted_at: new Date().toISOString() },  
          token, access_token: token  
        })  
      });  
    };  

    let r = await callSet(apiToken);  
    let txt = await r.text().catch(()=> "");  

    if(!r.ok && r.status === 401){  
      clearApiToken();  
      apiToken = await ensureBackendSessionToken();  
      r = await callSet(apiToken);  
      txt = await r.text().catch(()=> "");  
    }  

    if(!r.ok){  
      console.error("deleteAccount failed:", r.status, txt);  
      alert(`Hesap silinemedi. (${r.status})`);  
      return;  
    }  

    localStorage.removeItem(termsKey(email));  
    localStorage.removeItem(STORAGE_KEY);  
    localStorage.removeItem("google_id_token");  
    clearApiToken();  

    alert("Hesabın silindi.");  
    window.location.href = "/";

  }catch(e){
    console.error("deleteAccount exception:", e);
    alert("Hesap silinemedi. Lütfen tekrar dene.");
  }
}

// --------------------
// AUTH UI
// --------------------
function bindAuthUI(){
  // Index.html'de Google butonu otomatik render oluyor (HTML data-attr ile)
  // Apple butonu:
  const appleBtn = document.querySelector(".auth-btn.apple");
  if(appleBtn) appleBtn.onclick = () => {
    alert("Apple girişi hazırlanıyor. Google ile giriş yapabilirsiniz.\nÜyelik ücretsizdir.");
  };
}

// --------------------
// MENU UI BINDING
// --------------------
function bindMenuUI(){
  // Hamburger
  $("hambBtn") && ($("hambBtn").onclick = openMenu);
  $("menuOverlay") && ($("menuOverlay").onclick = (e)=>{ if(e.target === $("menuOverlay")) closeMenu(); });

  // Yeni Sohbet
  $("newChatBtn") && ($("newChatBtn").onclick = () => {
    ChatStore.newChat();
    renderChatFromStore();
    currentMode = "chat";
    closeMenu();
  });

  // Profil Kısayolu (Kart)
  const pBtn = $("profileBtn"); // Index.html'de ID profileBtn
  if(pBtn) pBtn.onclick = () => {
    closeMenu();
    goProfile();
  };

  // Menü Elemanları (Static HTML olduğu için querySelectorAll ile bul)
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
      const text = item.querySelector(".m-text")?.innerText?.trim();
      closeMenu();
      
      // Sayfa yönlendirmeleri
      if(text === "Hakkımızda") goPage("hakkimizda");
      else if(text === "İletişim") goPage("iletisim");
      else if(text === "Diyet" || text === "Plan") goDiet();
      else if(text === "Kahve Falı") openFalPanel();
      else if(text === "Tarot") location.href = "pages/tarot.html";
      else if(text === "Burç Yorumu") location.href = "pages/burc.html";
      else if(text === "Rüya") location.href = "pages/ruya.html";
      else if(text === "Gıybet Modu") { currentMode = "dedikodu"; }
      else if(text === "Hatırlatıcı") { /* Hatırlatıcı logic */ }
      else if(text === "Sohbet") { currentMode = "chat"; }
    });
  });

  // Footer Linkleri
  document.querySelectorAll(".sub-link").forEach(link => {
    link.addEventListener("click", async () => {
      if(link.innerText.includes("Güvenli Çıkış")) logout();
      if(link.innerText.includes("Hesabımı Sil")) await deleteAccount();
    });
  });
}

// --------------------
// COMPOSER
// --------------------
function bindComposer(){
  $("sendBtn") && ($("sendBtn").onclick = ()=> doSend());
  $("msgInput") && ($("msgInput").addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      doSend();
    }
  }));
}

// --------------------
// BOOT
// --------------------
document.addEventListener("DOMContentLoaded", async () => {
  document.body.classList.add("premium-ui");

  bindMenuUI();
  bindComposer();
  bindFalUI();
  bindAuthUI();

  // Bildirim sistemi init
  try { await initNotif({ baseUrl: BASE_DOMAIN }); } catch(e){}

  // GSI Wait
  try{
    await waitForGsi();
    const st = getBootState();  
    if(!st.authInited){  
      st.authInited = true;  
      initAuth();  
    }
  }catch(e){
    // GSI hatası olsa da devam et
  }

  const u = getUser();
  const logged = !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");

  if (logged) {
    $("loginOverlay")?.classList.remove("active");
    if (!u.terms_accepted_at) window.showTermsOverlay?.();
  } else {
    $("loginOverlay")?.classList.add("active");
  }

  // Arayüzü güncelle (Profil resmi burada boyanır)
  refreshPremiumBars();

  try{
    ChatStore.init();
    renderChatFromStore();
  }catch(e){}
});

window.addEventListener("pageshow", () => {
  try{ refreshPremiumBars(); }catch(e){}
});
