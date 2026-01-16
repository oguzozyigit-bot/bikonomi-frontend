/* js/chat.js (v16.2 - FINAL / SECURE + CSS UYUMLU) */
const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";

let isBusy = false;

// Sınıf isimlerini standartlaştırıyoruz (CSS ile uyumlu)
const ROLE_USER = "user";
const ROLE_BOT = "bot";

export function initChat() {
  console.log("Chat Modülü Aktif v16.2 (SECURE)");

  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("text");

  if (sendBtn) {
    // Double-bind önlemi (Clone yöntemiyle eski listener'ı temizle)
    const newBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newBtn, sendBtn);
    newBtn.addEventListener("click", () => {
      if (!isBusy) sendMessage();
    });
  }

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !isBusy) sendMessage();
    });
  }
}

function getToken() {
  return localStorage.getItem("auth_token") || "";
}

// Yumuşak kaydırma
function scrollChatToBottom() {
  const container = document.getElementById("chatContainer");
  if (!container) return;
  requestAnimationFrame(() => {
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  });
}

async function sendMessage() {
  if (isBusy) return;

  const input = document.getElementById("text");
  const txt = (input?.value || "").trim();
  if (!txt) return;

  const token = getToken();
  if (!token) {
    triggerAuth("Giriş yap evladım.");
    return;
  }

  // Kilitle
  isBusy = true;
  if (input) {
    input.disabled = true;
    input.style.opacity = "0.5";
  }

  // Kullanıcı mesajı
  addBubble(txt, ROLE_USER);
  if (input) input.value = "";

  const mode = window.currentAppMode || "chat";

  // Loading başlat
  addLoading("Caynana yazıyor...");

  try {
    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ message: txt, mode, persona: "normal" }),
    });

    // Loading temizle
    removeLoading();

    if (res.status === 401) {
      triggerAuth("Süren dolmuş.");
      return;
    }
    if (!res.ok) {
      addBubble("Sunucu hatası evladım.", ROLE_BOT);
      return;
    }

    const data = await res.json();
    const botText = (data?.assistant_text ?? "...").toString();
    const products = Array.isArray(data?.data) ? data.data : [];

    // ✅ XSS-safe typewriter + CSS uyumlu bot sınıfı
    typeWriterBubble(botText, ROLE_BOT, () => {
      if (products.length > 0) {
        setTimeout(() => renderProducts(products), 250);
      }
    });

  } catch (err) {
    removeLoading();
    console.error(err);
    addBubble("Bağlantı koptu evladım.", ROLE_BOT);
  } finally {
    // Kilidi aç
    isBusy = false;
    if (input) {
      input.disabled = false;
      input.style.opacity = "1";
      input.focus();
    }
  }
}

/* ✅ Güvenli balon: textContent + br node (HTML injection yok) */
function addBubble(text, role) {
  const container = document.getElementById("chatContainer");
  if (!container) return null;

  const wrap = document.createElement("div");
  wrap.className = "msg-row " + role;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + role;

  setTextWithLineBreaks(bubble, text);

  wrap.appendChild(bubble);
  container.appendChild(wrap);
  scrollChatToBottom();
  return bubble;
}

function setTextWithLineBreaks(el, text) {
  // el içine güvenli şekilde metin + <br> node basar
  el.textContent = ""; // temizle
  const parts = String(text).split("\n");
  parts.forEach((part, idx) => {
    el.appendChild(document.createTextNode(part));
    if (idx !== parts.length - 1) el.appendChild(document.createElement("br"));
  });
}

/* ✅ GERÇEK DAKTİLO (XSS SAFE): innerHTML yok, node basılıyor */
function typeWriterBubble(text, role, cb) {
  const container = document.getElementById("chatContainer");
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.className = "msg-row " + role;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + role;

  wrap.appendChild(bubble);
  container.appendChild(wrap);

  const s = String(text);
  let i = 0;
  const speed = 14; // ms

  function step() {
    if (i >= s.length) {
      if (cb) cb();
      return;
    }

    const ch = s.charAt(i);
    if (ch === "\n") {
      bubble.appendChild(document.createElement("br"));
    } else {
      bubble.appendChild(document.createTextNode(ch));
    }

    i++;
    scrollChatToBottom();
    setTimeout(step, speed);
  }

  step();
}

/* ✅ Loading balonu (kontrollü) */
function addLoading(text) {
  const container = document.getElementById("chatContainer");
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.className = "msg-row bot loading-bubble-wrap";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble bot";

  // Burada sabit HTML var -> güvenli (dış veri yok)
  bubble.innerHTML = `${text} <i class="fa-solid fa-pen-nib fa-beat-fade" style="margin-left:5px; font-size:12px;"></i>`;

  wrap.appendChild(bubble);
  container.appendChild(wrap);
  scrollChatToBottom();
}

function removeLoading() {
  document.querySelectorAll(".loading-bubble-wrap").forEach((el) => el.remove());
}

/* ✅ URL güvenliği: sadece http/https aç, javascript: engelle */
function safeUrl(url) {
  try {
    const u = new URL(url, window.location.origin);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    return "#";
  } catch {
    return "#";
  }
}

/* ✅ Ürün kartları: innerHTML YOK (XSS kapalı, tam DOM inşası) */
function renderProducts(products) {
  const container = document.getElementById("chatContainer");
  if (!container) return;

  products.slice(0, 5).forEach((p, index) => {
    setTimeout(() => {
      const wrap = document.createElement("div");
      wrap.className = "msg-row bot";

      const card = document.createElement("div");
      card.className = "product-card";

      // Rozet
      const source = document.createElement("div");
      source.className = "pc-source";
      source.textContent = "Trendyol";

      // Resim Alanı
      const imgWrap = document.createElement("div");
      imgWrap.className = "pc-img-wrap";

      const imgEl = document.createElement("img");
      imgEl.className = "pc-img";
      imgEl.alt = "Ürün görseli";
      imgEl.src = (p?.image || "").toString().trim() || PLACEHOLDER_IMG;
      imgEl.onerror = () => { imgEl.src = PLACEHOLDER_IMG; };

      imgWrap.appendChild(imgEl);

      // İçerik Alanı
      const content = document.createElement("div");
      content.className = "pc-content";

      const title = document.createElement("div");
      title.className = "pc-title";
      title.textContent = (p?.title || "Ürün").toString();

      const infoRow = document.createElement("div");
      infoRow.className = "pc-info-row";

      const icon = document.createElement("i");
      icon.className = "fa-solid fa-circle-check";

      const reason = document.createElement("span");
      reason.textContent = (p?.reason || "İncele").toString();

      infoRow.appendChild(icon);
      infoRow.appendChild(document.createTextNode(" "));
      infoRow.appendChild(reason);

      const bottomRow = document.createElement("div");
      bottomRow.className = "pc-bottom-row";

      const price = document.createElement("div");
      price.className = "pc-price";
      price.textContent = (p?.price || "Fiyat Gör").toString();

      const link = document.createElement("a");
      link.className = "pc-btn-mini";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.href = safeUrl((p?.url || "#").toString());
      link.textContent = "Ürüne Git";

      bottomRow.appendChild(price);
      bottomRow.appendChild(link);

      content.appendChild(title);
      content.appendChild(infoRow);
      content.appendChild(bottomRow);

      card.appendChild(source);
      card.appendChild(imgWrap);
      card.appendChild(content);

      wrap.appendChild(card);
      container.appendChild(wrap);
      scrollChatToBottom();
    }, index * 260);
  });
}

/* ✅ Auth çağrısı (bot balonu ile) */
function triggerAuth(msg) {
  addBubble(msg, ROLE_BOT);
  const modal = document.getElementById("authModal");
  if (modal) modal.style.display = "flex";
}
