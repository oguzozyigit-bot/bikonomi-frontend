import { BASE_DOMAIN } from "./config.js";

export function authHeaders(){
  const t = localStorage.getItem("google_id_token") || "";
  return t ? { "Authorization": "Bearer " + t } : {};
}

export async function apiPOST(endpoint, body){
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_DOMAIN}${endpoint.startsWith('/')?'':'/'}${endpoint}`;
  const res = await fetch(url, {
    method:"POST",
    headers:{ "Content-Type":"application/json", ...authHeaders() },
    body: JSON.stringify(body || {})
  });
  return res;
}

export async function apiGET(endpoint){
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_DOMAIN}${endpoint.startsWith('/')?'':'/'}${endpoint}`;
  const res = await fetch(url, { headers:{ ...authHeaders() } });
  return await res.json();
}
