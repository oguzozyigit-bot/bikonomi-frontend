// CAYNANA WEB - main.js (SAFE v5002 - FINAL)
// Tek dosya, çakışma yok. Fal UI sadece fal modunda görünür.
// KURALLAR:
// 1) Giriş yoksa: chat gönderme yok, mod değişimi yok, persona yok, kamera/mic yok.
// 2) Giriş varsa: tüm modlar + persona serbest (kilit yok).

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

// ---- STATE ----
let sessionId = "sess_" + Math.random().toString(36).slice(2, 10);
let pendingImage = null;
let currentAudio = null;
let isSending = false;

let currentMode = "chat";
let currentPersona = "normal";

// plan
let currentPlan = "free";
export const IS_ALTIN = () => (currentPlan || "free").toLowerCase() === "pro";

// fal
let falImages = [];
const FAL_STEPS = ["1/3: Üstten çek", "2/3: Yandan çek", "3/3: Diğer yandan çek"];

if (window.marked) marked.setOptions({ mangle: false, headerIds: false });

const $ = (id) => document.getElementById(id);

// ---- DOM ----
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

// ---- UI helpers ----
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
export function escapeHtml(s) {
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

async function typeWriterEffect(el, text, speed = 22) {
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

// ---- SAFE FETCH (gerçek hata döndürür) ----
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

// ---- LOGIN GATE ----
async function requireLogin(reasonText = "Evladım, önce giriş yapacaksın.") {
  await addBubble("ai", reasonText, false, "");
  showModal(authModal);
  setTimeout(ensureGoogleButton, 120);
}

// ---- Pages ----
async function openPageFromFile(title, path) {
  try {
    const r = await fetch(path, { cache: "no-store" });
    const html = await r.text();
    showPage(title, html);
  } catch (e) {
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

// dedikodu.js gibi modüller gerektirirse:
window.App = { escapeHtml, showPage };

// ---- Modes ----
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
  for (let i = 0; i < 4; i++) {
    const k = MODE_KEYS[(idx + i) % MODE_KEYS.length];
    colors.push(MODES[k].color);
  }
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
  // ⛔ GİRİŞ YOKSA MOD YOK
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

  // ✅ Fal UI sadece fal modunda
  document.body.classList.toggle("fal-mode", modeKey === "fal");
  if (modeKey !== "fal") {
    falImages = [];
    setFalStepUI();
  } else {
    resetFalCapture();
  }
}

// swipe + brand double tap
function bindSwipe() {
  const area = $("main");
  if (!area) return;
  let sx = 0,
    sy = 0,
    active = false;

  area.addEventListener(
    "pointerdown",
    (e) => {
      active = true;
      sx = e.clientX;
      sy = e.clientY;
    },
    { passive: true }
  );

  area.addEventListener(
    "pointerup",
    (e) => {
      if (!active) return;
      active = false;

      // ⛔ GİRİŞ YOKSA SWIPE MOD YOK
      if (!getToken()) {
        requireLogin("Evladım, modlara geçmek için önce giriş yapman lazım.");
        return;
      }

      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      const step = dx < 0 ? 1 : -1;
      const idx = MODE_KEYS.indexOf(currentMode);
      const next = MODE_KEYS[(idx + step + MODE_KEYS.length) % MODE_KEYS.length];
      switchMode(next);
    },
    { passive: true }
  );

  if (brandTap) {
    let last = 0;
    brandTap.addEventListener("click", () => {
      const now = Date.now();
      if (now - last < 300) {
        // ⛔ GİRİŞ YOKSA TAP MOD YOK
        if (!getToken()) {
          requireLogin("Evladım, modlara geçmek için önce giriş yapman lazım.");
          return;
        }
        const idx = MODE_KEYS.indexOf(currentMode);
        const next = MODE_KEYS[(idx + 1) % MODE_KEYS.length];
        switchMode(next);
      }
      last = now;
    });
  }
}

// ---- Drawer ----
function openDrawer() {
  if (drawerMask) drawerMask.classList.add("show");
  if (drawer) drawer.classList.add("open");
}
function closeDrawer() {
  if (drawerMask) drawerMask.classList.remove("show");
  if (drawer) drawer.classList.remove("open");
}

// ---- Plan + Drawer profile ----
async function pullPlanFromBackend() {
  if (!getToken()) {
    currentPlan = "free";
    return;
  }
  try {
    const r = await apiFetch(`${BASE_DOMAIN}/api/memory/get`, {
      method: "GET",
      headers: { ...authHeaders() },
    });
    const j = r.data || {};
    const plan = ((j.profile || {}).plan || "free").toLowerCase();
    currentPlan = plan === "plus" || plan === "pro" ? plan : "free";
  } catch {
    currentPlan = "free";
  }
}

const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="20" fill="#222"/><text x="40" y="50" font-size="26" text-anchor="middle" fill="#fff" font-family="Arial">👵</text></svg>`
  );

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
    const avatar = me.profile && me.profile.avatar_url ? me.profile.avatar_url : "";

    if (dpName) dpName.textContent = display || "Üye";
    if (dpPlan) dpPlan.textContent = plan;
    if (dpCN) dpCN.textContent = cn;

    if (dpAvatar) {
      dpAvatar.src = avatar || FALLBACK_AVATAR;
      dpAvatar.onerror = () => (dpAvatar.src = FALLBACK_AVATAR);
    }
  } catch {
    // sessiz geç
  }
}

function setDrawerProfileUI() {
  const logged = !!getToken();
  if (dpName) dpName.textContent = logged ? "Üye" : "Misafir";
  if (dpPlan) dpPlan.textContent = (currentPlan || "free").toUpperCase();
  if (dpCN) dpCN.textContent = "CN-????";
  if (dpAvatar) {
    dpAvatar.src = FALLBACK_AVATAR;
    dpAvatar.onerror = () => (dpAvatar.src = FALLBACK_AVATAR);
  }
}

function updateLoginUI() {
  const logged = !!getToken();
  if (safeLogoutBtn) safeLogoutBtn.style.display = logged ? "flex" : "none";
}

// ---- Google GSI ----
function ensureGoogleButton() {
  if (!googleBtn) return;
  googleBtn.innerHTML = "";

  if (!window.google?.accounts?.id) {
    showAuthError("Google bileşeni yüklenmedi. (Android System WebView/Chrome güncel mi?)");
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

        setTimeout(() => hideModal(authModal), 350);
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

// ---- Email Auth ----
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

    setTimeout(() => hideModal(authModal), 350);
  } catch (e) {
    showAuthError(e);
  }
}

// ---- Notifications (tıklayınca) ----
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

    notifList.innerHTML = items
      .map((it) => {
        const title = it.title || "Bildirim";
        const body = it.text || it.body || it.message || "";
        return `
          <div class="notifItem">
            <div class="notifItemTitle">${escapeHtml(title)}</div>
            <div class="notifItemBody">${escapeHtml(body)}</div>
          </div>
        `;
      })
      .join("");
  } catch (e) {
    notifList.innerHTML = `<div style="font-weight:900;color:#b00;">${escapeHtml(e.message || "Hata")}</div>`;
  }
}

// ---- Mic ----
function startMic() {
  if (!getToken()) {
    requireLogin("Evladım, mikrofon için önce giriş yap.");
    return;
  }
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

// ---- Fal UI ----
function setFalStepUI() {
  if (!falStepText || !falStepSub) return;

  if (currentMode !== "fal") {
    falStepText.textContent = "";
    falStepSub.textContent = "";
    return;
  }

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
async function falCheckOneImage(dataUrl) {
  try {
    const r = await apiFetch(
      FAL_CHECK_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      },
      25000
    );
    return r.data || { ok: false, reason: "Kontrol edilemedi." };
  } catch {
    return { ok: false, reason: "Kontrol edemedim, tekrar dene." };
  }
}
function openCamera() {
  if (!getToken()) {
    requireLogin("Evladım, fotoğraf göndermek için önce giriş yap.");
    return;
  }
  if (fileEl) {
    fileEl.value = "";
    fileEl.click();
  }
}
function openFalCamera() {
  openCamera();
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

// ---- Bubbles + audio ----
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
    const sp =
      speech && speech.trim()
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
  if (!getToken()) {
    requireLogin("Evladım, ses için önce giriş yap.");
    return;
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
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

// ---- Send (GİRİŞ KİLİDİ + NET HATA) ----
async function send() {
  if (isSending) return;

  // ⛔ GİRİŞ YOKSA CHAT YOK
  if (!getToken()) {
    if (sendBtn) sendBtn.disabled = false;
    isSending = false;
    await requireLogin("Evladım, önce giriş yapacaksın. Üyelik olmadan sohbet yok.");
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
    const r = await apiFetch(
      API_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      },
      25000
    );

    const data = r.data || {};

    const l = document.getElementById(loaderId);
    if (l) l.remove();

    await addBubble(
      "ai",
      data.assistant_text || "Bir şey diyemedim evladım.",
      false,
      data.speech_text || ""
    );
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

// ---- Events ----
function bindEvents() {
  // drawer
  if (menuBtn) menuBtn.onclick = openDrawer;
  if (drawerClose) drawerClose.onclick = closeDrawer;
  if (drawerMask) drawerMask.onclick = closeDrawer;

  // persona (⛔ giriş yoksa açılmaz)
  if (personaBtn) {
    personaBtn.onclick = () => {
      if (!getToken()) {
        requireLogin("Evladım, kaynana modları için önce giriş yap.");
        return;
      }
      showModal(personaModal);
    };
  }

  if (personaClose) personaClose.onclick = () => hideModal(personaModal);
  if (personaModal)
    personaModal.addEventListener("click", (e) => {
      if (e.target === personaModal) hideModal(personaModal);
    });

  // ✅ Persona kilidi KALDIRILDI (locked kontrolü yok)
  document.querySelectorAll("#personaModal .persona-opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      if (!getToken()) {
        requireLogin("Evladım, kaynana modları için önce giriş yap.");
        return;
      }

      document
        .querySelectorAll("#personaModal .persona-opt")
        .forEach((x) => x.classList.remove("selected"));

      opt.classList.add("selected");
      currentPersona = opt.getAttribute("data-persona") || "normal";
      setTimeout(() => hideModal(personaModal), 150);
    });
  });

  // auth open (menüden)
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
      updateLoginUI();
      setDrawerProfileUI();
      setAuthStatus("Çıkış yapıldı ❌");
    };
  }
  if (safeLogoutBtn) {
    safeLogoutBtn.onclick = () => {
      setToken("");
      currentPlan = "free";
      updateLoginUI();
      setDrawerProfileUI();
      closeDrawer();
    };
  }

  // pages
  if (planBtn) planBtn.onclick = () => openPageFromFile("Üyelik", "./pages/uyelik.html");
  if (aboutBtn) aboutBtn.onclick = () => openPageFromFile("Hakkımızda", "./pages/hakkimizda.html");
  if (faqBtn) faqBtn.onclick = () => openPageFromFile("Sık Sorulan Sorular", "./pages/sss.html");
  if (contactBtn) contactBtn.onclick = () => openPageFromFile("İletişim", "./pages/iletisim.html");
  if (privacyBtn) privacyBtn.onclick = () => openPageFromFile("Gizlilik", "./pages/gizlilik.html");

  // page close
  if (pageClose) pageClose.onclick = hidePage;
  if (pageModal)
    pageModal.addEventListener("click", (e) => {
      if (e.target === pageModal) hidePage();
    });

  // notifications
  if (notifIconBtn) notifIconBtn.onclick = openNotifications;
  if (notifClose) notifClose.onclick = () => hideModal(notifModal);
  if (notifModal)
    notifModal.addEventListener("click", (e) => {
      if (e.target === notifModal) hideModal(notifModal);
    });

  // chat actions
  if (camBtn) camBtn.onclick = openCamera;
  if (falCamBtn) falCamBtn.onclick = openFalCamera;
  if (micBtn) micBtn.onclick = startMic;
  if (textInput)
    textInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") send();
    });
  if (sendBtn) sendBtn.onclick = send;
}

// ---- Init ----
async function init() {
  // Fal UI düz: sadece fal’da
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

  await pullProfileToDrawer();

  // ⛔ giriş yoksa ilk açılışta modlar açık gibi görünmesin (UI var ama işlev yok)
  // İstersen burada direkt login modal da açtırırız.
}
init();
