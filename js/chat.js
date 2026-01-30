// FILE: /js/chat.js
// STABLE (LOCAL NAME MEMORY + KAYNANA OPENER + DELAYED STORE WRITE)
// ✅ Assistant cevabı ChatStore’a HEMEN yazmaz (double render/çift mesaj riskini azaltır)
// ✅ Scroll: 3 frame _forceBottom (DOM gecikmesini yutar)
// ✅ Name memory + kaynana opener + profile merge korunur

import { apiPOST } from "./api.js";
import { STORAGE_KEY } from "./config.js";
import { ChatStore } from "./chat_store.js";
import { getMemoryProfile, setMemoryProfile } from "./memory_profile.js";

const SAFETY_PATTERNS = {
  self_harm: /intihar|ölmek istiyorum|kendimi as(?:ıcam|acağım)|bileklerimi kes/i
};

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getProfile() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }
function setProfile(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p || {})); }

function hasLoginToken() {
  const apiToken = (localStorage.getItem("caynana_api_token") || "").trim();
  const google = (localStorage.getItem("google_id_token") || "").trim();
  return !!(apiToken || google);
}

function firstNameFromFullname(full = "") {
  const s = String(full || "").trim();
  if (!s) return "";
  return s.split(/\s+/)[0];
}

// USER-SCOPED CHAT_ID
function getChatKeyForUser(userId) {
  const u = String(userId || "").trim().toLowerCase();
  return u ? `caynana_chat_id:${u}` : "caynana_chat_id";
}
function readChatId(userId) {
  const key = getChatKeyForUser(userId);
  const v = (localStorage.getItem(key) || "").trim();
  if (!v || v === "null" || v === "undefined") return null;
  return v;
}
function writeChatId(userId, chatId) {
  const key = getChatKeyForUser(userId);
  if (chatId) localStorage.setItem(key, String(chatId));
}

// NAME CAPTURE
function extractNameFromText(text = "") {
  const s = String(text || "").trim();
  let m = s.match(/\b(adım|ismim)\s+([A-Za-zÇĞİÖŞÜçğıöşü'’\-]{2,})(?:\b|$)/i);
  if (m && m[2]) return m[2];
  m = s.match(/\bben\s+([A-Za-zÇĞİÖŞÜçğıöşü'’\-]{2,})(?:\b|$)/i);
  if (m && m[1]) return m[1];
  return "";
}

function maybePersistNameFromUserMessage(userMessage) {
  const p = getProfile();
  const has = !!(String(p.hitap || "").trim() || String(p.fullname || "").trim());
  if (has) return;

  const name = extractNameFromText(userMessage);
  if (!name) return;

  p.fullname = name;
  const fn = firstNameFromFullname(name);
  if (!p.hitap) p.hitap = fn || name;
  setProfile(p);

  try {
    setMemoryProfile({ name, hitap: (p.hitap || fn || name), fullname: name });
  } catch {}
}

function cleanValue(v) {
  if (v === null || v === undefined) return null;
  const s = typeof v === "string" ? v.trim() : v;
  if (s === "") return null;
  return s;
}
function mergeProfiles(formProfile = {}, memProfile = {}) {
  const out = { ...(memProfile || {}) };
  for (const [k, v] of Object.entries(formProfile || {})) {
    const cv = cleanValue(v);
    if (cv !== null) out[k] = cv;
  }
  return out;
}

function pickAssistantText(data) {
  if (!data || typeof data !== "object") return "";
  const keys = ["assistant_text", "text", "assistant", "reply", "answer", "output"];
  for (const k of keys) {
    const v = String(data[k] || "").trim();
    if (v) return v;
  }
  return "";
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// SCROLL HELPER
function _forceBottom(el){
  if(!el) return;
  let n = 0;
  const tick = () => {
    try { el.scrollTop = el.scrollHeight; } catch {}
    n++;
    if(n < 3) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// UI helpers
export function addBotBubble(text, elId="chat"){
  const div = document.getElementById(elId);
  if(!div) return;
  const bubble = document.createElement("div");
  bubble.className = "bubble bot";
  bubble.textContent = String(text||"");
  div.appendChild(bubble);
}

export function typeWriter(text, elId = "chat") {
  const div = document.getElementById(elId);
  if (!div) return;

  const bubble = document.createElement("div");
  bubble.className = "bubble bot";
  div.appendChild(bubble);

  const s = String(text || "");
  let i = 0;

  (function type() {
    if (i < s.length) {
      bubble.textContent += s.charAt(i++);
      _forceBottom(div);
      setTimeout(type, 28);
    } else {
      _forceBottom(div);
    }
  })();
}

export function addUserBubble(text) {
  const div = document.getElement
