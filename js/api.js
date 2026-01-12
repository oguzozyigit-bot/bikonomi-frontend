import { API_URL, SPEAK_URL, FAL_CHECK_URL, AUTH_ME_URL } from "./config.js";

export function getToken(){
  return localStorage.getItem("caynana_token") || "";
}
export function setToken(t){
  if(t) localStorage.setItem("caynana_token", t);
  else localStorage.removeItem("caynana_token");
}
export function authHeaders(){
  const t = getToken();
  return t ? { "Authorization": "Bearer " + t } : {};
}

export async function apiChat(payload){
  const r = await fetch(API_URL, {
    method:"POST",
    headers:{ "Content-Type":"application/json", ...authHeaders() },
    body: JSON.stringify(payload)
  });
  const j = await r.json();
  return { ok: r.ok, data: j };
}

export async function apiSpeak(text, persona){
  const r = await fetch(SPEAK_URL, {
    method:"POST",
    headers:{ "Content-Type":"application/json", ...authHeaders() },
    body: JSON.stringify({ text, persona })
  });
  // speak bazen json error döner
  const ct = r.headers.get("content-type") || "";
  if(ct.includes("application/json")){
    return { ok:false, error: (await r.json()).error || "TTS hata" };
  }
  return { ok:r.ok, blob: await r.blob() };
}

export async function apiFalCheck(image){
  const r = await fetch(FAL_CHECK_URL, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ image })
  });
  return { ok:r.ok, data: await r.json() };
}

export async function apiMe(){
  const r = await fetch(AUTH_ME_URL, { method:"GET", headers:{ ...authHeaders() } });
  if(!r.ok) return null;
  return await r.json();
}
