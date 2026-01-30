// FILE: /js/chat_page.js
// FINAL (CHAT.html uyumlu ID + SCROLL FIX + AUTO-FOLLOW + STT AUTO-SEND + SEESAW)
// ✅ messages container: #chat
// ✅ Auto-follow: alttaysan takip, yukarı çıktıysa bırak
// ✅ DOM render sonrası scroll: requestAnimationFrame
// ✅ Wheel/touch parent'ta boğulmaz
// ✅ STT: konuşma bitince otomatik gönder
// ✅ Tahtaravalli: usering/botting/thinking class
// ✅ FIX: fetchTextResponse imzası doğru
// ✅ FIX: assistant store double-write yok (chat.js zaten delayed write yapıyor)

import { fetchTextResponse } from "./chat.js";
import { ChatStore } from "./chat_store.js";

// Login zorunlu: token yoksa index'e yolla
const t = (localStorage.getItem("google_id_token") || "").trim();
if (!t) window.location.href = "/index.html";

const $ = (id) => document.getElementById(id);

const menuOverlay = $("menuOverlay");
const menuToggle = $("hambBtn");
const historyList = $("historyList");
const newChatBtn = $("newChatBtn");

// ✅ CHAT container
const messages = $("chat");

const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");

// seesaw / brand
const brandWrapper = $("brandWrapper");

let pendingFile = null;

// ------------------------
// ✅ SCROLL FIX (AUTO-FOLLOW)
// ------------------------
let follow = true;

function isNearBottom(slack = 140) {
  try {
    return (messages.scrollHeight - messages.scrollTop - messages.clientHeight) < slack;
  } catch {
    return true;
  }
}

function scrollBottom(force = false) {
  if (!messages) return;
  requestAnimationFrame(() => {
    if (!messages) return;
    if (force || follow) messages.scrollTop = messages.scrollHeight;
  });
}

if (messages) {
  messages.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
  messages.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: true });

  messages.addEventListener("scroll", () => {
    follow = isNearBottom();
  }, { passive: true });
}

// ------------------------
// ✅ Tahtaravalli state
// ------------------------
function setSeesaw(mode = "") {
  if (!brandWrapper) return;
  brandWrapper.classList.remove("usering", "botting", "thinking");
  if (mode) brandWrapper.classList.add(mode);
}
function clearSeesaw() {
  if (!brandWrapper) return;
  brandWrapper.classList.remove("usering", "botting", "thinking");
}

// ------------------------
// UI helpers
// ------------------------
function roleToClass(role){
  return role === "user" ? "user" : "bot";
}

function bubble(role, text) {
  if (!messages) return null;

  const div = document.createElement("div");
  div.className = `bubble ${roleToClass(role)}`;
  div.textContent = text;

  if (messages.dataset.empty === "1") {
    messages.innerHTML = "";
    messages.dataset.empty = "0";
  }

  messages.appendChild(div);
  scrollBottom(false);
  return div;
}

function typingIndicator() {
  if (!messages) return null;

  const div = document.createElement("div");
  div.className = "bubble bot";
  div.innerHTML = `
    <span class="typing-indicator">
      <span></span><span></span><span></span>
    </span>
  `;
  messages.appendChild(div);
  scrollBottom(false);
  return div;
}

function setSendActive() {
  const hasText = !!(msgInput?.value || "").trim();
  const hasFile = !!pendingFile;
  sendBtn?.classList.toggle("active", hasText || hasFile);
}

function autoGrow() {
  if (!msgInput) return;
  msgInput.style.height = "auto";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 150) + "px";
}

// ------------------------
// Sidebar (last 10 chats)
// ------------------------
function renderHistory() {
  if (!historyList) return;
  historyList.innerHTML = "";

  const items = ChatStore.list(); // son 10

  items.forEach((c) => {
    const row = document.createElement("div");
    row.className = "history-row" + (ChatStore.currentId === c.id ? " active" : "");
    row.title = c.title || "Sohbet";

    row.innerHTML = `
      <div class="history-title">${c.title || "Sohbet"}</div>
      <button class="history-del" title="Sil">🗑️</button>
    `;

    row.addEventListener("click", () => {
      ChatStore.currentId = c.id;
      loadCurrentChat();
      renderHistory();
      menuOverlay?.classList.remove("open");
    });

    row.querySelector(".history-del")?.addEventListener("click", (e) => {
      e.stopPropagation();
      ChatStore.deleteChat(c.id);
      loadCurrentChat();
      renderHistory();
    });

    historyList.appendChild(row);
  });
}

function loadCurrentChat() {
  if (!messages) return;

  messages.innerHTML = "";
  const h = ChatStore.history() || [];

  if (h.length === 0) {
    messages.innerHTML = `
      <div style="text-align:center; margin-top:20vh; color:#444;">
        <h3>Ne lazım evladım?</h3>
        <p style="font-size:13px; color:#666; margin-top:10px;">Sen sor, ben hallederim.</p>
      </div>
    `;
    messages.dataset.empty = "1";
    follow = true;
    scrollBottom(true);
    return;
  }

  messages.dataset.empty = "0";
  h.forEach((m) => bubble(m.role, m.content));
  follow = true;
  scrollBottom(true);
}

// ------------------------
// Mic (STT) + AUTO SEND
// ------------------------
let __rec = null;
let __sttBusy = false;

function startSTT() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("Tarayıcı mikrofon yazıya çevirme desteklemiyor.");
    return;
  }
  if (__sttBusy) return;

  const rec = new SR();
  __rec = rec;
  __sttBusy = true;

  rec.lang = "tr-TR";
  rec.interimResults = false;
  rec.continuous = false;

  // UI: mic glow (chat.html inline css)
  micBtn?.classList.add("listening");

  rec.onresult = (e) => {
    const t = e.results?.[0]?.[0]?.transcript || "";
    if (t) {
      msgInput.value = (msgInput.value ? msgInput.value + " " : "") + t;
      autoGrow();
      setSendActive();
    }
  };

  rec.onerror = () => {
    // sessiz geç
  };

  rec.onend = async () => {
    __sttBusy = false;
    micBtn?.classList.remove("listening");

    // ✅ konuşma bitti: otomatik gönder
    const txt = (msgInput?.value || "").trim();
    if (txt) {
      await send(true); // stt mode
    }
  };

  rec.start();
}

// ------------------------
// Send flow
// ------------------------
async function send(fromSTT = false) {
  const text = (msgInput?.value || "").trim();
  if (!text && !pendingFile) return;

  // usering seesaw
  setSeesaw("usering");

  const h0 = ChatStore.history() || [];
  if (h0.length === 0) messages.innerHTML = "";

  if (text) {
    bubble("user", text);
    ChatStore.add("user", text);
  }

  msgInput.value = "";
  autoGrow();
  setSendActive();

  // thinking seesaw
  setSeesaw("thinking");

  const loader = typingIndicator();

  let reply = "Evladım bir şeyler ters gitti.";
  try {
    // ✅ fetchTextResponse imzası: (msg, mode)
    const out = await fetchTextResponse(text || "Merhaba", "chat");
    reply = out?.text || reply;
  } catch {}

  try { loader?.remove(); } catch {}

  // botting seesaw
  setSeesaw("botting");

  bubble("assistant", reply);

  // ❌ assistant store double-write yok:
  // chat.js zaten scheduleAssistantStoreWrite ile yazıyor.
  // Burada sadece UI bubble basıyoruz.

  renderHistory();
  scrollBottom(false);

  // kısa bir süre sonra idle
  setTimeout(() => clearSeesaw(), 700);
}

// ------------------------
// Events
// ------------------------
menuToggle?.addEventListener("click", () => {
  menuOverlay?.classList.toggle("open");
});

// overlay tıklayınca kapat
menuOverlay?.addEventListener("click", (e) => {
  const sidebarEl = e.currentTarget?.querySelector?.(".menu-sidebar");
  if (!sidebarEl) return;
  if (sidebarEl.contains(e.target)) return;
  e.currentTarget.classList.remove("open");
});

newChatBtn?.addEventListener("click", () => {
  ChatStore.newChat();
  loadCurrentChat();
  renderHistory();
  menuOverlay?.classList.remove("open");
});

sendBtn?.addEventListener("click", () => send(false));

msgInput?.addEventListener("input", () => {
  autoGrow();
  setSendActive();
  setSeesaw("usering");
  // kısa idle
  clearTimeout(window.__typingIdle);
  window.__typingIdle = setTimeout(() => clearSeesaw(), 500);
});

msgInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send(false);
  }
});

micBtn?.addEventListener("click", startSTT);

// ------------------------
// Boot
// ------------------------
ChatStore.init();
loadCurrentChat();
renderHistory();
autoGrow();
setSendActive();
scrollBottom(true);
clearSeesaw();
