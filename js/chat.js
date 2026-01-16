/* js/chat.js (v16.3 - FINAL / FULL / SECURE + STATUS + NOTIF DOT) */

const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";

let isBusy = false;

const ROLE_USER = "user";
const ROLE_BOT = "bot";

export function initChat() {
  console.log("Chat Modülü Aktif v16.3 (FINAL)");

  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("text");

  // Başlangıç durumu
  setCaynanaStatus("idle");

  if (sendBtn) {
    // Double-bind önlemi (eski listenerları temizler)
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

/* ----------- UI STATUS (Dinliyor / Yazıyor / Auth / Replied) ----------- */
function setCaynanaStatus(state) {
  const badge = document.getElementById("caynanaSpeaking");
  const sugg = document.getElementById("suggestionText");
  const sendBtn = document.getElementById("sendBtn");
  const dot = document.querySelector("#notifBtn .notif-dot");

  if (!badge) return;

  const flashDotOnce = () => {
    if (!dot) return;
    dot.classList.remove("flash");
    void dot.offsetWidth; // reflow trick
    dot.classList.add("flash");
  };

  if (state === "typing") {
    badge.classList.add("is-typing");
    if (sugg) sugg.classList.add("is-typing");
    if (sendBtn) sendBtn.classList.add("is-busy");
    if (dot) dot.classList.add("is-typing");

    badge.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Caynana yazıyor...`;
    if (sugg) sugg.textContent = "Dur hele, yazıyorum...";

  } else if (state === "auth") {
    badge.classList.remove("is-typing");
    if (sugg) sugg.classList.remove("is-typing");
    if (sendBtn) sendBtn.classList.remove("is-busy");
    if (dot) dot.classList.remove("is-typing");

    badge.innerHTML = `<i class="fa-solid fa-user-lock"></i> Giriş gerekli`;
    if (sugg) sugg.textContent = "Önce bir giriş yap evladım...";

  } else if (state === "replied") {
    badge.classList.remove("is-typing");
    if (sugg) sugg.classList.remove("is-typing");
    if (sendBtn) sendBtn.classList.remove("is-busy");
    if (dot) dot.classList.remove("is-typing");

    flashDotOnce();

    badge.innerHTML = `<i class="fa-solid fa-comment-dots"></i> Caynana dinliyor...`;
    if (sugg) sugg.textContent = "Benim zamanımda...";

  } else {
    // idle
    badge.classList.remove("is-typing");
    if (sugg) sugg.classList.remove("is-typing");
    if (sendBtn) sendBtn.classList.remove("is-busy");
    if (dot) dot.classList.remove("is-typing");

    badge.innerHTML = `<i class="fa-solid fa-comment-dots"></i> Caynana dinliyor...`;
    if (sugg) sugg.textContent = "Benim zamanımda...";
  }
}

/* ----------- Scroll helper ----------- */
function scrollChatToBottom() {
  const container = document.getElementById("chatContainer");
  if (!container) return;
  requestAnimationFrame(() => {
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  });
}

/* ----------- Main send ----------- */
async function sendMessage() {
  if (isBusy) return;

  const input = document.getElementById("text");
  const txt = (input?.value || "").trim();
  if (!txt) return;

  const token = getToken();
  if (!token) {
    setCaynanaStatus("auth");
    triggerAuth("Giriş yap evladım.");
    return;
  }

  isBusy = true;
  if (input) {
    input.disabled = true;
    input.style.opacity = "0.5";
  }

  addBubble(txt, ROLE_USER);
  if (input) input.value = "";

  const mode = window.currentAppMode || "chat";

  setCaynanaStatus("typing");
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

    removeLoading();

    if (res.status === 401) {
      setCaynanaStatus("auth");
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

    // ✅ XSS-safe typewriter
    typeWriterBubble(botText, ROLE_BOT, () => {
      setCaynanaStatus("replied"); // ✅ cevap bitti: dot flash

      if (products.length > 0) {
        setTimeout(() => renderProducts(products), 250);
      }
    });

  } catch (err) {
    removeLoading();
    console.error(err);
    addBubble("Bağlantı koptu evladım.", ROLE_BOT);
  } finally {
    isBusy = false;

    if (input) {
      input.disabled = false;
      input.style.opacity = "1";
      input.focus();
    }

    // replied sonrası zaten idle’a dönsün
    // (flash animasyonu 0.55s sürüyor, çok bekletmeye gerek yok)
    setTimeout(() => setCaynanaStatus("idle"), 350);
  }
}

/* ----------- Safe bubbles ----------- */
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
  el.textContent = "";
  const parts = String(text).split("\n");
  parts.forEach((part, idx) => {
    el.appendChild(document.createTextNode(part));
    if (idx !== parts.length - 1) el.appendChild(document.createElement("br"));
  });
}

/* ----------- Typewriter (XSS SAFE) ----------- */
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
  const speed = 14;

  function step() {
    if (i >= s.length) {
      if (cb) cb();
      return;
    }

    const ch = s.charAt(i);
    if (ch === "\n") bubble.appendChild(document.createElement("br"));
    else bubble.appendChild(document.createTextNode(ch));

    i++;
    scrollChatToBottom();
    setTimeout(step, speed);
  }

  step();
}

/* ----------- Loading bubble ----------- */
function addLoading(text) {
  const container = document.getElementById("chatContainer");
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.className = "msg-row bot loading-bubble-wrap";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble bot";
  bubble.innerHTML = `${text} <i class="fa-solid fa-pen-nib fa-beat-fade" style="margin-left:5px; font-size:12px;"></i>`;

  wrap.appendChild(bubble);
  container.appendChild(wrap);
  scrollChatToBottom();
}

function removeLoading() {
  document.querySelectorAll(".loading-bubble-wrap").forEach((el) => el.remove());
}

/* ----------- URL safety ----------- */
function safeUrl(url) {
  try {
    const u = new URL(url, window.location.origin);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    return "#";
  } catch {
    return "#";
  }
}

/* ----------- Products (NO innerHTML / XSS SAFE) ----------- */
function renderProducts(products) {
  const container = document.getElementById("chatContainer");
  if (!container) return;

  products.slice(0, 5).forEach((p, index) => {
    setTimeout(() => {
      const wrap = document.createElement("div");
      wrap.className = "msg-row bot";

      const card = document.createElement("div");
      card.className = "product-card";

      const source = document.createElement("div");
      source.className = "pc-source";
      source.textContent = "Trendyol";

      const imgWrap = document.createElement("div");
      imgWrap.className = "pc-img-wrap";

      const imgEl = document.createElement("img");
      imgEl.className = "pc-img";
      imgEl.alt = "Ürün görseli";
      imgEl.src = (p?.image || "").toString().trim() || PLACEHOLDER_IMG;
      imgEl.onerror = () => { imgEl.src = PLACEHOLDER_IMG; };

      imgWrap.appendChild(imgEl);

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

/* ----------- Auth modal ----------- */
function triggerAuth(msg) {
  addBubble(msg, ROLE_BOT);
  const modal = document.getElementById("authModal");
  if (modal) modal.style.display = "flex";
}
