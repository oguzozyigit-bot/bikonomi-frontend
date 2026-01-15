/* js/chat.js (v9909 - OpenAI Entegrasyonu) */
import { BASE_DOMAIN } from './main.js';
import { currentUser } from './auth.js';

export function initChat() {
    console.log("💬 Sohbet Modülü Başlatılıyor...");

    const sendBtn = document.getElementById('sendBtn');
    const input = document.getElementById('text');
    
    // Olay Dinleyicileri
    if (sendBtn) {
        // Varsa eski listener'ı temizle (çoklu gönderimi önle)
        const newBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newBtn, sendBtn);
        newBtn.addEventListener('click', sendMessage);
    }
    
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

async function sendMessage() {
    const input = document.getElementById('text');
    const txt = input.value.trim();
    if (!txt) return;

    // 1. Kullanıcı Mesajını Ekrana Bas
    addBubble(txt, 'user');
    input.value = ''; // Kutuyu temizle

    // 2. Modu Belirle (Global değişkenden)
    const currentMode = window.currentAppMode || "chat";

    // 3. Backend'e Gönder
    try {
        const token = localStorage.getItem("auth_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        addBubble("...", 'bot', true); // Yazıyor animasyonu (geçici)

        const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                message: txt,
                mode: currentMode,
                persona: "normal"
            })
        });

        // Yazıyor... balonunu kaldır
        const loadingBubble = document.getElementById('loadingBubble');
        if (loadingBubble) loadingBubble.remove();

        const data = await res.json();

        if (res.ok) {
            addBubble(data.assistant_text || "Hımm...", 'bot');
        } else {
            console.error("Chat Hatası:", data);
            addBubble("Tansiyonum düştü evladım. (Sunucu Hatası)", 'bot');
        }

    } catch (err) {
        console.error(err);
        const loadingBubble = document.getElementById('loadingBubble');
        if (loadingBubble) loadingBubble.remove();
        addBubble("İnternetin mi koptu ne oldu? Cevap veremedim.", 'bot');
    }
}

// Baloncuk Ekleme
function addBubble(text, type, isLoading = false) {
    const container = document.getElementById('chatContainer');
    const row = document.createElement('div');
    row.className = `msg-row ${type}`;
    
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${type}`;
    if (isLoading) {
        bubble.id = 'loadingBubble';
        bubble.style.fontStyle = 'italic';
        bubble.style.opacity = '0.7';
    }
    
    // Basit satır kırılımı (Anayasa uyumlu)
    bubble.innerHTML = text.replace(/\n/g, '<br>');

    row.appendChild(bubble);
    container.appendChild(row);

    // Scroll
    container.scrollTo(0, container.scrollHeight);
}
