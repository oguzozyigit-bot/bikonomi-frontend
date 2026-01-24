// js/chat.js (FINAL - Profile-aware memory, History limit, Login required, 1x retry)

import { apiPOST } from "./api.js";
import { STORAGE_KEY } from "./config.js";

/*
  KURALLAR (KİLİTLİ):
  - Guest yok (login zorunlu)
  - History backend’e SON 30 mesaj gider
  - Profil doluysa KİŞİSEL cevaplarda profil ÖNCELİKLİ
  - Profil boşsa sohbetten çıkarım yapılır
  - "Adım Oğuz" gibi bilgiler unutulmaz (profil + history)
*/

// Sadece bariz risk durumunda frontend keser
const SAFETY_PATTERNS = {
  self_harm: /intihar|ölmek istiyorum|kendimi as(?:ıcam|acağım)|bileklerimi kes/i
};

function safeJson(s, fb = {}) {
  try { return JSON.parse(s || ""); } catch { return fb; }
}

function getProfile() {
  return safeJson(localStorage.getItem(STORAGE_KEY), {});
}

function hasLoginToken() {
  return !!(localStorage.getItem("google_id_token") || "").trim();
}

// --------------------
// HISTORY NORMALIZE
// --------------------
function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];

  return history
    .map(h => {
      if (!h || typeof h !== "object") return null;

      const roleRaw = String(h.role || h.type || "").toLowerCase();
      const role =
        roleRaw === "assistant" || roleRaw === "bot" ? "assistant" :
        roleRaw === "user" ? "user" :
        null;

      const content =
        (h.content ?? h.text ?? h.message ?? "").toString().trim();

      if (!role || !content) return null;
      return { role, content };
    })
    .filter(Boolean);
}

function limitHistory(history, max = 30) {
  if (history.length <= max) return history;
  return history.slice(history.length - max);
}

// --------------------
// RESPONSE PICKER
// --------------------
function pickAssistantText(data) {
  if (!data || typeof data !== "object") return "";
  const keys = [
    "assistant_text",
    "text",
    "assistant",
    "reply",
    "answer",
    "output"
  ];
  for (const k of keys) {
    const v = String(data[k] || "").trim();
    if (v) return v;
  }
  return "";
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// --------------------
// MAIN API CALL
// --------------------
export async function fetchTextResponse(msg, modeOrHistory = "chat", maybeHistory = []) {
  const message = String(msg || "").trim();
  if (!message) return { text: "", error: true };

  // Signature uyumu
  let mode = "chat";
  let history = [];

  if (Array.isArray(modeOrHistory)) {
    history = modeOrHistory;
  } else {
    mode = String(modeOrHistory || "chat");
    history = maybeHistory;
  }

  // Login zorunlu
  if (!hasLoginToken()) {
    return {
      text: "Önce giriş yapman lazım evladım. 🙂",
      error: true,
      code: "AUTH_REQUIRED"
    };
  }

  // Güvenlik
  if (SAFETY_PATTERNS.self_harm.test(message)) {
    return {
      text:
        "Aman evladım sakın. Yalnız değilsin. Eğer acil risk varsa 112’yi ara. " +
        "İstersen ne olduğunu anlat, buradayım.",
      error: true,
      code: "SAFETY"
    };
  }

  const profile = getProfile();
  const userId = profile.id || "guest";

  const cleanHistory = limitHistory(
    normalizeHistory(history),
    30
  );

  // 🔥 PROFİL HAFIZASI (ÖNCELİKLİ)
  const memoryProfile = {
    hitap: profile.hitap || null,
    botName: profile.botName || null,
    fullname: profile.fullname || null,
    dob: profile.dob || null,
    gender: profile.gender || null,
    maritalStatus: profile.maritalStatus || null,
    spouse: profile.spouse || null,
    childCount: profile.childCount || null,
    childNames: profile.childNames || null,
    team: profile.team || null,
    city: profile.city || null,
    isProfileCompleted: !!profile.isProfileCompleted
  };

  const payload = {
    text: message,
    message: message,
    user_id: userId,
    mode: mode,
    history: cleanHistory,

    // 👇 Modelin hafızası buradan beslenir
    profile: memoryProfile,

    // Web arama sinyali
    web: "auto",
    enable_web_search: true
  };

  const attempt = async () => {
    const res = await apiPOST("/api/chat", payload);

    if (res.status === 401 || res.status === 403) {
      return {
        text: "Oturumun düşmüş gibi. Çıkış yapıp tekrar girer misin?",
        error: true,
        code: "AUTH_EXPIRED"
      };
    }

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      const err = new Error(`API ${res.status}: ${t}`);
      err.isServer = res.status >= 500;
      err.status = res.status;
      throw err;
    }

    let data = {};
    try { data = await res.json(); } catch {}

    const out = pickAssistantText(data);
    return { text: out || "Bir aksilik oldu evladım." };
  };

  try {
    return await attempt();
  } catch (e) {
    if (e.isServer || e.status == null) {
      await sleep(600);
      try { return await attempt(); } catch {}
    }
    return {
      text: "Bağlantı koptu gibi. Bir daha dener misin?",
      error: true,
      code: "NETWORK"
    };
  }
}

// --------------------
// UI HELPERS
// --------------------
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
      div.scrollTop = div.scrollHeight;
      setTimeout(type, 15);
    }
  })();
}

export function addUserBubble(text) {
  const div = document.getElementById("chat");
  if (!div) return;

  const bubble = document.createElement("div");
  bubble.className = "bubble user";
  bubble.textContent = String(text || "");
  div.appendChild(bubble);
  div.scrollTop = div.scrollHeight;
}
