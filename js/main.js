// =========================================
// CAYNANA WEB APP - main.js (CLEAN + SAFE)
// Topbar sade: logo + 3 ikon
// Misafir/Plan Drawer içinde + küçük status (desktop)
// =========================================

export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const API_URL = `${BASE_DOMAIN}/api/chat`;
const SPEAK_URL = `${BASE_DOMAIN}/api/speak`;
const FAL_CHECK_URL = `${BASE_DOMAIN}/api/fal/check`;

const GOOGLE_CLIENT_ID =
  "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";

const WEB_LOCK = false;
const PLAY_URL = "https://play.google.com/store/apps/details?id=ai.caynana.app";
const APK_URL = "#";

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

let sessionId = "sess_" + Math.random().toString(36).slice(2, 10);
let currentAudio = null;
let pendingImage = null;
let currentMode = "chat";
let currentPersona = "normal";
let isSending = false;

let currentPlan = "free"; // free|plus|pro
const PLAN_PERSONAS = {
  free: ["normal"],
  plus: ["normal", "sevecen", "kizgin"],
  pro: ["normal", "sevecen", "kizgin", "huysuz", "itirazci"],
};

// ✅ İSTEDİĞİN: IS_ALTIN
export const IS_ALTIN = () => (currentPlan || "free").toLowerCase() === "pro";

// Fal
let falImages = [];
const FAL_STEPS = ["1/3: Üstten çek", "2/3: Yandan çek", "3/3: Diğer yandan çek"];

if (window.marked) marked.setOptions({ mangle: false, headerIds: false });

const $ = (id) => document.getElementById(id);

const chatContainer = $("chatContainer");
const heroContent = $("heroContent");
const heroImage = $("heroImage");
const heroTitle = $("heroTitle");
const heroDesc = $("heroDesc");

const suggestionText = $("suggestionText");
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

const brandTap = $("brandTap");
const camBtn = $("camBtn");
const micBtn = $("micBtn");
const falCamBtn = $("falCamBtn");
const falStepText = $("falStepText");
const falStepSub = $("falStepSub");

const webLock = $("webLock");
const lockAndroidBtn = $("lockAndroidBtn");
const lockApkBtn = $("lockApkBtn");

const notifIconBtn = $("notifIconBtn");
const notifBadge = $("notifBadge");
const notifBtn = $("notifBtn");
const notifPill = $("notifPill");
const notifModal = $("notifModal");
const notifClose = $("notifClose");
const notifList = $("notifList");

const dedikoduBtn = $("dedikoduBtn");

const dpAvatar = $("dpAvatar");
const dpName = $("dpName");
const dpPlan = $("dpPlan");
const dpCN = $("dpCN");

const topMiniStatus = $("topMiniStatus");
const msName = $("msName");
const msPlan = $("msPlan");

const profileModal = $("profileModal");
const openProfileBtn = $("openProfileBtn");
const profileClose = $("profileClose");
const pfCloseBtn = $("pfCloseBtn");
const pfSave = $("pfSave");
const pfStatus = $("pfStatus");

const pfNick = $("pfNick");
const pfName = $("pfName");
const pfAge = $("pfAge");
const pfGender = $("pfGender");
const pfHeight = $("pfHeight");
const pfWeight = $("pfWeight");
const pfAvatar = $("pfAvatar");

const profileAvatarPreview = $("profileAvatarPreview");
const profileMainName = $("profileMainName");
const profilePlanTag = $("profilePlanTag");
const profileCNTag = $("profileCNTag");

function showModal(el) { if (el) el.classList.add("show"); }
function hideModal(el) { if (el) el.classList.remove("show"); }

function setAuthStatus(msg) { if (authStatus) authStatus.textContent = msg; }
function showAuthError(err) {
  if (!authStatus) return;
  if (typeof err === "string") authStatus.textContent = "Hata: " + err;
  else if (err?.message) authStatus.textContent = "Hata: " + err.message;
  else authStatus.textContent = "Hata: (bilinmeyen)";
}

export function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function showPage(title, html) {
  if (!pageModal || !pageTitleEl || !pageBodyEl) return;
  pageTitleEl.textContent = title;
  pageBodyEl.innerHTML = html;
  showModal(pageModal);
  if (drawerMask) drawerMask.classList.remove("show");
  if (drawer) drawer.classList.remove("open");
}
function hidePage() { hideModal(pageModal); }

// dedikodu.js kullanıyor
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

const MODES = {
  chat:{ label:"Sohbet", icon:"fa-comments", color:"#FFB300",
    title:"Caynana ile<br>iki lafın belini kır.", desc:"Biraz dur bakalım, neler anlatacaksın?",
    img: assetUrl("images/hero-chat.png"), ph:"Naber Caynana?", sugg:"Benim zamanımda her şey daha güzeldi ah ah…",
    heroStyle:{ top:"100px", left:"24px", textAlign:"left", width:"auto", maxWidth:"70%" } },

  dedikodu:{ label:"Dedikodu", icon:"fa-comments", color:"#111111",
    title:"Dedikodu Odası<br>Altın Üyelere Özel",
    desc:"Evladım burada lafın ucu kaçar… Altın (Pro) olana açık.",
    img: assetUrl("images/hero-dedikodu.png"), ph:"", sugg:"Dedikodu varsa ben buradayım…",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  shopping:{ label:"Alışveriş", icon:"fa-bag-shopping", color:"#00C897",
    title:"Almadan önce<br>Caynana’ya sor.", desc:"Sonra “keşke” dememek için buradayım.",
    img: assetUrl("images/hero-shopping.png"), ph:"Ne arıyorsun evladım?", sugg:"Her indirime atlayan sonunda pahalı öder.",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  fal:{ label:"Fal", icon:"fa-mug-hot", color:"#8B5CF6",
    title:"Fincanı kapat<br>tabakla gönder.", desc:"3 açı çek: üstten, yandan, diğer yandan.",
    img: assetUrl("images/hero-fal.png"), ph:"", sugg:"Sadece fincan + tabak.",
    heroStyle:{ top:"100px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } }
};

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
}

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

async function pullPlanFromBackend() {
  if (!getToken()) {
    currentPlan = "free";
    refreshPersonaLocks();
    return;
  }
  try {
    const r = await fetch(`${BASE_DOMAIN}/api/memory/get`, { method: "GET", headers: { ...authHeaders() } });
    const j = await r.json().catch(() => ({}));
    const plan = ((j.profile || {}).plan || "free").toLowerCase();
    currentPlan = (plan === "plus" || plan === "pro") ? plan : "free";
  } catch {
    currentPlan = "free";
  }
  refreshPersonaLocks();
}

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
      if (icon) { icon.className = "fa-solid fa-check"; icon.style.display = "block"; }
      return;
    }
    opt.classList.remove("selected");
    if (!allow.has(id)) {
      opt.classList.add("locked");
      if (icon) { icon.className = "fa-solid fa-lock"; icon.style.display = "block"; }
    } else {
      opt.classList.remove("locked");
      if (icon) icon.style.display = "none";
    }
  });
}

async function pullDedikoduStatusAndNotifs() {
  // statüs: /api/dedikodu/status yoksa sessiz geç
  let cn = "CN-????";
  let name = "Misafir";
  let planText = currentPlan === "pro" ? "Altın" : currentPlan === "plus" ? "Plus" : "Free";
  let avatar = "https://via.placeholder.com/80";
  let unread = 0;

  if (getToken()) {
    try {
      const r = await fetch(`${BASE_DOMAIN}/api/dedikodu/status`, { headers: { ...authHeaders() } });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        cn = j.caynana_no || cn;
        name = j.display_name || name;
        planText = (j.plan || currentPlan || "free").toLowerCase();
        planText = planText === "pro" ? "Altın" : planText === "plus" ? "Plus" : "Free";
        avatar = j.avatar || avatar;
        unread = Number(j.unread_notifications || 0);
      }
    } catch {}
  }

  // UI bas
  if (dpCN) dpCN.textContent = cn;
  if (dpName) dpName.textContent = name;
  if (dpPlan) dpPlan.textContent = planText;
  if (dpAvatar) dpAvatar.src = avatar;

  if (msName) msName.textContent = name;
  if (msPlan) msPlan.textContent = planText;

  setNotifCount(unread);
}

function setNotifCount(n) {
  const v = Number(n || 0);
  if (notifBadge) {
    notifBadge.style.display = v > 0 ? "flex" : "none";
    notifBadge.textContent = String(v > 99 ? "99+" : v);
  }
  if (notifPill) {
    notifPill.style.display = v > 0 ? "inline-block" : "none";
    notifPill.textContent = String(v > 99 ? "99+" : v);
  }
}

async function openNotifModal() {
  if (!notifModal || !notifList) return;
  if (!getToken()) {
    showModal(notifModal);
    notifList.innerHTML = `<div style="font-weight:900;color:#444;">Giriş yapınca bildirimler gelir.</div>`;
    return;
  }

  showModal(notifModal);
  notifList.innerHTML = `<div style="font-weight:900;color:#444;">Yükleniyor…</div>`;

  try {
    const r = await fetch(`${BASE_DOMAIN}/api/notifications?limit=30`, { headers: { ...authHeaders() } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.detail || "Bildirimler alınamadı");
    const items = j.items || [];

    if (!items.length) {
      notifList.innerHTML = `<div style="font-weight:900;color:#444;">Bildirim yok.</div>`;
      return;
    }

    notifList.innerHTML = "";
    items.forEach((x) => {
      const it = document.createElement("div");
      it.className = "notifItem" + (!x.is_read ? " unread" : "");
      it.innerHTML = `
        <div class="notifItemTitle">${escapeHtml(x.title || "Bildirim")}</div>
        <div class="notifItemBody">${escapeHtml(x.body || "")}</div>
      `;
      notifList.appendChild(it);
    });

  } catch (e) {
    notifList.innerHTML = `<div style="font-weight:900;color:#b00020;">Hata: ${escapeHtml(e.message || "")}</div>`;
  }
}

async function switchMode(modeKey) {
  if (modeKey === currentMode) return;

  if (modeKey === "dedikodu") {
    await pullPlanFromBackend();
    applyHero("dedikodu");

    try {
      const mod = await import("./dedikodu.js");
      if (mod?.openPanel) mod.openPanel();
      else showPage("Dedikodu Odası", `<div style="font-weight:900;">dedikodu.js yok</div>`);
    } catch (e) {
      showPage("Dedikodu Odası", `<div style="font-weight:900;color:#111;">Hata</div><div style="margin-top:8px;color:#444;font-weight:800;">${escapeHtml(e.message || "")}</div>`);
    }
    return;
  }

  currentMode = modeKey;
  applyHero(modeKey);
  if (modeKey === "fal") resetFalCapture();
}

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
function resetFalCapture() { falImages = []; setFalStepUI(); }

function openCamera() { if (fileEl) { fileEl.value = ""; fileEl.click(); } }
function openFalCamera() { openCamera(); }

async function falCheckOneImage(dataUrl) {
  try {
    const r = await fetch(FAL_CHECK_URL, {
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

async function addBubble(role, text, isLoader = false, speech = "", imgData = null) {
  if (!chatContainer || !heroContent) return null;

  const div = document.createElement("div");
  div.className = "msg " + role;

  let content = "";
  if (imgData) content += `<img class="chat-img" src="${imgData}" onclick="event.stopPropagation()">`;

  div.innerHTML = `<div class="bubble">${content}</div>`;
  const bubble = div.querySelector(".bubble");

  chatContainer.appendChild(div);
  heroContent.style.display = "none";
  chatContainer.style.display = "block";
  scrollToBottom(true);

  if (role === "ai" && !isLoader) {
    if (window.DOMPurify && window.marked) {
      bubble.innerHTML = DOMPurify.sanitize(marked.parse(text));
    } else {
      bubble.textContent = text;
    }
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

if (chatContainer) {
  chatContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".audio-btn");
    if (!btn) return;

    const text = btn.dataset.speech || "";
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }

    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor`;
    try {
      const r = await fetch(SPEAK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ text, persona: currentPersona }),
      });
      const blob = await r.blob();
      currentAudio = new Audio(URL.createObjectURL(blob));
      await currentAudio.play();
      btn.classList.add("playing");
      btn.innerHTML = `<i class="fa-solid fa-stop"></i> Durdur`;
      currentAudio.onended = () => {
        btn.classList.remove("playing");
        btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
      };
    } catch {
      btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    }
  });
}

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

  const payload = { message: val, session_id: sessionId, image: pendingImage, mode: currentMode, persona: currentPersona };
  pendingImage = null;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    await addBubble("ai", data.assistant_text || "Bir şey diyemedim evladım.", false, data.speech_text || "");
  } catch {
    await addBubble("ai", "Bağlantı hatası oldu evladım. Bir daha dene.", false, "");
  } finally {
    isSending = false;
    sendBtn.disabled = false;
  }
}

function planHtml() {
  return `
    <div style="display:grid; gap:10px;">
      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="font-weight:1000;color:#111;">Free</div>
        <div style="margin-top:6px;color:#444;font-weight:800;">Günlük 2 fal • Sınırlı sohbet</div>
      </div>
      <div style="padding:12px;border:2px solid var(--primary);border-radius:16px;background:#fff8e1;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:1000;color:#111;">Plus</div>
          <div style="font-weight:1000;color:var(--primary);">79,99 TL</div>
        </div>
        <div style="margin-top:6px;color:#444;font-weight:800;">Sevecen + Kızgın açılır</div>
      </div>
      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:1000;color:#111;">Pro</div>
          <div style="font-weight:1000;color:#111;">119,99 TL</div>
        </div>
        <div style="margin-top:6px;color:#444;font-weight:800;">Dedikodu Odası + tüm modlar</div>
      </div>
    </div>
  `;
}

function aboutHtml() { return `<p><b>Caynana</b> — Yapay zekânın geleneksel aklı.</p>`; }
function faqHtml() { return `<p>SSS yakında.</p>`; }
function contactHtml() { return `<p>Destek: <b>support@caynana.ai</b></p>`; }
function privacyHtml() { return `<p>Gizlilik yakında.</p>`; }

function ensureGoogleButton() {
  if (!googleBtn) return;
  googleBtn.innerHTML = "";

  if (!window.google?.accounts?.id) {
    showAuthError("Google bileşeni yüklenmedi (WebView/Chrome güncel mi?)");
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
          await pullDedikoduStatusAndNotifs();
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
    await pullDedikoduStatusAndNotifs();
    setTimeout(() => hideModal(authModal), 450);
  } catch (e) {
    showAuthError(e);
  }
}

function bindEvents() {
  if (personaBtn && personaModal) personaBtn.onclick = () => { refreshPersonaLocks(); showModal(personaModal); };
  if (personaClose && personaModal) personaClose.onclick = () => hideModal(personaModal);
  if (personaModal) personaModal.addEventListener("click", (e) => { if (e.target === personaModal) hideModal(personaModal); });

  document.querySelectorAll("#personaModal .persona-opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      const id = opt.getAttribute("data-persona");
      const allow = new Set(allowedPersonas());
      if (!allow.has(id)) { hideModal(personaModal); showPage("Üyelik", planHtml()); return; }
      currentPersona = id;
      refreshPersonaLocks();
      setTimeout(() => hideModal(personaModal), 150);
    });
  });

  if (menuBtn && drawer && drawerMask) menuBtn.onclick = () => { drawerMask.classList.add("show"); drawer.classList.add("open"); };
  if (drawerClose && drawer && drawerMask) drawerClose.onclick = () => { drawerMask.classList.remove("show"); drawer.classList.remove("open"); };
  if (drawerMask && drawer) drawerMask.onclick = () => { drawerMask.classList.remove("show"); drawer.classList.remove("open"); };

  if (pageClose) pageClose.onclick = hidePage;
  if (pageModal) pageModal.addEventListener("click", (e) => { if (e.target === pageModal) hidePage(); });

  if (accountBtn && authModal) {
    accountBtn.onclick = () => {
      showModal(authModal);
      setAuthStatus(getToken() ? "Bağlı ✅" : "Bağlı değil ❌");
      setTimeout(ensureGoogleButton, 120);
    };
  }
  if (authClose) authClose.onclick = () => hideModal(authModal);
  if (authCloseX) authCloseX.onclick = () => hideModal(authModal);
  if (authModal) authModal.addEventListener("click", (e) => { if (e.target === authModal) hideModal(authModal); });

  if (btnLoginTab && btnRegTab && authSubmit) {
    btnLoginTab.onclick = () => { authMode = "login"; btnLoginTab.classList.add("tabActive"); btnRegTab.classList.remove("tabActive"); authSubmit.textContent = "Giriş Yap"; };
    btnRegTab.onclick = () => { authMode = "register"; btnRegTab.classList.add("tabActive"); btnLoginTab.classList.remove("tabActive"); authSubmit.textContent = "Kayıt Ol"; };
  }
  if (authSubmit) authSubmit.onclick = handleAuthSubmit;

  if (authLogout) {
    authLogout.onclick = () => {
      setToken("");
      currentPlan = "free";
      currentPersona = "normal";
      refreshPersonaLocks();
      setAuthStatus("Çıkış yapıldı ❌");
      pullDedikoduStatusAndNotifs();
    };
  }

  if (planBtn) planBtn.onclick = () => showPage("Üyelik", planHtml());
  if (aboutBtn) aboutBtn.onclick = () => showPage("Hakkımızda", aboutHtml());
  if (faqBtn) faqBtn.onclick = () => showPage("Sık Sorulan Sorular", faqHtml());
  if (contactBtn) contactBtn.onclick = () => showPage("İletişim", contactHtml());
  if (privacyBtn) privacyBtn.onclick = () => showPage("Gizlilik", privacyHtml());

  if (brandTap) brandTap.onclick = () => switchMode("chat");

  if (camBtn) camBtn.onclick = () => openCamera();
  if (falCamBtn) falCamBtn.onclick = () => openFalCamera();
  if (micBtn) micBtn.onclick = () => startMic();
  if (textInput) textInput.addEventListener("keypress", (e) => { if (e.key === "Enter") send(); });
  if (sendBtn) sendBtn.onclick = () => send();

  if (notifIconBtn) notifIconBtn.onclick = () => openNotifModal();
  if (notifBtn) notifBtn.onclick = () => openNotifModal();
  if (notifClose) notifClose.onclick = () => hideModal(notifModal);
  if (notifModal) notifModal.addEventListener("click", (e) => { if (e.target === notifModal) hideModal(notifModal); });

  if (dedikoduBtn) dedikoduBtn.onclick = () => switchMode("dedikodu");
}

function isMobile() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ""); }
function applyWebLock() {
  if (!WEB_LOCK) return;
  if (isMobile()) return;
  if (lockAndroidBtn) lockAndroidBtn.href = PLAY_URL;
  if (lockApkBtn) lockApkBtn.href = APK_URL;
  showModal(webLock);
}

async function init() {
  applyWebLock();
  if (lockAndroidBtn) lockAndroidBtn.href = PLAY_URL;
  if (lockApkBtn) lockApkBtn.href = APK_URL;

  renderDock();
  applyHero("chat");
  setFalStepUI();
  bindEvents();

  await pullPlanFromBackend();
  await pullDedikoduStatusAndNotifs();
}

init();
