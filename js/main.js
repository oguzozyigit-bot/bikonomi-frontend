// caynana-web/js/main.js
// =========================================
// CAYNANA WEB APP - main.js (STABLE)
// - Token yokken notifications/dedikodu çağırmaz (CORS/ERR_FAILED biter)
// - Üst barda sadece ikonlar: bildirim / kaynana modu / hamburger
// - Profil bilgisi drawer içinde (dpAvatar/dpName/dpPlan/dpCN)
// - window.App (escapeHtml, showPage) sağlar (dedikodu.js uyumu)
// =========================================

/** =============================
 *  CONFIG
 *  ============================= */
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const API_CHAT_URL = `${BASE_DOMAIN}/api/chat`;
const API_SPEAK_URL = `${BASE_DOMAIN}/api/speak`;
const API_FAL_CHECK_URL = `${BASE_DOMAIN}/api/fal/check`;

const API_PROFILE_ME = `${BASE_DOMAIN}/api/profile/me`;
const API_PROFILE_SET = `${BASE_DOMAIN}/api/profile/set`;

const API_NOTIFS = `${BASE_DOMAIN}/api/notifications`; // GET (auth)
const API_DEDIKODU_INVITE = `${BASE_DOMAIN}/api/dedikodu/invite`; // POST (auth)
const API_DEDIKODU_ACCEPT = `${BASE_DOMAIN}/api/dedikodu/accept`; // POST (auth)

const GOOGLE_CLIENT_ID =
  "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";

/** =============================
 *  AUTH / TOKEN
 *  ============================= */
const TOKEN_KEY = "caynana_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function authHeaders() {
  const t = getToken();
  return t ? { Authorization: "Bearer " + t } : {};
}
function hasToken() {
  const t = getToken();
  return !!(t && t.length > 12);
}

/** =============================
 *  STATE
 *  ============================= */
let sessionId = "sess_" + Math.random().toString(36).slice(2, 10);
let currentAudio = null;
let pendingImage = null;
let currentMode = "chat";
let currentPersona = "normal";
let isSending = false;

// plan: free | plus | pro
let currentPlan = "free";
const PLAN_PERSONAS = {
  free: ["normal"],
  plus: ["normal", "sevecen", "kizgin"],
  pro: ["normal", "sevecen", "kizgin", "huysuz", "itirazci"],
};

// ✅ senin istediğin tanım
export const IS_ALTIN = () => (currentPlan || "free").toLowerCase() === "pro";

/** Fal */
let falImages = [];
const FAL_STEPS = ["1/3: Üstten çek", "2/3: Yandan çek", "3/3: Diğer yandan çek"];

/** Notifications cache (UI) */
let notifsCache = []; // {id, status, text, inviter..., room_id}

/** =============================
 *  DOM
 *  ============================= */
const $ = (id) => document.getElementById(id);

const heroImage = $("heroImage");
const heroContent = $("heroContent");
const heroTitle = $("heroTitle");
const heroDesc = $("heroDesc");

const chatContainer = $("chatContainer");
const suggestionText = $("suggestionText");

const textInput = $("text");
const sendBtn = $("sendBtn");
const camBtn = $("camBtn");
const micBtn = $("micBtn");
const fileEl = $("fileInput");

const dock = $("dock");

const personaModal = $("personaModal");
const personaBtn = $("personaBtn");
const personaClose = $("personaClose");

const drawer = $("drawer");
const drawerMask = $("drawerMask");
const menuBtn = $("menuBtn");
const drawerClose = $("drawerClose");

const authModal = $("authModal");
const accountBtn = $("accountBtn");
const authClose = $("authClose");
const authCloseX = $("authCloseX");
const authLogout = $("authLogout");

const btnLoginTab = $("btnLoginTab");
const btnRegTab = $("btnRegTab");
const authEmail = $("authEmail");
const authPass = $("authPass");
const authSubmit = $("authSubmit");
const authStatus = $("authStatus");
const googleBtn = $("googleBtn");

const pageModal = $("pageModal");
const pageTitleEl = $("pageTitle");
const pageBodyEl = $("pageBody");
const pageClose = $("pageClose");

const planBtn = $("planBtn");
const aboutBtn = $("aboutBtn");
const faqBtn = $("faqBtn");
const contactBtn = $("contactBtn");
const privacyBtn = $("privacyBtn");

// Drawer profile card
const dpAvatar = $("dpAvatar");
const dpName = $("dpName");
const dpPlan = $("dpPlan");
const dpCN = $("dpCN");
const openProfileBtn = $("openProfileBtn");

// Profile modal
const profileModal = $("profileModal");
const profileClose = $("profileClose");
const pfCloseBtn = $("pfCloseBtn");
const pfSave = $("pfSave");
const pfStatus = $("pfStatus");
const profileAvatarPreview = $("profileAvatarPreview");
const profileMainName = $("profileMainName");
const profilePlanTag = $("profilePlanTag");
const profileCNTag = $("profileCNTag");

const pfNick = $("pfNick");
const pfName = $("pfName");
const pfAge = $("pfAge");
const pfGender = $("pfGender");
const pfHeight = $("pfHeight");
const pfWeight = $("pfWeight");
const pfAvatar = $("pfAvatar");

// Notifications modal
const notifIconBtn = $("notifIconBtn");
const notifBadge = $("notifBadge");
const notifBtn = $("notifBtn");
const notifPill = $("notifPill");
const notifModal = $("notifModal");
const notifClose = $("notifClose");
const notifList = $("notifList");

// Dedikodu button in drawer (id=dedikoduBtn)
const dedikoduBtn = $("dedikoduBtn");

// Photo modal
const photoModal = $("photoModal");
const photoPreview = $("photoPreview");
const photoTitle = $("photoTitle");
const photoHint = $("photoHint");
const photoCancelBtn = $("photoCancelBtn");
const photoOkBtn = $("photoOkBtn");

// Fal UI
const falCamBtn = $("falCamBtn");
const falStepText = $("falStepText");
const falStepSub = $("falStepSub");

/** =============================
 *  UI UTILS
 *  ============================= */
function showModal(el) {
  if (el) el.classList.add("show");
}
function hideModal(el) {
  if (el) el.classList.remove("show");
}

function setAuthStatus(msg) {
  if (authStatus) authStatus.textContent = msg || "";
}

function showAuthError(err) {
  if (!authStatus) return;
  if (typeof err === "string") authStatus.textContent = "Hata: " + err;
  else if (err?.message) authStatus.textContent = "Hata: " + err.message;
  else authStatus.textContent = "Hata: bilinmeyen";
}

export function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

function showPage(title, html) {
  if (!pageModal || !pageTitleEl || !pageBodyEl) return;
  pageTitleEl.textContent = title || "";
  pageBodyEl.innerHTML = html || "";
  showModal(pageModal);

  // drawer kapat
  if (drawerMask) drawerMask.classList.remove("show");
  if (drawer) drawer.classList.remove("open");
}
function hidePage() {
  hideModal(pageModal);
}

// dedikodu.js için
window.App = { escapeHtml, showPage };

function scrollToBottom(force = false) {
  if (!chatContainer) return;
  if (force) {
    requestAnimationFrame(() => (chatContainer.scrollTop = chatContainer.scrollHeight));
    return;
  }
  const near = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) < 260;
  if (!near) return;
  requestAnimationFrame(() => (chatContainer.scrollTop = chatContainer.scrollHeight));
}
window.addEventListener("resize", () => scrollToBottom(true));

function assetUrl(relPath) {
  return new URL(`../${relPath}`, import.meta.url).href;
}

/** =============================
 *  MODES
 *  ============================= */
const MODES = {
  chat: {
    label: "Sohbet",
    icon: "fa-comments",
    color: "#FFB300",
    title: "Caynana ile<br>iki lafın belini kır.",
    desc: "Biraz dur bakalım, neler anlatacaksın?",
    img: assetUrl("images/hero-chat.png"),
    ph: "Naber Caynana?",
    sugg: "Benim zamanımda her şey daha güzeldi ah ah…",
    heroStyle: { top: "100px", left: "24px", textAlign: "left", width: "auto", maxWidth: "70%" },
  },

  // Dedikodu modu dock'ta dursun (şimdilik herkese aç)
  dedikodu: {
    label: "Dedikodu",
    icon: "fa-people-group",
    color: "#111111",
    title: "Dedikodu Odası",
    desc: "Evladım burada lafın ucu kaçar…",
    img: assetUrl("images/hero-dedikodu.png"),
    ph: "",
    sugg: "Dedikodu varsa ben buradayım…",
    heroStyle: { top: "110px", left: "0", textAlign: "center", width: "100%", maxWidth: "100%" },
  },

  shopping: {
    label: "Alışveriş",
    icon: "fa-bag-shopping",
    color: "#00C897",
    title: "Almadan önce<br>Caynana’ya sor.",
    desc: "Sonra “keşke” dememek için buradayım.",
    img: assetUrl("images/hero-shopping.png"),
    ph: "Ne arıyorsun evladım?",
    sugg: "Her indirime atlayan sonunda pahalı öder.",
    heroStyle: { top: "110px", left: "0", textAlign: "center", width: "100%", maxWidth: "100%" },
  },

  fal: {
    label: "Fal",
    icon: "fa-mug-hot",
    color: "#8B5CF6",
    title: "Fincanı kapat<br>tabakla gönder.",
    desc: "3 açı çek: üstten, yandan, diğer yandan.",
    img: assetUrl("images/hero-fal.png"),
    ph: "",
    sugg: "Sadece fincan + tabak.",
    heroStyle: { top: "100px", left: "0", textAlign: "center", width: "100%", maxWidth: "100%" },
  },

  health: {
    label: "Sağlık",
    icon: "fa-heart-pulse",
    color: "#EF4444",
    title: "Caynana Sağlık'la<br>turp gibi ol.",
    desc: "Neren ağrıyor söyle bakayım?",
    img: assetUrl("images/hero-health.png"),
    ph: "Şikayetin ne?",
    sugg: "Çay üstüne sakın soğuk su içme!",
    heroStyle: { top: "110px", left: "24px", textAlign: "left", width: "auto", maxWidth: "70%" },
  },

  diet: {
    label: "Diyet",
    icon: "fa-carrot",
    color: "#84CC16",
    title: "Sağlıklı beslen<br>zinde kal!",
    desc: "Açlıktan değil, keyiften yiyin.",
    img: assetUrl("images/hero-diet.png"),
    ph: "Boy kilo kaç?",
    sugg: "Ekmek değil, yeşillik ye.",
    heroStyle: { top: "100px", left: "24px", textAlign: "left", width: "auto", maxWidth: "75%" },
  },
};

/** =============================
 *  HERO APPLY
 *  ============================= */
function applyHero(modeKey) {
  const m = MODES[modeKey] || MODES.chat;

  document.documentElement.style.setProperty("--primary", m.color);

  if (heroImage) heroImage.src = m.img;
  if (heroTitle) heroTitle.innerHTML = m.title;
  if (heroDesc) heroDesc.innerHTML = m.desc;

  const hs = m.heroStyle || {};
  if (heroContent) {
    heroContent.style.top = hs.top || "100px";
    heroContent.style.left = hs.left || "24px";
    heroContent.style.textAlign = hs.textAlign || "left";
    heroContent.style.width = hs.width || "auto";
    heroContent.style.maxWidth = hs.maxWidth || "70%";
  }

  if (textInput) textInput.placeholder = m.ph || "Bir şey yaz...";
  if (suggestionText) suggestionText.textContent = m.sugg || "";

  const dyn = document.querySelector(".oz-l-dynamic");
  if (dyn) dyn.style.background = m.color;

  // fal mode toggle
  document.body.classList.toggle("fal-mode", modeKey === "fal");
}

/** =============================
 *  DOCK
 *  ============================= */
function renderDock() {
  if (!dock) return;
  dock.innerHTML = "";

  Object.keys(MODES).forEach((k) => {
    const m = MODES[k];
    const item = document.createElement("div");
    item.className = "dock-item" + (k === currentMode ? " active" : "");
    item.setAttribute("data-mode", k);
    item.innerHTML = `
      <div class="icon-box"><i class="fa-solid ${m.icon}"></i></div>
      <div class="dock-label">${m.label}</div>
    `;
    item.onclick = () => switchMode(k);
    dock.appendChild(item);
  });
}

/** =============================
 *  MODE SWITCH
 *  ============================= */
const modeChats = {};
function saveCurrentModeChat() {
  if (!chatContainer) return;
  modeChats[currentMode] = chatContainer.innerHTML || "";
}
function loadModeChat(modeKey) {
  if (!chatContainer || !heroContent) return;

  chatContainer.innerHTML = modeChats[modeKey] || "";
  if (!chatContainer.innerHTML.trim()) {
    heroContent.style.display = "block";
    chatContainer.style.display = "none";
  } else {
    heroContent.style.display = "none";
    chatContainer.style.display = "block";
    scrollToBottom(true);
  }
}

// Brand tap cycle
const modeKeys = Object.keys(MODES);
function cycleMode(step = 1) {
  const idx = modeKeys.indexOf(currentMode);
  const next = modeKeys[(idx + step + modeKeys.length) % modeKeys.length];
  switchMode(next);
}

async function switchMode(modeKey) {
  if (modeKey === currentMode) return;

  // Dedikodu: ayrı panel (sayfa)
  if (modeKey === "dedikodu") {
    applyHero("dedikodu");
    // Token yoksa sadece bilgilendir
    if (!hasToken()) {
      showPage(
        "Dedikodu Odası",
        `<div style="font-weight:1000;color:#111;">Önce giriş yap</div>
         <div style="margin-top:8px;color:#444;font-weight:900;">Dedikodu Odası için hesap gerekli evladım 🙂</div>`
      );
      return;
    }
    // dedikodu.js yükle (varsa)
    try {
      const mod = await import("./dedikodu.js");
      if (mod?.openPanel) mod.openPanel();
      else if (window.Dedikodu?.openPanel) window.Dedikodu.openPanel();
      else showPage("Dedikodu Odası", `<div style="font-weight:900;">dedikodu.js bulunamadı</div>`);
    } catch (e) {
      showPage("Dedikodu Odası", `<div style="font-weight:900;">Hata:</div><div>${escapeHtml(e?.message || "")}</div>`);
    }
    return;
  }

  saveCurrentModeChat();
  currentMode = modeKey;

  document.querySelectorAll(".dock-item").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-mode") === modeKey);
  });

  applyHero(modeKey);
  loadModeChat(modeKey);

  if (modeKey === "fal") resetFalCapture();
}

/** =============================
 *  PERSONA LOCKS
 *  ============================= */
function allowedPersonas() {
  return PLAN_PERSONAS[currentPlan] || ["normal"];
}
function refreshPersonaLocks() {
  const allow = new Set(allowedPersonas());
  document.querySelectorAll("#personaModal .persona-opt").forEach((opt) => {
    const id = opt.getAttribute("data-persona");
    const icon = opt.querySelector("i");

    if (id === currentPersona) {
      opt.classList.add("selected");
      opt.classList.remove("locked");
      if (icon) {
        icon.className = "fa-solid fa-check";
        icon.style.display = "block";
      }
      return;
    }

    opt.classList.remove("selected");
    if (!allow.has(id)) {
      opt.classList.add("locked");
      if (icon) {
        icon.className = "fa-solid fa-lock";
        icon.style.display = "block";
      }
    } else {
      opt.classList.remove("locked");
      if (icon) icon.style.display = "none";
    }
  });
}

/** =============================
 *  BACKEND: PLAN / PROFILE
 *  ============================= */
export async function pullPlanFromBackend() {
  if (!hasToken()) {
    currentPlan = "free";
    refreshPersonaLocks();
    return;
  }
  try {
    const r = await fetch(`${BASE_DOMAIN}/api/memory/get`, { headers: { ...authHeaders() } });
    const j = await r.json().catch(() => ({}));
    const plan = ((j.profile || {}).plan || "free").toLowerCase();
    currentPlan = plan === "plus" || plan === "pro" ? plan : "free";
  } catch {
    currentPlan = "free";
  }
  refreshPersonaLocks();
}

// Drawer + Profile modal için /api/profile/me
async function pullProfileMeAndRender() {
  // token yoksa misafir göster
  if (!hasToken()) {
    setDrawerProfileUI({ plan: "free", display_name: "Misafir", caynana_id: "CN-????", avatar_url: "" });
    return;
  }

  try {
    const r = await fetch(API_PROFILE_ME, { headers: { ...authHeaders() } });
    const j = await r.json().catch(() => ({}));
    // j: {plan, caynana_id, display_name, profile:{...}}
    setDrawerProfileUI({
      plan: j.plan || "free",
      display_name: j.display_name || "Misafir",
      caynana_id: j.caynana_id || "CN-????",
      avatar_url: (j.profile || {}).avatar_url || "",
      profile: j.profile || {},
    });

    // plan state'i buradan da güncelleyebiliriz
    currentPlan = (j.plan || currentPlan || "free").toLowerCase();
    refreshPersonaLocks();
  } catch {
    // sessiz geç
  }
}

function setDrawerProfileUI({ plan, display_name, caynana_id, avatar_url, profile }) {
  const safeName = (display_name || "Misafir").trim() || "Misafir";
  const safePlan = (plan || "free").toString().toUpperCase();
  const safeCN = (caynana_id || "CN-????").toString();

  if (dpName) dpName.textContent = safeName;
  if (dpPlan) dpPlan.textContent = safePlan;
  if (dpCN) dpCN.textContent = safeCN;

  const av = avatar_url || "https://via.placeholder.com/80";
  if (dpAvatar) dpAvatar.src = av;

  // profile modal head
  if (profileAvatarPreview) profileAvatarPreview.src = av;
  if (profileMainName) profileMainName.textContent = safeName;
  if (profilePlanTag) profilePlanTag.textContent = safePlan;
  if (profileCNTag) profileCNTag.textContent = safeCN;

  // form doldur
  if (profile) {
    if (pfNick) pfNick.value = profile.nickname || "";
    if (pfName) pfName.value = profile.full_name || "";
    if (pfAge) pfAge.value = profile.age ?? "";
    if (pfGender) pfGender.value = profile.gender || "";
    if (pfHeight) pfHeight.value = profile.height_cm ?? "";
    if (pfWeight) pfWeight.value = profile.weight_kg ?? "";
    if (pfAvatar) pfAvatar.value = profile.avatar_url || "";
  }
}

/** =============================
 *  NOTIFICATIONS (ONLY on click)
 *  ============================= */
async function fetchNotificationsSafe() {
  if (!hasToken()) return [];
  const r = await fetch(API_NOTIFS, { headers: { ...authHeaders() } });
  if (r.status === 401) return [];
  const j = await r.json().catch(() => ({}));
  return j.items || [];
}

async function openNotificationsModal() {
  // token yoksa uyar
  if (!hasToken()) {
    showPage(
      "Bildirimler",
      `<div style="font-weight:1000;color:#111;">Giriş gerekli</div>
       <div style="margin-top:8px;color:#444;font-weight:900;">Bildirimleri görmek için önce giriş yap evladım.</div>`
    );
    return;
  }

  // modal aç
  if (notifList) notifList.innerHTML = `<div style="font-weight:900;color:#666;">Yükleniyor…</div>`;
  showModal(notifModal);

  try {
    const items = await fetchNotificationsSafe();
    notifsCache = items;

    renderNotifs(items);
    updateNotifBadges(items);
  } catch (e) {
    if (notifList) notifList.innerHTML = `<div style="font-weight:900;color:#b00;">${escapeHtml(e?.message || "Hata")}</div>`;
  }
}

function updateNotifBadges(items) {
  const unread = (items || []).length;

  // üstteki küçük badge (zil üstü)
  if (notifBadge) {
    if (unread > 0) {
      notifBadge.style.display = "flex";
      notifBadge.textContent = String(unread > 99 ? "99+" : unread);
    } else {
      notifBadge.style.display = "none";
    }
  }

  // drawer içindeki pill
  if (notifPill) {
    if (unread > 0) {
      notifPill.style.display = "inline-block";
      notifPill.textContent = String(unread > 99 ? "99+" : unread);
    } else {
      notifPill.style.display = "none";
    }
  }
}

function renderNotifs(items) {
  if (!notifList) return;

  const list = items || [];
  if (!list.length) {
    notifList.innerHTML = `<div style="font-weight:900;color:#666;">Bildirim yok.</div>`;
    return;
  }

  notifList.innerHTML = "";
  list.forEach((it) => {
    const box = document.createElement("div");
    box.className = "notifItem unread";

    const inviter =
      (it.inviter_nickname || it.inviter_full_name || "Bir kullanıcı").toString();

    const text =
      it.text ||
      `${inviter} seni Dedikodu Odası'na çağırdı.`;

    box.innerHTML = `
      <div class="notifItemTitle">Dedikodu Daveti</div>
      <div class="notifItemBody">${escapeHtml(text)}</div>
      <div class="notifActions">
        <button class="nBtn" data-act="reject" data-id="${escapeHtml(it.id || "")}">Reddet</button>
        <button class="nBtn primary" data-act="accept" data-id="${escapeHtml(it.id || "")}">Kabul</button>
      </div>
    `;
    notifList.appendChild(box);
  });

  notifList.querySelectorAll("button").forEach((b) => {
    b.onclick = async () => {
      const act = b.getAttribute("data-act");
      const id = b.getAttribute("data-id");

      // server şeması sende: accept invite_id istiyor -> burada item.id invite_id ise çalışır
      // items'ta "id" invite id geliyor (backend koduna göre)
      try {
        if (act === "accept") {
          await fetch(API_DEDIKODU_ACCEPT, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ invite_id: id }),
          });
          showPage("Dedikodu Odası", `<div style="font-weight:1000;color:#111;">Kabul edildi ✅</div>`);
        } else {
          // reject endpoint yoksa sessiz geç
          showPage("Bildirim", `<div style="font-weight:1000;color:#111;">Reddedildi</div>`);
        }

        // modal kapat + badge yenile
        hideModal(notifModal);
        const items = await fetchNotificationsSafe();
        updateNotifBadges(items);
      } catch (e) {
        showPage("Hata", `<div style="font-weight:900;color:#111;">${escapeHtml(e?.message || "Hata")}</div>`);
      }
    };
  });
}

/** =============================
 *  GOOGLE SIGN-IN (GSI)
 *  ============================= */
function ensureGoogleButton() {
  if (!googleBtn) return;
  googleBtn.innerHTML = "";

  if (!window.google?.accounts?.id) {
    showAuthError("Google bileşeni yüklenmedi. (Android System WebView/Chrome güncel mi?)");
    return;
  }

  try {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (resp) => {
        try {
          setAuthStatus("Google ile giriş yapılıyor…");
          const r = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: resp.credential }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.detail || "Google giriş hatası");

          setToken(j.token);
          setAuthStatus(`Bağlandı ✅ (${j.email || "Google"})`);

          await pullPlanFromBackend();
          await pullProfileMeAndRender();
          updateNotifBadges(await fetchNotificationsSafe());

          setTimeout(() => hideModal(authModal), 450);
        } catch (e) {
          showAuthError(e);
        }
      },
    });

    google.accounts.id.renderButton(googleBtn, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 280,
    });
  } catch (e) {
    showAuthError(e);
  }
}

/** =============================
 *  EMAIL AUTH
 *  ============================= */
let authMode = "login";

async function handleAuthSubmit() {
  const email = (authEmail?.value || "").trim();
  const password = (authPass?.value || "").trim();
  setAuthStatus("İşlem yapıyorum…");

  try {
    const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const r = await fetch(`${BASE_DOMAIN}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.detail || "Hata");

    setToken(j.token);
    setAuthStatus(`Bağlandı ✅ (${j.email || email})`);

    await pullPlanFromBackend();
    await pullProfileMeAndRender();
    updateNotifBadges(await fetchNotificationsSafe());

    setTimeout(() => hideModal(authModal), 450);
  } catch (e) {
    showAuthError(e);
  }
}

/** =============================
 *  PROFILE SAVE
 *  ============================= */
async function saveProfile() {
  if (!hasToken()) {
    if (pfStatus) pfStatus.textContent = "Giriş yapmadan profil kaydedilmez.";
    return;
  }

  const body = {
    nickname: pfNick?.value || "",
    full_name: pfName?.value || "",
    age: pfAge?.value ? Number(pfAge.value) : null,
    gender: pfGender?.value || "",
    height_cm: pfHeight?.value ? Number(pfHeight.value) : null,
    weight_kg: pfWeight?.value ? Number(pfWeight.value) : null,
    avatar_url: pfAvatar?.value || "",
  };

  // null'ları temizle
  Object.keys(body).forEach((k) => {
    if (body[k] === null) delete body[k];
  });

  if (pfStatus) pfStatus.textContent = "Kaydediliyor…";

  try {
    const r = await fetch(API_PROFILE_SET, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.detail || "Kaydedilemedi");

    if (pfStatus) pfStatus.textContent = "Kaydedildi ✅";
    await pullProfileMeAndRender();
    setTimeout(() => hideModal(profileModal), 450);
  } catch (e) {
    if (pfStatus) pfStatus.textContent = "Hata: " + (e?.message || "Bilinmeyen");
  }
}

/** =============================
 *  MIC
 *  ============================= */
function startMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return alert("Tarayıcı desteklemiyor");
  const r = new SR();
  r.lang = "tr-TR";
  r.onresult = (e) => {
    if (textInput) textInput.value = e.results[0][0].transcript;
    send();
  };
  r.start();
}

/** =============================
 *  FAL UI
 *  ============================= */
function setFalStepUI() {
  if (!falStepText || !falStepSub) return;
  if (falImages.length < 3) {
    falStepText.textContent = "Fal için 3 fotoğraf çek";
    falStepSub.textContent = FAL_STEPS[falImages.length] || "1/3: Üstten çek";
  } else {
    falStepText.textContent = "Fal hazır…";
    falStepSub.textContent = "Yorum hazırlanıyor";
  }
}
function resetFalCapture() {
  falImages = [];
  setFalStepUI();
}

/** =============================
 *  PHOTO / FAL
 *  ============================= */
function openCamera() {
  if (!fileEl) return;
  fileEl.value = "";
  fileEl.click();
}
function openFalCamera() {
  openCamera();
}

async function falCheckOneImage(dataUrl) {
  try {
    const r = await fetch(API_FAL_CHECK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    return await r.json();
  } catch {
    return { ok: false, reason: "Kontrol edemedim, tekrar dene." };
  }
}

function resetModalOnly() {
  pendingImage = null;
  if (photoPreview) photoPreview.src = "";
  hideModal(photoModal);
  if (fileEl) fileEl.value = "";
}

if (fileEl) {
  fileEl.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const imgData = reader.result;

      if (currentMode === "fal") {
        const check = await falCheckOneImage(imgData);
        if (!check.ok) {
          await addBubble("ai", check.reason || "Evladım bu fincan-tabak değil. Yeniden çek.", false, "");
          resetModalOnly();
          setTimeout(() => openFalCamera(), 200);
          return;
        }

        falImages.push(imgData);
        setFalStepUI();

        pendingImage = imgData;
        if (photoPreview) photoPreview.src = pendingImage;
        if (photoTitle) photoTitle.textContent = "Fal fotoğrafı";
        if (photoHint) {
          photoHint.textContent =
            falImages.length < 3 ? `Tamam deyince ${FAL_STEPS[falImages.length] || "sonraki açı"} geçiyoruz.` : "Tamam deyince fala bakıyorum.";
        }
        showModal(photoModal);
        return;
      }

      pendingImage = imgData;
      if (photoPreview) photoPreview.src = pendingImage;
      if (photoTitle) photoTitle.textContent = "Fotoğraf hazır";
      if (photoHint) photoHint.textContent = "Tamam deyince Caynana hemen yoruma başlayacak.";
      showModal(photoModal);
    };
    reader.readAsDataURL(f);
  });
}

if (photoCancelBtn) {
  photoCancelBtn.onclick = () => {
    if (currentMode === "fal") {
      falImages = falImages.slice(0, Math.max(0, falImages.length - 1));
      setFalStepUI();
    }
    resetModalOnly();
  };
}
if (photoOkBtn) {
  photoOkBtn.onclick = async () => {
    hideModal(photoModal);

    if (currentMode === "fal") {
      if (falImages.length < 3) {
        setTimeout(() => openFalCamera(), 220);
        return;
      }
      pendingImage = falImages[falImages.length - 1];
      if (textInput) textInput.value = "Fal bak: fincanı 3 açıdan gönderdim. Gerçekçi ve insani anlat.";
      await send();
      resetFalCapture();
      return;
    }

    if (textInput) textInput.value = "";
    await send();
  };
}

/** =============================
 *  CHAT BUBBLES
 *  ============================= */
async function typeWriterEffect(el, text, speed = 26) {
  return new Promise((resolve) => {
    let i = 0;
    el.innerHTML = "";
    el.classList.add("typing-cursor");

    function tick() {
      if (i < text.length) {
        el.textContent += text.charAt(i++);
        scrollToBottom(true);
        setTimeout(tick, speed);
      } else {
        el.classList.remove("typing-cursor");
        if (window.DOMPurify && window.marked) el.innerHTML = DOMPurify.sanitize(marked.parse(text));
        else el.textContent = text;
        scrollToBottom(true);
        resolve();
      }
    }
    tick();
  });
}

async function addBubble(role, text, isLoader = false, speech = "", imgData = null, id = null) {
  if (!chatContainer || !heroContent) return null;

  const div = document.createElement("div");
  div.className = "msg " + role;
  if (id) div.id = id;

  let content = "";
  if (imgData) content += `<img class="chat-img" src="${imgData}" onclick="event.stopPropagation()">`;

  div.innerHTML = `<div class="bubble">${content}</div>`;
  const bubble = div.querySelector(".bubble");

  chatContainer.appendChild(div);
  heroContent.style.display = "none";
  chatContainer.style.display = "block";
  scrollToBottom(true);

  if (role === "ai" && !isLoader) {
    await typeWriterEffect(bubble, text);
  } else {
    bubble.innerHTML += role === "user" ? escapeHtml(text) : text;
  }

  if (role === "ai") {
    const sp = (speech && speech.trim()) ? speech : (text || "").replace(/[*_`#>-]/g, "").slice(0, 280);
    const btn = document.createElement("div");
    btn.className = "audio-btn";
    btn.dataset.speech = sp;
    btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    div.appendChild(btn);
  }

  scrollToBottom(true);
  return div;
}

/** =============================
 *  AUDIO (TTS)
 *  ============================= */
if (chatContainer) {
  chatContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".audio-btn");
    if (!btn) return;
    await playAudio(btn.dataset.speech, btn);
  });
}

async function playAudio(text, btn) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  document.querySelectorAll(".audio-btn.playing").forEach((b) => {
    b.classList.remove("playing");
    b.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
  });

  const oldHtml = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor`;

  try {
    const r = await fetch(API_SPEAK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ text, persona: currentPersona }),
    });

    const blob = await r.blob();
    currentAudio = new Audio(URL.createObjectURL(blob));
    currentAudio.onended = () => {
      btn.classList.remove("playing");
      btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    };
    await currentAudio.play();
    btn.classList.add("playing");
    btn.innerHTML = `<i class="fa-solid fa-stop"></i> Durdur`;
  } catch {
    btn.innerHTML = oldHtml;
  }
}

/** =============================
 *  SEND
 *  ============================= */
async function send() {
  if (isSending) return;
  if (!textInput || !sendBtn) return;

  let val = (textInput.value || "").trim();
  if (pendingImage && val === "") val = "Bu resmi yorumla";
  if (!val && !pendingImage) return;

  isSending = true;
  sendBtn.disabled = true;

  await addBubble("user", val, false, "", pendingImage);
  textInput.value = "";

  const loaderId = "ldr_" + Date.now();
  await addBubble("ai", "<i class='fa-solid fa-spinner fa-spin'></i>", true, "", null, loaderId);

  const payload = {
    message: val,
    session_id: sessionId,
    image: pendingImage,
    mode: currentMode,
    persona: currentPersona,
  };
  pendingImage = null;

  try {
    const res = await fetch(API_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    const loader = document.getElementById(loaderId);
    if (loader) loader.remove();

    await addBubble("ai", data.assistant_text || "Bir şey diyemedim evladım.", false, data.speech_text || "");
  } catch {
    const loader = document.getElementById(loaderId);
    if (loader) loader.remove();
    await addBubble("ai", "Bağlantı hatası oldu evladım. Bir daha dene.", false, "");
  } finally {
    isSending = false;
    sendBtn.disabled = false;
  }
}

/** =============================
 *  PAGES
 *  ============================= */
function planHtml() {
  return `
    <div style="display:grid; gap:10px;">
      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="font-weight:1000;color:#111;">Free</div>
        <div style="margin-top:6px;color:#444;font-weight:800;line-height:1.45;">Günlük <b>2 fal</b> • Sınırlı sohbet</div>
      </div>
      <div style="padding:12px;border:2px solid var(--primary);border-radius:16px;background:#fff8e1;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:1000;color:#111;">Plus</div>
          <div style="font-weight:1000;color:var(--primary);">79,99 TL</div>
        </div>
        <div style="margin-top:6px;color:#444;font-weight:800;line-height:1.45;">Daha fazla limit</div>
      </div>
      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:1000;color:#111;">Pro</div>
          <div style="font-weight:1000;color:#111;">119,99 TL</div>
        </div>
        <div style="margin-top:6px;color:#444;font-weight:800;line-height:1.45;">Sınırsız</div>
      </div>
    </div>
  `;
}
function aboutHtml() {
  return `<p><b>Caynana</b> — Yapay zekânın geleneksel aklı.</p>`;
}
function faqHtml() {
  return `<p><b>SSS</b> yakında.</p>`;
}
function contactHtml() {
  return `<p>Destek: <b>support@caynana.ai</b></p>`;
}
function privacyHtml() {
  return `<p>Gizlilik yakında.</p>`;
}

/** =============================
 *  EVENTS
 *  ============================= */
function bindEvents() {
  // Persona modal
  if (personaBtn && personaModal) {
    personaBtn.onclick = () => {
      refreshPersonaLocks();
      showModal(personaModal);
    };
  }
  if (personaClose && personaModal) personaClose.onclick = () => hideModal(personaModal);
  if (personaModal) personaModal.addEventListener("click", (e) => { if (e.target === personaModal) hideModal(personaModal); });

  document.querySelectorAll("#personaModal .persona-opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      const id = opt.getAttribute("data-persona");
      const allow = new Set(allowedPersonas());
      if (!allow.has(id)) {
        hideModal(personaModal);
        showPage("Üyelik", planHtml());
        return;
      }
      currentPersona = id;
      refreshPersonaLocks();
      setTimeout(() => hideModal(personaModal), 150);
    });
  });

  // Drawer
  if (menuBtn && drawer && drawerMask) menuBtn.onclick = () => { drawerMask.classList.add("show"); drawer.classList.add("open"); };
  if (drawerClose && drawer && drawerMask) drawerClose.onclick = () => { drawerMask.classList.remove("show"); drawer.classList.remove("open"); };
  if (drawerMask && drawer) drawerMask.onclick = () => { drawerMask.classList.remove("show"); drawer.classList.remove("open"); };

  // Page modal
  if (pageClose) pageClose.onclick = hidePage;
  if (pageModal) pageModal.addEventListener("click", (e) => { if (e.target === pageModal) hidePage(); });

  // Auth modal (drawer item)
  if (accountBtn && authModal) {
    accountBtn.onclick = () => {
      showModal(authModal);
      setAuthStatus(hasToken() ? "Bağlı ✅" : "Bağlı değil ❌");
      setTimeout(ensureGoogleButton, 120);
    };
  }
  if (authClose) authClose.onclick = () => hideModal(authModal);
  if (authCloseX) authCloseX.onclick = () => hideModal(authModal);
  if (authModal) authModal.addEventListener("click", (e) => { if (e.target === authModal) hideModal(authModal); });

  // Auth tabs
  if (btnLoginTab && btnRegTab && authSubmit) {
    btnLoginTab.onclick = () => {
      authMode = "login";
      btnLoginTab.classList.add("tabActive");
      btnRegTab.classList.remove("tabActive");
      authSubmit.textContent = "Giriş Yap";
    };
    btnRegTab.onclick = () => {
      authMode = "register";
      btnRegTab.classList.add("tabActive");
      btnLoginTab.classList.remove("tabActive");
      authSubmit.textContent = "Kayıt Ol";
    };
  }
  if (authSubmit) authSubmit.onclick = handleAuthSubmit;

  // Logout
  if (authLogout) {
    authLogout.onclick = async () => {
      setToken("");
      currentPlan = "free";
      currentPersona = "normal";
      refreshPersonaLocks();
      setAuthStatus("Çıkış yapıldı ❌");
      await pullProfileMeAndRender();
      updateNotifBadges([]);
    };
  }

  // Drawer pages
  if (planBtn) planBtn.onclick = () => showPage("Üyelik", planHtml());
  if (aboutBtn) aboutBtn.onclick = () => showPage("Hakkımızda", aboutHtml());
  if (faqBtn) faqBtn.onclick = () => showPage("Sık Sorulan Sorular", faqHtml());
  if (contactBtn) contactBtn.onclick = () => showPage("İletişim", contactHtml());
  if (privacyBtn) privacyBtn.onclick = () => showPage("Gizlilik", privacyHtml());

  // Brand tap: mode cycle
  if (brandTap) brandTap.onclick = () => cycleMode(1);

  // Camera/Mic/Send
  if (camBtn) camBtn.onclick = () => openCamera();
  if (falCamBtn) falCamBtn.onclick = () => openFalCamera();
  if (micBtn) micBtn.onclick = () => startMic();
  if (textInput) textInput.addEventListener("keypress", (e) => { if (e.key === "Enter") send(); });
  if (sendBtn) sendBtn.onclick = () => send();

  // Fal camera button (fal mode UI)
  if (falCamBtn) falCamBtn.onclick = () => openFalCamera();

  // Drawer profile edit
  if (openProfileBtn && profileModal) {
    openProfileBtn.onclick = async () => {
      if (pfStatus) pfStatus.textContent = "";
      showModal(profileModal);
      await pullProfileMeAndRender();
    };
  }
  if (profileClose) profileClose.onclick = () => hideModal(profileModal);
  if (pfCloseBtn) pfCloseBtn.onclick = () => hideModal(profileModal);
  if (pfSave) pfSave.onclick = () => saveProfile();

  // Notifications: üst zil + drawer bildirim
  if (notifIconBtn) notifIconBtn.onclick = () => openNotificationsModal();
  if (notifBtn) notifBtn.onclick = () => openNotificationsModal();
  if (notifClose) notifClose.onclick = () => hideModal(notifModal);
  if (notifModal) notifModal.addEventListener("click", (e) => { if (e.target === notifModal) hideModal(notifModal); });

  // Dedikodu drawer
  if (dedikoduBtn) {
    dedikoduBtn.onclick = () => switchMode("dedikodu");
  }
}

/** =============================
 *  INIT
 *  ============================= */
async function init() {
  // Dock + hero
  renderDock();
  applyHero("chat");
  loadModeChat("chat");
  setFalStepUI();

  bindEvents();

  // plan/profile sadece token varsa çek
  await pullPlanFromBackend();
  await pullProfileMeAndRender();

  // ✅ token varsa badge hesapla (ama SAYFA açılır açılmaz çağırma istemiyorsan burayı kapatabilirsin)
  // ben burada token varsa sessizce 1 kez çekiyorum (UI için)
  if (hasToken()) {
    try {
      const items = await fetchNotificationsSafe();
      updateNotifBadges(items);
    } catch {
      // sessiz
    }
  } else {
    updateNotifBadges([]);
  }
}

init();
