// caynana-web/js/main.js (STABLE)
// - index.html (v3001) ile %100 uyumlu
// - topbar: topbarGlass + topActions
// - google login geri geldi (auth modal açılınca render)
// - CORS patlatmasın diye notifications açılışta çağrılmaz

export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const API_URL = `${BASE_DOMAIN}/api/chat`;
const SPEAK_URL = `${BASE_DOMAIN}/api/speak`;
const FAL_CHECK_URL = `${BASE_DOMAIN}/api/fal/check`;

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";

// Web lock
const WEB_LOCK = false;
const PLAY_URL = "https://play.google.com/store/apps/details?id=ai.caynana.app";
const APK_URL  = "#";

// --------------------
// Token helpers
// --------------------
const TOKEN_KEY = "caynana_token";
export function getToken(){ return localStorage.getItem(TOKEN_KEY) || ""; }
function setToken(t){ t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }
export function authHeaders(){ return getToken() ? { "Authorization": "Bearer " + getToken() } : {}; }

// --------------------
// State
// --------------------
let sessionId = "sess_" + Math.random().toString(36).slice(2, 10);
let currentAudio = null;
let pendingImage = null;
let currentMode = "chat";
let currentPersona = "normal";
let isSending = false;

let currentPlan = "free"; // free|plus|pro
export const IS_ALTIN = () => (currentPlan || "free").toLowerCase() === "pro";

// Fal
let falImages = [];
const FAL_STEPS = ["1/3: Üstten çek", "2/3: Yandan çek", "3/3: Diğer yandan çek"];
if (window.marked) marked.setOptions({ mangle:false, headerIds:false });

// --------------------
// DOM
// --------------------
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
const notifModal = $("notifModal");
const notifClose = $("notifClose");
const notifList = $("notifList");
const notifBadge = $("notifBadge");
const notifPill = $("notifPill");

const dpAvatar = $("dpAvatar");
const dpName = $("dpName");
const dpPlan = $("dpPlan");
const dpCN = $("dpCN");
const safeLogoutBtn = $("safeLogoutBtn");

const oz0 = $("ozLine0");
const oz1 = $("ozLine1");
const oz2 = $("ozLine2");
const oz3 = $("ozLine3");

// --------------------
// Utils
// --------------------
function showModal(el){ if(el) el.classList.add("show"); }
function hideModal(el){ if(el) el.classList.remove("show"); }

function setAuthStatus(msg){ if(authStatus) authStatus.textContent = msg; }
function showAuthError(err){
  if(!authStatus) return;
  const m = (typeof err === "string") ? err : (err?.message || "Bilinmeyen");
  authStatus.textContent = "Hata: " + m;
}

export function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

// dedikodu.js vb. isterse
window.App = { escapeHtml, showPage };

function showPage(title, html){
  if(!pageModal || !pageTitleEl || !pageBodyEl) return;
  pageTitleEl.textContent = title;
  pageBodyEl.innerHTML = html;
  showModal(pageModal);
  closeDrawer();
}
function hidePage(){ hideModal(pageModal); }

function isMobile(){
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

function scrollToBottom(force=false){
  if(!chatContainer) return;
  if(force){ requestAnimationFrame(()=> chatContainer.scrollTop = chatContainer.scrollHeight); return; }
  const near = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) < 260;
  if(!near) return;
  requestAnimationFrame(()=> chatContainer.scrollTop = chatContainer.scrollHeight);
}
window.addEventListener("resize", ()=> scrollToBottom(true));

async function typeWriterEffect(element, text, speed=22){
  return new Promise(resolve=>{
    let i=0;
    element.innerHTML="";
    element.classList.add("typing-cursor");
    function tick(){
      if(i<text.length){
        element.textContent += text.charAt(i++);
        scrollToBottom(true);
        setTimeout(tick, speed);
      }else{
        element.classList.remove("typing-cursor");
        if(window.DOMPurify && window.marked){
          element.innerHTML = DOMPurify.sanitize(marked.parse(text));
        }else{
          element.textContent = text;
        }
        resolve();
      }
    }
    tick();
  });
}

function assetUrl(relPath){
  return new URL(`../${relPath}`, import.meta.url).href;
}

// --------------------
// Modes
// --------------------
const MODES = {
  chat:{ label:"Sohbet", icon:"fa-comments", color:"#FFB300",
    title:"Caynana ile<br>iki lafın belini kır.",
    desc:"Biraz dur bakalım, neler anlatacaksın?",
    img: assetUrl("images/hero-chat.png"),
    ph:"Naber Caynana?",
    sugg:"Benim zamanımda her şey daha güzeldi ah ah…",
    heroStyle:{ top:"100px", left:"24px", textAlign:"left", width:"auto", maxWidth:"70%" } },

  dedikodu:{ label:"Dedikodu", icon:"fa-people-group", color:"#111111",
    title:"Dedikodu Odası",
    desc:"Evladım burada lafın ucu kaçar…",
    img: assetUrl("images/hero-dedikodu.png"),
    ph:"", sugg:"Dedikodu varsa ben buradayım…",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  shopping:{ label:"Alışveriş", icon:"fa-bag-shopping", color:"#00C897",
    title:"Almadan önce<br>Caynana’ya sor.",
    desc:"Sonra “keşke” dememek için buradayım.",
    img: assetUrl("images/hero-shopping.png"),
    ph:"Ne arıyorsun evladım?",
    sugg:"Her indirime atlayan sonunda pahalı öder.",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  fal:{ label:"Fal", icon:"fa-mug-hot", color:"#8B5CF6",
    title:"Fincanı kapat<br>tabakla gönder.",
    desc:"3 açı çek: üstten, yandan, diğer yandan.",
    img: assetUrl("images/hero-fal.png"),
    ph:"", sugg:"Sadece fincan + tabak.",
    heroStyle:{ top:"100px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  saglik:{ label:"Sağlık", icon:"fa-heart-pulse", color:"#EF4444",
    title:"Caynana Sağlık'la<br>turp gibi ol.",
    desc:"Neren ağrıyor söyle bakayım?",
    img: assetUrl("images/hero-health.png"),
    ph:"Şikayetin ne?",
    sugg:"Çay üstüne sakın soğuk su içme!",
    heroStyle:{ top:"110px", left:"24px", textAlign:"left", width:"auto", maxWidth:"70%" } },

  diyet:{ label:"Diyet", icon:"fa-carrot", color:"#84CC16",
    title:"Sağlıklı beslen<br>zinde kal!",
    desc:"Açlıktan değil, keyiften yiyin.",
    img: assetUrl("images/hero-diet.png"),
    ph:"Boy kilo kaç?",
    sugg:"Ekmek değil, yeşillik ye.",
    heroStyle:{ top:"100px", left:"24px", textAlign:"left", width:"auto", maxWidth:"75%" } },
};

const MODE_KEYS = Object.keys(MODES);

// Footer 4 çizgi: aktif + sonraki 3
function applyFooterLines(activeKey){
  const idx = MODE_KEYS.indexOf(activeKey);
  const colors = [];
  for(let i=0;i<4;i++){
    const k = MODE_KEYS[(idx + i + MODE_KEYS.length) % MODE_KEYS.length];
    colors.push((MODES[k]||MODES.chat).color);
  }
  if(oz0) oz0.style.background = colors[0];
  if(oz1) oz1.style.background = colors[1];
  if(oz2) oz2.style.background = colors[2];
  if(oz3) oz3.style.background = colors[3];
}

// --------------------
// Hero apply
// --------------------
function applyHero(modeKey){
  const m = MODES[modeKey] || MODES.chat;
  document.documentElement.style.setProperty("--primary", m.color);
  if(heroImage) heroImage.src = m.img;
  if(heroTitle) heroTitle.innerHTML = m.title;
  if(heroDesc) heroDesc.innerHTML = m.desc;

  const hs = m.heroStyle || {};
  if(heroContent){
    heroContent.style.top = hs.top || "100px";
    heroContent.style.left = hs.left || "24px";
    heroContent.style.textAlign = hs.textAlign || "left";
    heroContent.style.width = hs.width || "auto";
    heroContent.style.maxWidth = hs.maxWidth || "70%";
  }
  if(textInput) textInput.placeholder = m.ph || "Bir şey yaz...";
  if(suggestionText) suggestionText.textContent = m.sugg || "";

  applyFooterLines(modeKey);
}

const modeChats = {};
function saveModeChat(){
  if(chatContainer) modeChats[currentMode] = chatContainer.innerHTML || "";
}
function loadModeChat(modeKey){
  if(!chatContainer || !heroContent) return;
  chatContainer.innerHTML = modeChats[modeKey] || "";
  if(!chatContainer.innerHTML.trim()){
    heroContent.style.display="block";
    chatContainer.style.display="none";
  }else{
    heroContent.style.display="none";
    chatContainer.style.display="block";
    scrollToBottom(true);
  }
}

function switchMode(modeKey){
  if(modeKey === currentMode) return;

  saveModeChat();
  currentMode = modeKey;

  document.querySelectorAll(".dock-item").forEach(el=>{
    el.classList.toggle("active", el.getAttribute("data-mode") === modeKey);
  });

  applyHero(modeKey);
  loadModeChat(modeKey);

  document.body.classList.toggle("fal-mode", modeKey === "fal");
  if(modeKey === "fal") resetFalCapture();
}

// Swipe ile mod geçişi (hero alanında)
function bindSwipe(){
  const area = $("main");
  if(!area) return;
  let sx=0, sy=0, active=false;

  area.addEventListener("pointerdown",(e)=>{ active=true; sx=e.clientX; sy=e.clientY; }, {passive:true});
  area.addEventListener("pointerup",(e)=>{
    if(!active) return;
    active=false;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if(Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    const step = dx < 0 ? 1 : -1;
    const idx = MODE_KEYS.indexOf(currentMode);
    const next = MODE_KEYS[(idx + step + MODE_KEYS.length) % MODE_KEYS.length];
    switchMode(next);
  }, {passive:true});
}

// --------------------
// Dock render
// --------------------
function renderDock(){
  if(!dock) return;
  dock.innerHTML="";
  MODE_KEYS.forEach(k=>{
    const m = MODES[k];
    const item = document.createElement("div");
    item.className = "dock-item" + (k===currentMode ? " active":"");
    item.setAttribute("data-mode", k);
    item.innerHTML = `
      <div class="icon-box"><i class="fa-solid ${m.icon}"></i></div>
      <div class="dock-label">${m.label}</div>
    `;
    item.onclick = ()=> switchMode(k);
    dock.appendChild(item);
  });
}

// --------------------
// Auth / plan / profile summary
// --------------------
async function pullPlanFromBackend(){
  if(!getToken()){
    currentPlan = "free";
    return;
  }
  try{
    const r = await fetch(`${BASE_DOMAIN}/api/memory/get`, { method:"GET", headers:{...authHeaders()} });
    const j = await r.json().catch(()=> ({}));
    const plan = ((j.profile||{}).plan || "free").toLowerCase();
    currentPlan = (plan==="plus" || plan==="pro") ? plan : "free";
  }catch{
    currentPlan = "free";
  }
}

function setDrawerProfileUI({name="Misafir", plan="Free", cn="CN-????", avatar=""}){
  if(dpName) dpName.textContent = name;
  if(dpPlan) dpPlan.textContent = plan;
  if(dpCN) dpCN.textContent = cn;
  if(dpAvatar){
    dpAvatar.src = avatar || "https://via.placeholder.com/80";
    dpAvatar.onerror = () => { dpAvatar.src = "https://via.placeholder.com/80"; };
  }
}

function updateLoginUI(){
  const logged = !!getToken();
  // Güvenli çıkış sadece online
  if(safeLogoutBtn) safeLogoutBtn.style.display = logged ? "flex" : "none";
}

// --------------------
// Google login
// --------------------
function ensureGoogleButton(){
  if(!googleBtn) return;
  googleBtn.innerHTML = "";
  if(!window.google?.accounts?.id){
    showAuthError("Google bileşeni yüklenmedi. (Android System WebView/Chrome güncel mü?)");
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (resp)=>{
      try{
        setAuthStatus("Google ile giriş yapılıyor…");
        const r = await fetch(`${BASE_DOMAIN}/api/auth/google`,{
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ id_token: resp.credential })
        });
        const j = await r.json().catch(()=> ({}));
        if(!r.ok) throw new Error(j.detail || "Google giriş başarısız");
        setToken(j.token);
        setAuthStatus("Bağlandı ✅");
        await pullPlanFromBackend();
        updateLoginUI();
        setTimeout(()=> hideModal(authModal), 400);
      }catch(e){
        showAuthError(e);
      }
    }
  });
  google.accounts.id.renderButton(googleBtn,{
    theme:"outline",
    size:"large",
    text:"continue_with",
    shape:"pill"
  });
}

// Email auth
let authMode = "login";
async function handleAuthSubmit(){
  const email = (authEmail?.value || "").trim();
  const password = (authPass?.value || "").trim();
  setAuthStatus("İşlem yapıyorum…");
  try{
    const endpoint = authMode==="register" ? "/api/auth/register" : "/api/auth/login";
    const r = await fetch(`${BASE_DOMAIN}${endpoint}`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password })
    });
    const j = await r.json().catch(()=> ({}));
    if(!r.ok) throw new Error(j.detail || "Hata");
    setToken(j.token);
    setAuthStatus("Bağlandı ✅");
    await pullPlanFromBackend();
    updateLoginUI();
    setTimeout(()=> hideModal(authModal), 400);
  }catch(e){
    showAuthError(e);
  }
}

// --------------------
// Notifications (CORS riskini azaltmak için sadece modal açınca)
// --------------------
async function fetchNotifications(){
  if(!getToken()) return [];
  const r = await fetch(`${BASE_DOMAIN}/api/notifications`, { method:"GET", headers:{...authHeaders()} });
  const j = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(j.detail || "Bildirim alınamadı");
  return j.items || [];
}
async function openNotifications(){
  showModal(notifModal);
  if(!notifList) return;
  notifList.innerHTML = `<div style="font-weight:900;color:#444;">Yükleniyor…</div>`;
  try{
    const items = await fetchNotifications();
    const unread = items.length;
    if(notifBadge){
      notifBadge.style.display = unread>0 ? "flex":"none";
      notifBadge.textContent = String(unread>99 ? "99+" : unread);
    }
    if(notifPill){
      notifPill.style.display = unread>0 ? "inline-block":"none";
      notifPill.textContent = String(unread>99 ? "99+" : unread);
    }

    if(!items.length){
      notifList.innerHTML = `<div style="font-weight:900;color:#666;">Bildirim yok.</div>`;
      return;
    }

    notifList.innerHTML = items.map(it=>`
      <div class="notifItem unread">
        <div class="notifItemTitle">${escapeHtml(it.title || "Bildirim")}</div>
        <div class="notifItemBody">${escapeHtml(it.text || it.message || "")}</div>
      </div>
    `).join("");
  }catch(e){
    notifList.innerHTML = `<div style="font-weight:900;color:#b00;">${escapeHtml(e.message||"Hata")}</div>`;
  }
}

// --------------------
// Mic
// --------------------
function startMic(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return alert("Tarayıcı desteklemiyor");
  const r = new SR();
  r.lang="tr-TR";
  r.onresult = (e)=>{ if(textInput) textInput.value = e.results[0][0].transcript; send(); };
  r.start();
}

// --------------------
// Photo / Fal
// --------------------
function openCamera(){ if(fileEl){ fileEl.value=""; fileEl.click(); } }
function openFalCamera(){ openCamera(); }

function setFalStepUI(){
  if(!falStepText || !falStepSub) return;
  if(falImages.length < 3){
    falStepText.textContent = "Fal için 3 fotoğraf çek";
    falStepSub.textContent = FAL_STEPS[falImages.length] || "1/3: Üstten çek";
  }else{
    falStepText.textContent = "Fal hazır…";
    falStepSub.textContent = "Yorum hazırlanıyor";
  }
}
function resetFalCapture(){ falImages=[]; setFalStepUI(); }

async function falCheckOneImage(dataUrl){
  try{
    const r = await fetch(FAL_CHECK_URL,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ image: dataUrl })
    });
    return await r.json();
  }catch{
    return { ok:false, reason:"Kontrol edemedim, tekrar dene." };
  }
}

function resetModalOnly(){
  pendingImage=null;
  if(photoPreview) photoPreview.src="";
  hideModal(photoModal);
  if(fileEl) fileEl.value="";
}

if(fileEl){
  fileEl.addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = async ()=>{
      const imgData = reader.result;

      if(currentMode === "fal"){
        const check = await falCheckOneImage(imgData);
        if(!check.ok){
          await addBubble("ai", check.reason || "Evladım bu fincan-tabak değil. Yeniden çek.", false, "");
          resetModalOnly();
          setTimeout(()=> openFalCamera(), 150);
          return;
        }
        falImages.push(imgData);
        setFalStepUI();

        pendingImage = imgData;
        if(photoPreview) photoPreview.src = pendingImage;
        if(photoTitle) photoTitle.textContent = "Fal fotoğrafı";
        if(photoHint){
          photoHint.textContent = (falImages.length < 3)
            ? `Tamam deyince ${FAL_STEPS[falImages.length] || "sonraki açı"} geçiyoruz.`
            : "Tamam deyince fala bakıyorum.";
        }
        showModal(photoModal);
        return;
      }

      pendingImage = imgData;
      if(photoPreview) photoPreview.src = pendingImage;
      if(photoTitle) photoTitle.textContent = "Fotoğraf hazır";
      if(photoHint) photoHint.textContent = "Tamam deyince Caynana hemen yoruma başlayacak.";
      showModal(photoModal);
    };
    reader.readAsDataURL(f);
  });
}

if(photoCancelBtn){
  photoCancelBtn.onclick = ()=>{
    if(currentMode === "fal"){
      falImages = falImages.slice(0, Math.max(0, falImages.length-1));
      setFalStepUI();
    }
    resetModalOnly();
  };
}

if(photoOkBtn){
  photoOkBtn.onclick = async ()=>{
    hideModal(photoModal);
    if(currentMode === "fal"){
      if(falImages.length < 3){
        setTimeout(()=> openFalCamera(), 180);
        return;
      }
      pendingImage = falImages[falImages.length-1];
      if(textInput) textInput.value = "Fal bak: fincanı 3 açıdan gönderdim. Gerçekçi ve insani anlat.";
      await send();
      resetFalCapture();
      return;
    }
    if(textInput) textInput.value="";
    await send();
  };
}

// --------------------
// Bubbles + Audio
// --------------------
async function addBubble(role, text, isLoader=false, speech="", imgData=null, id=null){
  if(!chatContainer || !heroContent) return null;

  const div = document.createElement("div");
  div.className = "msg " + role;
  if(id) div.id = id;

  let content = "";
  if(imgData){
    content += `<img class="chat-img" src="${imgData}">`;
  }
  div.innerHTML = `<div class="bubble">${content}</div>`;
  const bubble = div.querySelector(".bubble");

  chatContainer.appendChild(div);
  heroContent.style.display="none";
  chatContainer.style.display="block";
  scrollToBottom(true);

  if(role==="ai" && !isLoader){
    await typeWriterEffect(bubble, text);
  }else{
    bubble.innerHTML += role==="user" ? escapeHtml(text) : text;
  }

  if(role==="ai"){
    const sp = (speech && speech.trim()) ? speech : (text||"").replace(/[*_`#>-]/g,"").slice(0,280);
    const btn = document.createElement("div");
    btn.className="audio-btn";
    btn.dataset.speech = sp;
    btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    div.appendChild(btn);
  }

  scrollToBottom(true);
  return div;
}

if(chatContainer){
  chatContainer.addEventListener("click", async (e)=>{
    const btn = e.target.closest(".audio-btn");
    if(!btn) return;
    await playAudio(btn.dataset.speech, btn);
  });
}

async function playAudio(text, btn){
  if(currentAudio){ currentAudio.pause(); currentAudio=null; }
  const oldHtml = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor`;
  try{
    const r = await fetch(SPEAK_URL,{
      method:"POST",
      headers:{ "Content-Type":"application/json", ...authHeaders() },
      body: JSON.stringify({ text, persona: currentPersona })
    });
    const blob = await r.blob();
    currentAudio = new Audio(URL.createObjectURL(blob));
    currentAudio.onended = ()=>{ btn.classList.remove("playing"); btn.innerHTML = oldHtml; };
    await currentAudio.play();
    btn.classList.add("playing");
    btn.innerHTML = `<i class="fa-solid fa-stop"></i> Durdur`;
  }catch{
    btn.innerHTML = oldHtml;
  }
}

// --------------------
// Send
// --------------------
async function send(){
  if(isSending) return;
  let val = (textInput?.value || "").trim();
  if(pendingImage && !val) val = "Bu resmi yorumla";
  if(!val && !pendingImage) return;

  isSending=true;
  if(sendBtn) sendBtn.disabled=true;

  await addBubble("user", val, false, "", pendingImage);
  if(textInput) textInput.value="";

  const loaderId = "ldr_" + Date.now();
  await addBubble("ai", "<i class='fa-solid fa-spinner fa-spin'></i>", true, "", null, loaderId);

  const payload = { message: val, session_id: sessionId, image: pendingImage, mode: currentMode, persona: currentPersona };
  pendingImage=null;

  try{
    const res = await fetch(API_URL,{
      method:"POST",
      headers:{ "Content-Type":"application/json", ...authHeaders() },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(()=> ({}));

    const loader = document.getElementById(loaderId);
    if(loader) loader.remove();

    await addBubble("ai", data.assistant_text || "Bir şey diyemedim evladım.", false, data.speech_text || "");
    saveModeChat();
  }catch{
    const loader = document.getElementById(loaderId);
    if(loader) loader.remove();
    await addBubble("ai","Bağlantı hatası oldu evladım. Bir daha dene.", false,"");
  }finally{
    isSending=false;
    if(sendBtn) sendBtn.disabled=false;
  }
}

// --------------------
// Drawer helpers
// --------------------
function openDrawer(){
  if(drawerMask) drawerMask.classList.add("show");
  if(drawer) drawer.classList.add("open");
}
function closeDrawer(){
  if(drawerMask) drawerMask.classList.remove("show");
  if(drawer) drawer.classList.remove("open");
}

// --------------------
// Pages HTML
// --------------------
function planHtml(){
  return `
    <div style="display:grid; gap:10px;">
      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="font-weight:1000;color:#111;">Free</div>
        <div style="margin-top:6px;color:#444;font-weight:800;line-height:1.45;">
          Günlük <b>2 fal</b> • Sınırlı sohbet • Sadece <b>Normal</b>
        </div>
      </div>
      <div style="padding:12px;border:2px solid var(--primary);border-radius:16px;background:#fff8e1;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:1000;color:#111;">Plus</div>
          <div style="font-weight:1000;color:var(--primary);">79,99 TL</div>
        </div>
        <div style="margin-top:6px;color:#444;font-weight:800;line-height:1.45;">
          Günlük <b>5 fal</b> • Daha fazla sohbet
        </div>
      </div>
      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:1000;color:#111;">Pro</div>
          <div style="font-weight:1000;color:#111;">119,99 TL</div>
        </div>
        <div style="margin-top:6px;color:#444;font-weight:800;line-height:1.45;">
          <b>Sınırsız</b> fal/sohbet • Tüm modlar
        </div>
      </div>
    </div>
  `;
}
function aboutHtml(){ return `<p><b>Caynana</b> — Yapay zekânın geleneksel aklı.</p>`; }
function faqHtml(){ return `<p>SSS yakında.</p>`; }
function contactHtml(){ return `<p>Destek: <b>support@caynana.ai</b></p>`; }
function privacyHtml(){ return `<p>Gizlilik politikası yakında.</p>`; }

// --------------------
// Events
// --------------------
function bindEvents(){
  // Persona
  if(personaBtn && personaModal){
    personaBtn.onclick = ()=> showModal(personaModal);
  }
  if(personaClose && personaModal) personaClose.onclick = ()=> hideModal(personaModal);
  if(personaModal) personaModal.addEventListener("click",(e)=>{ if(e.target===personaModal) hideModal(personaModal); });

  // Menu drawer
  if(menuBtn) menuBtn.onclick = openDrawer;
  if(drawerClose) drawerClose.onclick = closeDrawer;
  if(drawerMask) drawerMask.onclick = closeDrawer;

  // Page modal close
  if(pageClose) pageClose.onclick = hidePage;
  if(pageModal) pageModal.addEventListener("click",(e)=>{ if(e.target===pageModal) hidePage(); });

  // Notifications
  if(notifIconBtn) notifIconBtn.onclick = openNotifications;
  if(notifClose) notifClose.onclick = ()=> hideModal(notifModal);
  if(notifModal) notifModal.addEventListener("click",(e)=>{ if(e.target===notifModal) hideModal(notifModal); });

  // Drawer items
  if(accountBtn && authModal){
    accountBtn.onclick = ()=>{
      showModal(authModal);
      setAuthStatus(getToken() ? "Bağlı ✅" : "Bağlı değil ❌");
      setTimeout(ensureGoogleButton, 120);
      closeDrawer();
    };
  }
  if(planBtn) planBtn.onclick = ()=>{ showPage("Üyelik", planHtml()); };
  if(aboutBtn) aboutBtn.onclick = ()=>{ showPage("Hakkımızda", aboutHtml()); };
  if(faqBtn) faqBtn.onclick = ()=>{ showPage("Sık Sorulan Sorular", faqHtml()); };
  if(contactBtn) contactBtn.onclick = ()=>{ showPage("İletişim", contactHtml()); };
  if(privacyBtn) privacyBtn.onclick = ()=>{ showPage("Gizlilik", privacyHtml()); };

  // Auth modal close
  const authCloseBtn = $("authClose");
  if(authCloseBtn) authCloseBtn.onclick = ()=> hideModal(authModal);
  if(authCloseX) authCloseX.onclick = ()=> hideModal(authModal);
  if(authModal) authModal.addEventListener("click",(e)=>{ if(e.target===authModal) hideModal(authModal); });

  // Auth tabs
  if(btnLoginTab && btnRegTab && authSubmit){
    btnLoginTab.onclick = ()=>{
      authMode="login";
      btnLoginTab.classList.add("tabActive");
      btnRegTab.classList.remove("tabActive");
      authSubmit.textContent="Giriş Yap";
    };
    btnRegTab.onclick = ()=>{
      authMode="register";
      btnRegTab.classList.add("tabActive");
      btnLoginTab.classList.remove("tabActive");
      authSubmit.textContent="Kayıt Ol";
    };
  }
  if(authSubmit) authSubmit.onclick = handleAuthSubmit;

  // Logout
  if(authLogout){
    authLogout.onclick = ()=>{
      setToken("");
      currentPlan="free";
      setAuthStatus("Çıkış yapıldı ❌");
      updateLoginUI();
    };
  }
  if(safeLogoutBtn){
    safeLogoutBtn.onclick = ()=>{
      setToken("");
      currentPlan="free";
      updateLoginUI();
      closeDrawer();
    };
  }

  // Brand tap cycle
  if(brandTap) brandTap.onclick = ()=> cycleMode(1);

  // Camera / mic / send
  if(camBtn) camBtn.onclick = openCamera;
  if(falCamBtn) falCamBtn.onclick = openFalCamera;
  if(micBtn) micBtn.onclick = startMic;
  if(textInput) textInput.addEventListener("keypress",(e)=>{ if(e.key==="Enter") send(); });
  if(sendBtn) sendBtn.onclick = send;
}

// --------------------
// Web lock
// --------------------
function applyWebLock(){
  if(!WEB_LOCK) return;
  if(isMobile()) return;
  if(lockAndroidBtn) lockAndroidBtn.href = PLAY_URL;
  if(lockApkBtn) lockApkBtn.href = APK_URL;
  showModal(webLock);
}

// --------------------
// Init
// --------------------
async function init(){
  applyWebLock();
  if(lockAndroidBtn) lockAndroidBtn.href = PLAY_URL;
  if(lockApkBtn) lockApkBtn.href = APK_URL;

  renderDock();
  applyHero("chat");
  loadModeChat("chat");
  setFalStepUI();

  bindSwipe();
  bindEvents();

  await pullPlanFromBackend();
  updateLoginUI();

  // İlk drawer profil görünümü (şimdilik local)
  setDrawerProfileUI({ name: getToken() ? "Kullanıcı" : "Misafir", plan: currentPlan.toUpperCase(), cn:"CN-????", avatar:"" });
}

init();
