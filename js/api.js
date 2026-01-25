// js/api.js

import { BASE_DOMAIN } from "./config.js";

const API_TOKEN_KEY = "caynana_api_token";

// BASE_DOMAIN:
// - "" ise same-origin (en sağlam)
// - "https://domain.com" ise cross-origin
const BASE = String(BASE_DOMAIN || "").trim().replace(/\/+$/, ""); // sondaki / temizle

function buildUrl(endpoint = "") {
  const ep = String(endpoint || "").trim();
  if (!ep) return BASE || "/";

  // Tam URL verilmişse aynen kullan
  if (/^https?:\/\//i.test(ep)) return ep;

  // Relative path'i normalize et
  const path = ep.startsWith("/") ? ep : `/${ep}`;

  // BASE boşsa same-origin'e relative çağır (404'lerin çoğu burada çözülür)
  if (!BASE) return path;

  return `${BASE}${path}`;
}

export function authHeaders(){
  const apiToken = (localStorage.getItem(API_TOKEN_KEY) || "").trim();
  const google = (localStorage.getItem("google_id_token") || "").trim();

  // Önce backend token, yoksa google token
  const t = apiToken || google;
  return t ? { "Authorization": "Bearer " + t } : {};
}

export async function apiPOST(endpoint, body){
  const url = buildUrl(endpoint);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json", ...authHeaders() },
    body: JSON.stringify(body || {})
  });
  return res;
}

export async function apiGET(endpoint){
  const url = buildUrl(endpoint);
  const res = await fetch(url, { headers: { ...authHeaders() } });

  // NOT: bazen 401/403 döner; json parse patlamasın
  const txt = await res.text().catch(()=> "");
  try { return JSON.parse(txt || "{}"); } catch { return {}; }
}

// Debug (istersen kullan)
export function __debugApiBase(){
  return { BASE_DOMAIN, BASE, sampleChat: buildUrl("/api/chat") };
}
