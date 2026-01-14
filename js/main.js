// CAYNANA WEB - main.js (FINAL v6000)
// ✅ Tek dosya, çakışma yok, JS içine CSS YAZILMAZ.
// ✅ Giriş yoksa: chat gönderme yok, mod yok, persona yok, kamera/mic yok.
// ✅ Giriş varsa: tüm modlar + persona serbest (kilit yok).
// ✅ Shopping: ürünleri TEK TEK, premium kart olarak basar. Fiyat yoksa fiyat/puan göstermez.
// ✅ Swipe + çift tık: giriş varsa çalışır.

export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const API_URL = `${BASE_DOMAIN}/api/chat`;
const SPEAK_URL = `${BASE_DOMAIN}/api/speak`;
const FAL_CHECK_URL = `${BASE_DOMAIN}/api/fal/check`;
const NOTIF_URL = `${BASE_DOMAIN}/api/notifications`;
const PROFILE_ME_URL = `${BASE_DOMAIN}/api/profile/me`;

const GOOGLE_CLIENT_ID =
  "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";

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

// -------------------------
// GLOBAL FAILSAFE (siyah ekranı bitirir)
// -------------------------
window.addEventListener("error", (e) => {
  try {
    const msg = (e && (e.message || e.error?.message)) || "Bilinmeyen JS hatası";
    const box = document.createElement("div");
    box.style.cssText =
      "position:fixed;inset:12px;z-index:999999;background:#111;color:#fff;padding:14px;border-radius:14px;font:14px/1.4 system-ui;overflow:auto;";
    box.innerHTML =
      `<b>JS HATASI:</b><br>${msg}<br><br>` +
      `<small>Dosya: ${(e && e.filename) || "-"}<br>Satır: ${(e && e.lineno) || "-"}:${(e && e.colno) || "-"}</small>`;
    document.body.appendChild(box);
  } catch {}
});

// -------------------------
// STATE
// -------------------------
let sessionId = "sess_" + Math.random().toString(36).slice(2, 10);
let pendingImage = null;
let currentAudio = null;
let isSending = false;

let currentMode = "chat";
let currentPersona = "normal";

let currentPlan = "free";

// fal
let falImages = [];
const FAL_STEPS = ["1/3: Üstten çek", "2/3: Yandan çek", "3/3: Diğer yandan çek"];

if (window.marked) marked.setOptions({ mangle: false, headerIds: false });

const $ = (id) => document.getElementById(id);

// -------------------------
// DOM
// -------------------------
const mainEl = $("main");
const heroImage = $("heroImage");
const heroContent = $("heroContent");
const heroTitle = $("heroTitle");
const heroDesc = $("heroDesc");
const suggestionText = $("suggestionText");

const chatContainer = $("chatContainer");
const textInput = $("text");
const sendBtn = $("sendBtn");

const dock = $("dock");
const fileEl = $("fileInput");

const photoModal = $("photoModal");
const photoPreview = $("photoPreview");
const photoTitle = $("photoTitle");
const photoHint = $("photoHint");
const photoCancelBtn = $("photoCancelBtn");
const photoOkBtn = $("photoOkBtn");

const personaModal = $("personaModal");
const personaBtn = $("personaBtn");
const personaClose = $("personaClose");

const drawer = $("drawer");
const drawerMask = $("drawerMask");
const menuBtn = $("menuBtn");
const drawerClose = $("drawerClose");

const authModal = $("authModal");
const accountBtn = $("accountBtn");
const authCloseX = $("authCloseX");
const authClose = $("authClose");
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

const brandTap = $("brandTap");
const camBtn = $("camBtn");
const micBtn = $("micBtn");
const falCamBtn = $("falCamBtn");
const falStepText = $("falStepText");
const falStepSub = $("falStepSub");

const safeLogoutBtn = $("safeLogoutBtn");
const dpAvatar = $("dpAvatar");
const dpName = $("dpName");
const dpPlan = $("dpPlan");
const dpCN = $("dpCN");

const notifIconBtn = $("notifIconBtn");
const notifBadge = $("notifBadge");
const notifModal = $("notifModal");
const notifClose = $("notifClose");
const notifList = $("notifList");

const oz0 = $("ozLine0");
const oz1 = $("ozLine1");
const oz2 = $("ozLine2");
const oz3 = $("ozLine3");

// -------------------------
// UI helpers
// -------------------------
function showModal(el) {
  if (el) el.classList.add("show");
}
function hideModal(el) {
  if (el) el.classList.remove("show");
}
function setAuthStatus(msg) {
  if (authStatus) authStatus.textContent = msg;
}
function showAuthError(err) {
  const m = typeof err === "string" ? err : err?.message || "Hata";
  if (authStatus) authStatus.textContent = "Hata: " + m;
}
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

function scrollToBottom(force = false) {
  if (!chatContainer) return;
  if (force) {
    requestAnimationFrame(() => (chatContainer.scrollTop = chatContainer.scrollHeight));
    return;
  }
  const near =
    chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 260;
  if (!near) return;
  requestAnimationFrame(() => (chatContainer.scrollTop = chatContainer.scrollHeight));
}
window.addEventListener("resize", () => scrollToBottom(true));

async function typeWriterEffect(el, text, speed = 18) {
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
        resolve();
      }
    }
    tick();
  });
}

function assetUrl(relPath) {
  return new URL(`../${relPath}`, import.meta.url).href;
}

// -------------------------
// SAFE FETCH
// -------------------------
async function apiFetch(url, opts = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { ...(opts.headers || {}) };
  const method = (opts.method || "GET").toUpperCase();

  if (opts.body && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      ...opts,
      method,
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 204) return { ok: true, status: 204, data: null };

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const isJson = ct.includes("application/json");
    const data = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");

    if (!res.ok) {
      const msg =
        (typeof data === "object" && (data.detail || data.message)) ||
        (typeof data === "string" && data) ||
        `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return { ok: true, status: res.status, data };
  } catch (e) {
    if (String(e?.name || "").toLowerCase() === "aborterror") {
      const err = new Error("Zaman aşımı (sunucu yanıt vermedi).");
      err.code = "TIMEOUT";
      throw err;
    }
    if ((e && e.message === "Failed to fetch") || /failed to fetch/i.test(String(e?.message || ""))) {
      const err = new Error("Sunucuya erişemedim (CORS / ağ / SSL).");
      err.code = "FAILED_FETCH";
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// -------------------------
// LOGIN GATE
// -------------------------
async function requireLogin(reasonText = "Evladım, önce giriş yapacaksın.") {
  await addBubble("ai", reasonText, false, "");
  showModal(authModal);
  setTimeout(ensureGoogleButton, 120);
}

// -------------------------
// CSS injection (JS içinde gerçek CSS olmaz, STYLE etiketi ile ekleriz)
// -------------------------
function ensurePremiumCardStyles() {
  if (document.getElementById("premiumCardStyles")) return;

  const s = document.createElement("style");
  s.id = "premiumCardStyles";
  s.textContent = `
  .shopWrap{ margin-top:12px; display:flex; flex-direction:column; gap:12px; }
  .shopCard{
    background:#fff;
    border:1px solid rgba(0,0,0,.08);
    border-radius:18px;
    overflow:hidden;
    box-shadow:0 10px 28px rgba(0,0,0,.16);
  }
  .shopTop{
    display:flex; gap:12px; align-items:stretch;
    padding:12px;
  }
  .shopImgBox{
    width:96px; min-width:96px; height:96px;
    border-radius:16px;
    background:linear-gradient(135deg, rgba(0,0,0,.04), rgba(0,0,0,.02));
    border:1px solid rgba(0,0,0,.06);
    display:flex; align-items:center; justify-content:center;
    overflow:hidden;
  }
  .shopImgBox img{
    width:100%; height:100%; object-fit:contain;
  }
  .shopMeta{ flex:1; min-width:0; }
  .shopBadges{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:6px; }
  .badge{
    font-weight:1000;
    font-size:11px;
    padding:6px 10px;
    border-radius:999px;
    border:1px solid rgba(0,0,0,.10);
    background:#f6f6f6;
    color:#111;
  }
  .badge.gold{ background:rgba(255,179,0,.16); border-color:rgba(255,179,0,.35); }
  .badge.silver{ background:rgba(160,160,160,.16); border-color:rgba(160,160,160,.35); }
  .badge.bronze{ background:rgba(205,127,50,.16); border-color:rgba(205,127,50,.35); }
  .badge.pick{ background:rgba(0,200,151,.14); border-color:rgba(0,200,151,.30); }
  .shopTitle{
    font-weight:1000;
    color:#111;
    font-size:13px;
    line-height:1.25;
    max-height:34px;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .shopPrice{
    margin-top:6px;
    font-weight:1000;
    font-size:14px;
    color:var(--primary);
  }
  .shopWhy{
    margin:0 12px 12px 12px;
    padding:10px 12px;
    border-radius:16px;
    background:#f7f7f8;
    border:1px solid rgba(0,0,0,.06);
    font-weight:800;
    font-size:12px;
    line-height:1.35;
    color:#333;
  }
  .shopBtn{
    margin:0 12px 12px 12px;
    display:flex; align-items:center; justify-content:center;
    gap:8px;
    text-decoration:none;
    height:44px;
    border-radius:14px;
    background:var(--primary);
    color:#fff;
    font-weight:1000;
  }
  .shopBtn:active{ transform:scale(.98); }
  `;
  document.head.appendChild(s);
}

// -------------------------
// Pages
// -------------------------
async function openPageFromFile(title, path) {
  try {
    const r = await fetch(path, { cache: "no-store" });
    const html = await r.text();
    showPage(title, html);
  } catch {
    showPage(title, `<div style="font-weight:900;color:#b00;">Sayfa yüklenemedi</div>`);
  }
}
function showPage(title, html) {
  if (!pageModal || !pageTitleEl || !pageBodyEl) return;
  pageTitleEl.textContent = title;
  pageBodyEl.innerHTML = html;
  showModal(pageModal);
  closeDrawer();
}
function hidePage() {
  hideModal(pageModal);
}
window.App = { escapeHtml, showPage };

// -------------------------
// Modes
// -------------------------
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
  },
  dedikodu: {
    label: "Dedikodu",
    icon: "fa-people-group",
    color: "#111111",
    title: "Dedikodu Odası",
    desc: "Evladım burada lafın ucu kaçar…",
    img: assetUrl("images/hero-dedikodu.png"),
    ph: "Bir şey yaz…",
    sugg: "Dedikodu varsa ben buradayım…",
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
  },
  saglik: {
    label: "Sağlık",
    icon: "fa-heart-pulse",
    color: "#EF4444",
    title: "Caynana Sağlık'la<br>turp gibi ol.",
    desc: "Neren ağrıyor söyle bakayım?",
    img: assetUrl("images/hero-health.png"),
    ph: "Şikayetin ne?",
    sugg: "Çay üstüne sakın soğuk su içme!",
  },
  diyet: {
    label: "Diyet",
    icon: "fa-carrot",
    color: "#84CC16",
    title: "Sağlıklı beslen<br>zinde kal!",
    desc: "Açlıktan değil, keyiften yiyin.",
    img: assetUrl("images/hero-diet.png"),
    ph: "Boy kilo kaç?",
    sugg: "Ekmek değil, yeşillik ye.",
  },
};
const MODE_KEYS = Object.keys(MODES);

function applyFooterLines(activeKey) {
  const idx = MODE_KEYS.indexOf(activeKey);
  const colors = [];
  for (let i = 0; i < 4; i++) colors.push(MODES[MODE_KEYS[(idx + i) % MODE_KEYS.length]].color);
  if (oz0) oz0.style.background = colors[0];
  if (oz1) oz1.style.background = colors[1];
  if (oz2) oz2.style.background = colors[2];
  if (oz3) oz3.style.background = colors[3];
}

function applyHero(modeKey) {
  const m = MODES[modeKey] || MODES.chat;
  document.documentElement.style.setProperty("--primary", m.color);
  if (heroImage) heroImage.src = m.img;
  if (heroTitle) heroTitle.innerHTML = m.title;
  if (heroDesc) heroDesc.innerHTML = m.desc;
  if (textInput) textInput.placeholder = m.ph || "Bir şey yaz...";
  if (suggestionText) suggestionText.textContent = m.sugg || "";
  applyFooterLines(modeKey);
}

function renderDock() {
  if (!dock) return;
  dock.innerHTML = "";
  MODE_KEYS.forEach((k) => {
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

const modeChats = {};
function saveModeChat() {
  if (chatContainer) modeChats[currentMode] = chatContainer.innerHTML || "";
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

function switchMode(modeKey) {
  if (!getToken()) {
    requireLogin("Evladım, modlara geçmek için önce giriş yapman lazım.");
    return;
  }
  if (modeKey === currentMode) return;

  saveModeChat();
  currentMode = modeKey;

  document.querySelectorAll(".dock-item").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-mode") === modeKey);
  });

  applyHero(modeKey);
  loadModeChat(modeKey);

  document.body.classList.toggle("fal-mode", modeKey === "fal");
  if (modeKey !== "fal") {
    falImages = [];
    setFalStepUI();
  } else {
    resetFalCapture();
  }
}

// -------------------------
// Swipe + double tap (giriş şart)
// -------------------------
function bindSwipe() {
  const area = mainEl || $("main");
  if (!area) return;

  let sx = 0, sy = 0, active = false;

  area.addEventListener("pointerdown", (e) => {
    // chat açıkken scroll ile karışmasın
    const chatVisible = chatContainer && chatContainer.style.display === "block";
    if (chatVisible) return;
    active = true;
    sx = e.clientX;
    sy = e.clientY;
  }, { passive: true });

  area.addEventListener("pointerup", (e) => {
    if (!active) return;
    active = false;
    if (!getToken()) return;

    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;

    const step = dx < 0 ? 1 : -1;
    const idx = MODE_KEYS.indexOf(currentMode);
    const next = MODE_KEYS[(idx + step + MODE_KEYS.length) % MODE_KEYS.length];
    switchMode(next);
  }, { passive: true });

  if (brandTap) {
    let last = 0;
    brandTap.addEventListener("click", () => {
      const now = Date.now();
      if (now - last < 300) {
        if (!getToken()) return;
        const idx = MODE_KEYS.indexOf(currentMode);
        const next = MODE_KEYS[(idx + 1) % MODE_KEYS.length];
        switchMode(next);
      }
      last = now;
    });
  }
}

// -------------------------
// Drawer
// -------------------------
function openDrawer() {
  if (drawerMask) drawerMask.classList.add("show");
  if (drawer) drawer.classList.add("open");
}
function closeDrawer() {
  if (drawerMask) drawerMask.classList.remove("show");
  if (drawer) drawer.classList.remove("open");
}

// -------------------------
// Profile/Plan
// -------------------------
async function pullPlanFromBackend() {
  if (!getToken()) { currentPlan = "free"; return; }
  try {
    const r = await apiFetch(`${BASE_DOMAIN}/api/memory/get`, {
      method: "GET",
      headers: { ...authHeaders() },
    });
    const j = r.data || {};
    const plan = ((j.profile || {}).plan || "free").toLowerCase();
    currentPlan = (plan === "plus" || plan === "pro") ? plan : "free";
  } catch {
    currentPlan = "free";
  }
}

const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="20" fill="#222"/><text x="40" y="50" font-size="26" text-anchor="middle" fill="#fff" font-family="Arial">👵</text></svg>`);

function setDrawerProfileUI() {
  const logged = !!getToken();
  if (dpName) dpName.textContent = logged ? "Üye" : "Misafir";
  if (dpPlan) dpPlan.textContent = (currentPlan || "free").toUpperCase();
  if (dpCN) dpCN.textContent = "CN-????";
  if (dpAvatar) dpAvatar.src = FALLBACK_AVATAR;
}
function updateLoginUI() {
  const logged = !!getToken();
  if (safeLogoutBtn) safeLogoutBtn.style.display = logged ? "flex" : "none";
}

async function pullProfileToDrawer() {
  if (!getToken()) return;
  try {
    const r = await apiFetch(PROFILE_ME_URL, {
      method: "GET",
      headers: { ...authHeaders() },
    });
    const me = r.data || {};
    const display = (me.display_name || me.email || "Üye").trim();
    const cn = me.caynana_id || "CN-????";
    const plan = (me.plan || currentPlan || "free").toUpperCase();
    const avatar = (me.profile && me.profile.avatar_url) ? me.profile.avatar_url : "";

    if (dpName) dpName.textContent = display;
    if (dpPlan) dpPlan.textContent = plan;
    if (dpCN) dpCN.textContent = cn;

    if (dpAvatar) {
      dpAvatar.src = avatar || FALLBACK_AVATAR;
      dpAvatar.onerror = () => (dpAvatar.src = FALLBACK_AVATAR);
    }
  } catch {}
}

// -------------------------
// Google GSI
// -------------------------
function ensureGoogleButton() {
  if (!googleBtn) return;
  googleBtn.innerHTML = "";

  if (!window.google?.accounts?.id) {
    showAuthError("Google bileşeni yüklenmedi.");
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (resp) => {
      try {
        setAuthStatus("Google ile giriş yapılıyor…");
        const r = await apiFetch(`${BASE_DOMAIN}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: resp.credential }),
        });
        const j = r.data || {};
        if (!j.token) throw new Error(j.detail || "Google giriş başarısız");

        setToken(j.token);
        setAuthStatus("Bağlandı ✅");

        await pullPlanFromBackend();
        setDrawerProfileUI();
        updateLoginUI();
        await pullProfileToDrawer();

        // giriş sonrası persona kilitleri UI’dan kalksın
        unlockPersonaUI();

        setTimeout(() => hideModal(authModal), 250);
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
  });
}

// -------------------------
// Email auth (opsiyonel)
let authMode = "login";
async function handleAuthSubmit() {
  const email = (authEmail?.value || "").trim();
  const password = (authPass?.value || "").trim();
  setAuthStatus("İşlem yapıyorum…");
  try {
    const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const r = await apiFetch(`${BASE_DOMAIN}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const j = r.data || {};
    if (!j.token) throw new Error(j.detail || "Hata");

    setToken(j.token);
    setAuthStatus("Bağlandı ✅");

    await pullPlanFromBackend();
    setDrawerProfileUI();
    updateLoginUI();
    await pullProfileToDrawer();
    unlockPersonaUI();

    setTimeout(() => hideModal(authModal), 250);
  } catch (e) {
    showAuthError(e);
  }
}

// -------------------------
// Persona UI: giriş yoksa kilitli görünür, giriş varsa kilit kalkar
function lockPersonaUI() {
  document.querySelectorAll("#personaModal .persona-opt").forEach((opt) => {
    if (opt.getAttribute("data-persona") === "normal") {
      opt.classList.remove("locked");
      opt.querySelector("i")?.classList.add("fa-check");
    } else {
      opt.classList.add("locked");
      // ikon lock ise kalsın
    }
  });
}
function unlockPersonaUI() {
  document.querySelectorAll("#personaModal .persona-opt").forEach((opt) => {
    opt.classList.remove("locked");
    // lock ikonları varsa gizlemek yerine dokunma; seçilince check zaten oluyor
  });
}

// -------------------------
// Notifications
async function openNotifications() {
  showModal(notifModal);
  if (!notifList) return;

  if (!getToken()) {
    notifList.innerHTML = `<div style="font-weight:900;color:#666;">Önce giriş yap evladım.</div>`;
    return;
  }

  notifList.innerHTML = `<div style="font-weight:900;color:#444;">Yükleniyor…</div>`;
  try {
    const r = await apiFetch(NOTIF_URL, { method: "GET", headers: { ...authHeaders() } });
    const j = r.data || {};
    const items = j.items || [];
    const n = items.length;

    if (notifBadge) {
      notifBadge.style.display = n > 0 ? "flex" : "none";
      notifBadge.textContent = String(n > 99 ? "99+" : n);
    }

    if (!items.length) {
      notifList.innerHTML = `<div style="font-weight:900;color:#666;">Bildirim yok.</div>`;
      return;
    }

    notifList.innerHTML = items.map((it) => {
      const title = it.title || "Bildirim";
      const body = it.text || it.body || it.message || "";
      return `
        <div class="notifItem">
          <div class="notifItemTitle">${escapeHtml(title)}</div>
          <div class="notifItemBody">${escapeHtml(body)}</div>
        </div>`;
    }).join("");
  } catch (e) {
    notifList.innerHTML = `<div style="font-weight:900;color:#b00;">${escapeHtml(e.message || "Hata")}</div>`;
  }
}

// -------------------------
// Mic / Camera
function startMic() {
  if (!getToken()) return requireLogin("Evladım, mikrofon için önce giriş yap.");
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
function openCamera() {
  if (!getToken()) return requireLogin("Evladım, fotoğraf göndermek için önce giriş yap.");
  if (fileEl) { fileEl.value = ""; fileEl.click(); }
}
function openFalCamera() { openCamera(); }

// -------------------------
// Fal UI
function setFalStepUI() {
  if (!falStepText || !falStepSub) return;
  if (currentMode !== "fal") { falStepText.textContent = ""; falStepSub.textContent = ""; return; }
  if (falImages.length < 3) {
    falStepText.textContent = "Fal için 3 fotoğraf çek";
    falStepSub.textContent = FAL_STEPS[falImages.length] || "1/3: Üstten çek";
  } else {
    falStepText.textContent = "Fal hazır…";
    falStepSub.textContent = "Yorum hazırlanıyor";
  }
}
function resetFalCapture() { falImages = []; setFalStepUI(); }

async function falCheckOneImage(dataUrl) {
  try {
    const r = await apiFetch(FAL_CHECK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    }, 25000);
    return r.data || { ok: false, reason: "Kontrol edilemedi." };
  } catch {
    return { ok: false, reason: "Kontrol edemedim, tekrar dene." };
  }
}

// file input
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
          await addBubble("ai", check.reason || "Evladım bu fincan-tabak değil.", false, "");
          resetModalOnly();
          setTimeout(() => openFalCamera(), 150);
          return;
        }
        falImages.push(imgData);
        setFalStepUI();
      }

      pendingImage = imgData;
      if (photoPreview) photoPreview.src = pendingImage;
      if (photoTitle) photoTitle.textContent = currentMode === "fal" ? "Fal fotoğrafı" : "Fotoğraf hazır";
      if (photoHint) photoHint.textContent = "Tamam deyince gönderiyorum.";
      showModal(photoModal);
    };
    reader.readAsDataURL(f);
  });
}
if (photoCancelBtn) photoCancelBtn.onclick = resetModalOnly;
if (photoOkBtn) {
  photoOkBtn.onclick = async () => {
    hideModal(photoModal);

    if (currentMode === "fal" && falImages.length < 3) {
      setTimeout(() => openFalCamera(), 180);
      return;
    }

    if (currentMode === "fal" && textInput) {
      textInput.value = "Fal bak: fincanı 3 açıdan gönderdim. İnsani anlat.";
    }

    await send();
    if (currentMode === "fal") resetFalCapture();
  };
}

// -------------------------
// Bubbles + audio
async function addBubble(role, text, isLoader = false, speech = "") {
  if (!chatContainer || !heroContent) return null;

  const div = document.createElement("div");
  div.className = "msg " + role;
  div.innerHTML = `<div class="bubble"></div>`;
  const bubble = div.querySelector(".bubble");

  chatContainer.appendChild(div);
  heroContent.style.display = "none";
  chatContainer.style.display = "block";
  scrollToBottom(true);

  if (role === "ai" && !isLoader) await typeWriterEffect(bubble, text);
  else bubble.innerHTML = role === "user" ? escapeHtml(text) : text;

  if (role === "ai") {
    const sp = speech && speech.trim()
      ? speech
      : (text || "").replace(/[*_`#>-]/g, "").slice(0, 260);

    const btn = document.createElement("div");
    btn.className = "audio-btn";
    btn.dataset.speech = sp;
    btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    div.appendChild(btn);
  }

  scrollToBottom(true);
  return div;
}

if (chatContainer) {
  chatContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".audio-btn");
    if (!btn) return;
    await playAudio(btn.dataset.speech, btn);
  });
}

async function playAudio(text, btn) {
  if (!getToken()) return requireLogin("Evladım, ses için önce giriş yap.");

  if (currentAudio) { currentAudio.pause(); currentAudio = null; }

  const old = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor`;

  try {
    const res = await fetch(SPEAK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ text, persona: currentPersona }),
    });
    if (!res.ok) throw new Error("TTS çalışmadı");
    const blob = await res.blob();
    currentAudio = new Audio(URL.createObjectURL(blob));
    currentAudio.onended = () => (btn.innerHTML = old);
    await currentAudio.play();
    btn.innerHTML = `<i class="fa-solid fa-stop"></i> Durdur`;
  } catch {
    btn.innerHTML = old;
  }
}

// -------------------------
// Shopping premium cards (TEK TEK)
function normStr(x) { return (x == null ? "" : String(x)).trim(); }

function pickUrl(p) {
  return normStr(p.url || p.link || p.product_url || p.productUrl || p.href);
}
function pickTitle(p) {
  return normStr(p.title || p.name || p.product_title || p.productTitle || "Ürün");
}
function pickImg(p) {
  return normStr(p.image || p.image_url || p.imageUrl || p.img || p.thumbnail);
}
function pickPrice(p) {
  const raw = normStr(p.price || p.price_text || p.priceText || p.display_price || "");
  // "Fiyat için tıkla" / "" gibi durumlarda boş kabul
  if (!raw) return "";
  if (/fiyat/i.test(raw) && /tıkla/i.test(raw)) return "";
  return raw;
}

function buildWhyText(p, idx) {
  // Backend varsa: reason/why/bullet
  const c = normStr(p.reason || p.why || p.caynana_reason || p.note);
  if (c) return c;

  // Yoksa dinamik üret
  const title = pickTitle(p).toLowerCase();
  const hints = [];
  if (/raf|dolap|kitap|ayakkabı/i.test(title)) hints.push("kurulum ve ölçü uyumu");
  if (/ahşap|mdf|metal/i.test(title)) hints.push("malzeme dayanımı");
  if (/banyo|mutfak/i.test(title)) hints.push("nem/temizlik uyumu");
  if (!hints.length) hints.push("fiyat/performans dengesi");

  const variants = [
    `Bunu ${hints[0]} tarafı daha mantıklı durduğu için öne aldım; satıcı yorumlarını da bir kontrol et, sonra üzülmeyelim.`,
    `Şuna “temiz tercih” derim: ${hints[0]} iyi görünüyor. Ölçünü söyleyebilirsen daha net nokta atışı yaparım.`,
    `Evladım bu seçenek ${hints[0]} açısından daha dengeli duruyor; aşırı ucuzun peşine düşme, sonra iki kere alırsın.`,
  ];
  return variants[idx % variants.length];
}

function rankBadge(i) {
  if (i === 0) return { text: "ALTIN ÖNERİ", cls: "gold" };
  if (i === 1) return { text: "GÜMÜŞ", cls: "silver" };
  if (i === 2) return { text: "BRONZ", cls: "bronze" };
  return { text: "Caynana Öneriyor", cls: "pick" };
}

function renderShoppingCards(products) {
  if (!chatContainer) return;
  ensurePremiumCardStyles();

  const wrap = document.createElement("div");
  wrap.className = "shopWrap";

  (products || []).slice(0, 6).forEach((p, i) => {
    const url = pickUrl(p);
    const title = pickTitle(p);
    const img = pickImg(p);
    const price = pickPrice(p);

    const b = rankBadge(i);
    const why = buildWhyText(p, i);

    // fiyat yoksa: fiyat/puan hiçbir şey gösterme
    const priceHtml = price ? `<div class="shopPrice">${escapeHtml(price)}</div>` : "";

    const safeUrl = url || "#";
    const btnDisabled = !url;

    const card = document.createElement("div");
    card.className = "shopCard";
    card.innerHTML = `
      <div class="shopTop">
        <div class="shopImgBox">
          ${img ? `<img src="${escapeHtml(img)}" alt="img" onerror="this.style.display='none'">` : `<div style="font-weight:900;color:#777;">Görsel yok</div>`}
        </div>
        <div class="shopMeta">
          <div class="shopBadges">
            <span class="badge ${b.cls}">${escapeHtml(b.text)}</span>
            <span class="badge">#${i + 1}</span>
          </div>
          <div class="shopTitle">${escapeHtml(title)}</div>
          ${priceHtml}
        </div>
      </div>
      <div class="shopWhy">👵 ${escapeHtml(why)}</div>
      <a class="shopBtn" ${btnDisabled ? "" : `href="${escapeHtml(safeUrl)}"`} target="_blank" rel="noopener">
        <i class="fa-solid fa-arrow-up-right-from-square"></i>
        Caynana Öneriyor — Ürüne Git
      </a>
    `;

    // link yoksa butonu pasifleştir
    if (btnDisabled) {
      const a = card.querySelector(".shopBtn");
      if (a) {
        a.style.background = "#ddd";
        a.style.color = "#666";
        a.style.pointerEvents = "none";
        a.textContent = "Link yok (kaynak gelmedi)";
      }
    }

    wrap.appendChild(card);
  });

  chatContainer.appendChild(wrap);
  scrollToBottom(true);
}

// -------------------------
// SEND
async function send() {
  if (isSending) return;

  if (!getToken()) {
    await requireLogin("Evladım, üyelik olmadan sohbet yok. Önce giriş.");
    return;
  }

  let val = (textInput?.value || "").trim();
  if (pendingImage && !val) val = "Bu resmi yorumla";
  if (!val && !pendingImage) return;

  isSending = true;
  if (sendBtn) sendBtn.disabled = true;

  await addBubble("user", val);
  if (textInput) textInput.value = "";

  const loaderId = "ldr_" + Date.now();
  const loader = document.createElement("div");
  loader.className = "msg ai";
  loader.id = loaderId;
  loader.innerHTML = `<div class="bubble"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
  chatContainer.appendChild(loader);
  scrollToBottom(true);

  const payload = {
    message: val,
    session_id: sessionId,
    image: pendingImage,
    mode: currentMode,
    persona: currentPersona,
  };
  pendingImage = null;

  try {
    const r = await apiFetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    }, 25000);

    const data = r.data || {};

    const l = document.getElementById(loaderId);
    if (l) l.remove();

    await addBubble("ai", data.assistant_text || "Bir şey diyemedim evladım.", false, data.speech_text || "");

    // shopping kartları
    if (currentMode === "shopping" && Array.isArray(data.data) && data.data.length) {
      renderShoppingCards(data.data);
    }
  } catch (e) {
    const l = document.getElementById(loaderId);
    if (l) l.remove();
    const msg = e?.message || "Bağlantı hatası oldu evladım. Bir daha dene.";
    await addBubble("ai", `Bağlantı sorunu: ${msg}`, false, "");
  } finally {
    isSending = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}

// -------------------------
// Events
function bindEvents() {
  // drawer
  if (menuBtn) menuBtn.onclick = openDrawer;
  if (drawerClose) drawerClose.onclick = closeDrawer;
  if (drawerMask) drawerMask.onclick = closeDrawer;

  // persona
  if (personaBtn) {
    personaBtn.onclick = () => {
      if (!getToken()) return requireLogin("Evladım, kaynana modları için önce giriş yap.");
      showModal(personaModal);
    };
  }
  if (personaClose) personaClose.onclick = () => hideModal(personaModal);
  if (personaModal) personaModal.addEventListener("click", (e) => {
    if (e.target === personaModal) hideModal(personaModal);
  });

  document.querySelectorAll("#personaModal .persona-opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      if (!getToken()) return requireLogin("Evladım, kaynana modları için önce giriş yap.");
      document.querySelectorAll("#personaModal .persona-opt").forEach((x) => x.classList.remove("selected"));
      opt.classList.add("selected");
      currentPersona = opt.getAttribute("data-persona") || "normal";
      setTimeout(() => hideModal(personaModal), 150);
    });
  });

  // auth open
  if (accountBtn) {
    accountBtn.onclick = () => {
      showModal(authModal);
      setAuthStatus(getToken() ? "Bağlı ✅" : "Bağlı değil ❌");
      setTimeout(ensureGoogleButton, 120);
      closeDrawer();
    };
  }
  if (authCloseX) authCloseX.onclick = () => hideModal(authModal);
  if (authClose) authClose.onclick = () => hideModal(authModal);

  // tabs
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

  if (authLogout) {
    authLogout.onclick = () => {
      setToken("");
      currentPlan = "free";
      setDrawerProfileUI();
      updateLoginUI();
      lockPersonaUI();
      setAuthStatus("Çıkış yapıldı ❌");
    };
  }
  if (safeLogoutBtn) {
    safeLogoutBtn.onclick = () => {
      setToken("");
      currentPlan = "free";
      setDrawerProfileUI();
      updateLoginUI();
      lockPersonaUI();
      closeDrawer();
    };
  }

  // pages
  if (planBtn) planBtn.onclick = () => openPageFromFile("Üyelik", "./pages/uyelik.html");
  if (aboutBtn) aboutBtn.onclick = () => openPageFromFile("Hakkımızda", "./pages/hakkimizda.html");
  if (faqBtn) faqBtn.onclick = () => openPageFromFile("Sık Sorulan Sorular", "./pages/sss.html");
  if (contactBtn) contactBtn.onclick = () => openPageFromFile("İletişim", "./pages/iletisim.html");
  if (privacyBtn) privacyBtn.onclick = () => openPageFromFile("Gizlilik", "./pages/gizlilik.html");

  if (pageClose) pageClose.onclick = hidePage;
  if (pageModal) pageModal.addEventListener("click", (e) => {
    if (e.target === pageModal) hidePage();
  });

  // notifications
  if (notifIconBtn) notifIconBtn.onclick = openNotifications;
  if (notifClose) notifClose.onclick = () => hideModal(notifModal);
  if (notifModal) notifModal.addEventListener("click", (e) => {
    if (e.target === notifModal) hideModal(notifModal);
  });

  // actions
  if (camBtn) camBtn.onclick = openCamera;
  if (falCamBtn) falCamBtn.onclick = openFalCamera;
  if (micBtn) micBtn.onclick = startMic;

  if (textInput) textInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") send();
  });
  if (sendBtn) sendBtn.onclick = send;
}

// -------------------------
// INIT
async function init() {
  document.body.classList.remove("fal-mode");
  falImages = [];

  renderDock();
  applyHero("chat");
  loadModeChat("chat");
  setFalStepUI();

  bindSwipe();
  bindEvents();

  await pullPlanFromBackend();
  setDrawerProfileUI();
  updateLoginUI();

  if (getToken()) {
    unlockPersonaUI();
    await pullProfileToDrawer();
  } else {
    lockPersonaUI();
  }
}
init();
