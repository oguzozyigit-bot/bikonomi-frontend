/* js/chat.js (v9910 - SHOPPING CARDS ENABLED) */
import { BASE_DOMAIN } from './main.js';

export function initChat() {
    const sendBtn = document.getElementById('sendBtn');
    const input = document.getElementById('text');
    
    if (sendBtn) {
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

    addBubble(txt, 'user');
    input.value = '';

    const currentMode = window.currentAppMode || "chat";

    try {
        const token = localStorage.getItem("auth_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        addBubble("...", 'bot', true); 

        const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ message: txt, mode: currentMode, persona: "normal" })
        });

        const loadingBubble = document.getElementById('loadingBubble');
        if (loadingBubble) loadingBubble.remove();

        const data = await res.json();

        if (res.ok) {
            // 1. Metin Cevabı
            addBubble(data.assistant_text || "Hımm...", 'bot');

            // 2. Ürün Kartları Varsa Çiz
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                renderProducts(data.data);
            }
        } else {
            addBubble("Bir hata oldu evladım.", 'bot');
        }

    } catch (err) {
        const loadingBubble = document.getElementById('loadingBubble');
        if (loadingBubble) loadingBubble.remove();
        addBubble("İnternet gitti galiba.", 'bot');
    }
}

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
    
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTo(0, container.scrollHeight);
}

// --- ÜRÜN KARTLARI (ANAYASA TASARIMI) ---
function renderProducts(products) {
    const container = document.getElementById('chatContainer');
    
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // 5 Yıldız (Sarı)
        let starsHTML = '';
        for(let i=0; i<5; i++) starsHTML += '<i class="fa-solid fa-star"></i>';

        card.innerHTML = `
            <div class="pc-img-wrap">
                <img src="${p.image}" class="pc-img" onerror="this.src='https://via.placeholder.com/300?text=Urun'">
            </div>
            <div class="pc-content">
                <div class="pc-title">${p.title}</div>
                <div class="caynana-stars">${starsHTML}</div>
                <div style="font-weight:800; color:#00C897; font-size:16px;">${p.price}</div>
                
                <div class="pc-desc">
                    <strong>👵 Caynana Diyor ki:</strong><br>
                    ${p.reason}
                </div>
                
                <button class="pc-btn" onclick="window.open('${p.url}', '_blank')">
                    Caynana Öneriyor — Ürüne Git
                </button>
            </div>
        `;
        
        // Kartı bir satır içine koymadan direkt ekliyoruz ki tam genişlik olsun
        // Ama düzgün hizalamak için msg-row içine de alabiliriz. 
        // Şimdilik direkt container'a ekleyelim, CSS halleder.
        const row = document.createElement('div');
        row.className = 'msg-row bot';
        row.style.display = 'block'; // Block olsun ki tam otursun
        row.appendChild(card);
        
        container.appendChild(row);
    });
    
    container.scrollTo(0, container.scrollHeight);
}
