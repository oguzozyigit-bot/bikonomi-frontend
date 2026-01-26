// js/auth.js (FINAL - Google GSI + JWT base64url UTF-8 decode + terms kalıcı + backend token cache)

import { GOOGLE_CLIENT_ID, STORAGE_KEY, BASE_DOMAIN } from "./config.js";

const API_TOKEN_KEY = "caynana_api_token";
const STABLE_ID_KEY = "caynana_stable_id_v1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getAuthState(){
  if(!window.__CAYNANA_AUTH__) window.__CAYNANA_AUTH__ = {
    inited: false,
    promptInFlight: false,
    lastPromptAt: 0
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
