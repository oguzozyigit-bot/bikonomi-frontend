// =========================================================
// FILE: /js/auth.js
// VERSION: vFINAL+1 (Fix: Custom Google button actually opens Google sign-in)
// WHAT CHANGED:
// 1) initAuth() artık #googleBtnWrap içine GSI butonunu 1 kez render eder (hidden).
// 2) handleLogin("google") artık prompt() yerine hidden GSI butonunu click’ler.
//    (prompt One Tap bazen “not displayed” olur; buton click daha stabil.)
// 3) Yine de click bulunamazsa fallback olarak prompt() bırakıldı.
// =========================================================

import { GOOGLE_CLIENT_ID, STORAGE_KEY, BASE_DOMAIN } from "./config.js";

const API_TOKEN_KEY = "caynana_api_token";
const STABLE_ID_KEY = "caynana_stable_id_v1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getAuthState(){
  if(!window.__CAYNANA_AUTH__) window.__CAYNANA_AUTH__ = {
    inited: false,
    promptInFlight: false,
    lastPromptAt: 0,
    btnRendered: false
  };
  return window.__CAYNANA_AUTH__;
}

export async function waitForGsi(timeoutMs = 8000){
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs){
    if (window.google?.accounts?.id) return true;
    await sleep(60);
  }
  return false;
}

// ✅ JWT payload UTF-8 decode (Türkçe karakter bozulmasın)
function base64UrlToBytes(base64Url){
  let b64 = String(base64Url || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);

  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function parseJwt(idToken = ""){
  try{
    const parts = String(idToken).split(".");
    if(parts.length < 2) return null;

    const bytes = base64UrlToBytes(parts[1]);
    const json = new TextDecoder("utf-8", { fatal:false }).decode(bytes);
    return JSON.parse(json);
  }catch(e){
    console.error("parseJwt failed:", e);
    return null;
  }
}

function termsKey(email=""){
  return `caynana_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}

function setApiToken(t){ if(t) localStorage.setItem(API_TOKEN_KEY, t); }
function clearApiToken(){ localStorage.removeItem(API_TOKEN_KEY); }

// ✅ ID üret: 2 harf + 8 rakam (ardışık yok)
function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickLetter(except){
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let ch = "";
  for(let t=0;t<50;t++){
    ch = A[randInt(0, A.length-1)];
    if(ch !== except) return ch;
  }
  return ch || "X";
}
function buildNonSequentialDigits(len=8){
  const digits = [];
  for(let i=0;i<len;i++){
    let d = randInt(0,9);
    for(let t=0;t<120;t++){
      const prev = digits[i-1];
      const prev2 = digits[i-2];
      const ok1 = (prev === undefined) ? true : (d !== prev && Math.abs(d - prev) !== 1);
      const ok2 = (prev2 === undefined) ? true : (d !== prev2);
      if(ok1 && ok2) break;
      d = randInt(0,9);
    }
    digits.push(d);
  }
  return digits.join("");
}
function getOrCreateStableId(){
  const existing = (localStorage.getItem(STABLE_ID_KEY) || "").trim();
  if(existing) return existing;

  const a = pickLetter("");
  const b = pickLetter(a);
  const nums = buildNonSequentialDigits(8);
  const id = `${a}${b}${nums}`;
  localStorage.setItem(STABLE_ID_KEY, id);
  return id;
}

// Backend session token al (Google id_token -> backend token)
async function fetchBackendToken(googleIdToken){
  const r = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

async function handleGoogleResponse(res){
  try{
    const idToken = (res?.credential || "").trim();
    if(!idToken) return;

    localStorage.setItem("google_id_token", idToken);

    const payload = parseJwt(idToken);
    if(!payload?.email){
      alert("Google token çözülemedi. Client ID / domain ayarlarını kontrol et.");
      return;
    }

    const email = String(payload.email).toLowerCase().trim();
    const savedTermsAt = localStorage.getItem(termsKey(email)) || null;

    const stableId = getOrCreateStableId();

    const user = {
      id: stableId,
      user_id: stableId,
      email,

      fullname: payload.name || "",
      name: payload.name || "",
      display_name: payload.name || "",

      picture: payload.picture || "",
      avatar: payload.picture || "",

      provider: "google",
      isSessionActive: true,
      lastLoginAt: new Date().toISOString(),
      terms_accepted_at: savedTermsAt,
      yp_percent: 50
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    try{
      await fetchBackendToken(idToken);
    }catch(e){
      console.warn("backend token alınamadı:", e);
      clearApiToken();
    }

    window.location.reload();
  }catch(e){
    console.error("handleGoogleResponse error:", e);
    alert("Google girişinde hata oldu. Console'u kontrol et.");
  }
}

/**
 * ✅ Hidden GSI button render
 * - index.html içinde #googleBtnWrap varsa içine Google butonunu render ediyoruz (gizli).
 * - Custom 3D butona basınca bu hidden butonu click'leyerek popup sign-in açıyoruz.
 */
function renderHiddenGoogleButtonOnce(){
  const st = getAuthState();
  if(st.btnRendered) return;

  const wrap = document.getElementById("googleBtnWrap");
  if(!wrap) return;

  // wrap görünmesin ama DOM’da dursun
  wrap.style.position = "absolute";
  wrap.style.left = "-9999px";
  wrap.style.top = "0";
  wrap.style.width = "1px";
  wrap.style.height = "1px";
  wrap.style.overflow = "hidden";
  wrap.style.opacity = "0";
  wrap.style.pointerEvents = "none";

  try{
    window.google.accounts.id.renderButton(wrap, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 1
    });
    st.btnRendered = true;
  }catch(e){
    console.warn("renderButton failed:", e);
  }
}

function clickHiddenGoogleButton(){
  const wrap = document.getElementById("googleBtnWrap");
  if(!wrap) return false;

  // renderButton genelde div[role=button] üretir
  const btn = wrap.querySelector('div[role="button"]');
  if(btn && typeof btn.click === "function"){
    btn.click();
    return true;
  }

  // Bazı durumlarda iframe çıkabilir (click her zaman çalışmayabilir)
  const iframe = wrap.querySelector("iframe");
  if(iframe){
    try{
      iframe.contentWindow?.focus?.();
      // iframe click çoğu tarayıcıda çalışmayabilir; false dönelim
    }catch(e){}
  }
  return false;
}

export function initAuth() {
  const st = getAuthState();
  if(st.inited) return;

  if (!window.google?.accounts?.id) return;
  if(!GOOGLE_CLIENT_ID){
    console.error("GOOGLE_CLIENT_ID missing in config.js");
    return;
  }

  st.inited = true;

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleResponse,
    auto_select: false,
    use_fedcm_for_prompt: true,
    cancel_on_tap_outside: false
  });

  // ✅ Tek sefer hidden butonu üret
  renderHiddenGoogleButtonOnce();
}

export function handleLogin(provider) {
  if(provider !== "google"){
    alert("Apple girişi yakında evladım.");
    return;
  }

  if(!window.google?.accounts?.id){
    alert("Google servisi yüklenemedi (GSI).");
    return;
  }

  initAuth();

  const st = getAuthState();
  const now = Date.now();
  if(st.promptInFlight) return;
  if(now - (st.lastPromptAt || 0) < 900) return;

  st.promptInFlight = true;
  st.lastPromptAt = now;

  try{
    // ✅ Öncelik: Hidden renderButton click -> popup login
    renderHiddenGoogleButtonOnce();
    const clicked = clickHiddenGoogleButton();

    if(!clicked){
      // Fallback: One Tap prompt (bazı cihazlarda görünmeyebilir)
      try{ window.google.accounts.id.cancel?.(); }catch(e){}
      window.google.accounts.id.prompt((n)=>{
        try{
          if(n?.isNotDisplayed?.() || n?.isSkippedMoment?.() || n?.isDismissedMoment?.()){
            window.showGoogleButtonFallback?.("prompt not displayed");
          }
        }catch(e){}
      });
    }

    setTimeout(()=>{ st.promptInFlight = false; }, 650);
  }catch(e){
    console.error("google login error:", e);
    window.showGoogleButtonFallback?.("prompt error");
    st.promptInFlight = false;
  }
}

export async function acceptTerms() {
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const email = String(user?.email || "").toLowerCase().trim();
  if(!email) return false;

  const ts = new Date().toISOString();
  localStorage.setItem(termsKey(email), ts);

  user.terms_accepted_at = ts;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return true;
}

export function logout() {
  if(confirm("Gidiyor musun evladım?")){
    try{ window.google?.accounts?.id?.disableAutoSelect?.(); }catch(e){}
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");
    localStorage.removeItem(API_TOKEN_KEY);
    window.location.reload();
  }
}
```0
