// js/auth.js (FINAL - Google GSI + JWT base64url decode + terms kalıcı + backend token cache)

import { GOOGLE_CLIENT_ID, STORAGE_KEY, BASE_DOMAIN } from "./config.js";

const API_TOKEN_KEY = "caynana_api_token";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function waitForGsi(timeoutMs = 8000){
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs){
    if (window.google?.accounts?.id) return true;
    await sleep(60);
  }
  return false;
}

// --- Base64URL JWT decode (FIX) ---
function parseJwt(idToken = ""){
  try{
    const parts = String(idToken).split(".");
    if(parts.length < 2) return null;

    let base64Url = parts[1];
    base64Url = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64Url.length % 4;
    if(pad) base64Url += "=".repeat(4 - pad);

    return JSON.parse(atob(base64Url));
  }catch(e){
    console.error("parseJwt failed:", e);
    return null;
  }
}

function termsKey(email=""){
  return `caynana_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}

function setApiToken(t){
  if(t) localStorage.setItem(API_TOKEN_KEY, t);
}
function clearApiToken(){
  localStorage.removeItem(API_TOKEN_KEY);
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

  // olası alan adları
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

// Google callback
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

    // user (main.js ile uyumlu)
    const user = {
      id: email,
      email: email,
      fullname: payload.name || "",
      avatar: payload.picture || "",
      provider: "google",
      isSessionActive: true,
      lastLoginAt: new Date().toISOString(),
      terms_accepted_at: savedTermsAt,
      yp_percent: 50
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    // Backend session token’ı da al (silme vs. için gerekli)
    try{
      await fetchBackendToken(idToken);
    }catch(e){
      // Token alınamazsa login yine olur; sadece silme/updateside sorun olur
      console.warn("backend token alınamadı:", e);
      clearApiToken();
    }

    window.location.reload();
  }catch(e){
    console.error("handleGoogleResponse error:", e);
    alert("Google girişinde hata oldu. Console'u kontrol et.");
  }
}

export function initAuth() {
  if (!window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleResponse,
    auto_select: false
  });
}

export function handleLogin(provider) {
  if(provider === "google") {
    if(window.google?.accounts?.id){
      window.google.accounts.id.prompt((n)=>{
        if(n?.isNotDisplayed?.() || n?.isSkippedMoment?.()){
          window.showGoogleButtonFallback?.("prompt not displayed");
        }
      });
    } else {
      alert("Google servisi yüklenemedi (GSI).");
    }
  } else {
    alert("Apple girişi yakında evladım.");
  }
}

export async function acceptTerms() {
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const email = String(user?.email || user?.id || "").toLowerCase().trim();
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
    // termsKey KALIR (çıkış sonrası tekrar sözleşme sormasın)
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");
    localStorage.removeItem(API_TOKEN_KEY);
    window.location.reload();
  }
}
