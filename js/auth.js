import { GOOGLE_CLIENT_ID, STORAGE_KEY } from "./config.js";

export async function waitForGsi(timeoutMs = 8000){
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs){
    if (window.google?.accounts?.id) return true;
    await new Promise(r => setTimeout(r, 50));
  }
  return false;
}

export function initAuth() {
  if (!window.google) return;
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleResponse,
    auto_select: false
  });
}

async function handleGoogleResponse(res){
  const token = res.credential;
  if(token){
    localStorage.setItem("google_id_token", token);
    const payload = JSON.parse(atob(token.split('.')[1]));
    const user = {
      id: payload.email,
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
      terms_accepted_at: null,
      isSessionActive: true
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.location.reload();
  }
}

export function handleLogin(provider) {
  if(provider === "google") {
    if(window.google) google.accounts.id.prompt();
    else alert("Google servisi yüklenemedi.");
  } else {
    alert("Apple girişi yakında evladım.");
  }
}

export async function acceptTerms() {
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  if(user.id){
    user.termsAccepted = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return true;
  }
  return false;
}

export function logout() {
  if(confirm("Gidiyor musun evladım?")){
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");
    window.location.reload();
  }
}
