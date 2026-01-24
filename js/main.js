// js/main.js (v5.2 FINAL - Google Only, Pages Routing, Terms Gate + Google Login Fix)
// Statik sayfalar overlay değil: /pages/*.html üzerinden açılır.

import { BASE_DOMAIN, STORAGE_KEY } from "./config.js";
import { initAuth, handleLogin, logout, acceptTerms } from "./auth.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter } from "./chat.js";
import { openFalPanel, closeFalPanel, handleFalPhoto } from "./fal.js";

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getUser() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }
function setUser(u) { localStorage.setItem(STORAGE_KEY, JSON.stringify(u || {})); }

function firstName(full = "") {
  const s = String(full || "").trim();
  if (!s) return "";
  return s.split(/\s+/)[0];
}

// --------------------
// GLOBAL UI HOOKS (auth.js çağırır)
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
// Premium UI state
// --------------------
function refreshPremiumBars() {
  const u = getUser();
  const logged = !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");
  document.body.classList.toggle("is-logged", logged);

  const name = (u.hitap || firstName(u.fullname) || u.email || "MİSAFİR").toUpperCase();
  const hint = $("loginHint");
  if (hint && !logged) hint.textContent = "Servisler hazır. Google ile devam et evladım.";

  const yp = Number((u?.yp_percent ?? 50));
  const p = Math.max(5, Math.min(100, yp));
  if ($("ypNum")) $("ypNum").textContent = `${p}%`;
  if ($("ypFill")) $("ypFill").style.width = `${p}%`;

  const profileBtn = $("profileBtn");
  if (profileBtn) {
    profileBtn.onclick = () => {
      if (!logged) {
        $("loginOverlay")?.classList.add("active");
        if ($("loginOverlay")) $("loginOverlay").style.display = "flex";
        return;
      }
      location.href = "pages/profil.html";
    };
  }

  $("logoutBtn") && ($("logoutBtn").onclick = () => {
    if (!logged) {
      $("loginOverlay")?.classList.add("active");
      if ($("loginOverlay")) $("loginOverlay").style.display = "flex";
      return;
    }
    logout();
  });

  $("deleteAccountBtn") && ($("deleteAccountBtn").onclick = async () => {
    if (!logged) return alert("Önce giriş yap evladım.");
    await deleteAccount();
  });

  const bw = $("brandWrapper");
  if (bw) bw.dataset.user = logged ? name : "MİSAFİR";
}

// --------------------
// Menu (grid + aksiyon)
// --------------------
const MENU_ITEMS = [
  { key: "chat",       label: "Sohbet",      sub: "Dertleş",      ico: "💬" },
  { key: "dedikodu",   label: "Dedikodu",    sub: "Özel oda",     ico: "🕵️" },
  { key: "shopping",   label: "Alışveriş",   sub: "Tasarruf et",  ico: "🛍️" },
  { key: "translate",  label: "Tercüman",    sub: "Çeviri",       ico: "🌍" },
  { key: "diet",       label: "Diyet",       sub: "Plan",         ico: "🥗" },
  { key: "health",     label: "Sağlık",      sub: "Danış",        ico: "❤️" },
  { key: "special",    label: "Özel Gün",    sub: "Hatırla",      ico: "🎉" },
  { key: "reminder",   label: "Hatırlatıcı", sub: "Alarm",        ico: "⏰" },
  { key: "fal",        label: "Kahve Falı",  sub: "Günde 1",      ico: "☕" },
  { key: "tarot",      label: "Tarot",       sub: "Kart seç",     ico: "🃏" },
  { key: "horoscope",  label: "Burç",        sub: "Günlük",       ico: "♈" },
  { key: "dream",      label: "Rüya",        sub: "Yorumla",      ico: "🌙" },

  // ✅ /pages statik sayfalar (senin dosya adların)
  { key: "hakkimizda", label: "Hakkımızda",  sub: "Biz kimiz?",   ico: "ℹ️" },
  { key: "sss",        label: "SSS",         sub: "Sorular",      ico: "❓" },
  { key: "gizlilik",   label: "Gizlilik",    sub: "Güven",        ico: "🔒" },
  { key: "iletisim",   label: "İletişim",    sub: "Bize yaz",     ico: "✉️" },
  { key: "sozlesme",   label: "Sözleşme",    sub: "Kurallar",     ico: "📄" },
  { key: "uyelik",     label: "Üyelik",      sub: "Detaylar",     ico: "🪪" },
];

function populateMenuGrid() {
  const grid = $("mainMenu");
  if (!grid) return;
  if (grid.children.length > 0) return;

  grid.innerHTML = MENU_ITEMS.map(m => `
    <div class="menu-action" data-action="${m.key}">
      <div class="ico">${m.ico}</div>
      <div><div>${m.label}</div><small>${m.sub}</small></div>
    </div>
  `).join("");
}

function openMenu() { $("menuOverlay")?.classList.add("open"); }
function closeMenu() { $("menuOverlay")?.classList.remove("open"); }

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

async function handleMenuAction(action) {
  closeMenu();

  if (["hakkimizda","iletisim","gizlilik","sozlesme","sss","uyelik"].includes(action)) {
    goPage(action);
    return;
  }

  if (action === "fal") { openFalPanel(); return; }
  if (action === "reminder") { location.href = "pages/hatirlatici.html"; return; }
  if (action === "tarot") { location.href = "pages/tarot.html"; return; }
  if (action === "horoscope") { location.href = "pages/burc.html"; return; }
  if (action === "dream") { location.href = "pages/ruya.html"; return; }

  if (action === "dedikodu") { await sendForced("Dedikodu modundayız. Anlat bakalım… 😏", "dedikodu"); return; }
  if (action === "shopping") { await sendForced("Alışverişe geçtik. Ne alacaksın?", "shopping"); return; }
  if (action === "translate") { await sendForced("Çeviri: metni yapıştır, dilini söyle.", "trans"); return; }
  if (action === "diet") { await sendForced("Diyet: hedefin ne? kilo mu koruma mı?", "diet"); return; }
  if (action === "health") { await sendForced("Sağlık: ne şikayetin var?", "health"); return; }
  if (action === "special") { await sendForced("Özel gün: hangi tarihleri ekleyelim?", "chat"); return; }
  if (action === "chat") { await sendForced("Anlat bakalım evladım.", "chat"); return; }

  location.href = `pages/${action}.html`;
}

// --------------------
// Chat
// --------------------
let currentMode = "chat";
let chatHistory = [];

function setBrandState(state) {
  const bw = $("brandWrapper");
  const mf = $("mobileFrame");
  if (bw) {
    bw.classList.remove("usering","botting","thinking","talking");
    if (state) bw.classList.add(state);
  }
  if (mf) {
    mf.classList.remove("usering","botting","thinking","talking");
    if (state) mf.classList.add(state);
  }
}

async function sendForced(text, mode="chat") {
  currentMode = mode;
  await doSend(text, true);
}

function specialAnswerIfNeeded(txt){
  const s = String(txt || "").trim();
  if (/(seni\s*kim\s*(yazd[ıi]|yaratt[ıi]|yapt[ıi])|kim\s*yazd[ıi]\s*seni|kim\s*yaratt[ıi])/i.test(s)){
    return "Benim arkamda işinde tecrübeli oldukça büyük bir yazılım kadrosu var. Beni şu yazdı ya da yarattı diye kesin isim veremem; ama akıl takımının başı Oğuz Özyiğit, onu söyleyebilirim.";
  }
  return null;
}

async function doSend(forcedText = null, isSystem = false) {
  const input = $("msgInput");
  const txt = String(forcedText ?? input?.value ?? "").trim();
  if (!txt) return;

  setBrandState("usering");
  addUserBubble(txt);
  if (input && forcedText === null) input.value = "";

  chatHistory.push({ role: "user", content: txt });

  const special = specialAnswerIfNeeded(txt);
  if (special) {
    setBrandState("botting");
    setTimeout(() => setBrandState("talking"), 120);
    typeWriter(special, "chat");
    chatHistory.push({ role: "assistant", content: special });
    setTimeout(() => setBrandState(null), 650);
    return;
  }

  setTimeout(() => setBrandState("thinking"), 120);
  const holder = document.createElement("div");
  holder.className = "bubble bot loading";
  holder.textContent = "…";
  $("chat")?.appendChild(holder);
  holder.scrollIntoView({ behavior: "smooth", block: "end" });

  let reply = "Evladım bir şeyler ters gitti.";
  try {
    const out = await fetchTextResponse(txt, currentMode, chatHistory);
    reply = out?.text || reply;
  } catch (e) {}

  try { holder.remove(); } catch (e) {}

  setBrandState("botting");
  setTimeout(() => setBrandState("talking"), 120);
  typeWriter(reply, "chat");
  chatHistory.push({ role: "assistant", content: reply });
  setTimeout(() => setBrandState(null), 650);
}

// --------------------
// Fal binding
// --------------------
function bindFalUI(){
  $("closeFalBtn") && ($("closeFalBtn").onclick = () => closeFalPanel());
  const fi = $("falInput");
  if (fi) fi.onchange = () => handleFalPhoto(fi);
  const lt = $("loadingText");
  if (lt) lt.style.color = "var(--gold)";
}

// --------------------
// Account delete
// --------------------
async function deleteAccount(){
  const u0 = getUser();
  const uid = (u0?.id || "").trim();
  const email = (u0?.email || uid).trim().toLowerCase();

  if(!uid){
    alert("Önce giriş yap evladım.");
    return;
  }

  if(!confirm("Hesabını silmek istiyor musun? Bu işlem geri alınamaz.")) return;

  const idToken = (localStorage.getItem("google_id_token") || "").trim();
  if(!idToken){
    alert("Google oturumu doğrulanamadı. Çıkış yapıp tekrar giriş yap.");
    return;
  }

  try {
    const r = await fetch(`${BASE_DOMAIN}/api/profile/set`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`, // ✅
        "X-Google-Token": idToken            // ✅
      },
      body: JSON.stringify({
        user_id: uid,
        meta: {
          email: email,
          deleted_at: new Date().toISOString()
        },
        google_id_token: idToken
      })
    });

    const bodyText = await r.text().catch(()=> "");

    if(!r.ok){
      console.error("deleteAccount failed:", r.status, bodyText);
      alert(`Hesap silinemedi. (${r.status})`);
      return;
    }

    const termsKey = `caynana_terms_accepted_at::${email}`;
    localStorage.removeItem(termsKey);

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");

    alert("Hesabın silindi.");
    window.location.href = "/";
    return;

  } catch (e) {
    console.error("deleteAccount exception:", e);
    alert("Hesap silinemedi. Lütfen tekrar dene.");
  }
}

// --------------------
// Login / Terms (Google Fix)
// --------------------
async function waitForGsi(timeoutMs = 8000){
  const t0 = Date.now();
  while(Date.now() - t0 < timeoutMs){
    if(window.google?.accounts?.id) return true;
    await sleep(60);
  }
  return false;
}

// ✅ Google login: önce prompt dene (GSI hazırsa), olmazsa auth.js handleLogin'e düş
async function googleLoginSmart(){
  const hint = $("loginHint");
  try{
    if(window.google?.accounts?.id){
      // prompt deneyelim (bazı kurulumlarda renderButton/prompt initAuth içinde yapılır)
      window.google.accounts.id.prompt((n)=>{
        // Not displayed vs durumlarında fallback
        if (n?.isNotDisplayed?.() || n?.isSkippedMoment?.()){
          if(hint) hint.textContent = "Google penceresi açılamadı. Tekrar deniyorum...";
          handleLogin("google");
        }
      });
      return;
    }
  }catch(e){}

  // fallback
  handleLogin("google");
}

function bindAuthUI(){
  // Google
  $("googleLoginBtn") && ($("googleLoginBtn").onclick = () => googleLoginSmart());

  // Apple (şimdilik)
  $("appleLoginBtn") && ($("appleLoginBtn").onclick = () => {
    alert("Evladım Apple daha hazırlanıyor… Şimdilik Google’la gel 🙂");
  });

  // Terms accept
  $("termsAcceptBtn") && ($("termsAcceptBtn").onclick = async () => {
    if(!$("termsCheck")?.checked) return alert("Onayla evladım.");
    const ok = await acceptTerms();
    if(!ok) return alert("Sözleşme kaydedilemedi.");
    $("termsOverlay")?.classList.remove("active");
    if ($("termsOverlay")) $("termsOverlay").style.display = "none";
    refreshPremiumBars();
  });
}

// --------------------
// Notif UI
// --------------------
function bindNotifUI(){
  $("notifBtn") && ($("notifBtn").onclick = () => {
    $("notifDropdown")?.classList.toggle("show");
    if($("notifBadge")) $("notifBadge").style.display = "none";
  });

  document.addEventListener("click", (e)=>{
    const dd = $("notifDropdown");
    if(!dd) return;
    if(e.target?.closest?.("#notifBtn")) return;
    if(e.target?.closest?.("#notifDropdown")) return;
    dd.classList.remove("show");
  });
}

// --------------------
// Menu UI
// --------------------
function bindMenuUI(){
  $("hambBtn") && ($("hambBtn").onclick = openMenu);
  $("menuOverlay") && ($("menuOverlay").onclick = (e)=>{ if(e.target === $("menuOverlay")) closeMenu(); });

  $("newChatBtn") && ($("newChatBtn").onclick = () => {
    closeMenu();
    if ($("chat")) $("chat").innerHTML = "";
    chatHistory = [];
    setBrandState(null);
  });

  $("mainMenu") && ($("mainMenu").onclick = (e)=>{
    const it = e.target?.closest?.(".menu-action");
    if(!it) return;
    handleMenuAction(it.getAttribute("data-action"));
  });
}

// --------------------
// Composer
// --------------------
function bindComposer(){
  $("sendBtn") && ($("sendBtn").onclick = ()=> doSend());
  $("msgInput") && ($("msgInput").addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      doSend();
    }
  }));

  $("camBtn") && ($("camBtn").onclick = () => openFalPanel());
}

// --------------------
// BOOT
// --------------------
document.addEventListener("DOMContentLoaded", async ()=>{
  document.body.classList.add("premium-ui");

  populateMenuGrid();
  bindMenuUI();
  bindNotifUI();
  bindComposer();
  bindFalUI();
  bindAuthUI();

  // init notif + auth
  try { await initNotif({ baseUrl: BASE_DOMAIN }); } catch(e) {}

  // GSI bekle
  const okGsi = await waitForGsi();
  if(okGsi && $("loginHint")) $("loginHint").textContent = "Google hazır. Devam et evladım.";

  // init auth (render/prompt setup burada olmalı)
  try { initAuth(); } catch(e) {
    window.showGoogleButtonFallback?.("initAuth hata");
  }

  // logout / delete
  $("logoutBtn") && ($("logoutBtn").onclick = () => logout());
  $("deleteAccountBtn") && ($("deleteAccountBtn").onclick = () => deleteAccount());

  // session check (ilk girişte sözleşme zorunlu)
  const u = getUser();
  const logged = !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");

  if(logged){
    $("loginOverlay")?.classList.remove("active");
    if ($("loginOverlay")) $("loginOverlay").style.display = "none";
    if(!u.terms_accepted_at){
      window.showTermsOverlay?.();
    }
  } else {
    $("loginOverlay")?.classList.add("active");
    if ($("loginOverlay")) $("loginOverlay").style.display = "flex";
  }

  refreshPremiumBars();
});
