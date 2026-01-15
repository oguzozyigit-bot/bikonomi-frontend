/* js/chat.js (v9914 - SMOOTH SHOPPING FLOW + TOKEN/CSS/URL FIX)
   - Token key: caynana_token (senin sistem)
   - Endpoint: /api/chat (backend ile uyumlu)
   - Mevcut CSS ile uyum: .msg.user / .msg.ai + .bubble
   - Ürün kartları: tek sütun, link <a>, görsel fallback
   - Shopping kartları: metin bitince sırayla akış
*/

import { BASE_DOMAIN } from "./main.js";

export function initChat() {
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("text");

  if (sendBtn) {
    // Event çakışmasını önle
    const newBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newBtn, sendBtn);
    newBtn.addEventListener("click", sendMessage);
  }

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }
}

function getToken() {
  // Senin standardın
  return localStorage.getItem("caynana_token") || "";
}

function currentMode() {
  // main.js setHeroMode bunu window.currentAppMode olarak set ediyor
  return window.currentAppMode || "chat";
}

async function sendMessage() {
  const input = document.getElementById("text");
  const txt = (input?.value || "").trim();
  if (!txt) return;

  // Login gate (token yoksa auth modal aç)
  const token = getToken();
  if (!token) {
    try {
      if (typeof window.openAuth === "function") window.openAuth();
    } catch {}
    // chat'e küçük uyarı da bas
    addBubble("Evladım, önce Google ile giriş yapacaksın.", "ai");
    return;
  }

  addBubble(txt, "user");
  input.value = "";

  const mode = currentMode();

  // Loading bubble
  const loadingId = addLoading("Caynana düşünüyor…");

  try {
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message: txt, mode, persona: window.currentPersona || "normal" }),
    });

    removeById(loadingId);

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      const errMsg = data?.detail || data?.message || "Bir hata oldu evladım.";
      addBubble(errMsg, "ai");
      return;
    }

    const botText = data.assistant_text || "Heh… bir şey diyemedim.";
    const products = Array.isArray(data.data) ? data.data : [];

    // Metni daktilo ile yaz, bitince ürünleri akıt
    typeWriterBubble(botText, "ai", () => {
      if (mode === "shopping" && products.length) {
        setTimeout(() => renderProducts(products), 650);
      }
    });
  } catch (err) {
    removeById(loadingId);
    addBubble("İnternet gitti galiba evladım. Bir daha dene.", "ai");
  }
}

// ----------------------------
// UI: bubbles (mevcut CSS ile uyumlu)
// .msg.user/.msg.ai + .bubble
// ----------------------------
function addBubble(text, role = "ai") {
  const container = document.getElementById("chatContainer");
  if (!container) return null;

  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "ai");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");

  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTo(0, container.scrollHeight);
  return wrap;
}

function addLoading(text) {
  const container = document.getElementById("chatContainer");
  if (!container) return null;

  const id = "ldr_" + Date.now() + "_" + Math.random().toString(16).slice(2);

  const wrap = document.createElement("div");
  wrap.className = "msg ai";
  wrap.id = id;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.style.opacity = "0.75";
  bubble.style.fontStyle = "italic";
  bubble.innerHTML = escapeHtml(text);

  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTo(0, container.scrollHeight);
  return id;
}

function removeById(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

function typeWriterBubble(text, role = "ai", callback) {
  const container = document.getElementById("chatContainer");
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "ai");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = "";

  wrap.appendChild(bubble);
  container.appendChild(wrap);

  let i = 0;
  const speed = 22;

  function tick() {
    if (i < text.length) {
      const ch = text.charAt(i++);
      if (ch === "\n") bubble.innerHTML += "<br>";
      else bubble.innerHTML += escapeHtml(ch);
      container.scrollTo(0, container.scrollHeight);
      setTimeout(tick, speed);
    } else {
      if (callback) callback();
    }
  }
  tick();
}

// ----------------------------
// Shopping cards (tek sütun, premium)
// Backend product keys: title, price, image, url, reason
// ----------------------------
function renderProducts(products) {
  const container = document.getElementById("chatContainer");
  if (!container) return;

  // Kart CSS yoksa basit inline ekle
  ensureProductStyles();

  products.slice(0, 6).forEach((p, index) => {
    setTimeout(() => {
      const card = document.createElement("div");
      card.className = "product-card";

      const img = safeUrl(p.image) || "";
      const url = safeUrl(p.url) || "";
      const title = p.title || "Ürün";
      const price = p.price || ""; // yoksa boş geç
      const reason = p.reason || "Evladım bunu seçtim çünkü daha mantıklı duruyor.";

      const priceHtml = price ? `<div class="pc-price">${escapeHtml(price)}</div>` : "";

      card.innerHTML = `
        <div class="pc-img-wrap">
          <img src="${escapeAttr(img)}" class="pc-img" alt="ürün"
               onerror="this.onerror=null;this.src='https://via.placeholder.com/600x600?text=Gorsel+Yok';">
        </div>
        <div class="pc-content">
          <div class="pc-title">${escapeHtml(title)}</div>
          ${priceHtml}
          <div class="pc-desc"><b>👵 Caynana diyor ki:</b><br>${escapeHtml(reason)}</div>
          ${
            url
              ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener" class="pc-btn">Caynana Öneriyor — Ürüne Git</a>`
              : `<div class="pc-btn disabled">Link yok (kaynak gelmedi)</div>`
          }
        </div>
      `;

      const wrap = document.createElement("div");
      wrap.className = "msg ai";
      wrap.appendChild(card);

      container.appendChild(wrap);
      container.scrollTo(0, container.scrollHeight);
    }, index * 650);
  });
}

function ensureProductStyles() {
  if (document.getElementById("pcStyleV9914")) return;
  const s = document.createElement("style");
  s.id = "pcStyleV9914";
  s.textContent = `
    .product-card{
      background:#fff;
      border:1px solid rgba(0,0,0,0.06);
      border-radius:22px;
      overflow:hidden;
      box-shadow:0 14px 34px rgba(0,0,0,0.14), 0 0 0 1px rgba(255,255,255,0.65) inset;
      margin-top:12px;
      animation: pcUp .55s cubic-bezier(.16,1,.3,1) both;
    }
    @keyframes pcUp { from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:translateY(0)} }
    .pc-img-wrap{
      padding:12px;
      background:linear-gradient(180deg, rgba(255,255,255,0.85), rgba(245,245,245,1));
      border-bottom:1px solid rgba(0,0,0,0.06);
    }
    .pc-img{
      width:100%;
      height:220px;
      object-fit:contain;
      border-radius:18px;
      background:#fff;
      border:1px solid rgba(0,0,0,0.06);
    }
    .pc-content{ padding:14px; }
    .pc-title{
      font-weight:950;
      font-size:15px;
      line-height:1.25;
      color:#141414;
      margin-bottom:8px;
    }
    .pc-price{
      font-weight:1000;
      font-size:18px;
      color: var(--primary, #00C897);
      margin-bottom:10px;
      letter-spacing:-0.4px;
    }
    .pc-desc{
      background:#FFFBF0;
      border:1px solid rgba(255,179,0,0.14);
      border-left:5px solid #FFB300;
      border-radius:18px;
      padding:12px 14px;
      font-weight:850;
      font-size:13px;
      line-height:1.45;
      color:#4e3a2f;
      margin-bottom:12px;
    }
    .pc-btn{
      height:50px;
      border-radius:16px;
      display:flex;
      align-items:center;
      justify-content:center;
      text-decoration:none;
      font-weight:1000;
      color:#fff;
      background:linear-gradient(135deg, var(--primary, #00C897), #111);
      box-shadow:0 14px 28px rgba(0,0,0,0.20);
      user-select:none;
    }
    .pc-btn:active{ transform:scale(.99); }
    .pc-btn.disabled{
      opacity:.55;
      background:#999;
      box-shadow:none;
    }
  `;
  document.head.appendChild(s);
}

// ----------------------------
// Utilities
// ----------------------------
function safeUrl(u) {
  const s = (u || "").trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "";
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

function escapeAttr(s) {
  // Çok basit attribute escape
  return escapeHtml(String(s || "")).replace(/"/g, "&quot;");
}
