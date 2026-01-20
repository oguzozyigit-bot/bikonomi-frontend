/* js/chat.js (v13.3 - SAFE TYPEWRITER + TIMEOUT + mode) */

import { BASE_DOMAIN, STORAGE_KEY } from './config.js';

// --- GÜVENLİK FİLTRESİ ---
const SAFETY_PATTERNS = {
  suicide: /intihar|ölmek istiyorum|bileklerimi|kendimi asıcam|kendimi asacağım/i,
  substance: /uyuşturucu|bonzai|kokain|esrar|hap/i,
  explicit: /s[iı]k|yarak|a[nm]cık|orospu|fahişe/i
};

// 1. SOHBET İSTEĞİ (YAZI)
export async function fetchTextResponse(userMessage, mode = "chat") {
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

  // ✅ BACKEND UYUMU: ChatRequest -> text, user_id, user_meta, persona, history (+mode)
  const payload = {
    text: userMessage, // 🔥 KRİTİK: message değil text
    mode,              // ✅ varsa backend bunu kullanır
    user_id: user?.id || user?.user_id || "guest",
    user_meta: {
      hitap: user?.hitap,
      region: user?.raw_data?.region,
      email: user?.email
    },
    persona: "normal",
    history: Array.isArray(user?.history) ? user.history : []
  };

  // ✅ TIMEOUT (takılmaları bitirir)
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

    // Abort (timeout) mesajı daha net olsun
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
      // ✅ innerHTML yerine textContent (bozulma + XSS riskini azaltır)
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
