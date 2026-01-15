/* js/chat.js (v9911 - TYPEWRITER EFFECT + IMAGES FIX) */
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

    // 1. Kullanıcı mesajı (Hemen görünür)
    addBubble(txt, 'user', false); 
    input.value = '';

    const currentMode = window.currentAppMode || "chat";

    try {
        const token = localStorage.getItem("auth_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // "Yazıyor..." balonu (Geçici)
        addBubble("...", 'bot', true, true); 

        const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ message: txt, mode: currentMode, persona: "normal" })
        });

        // "Yazıyor..." balonunu sil
        const loadingBubble = document.getElementById('loadingBubble');
        if (loadingBubble) loadingBubble.remove();

        const data = await res.json();

        if (res.ok) {
            // 2. Asistan Cevabı (DAKTİLO EFEKTİ İLE)
            const botText = data.assistant_text || "Hımm...";
            
            // Eğer ürün varsa, metni yazdıktan SONRA ürünleri göster
            const hasProducts = data.data && Array.isArray(data.data) && data.data.length > 0;
            
            // Daktilo efektini başlat
            typeWriterBubble(botText, () => {
                // Metin bittiğinde burası çalışır
                if (hasProducts) {
                    renderProducts(data.data);
                }
            });

        } else {
            addBubble("Bir hata oldu evladım.", 'bot');
        }

    } catch (err) {
        const loadingBubble = document.getElementById('loadingBubble');
        if (loadingBubble) loadingBubble.remove();
        addBubble("İnternet gitti galiba.", 'bot');
    }
}

// --- STANDART BALON EKLEME (Kullanıcı için) ---
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

// --- DAKTİLO EFEKTİ (Caynana için) ---
function typeWriterBubble(text, callback) {
    const container = document.getElementById('chatContainer');
    const row = document.createElement('div');
    row.className = 'msg-row bot';
    
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble bot';
    bubble.innerHTML = ''; // Başlangıçta boş
    
    row.appendChild(bubble);
    container.appendChild(row);

    let i = 0;
    const speed = 20; // Hız (ms) - Ne kadar düşükse o kadar hızlı

    function type() {
        if (i < text.length) {
            const char = text.charAt(i);
            // Satır sonu karakterini <br> yap
            if (char === '\n') {
                bubble.innerHTML += '<br>';
            } else {
                bubble.innerHTML += char;
            }
            i++;
            
            // Otomatik kaydır
            container.scrollTo(0, container.scrollHeight);
            
            setTimeout(type, speed);
        } else {
            // Yazma bitti
            if (callback) callback();
        }
    }
    
    type(); // Başlat
}

// --- ÜRÜN KARTLARI ---
function renderProducts(products) {
    const container = document.getElementById('chatContainer');
    
    products.forEach((p, index) => {
        // Hafif gecikmeli gelsin (sırayla pıt pıt düşsün)
        setTimeout(() => {
            const card = document.createElement('div');
            card.className = 'product-card';
            // Animasyonlu giriş
            card.style.animation = 'fadeIn 0.5s ease forwards';
            
            let starsHTML = '';
            for(let i=0; i<5; i++) starsHTML += '<i class="fa-solid fa-star"></i>';

            card.innerHTML = `
                <div class="pc-img-wrap">
                    <img src="${p.image}" class="pc-img" onerror="this.src='https://via.placeholder.com/300?text=Urun+Yok'">
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
            
            const row = document.createElement('div');
            row.className = 'msg-row bot';
            row.style.display = 'block'; 
            row.appendChild(card);
            
            container.appendChild(row);
            container.scrollTo(0, container.scrollHeight);
            
        }, index * 400); // Her kart arasında 400ms bekle
    });
}
