/* js/chat.js (v13.4 - PROFILE META + HISTORY PARAM + SAFE TYPEWRITER + TIMEOUT + mode) */

import { BASE_DOMAIN, STORAGE_KEY } from './config.js';

// --- GÜVENLİK FİLTRESİ ---
const SAFETY_PATTERNS = {
  suicide: /intihar|ölmek istiyorum|bileklerimi|kendimi asıcam|kendimi asacağım/i,
  substance: /uyuşturucu|bonzai|kokain|esrar|hap/i,
  explicit: /s[iı]k|yarak|a[nm]cık|orospu|fahişe/i
};

const PROFILE_KEY = "caynana_profile_v2";

function safeJsonParse(s, fallback){
  try { return JSON.parse(s || ""); } catch(e){ return fallback; }
}

function loadProfileMeta(){
  const p = safeJsonParse(localStorage.getItem(PROFILE_KEY) || "{}", {});
  return (p && typeof p === "object") ? p : {};
}

function buildMemorySummary(user, profile){
  // kısa ve stabil bir “kimlik özeti”
  const hitap = (profile.hitap || user.hitap || "").trim();
  const botName = (profile.bot_name || user.botName || user.bot_name || "").trim();
  const birth = (profile.birth_date || user.dob || user.birth_date || "").trim();
  const gender = (profile.gender || user.gender || "").trim();
  const spouse = (profile.spouse_name || user.spouse || "").trim();
  const team = (profile.team || user.team || "").trim();
  const region = (profile.region || user.city || user?.raw_data?.region || "").trim();

  const kids = Array.isArray(profile.children) ? profile.children : [];
  const kidsStr = kids
    .filter(k => (k?.name || "").trim())
    .map(k => `${String(k.name).trim()}${k.bday_dm ? ` (${k.bday_dm})` : ""}`)
    .join(", ");

  const periodOn = !!profile.period_tracking_enabled;
  const periodStr = periodOn
    ? `Regl takibi açık (son: ${profile.last_period_start || "—"}, döngü: ${profile.cycle_length_days || 28}g, süre: ${profile.period_length_days || 5}g)`
    : "";

  const parts = [
    hitap ? `Hitap: ${hitap}` : "",
    botName ? `Kaynana adı: ${botName}` : "",
    birth ? `Doğum tarihi: ${birth}` : "",
    gender ? `Cinsiyet: ${gender}` : "",
    region ? `Şehir: ${region}` : "",
    team ? `Takım: ${team}` : "",
    spouse ? `Eş: ${spouse}` : "",
    kidsStr ? `Çocuklar: ${kidsStr}` : "",
    periodStr ? periodStr : ""
  ].filter(Boolean);

  return parts.join(" | ");
}

// 1. SOHBET İSTEĞİ (YAZI)
// ✅ history param eklendi
export async function fetchTextResponse(userMessage, mode = "chat", history = []) {
  // Güvenlik Kontrolü
  if (SAFETY_PATTERNS.suicide.test(userMessage))
    return { text: "Aman evladım ağzından yel alsın! Bir bardak su iç, derin nefes al.", error: true };
  if (SAFETY_PATTERNS.substance.test(userMessage))
    return { text: "Tövbe de! O zıkkımları ağzına alma, sütümü helal etmem bak!", error: true };
  if (SAFETY_PATTERNS.explicit.test(userMessage))
    return { text: "Terbiyesizleşme! Karşında anan yaşında kadın var. Ağzına biber sürerim!", error: true };

  // Kullanıcı verisi (parse hatasına dayanıklı)
  let user = {};
  try { user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch (e) { user = {}; }

  const token = localStorage.getItem("google_token"); // Varsa token
  const profile = loadProfileMeta();
  const memory_summary = buildMemorySummary(user, profile);

  // history güvenliği
  const safeHistory = Array.isArray(history) ? history : [];

  // ✅ BACKEND UYUMU: ChatRequest -> text, user_id, user_meta, persona, history (+mode)
  const payload = {
    text: userMessage,
    mode,
    user_id: user?.id || user?.user_id || "guest",
    user_meta: {
      // eskiler
      hitap: profile?.hitap || user?.hitap,
      region: profile?.region || user?.raw_data?.region,
      email: user?.email,

      // profil (kalıcı hafıza)
      bot_name: profile?.bot_name,
      birth_date: profile?.birth_date,
      gender: profile?.gender,
      marital_status: profile?.marital_status,
      spouse_name: profile?.spouse_name,
      spouse_bday_dm: profile?.spouse_bday_dm,
      wedding_dm: profile?.wedding_dm,
      engagement_dm: profile?.engagement_dm,
      met_dm: profile?.met_dm,
      team: profile?.team,
      children: Array.isArray(profile?.children) ? profile.children : [],
      period_tracking_enabled: !!profile?.period_tracking_enabled,
      last_period_start: profile?.last_period_start,
      cycle_length_days: profile?.cycle_length_days,
      period_length_days: profile?.period_length_days
    },
    persona: "normal",
    history: safeHistory,

    // ✅ modele kısa özet (backend prompt’a koyacak)
    memory_summary
  };

  // ✅ TIMEOUT
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30000); // 30sn

  try {
    const url = `${BASE_DOMAIN}/api/chat`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(t);

    // ✅ Hata varsa cevabı da yakala
    if (!res.ok) {
      let detail = "";
      try { detail = await res.text(); } catch (e) {}
      throw new Error(`Sunucu hatası: ${res.status} ${detail}`.trim());
    }

    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }

    const assistantText = (data && typeof data.text === "string") ? data.text : "";

    if (!assistantText) {
      console.warn("Beklenmeyen response formatı:", data);
      return { text: "Evladım bir şeyler ters gitti, bir daha dene.", error: true, data };
    }

    return { text: assistantText, data };

  } catch (e) {
    clearTimeout(t);
    console.error("Chat Hatası:", e);

    const isAbort = (e && (e.name === "AbortError" || String(e).includes("AbortError")));
    if (isAbort) {
      return { text: "Evladım server biraz naz yaptı, cevap gecikti. Bir daha tıkla, hallederiz.", error: true };
    }

    return { text: "Evladım tansiyonum çıktı galiba, internetim çekmiyor. Birazdan gel.", error: true };
  }
}

// 2. SES İSTEĞİ (OPSİYONEL)
export async function fetchVoiceResponse(textToRead) {
  return true;
}

// --- UI YARDIMCILARI ---
export function typeWriter(text, elementId = 'chat') {
  const chatDiv = document.getElementById(elementId);
  if (!chatDiv) return;

  const bubbleRow = document.createElement("div");
  bubbleRow.className = "bubble bot";
  chatDiv.appendChild(bubbleRow);

  let i = 0;
  const speed = 20;

  function type() {
    if (i < text.length) {
      bubbleRow.textContent += text.charAt(i);
      i++;
      chatDiv.scrollTop = chatDiv.scrollHeight;
      setTimeout(type, speed);
    }
  }
  type();
}

export function addUserBubble(text) {
  const chat = document.getElementById('chat');
  if (!chat) return;

  const d = document.createElement('div');
  d.className = "bubble user";
  d.innerText = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}
