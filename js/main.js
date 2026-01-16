/* js/main.js (v21.0 - HISTORY + TRASH) */
import { initChat, triggerAuth } from './chat.js';

// Mod Yapılandırması (Açılış mesajlarını buraya ekledik)
const MODE_CONFIG = {
    'chat': { 
        title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", icon: "fa-comments",
        welcome: "Ooo hoş geldin evladım! Gözüm yollarda kaldı. Gel otur şöyle, anlat bakalım derdin ne?"
    },
    'shopping': { 
        title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", icon: "fa-bag-shopping",
        welcome: "Aman evladım, paranı sokağa atma. Ne lazım söyle, en uygununu bulayım sana."
    },
    'dedikodu': { 
        title: "Dedikodu Odası<br>Bize Özel.", desc: "Duvarların kulağı var.", color: "#90A4AE", icon: "fa-user-secret",
        welcome: "Kız kim ne demiş? Anlat çabuk, aramızda kalacak söz."
    },
    'fal': { 
        title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#CE93D8", icon: "fa-mug-hot",
        welcome: "Hadi iç kahveni, kapat fincanı soğusun da gel. Bakalım kısmetinde ne var?"
    },
    'astro': { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Merkür retrosu hayırdır.", color: "#7986CB", icon: "fa-star", welcome: "Yıldızlar bu ara karışık evladım. Burcun ne senin?" },
    'ruya': { title: "Rüyalar Alemi<br>Hayırdır.", desc: "Kabus mu gördün?", color: "#81D4FA", icon: "fa-cloud-moon", welcome: "Hayırdır inşallah de. Ne gördün rüyanda?" },
    'health': { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor?", color: "#E57373", icon: "fa-heart-pulse", welcome: "Aman sağlığına dikkat et. Neren ağrıyor, neyin var?" },
    'diet': { title: "Boğazını Tut<br>Rahat Et.", desc: "O böreği bırak.", color: "#AED581", icon: "fa-carrot", welcome: "O böreği yavaşça yere bırak evladım. Gel diyete başlayalım." },
    'trans': { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", icon: "fa-language", welcome: "Ne diyor bu gavurlar? Anlamadığın yeri sor bana." }
};
const MODULE_ORDER = ['chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'];

// 🔥 MODÜL HAFIZASI 🔥
const chatHistory = {}; 

function initDock() {
    const dock = document.getElementById('dock');
    if (!dock) return;
    dock.innerHTML = ''; 
    MODULE_ORDER.forEach(key => {
        const conf = MODE_CONFIG[key];
        const item = document.createElement('div');
        item.className = 'dock-item';
        item.dataset.mode = key;
        item.onclick = () => setAppMode(key);
        item.innerHTML = `<div class="dock-icon"><i class="fa-solid ${conf.icon}"></i></div><div class="dock-label">${key.toUpperCase()}</div>`;
        dock.appendChild(item);
    });
}

function setAppMode(mode) {
    // 1. Önceki modun geçmişini kaydet
    const currentContainer = document.getElementById('chatContainer');
    const oldMode = window.currentAppMode || 'chat';
    if (currentContainer) {
        chatHistory[oldMode] = currentContainer.innerHTML;
    }

    // 2. Yeni moda geç
    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode] || MODE_CONFIG['chat'];
    
    // UI Güncelle
    const titleEl = document.getElementById('heroTitle');
    const descEl = document.getElementById('heroDesc');
    
    if(titleEl) titleEl.innerHTML = cfg.title;
    if(descEl) descEl.innerHTML = cfg.desc;
    
    document.documentElement.style.setProperty('--primary', cfg.color);
    
    // İkon Aktifliği
    document.querySelectorAll('.dock-item').forEach(el => {
        el.classList.remove('active');
        if(el.dataset.mode === mode) el.classList.add('active');
    });

    // Alt Çizgileri Renklendir
    updateFooterBars(mode);

    // 3. Yeni modun geçmişini yükle (Yoksa varsayılan mesajı bas)
    if (chatHistory[mode]) {
        currentContainer.innerHTML = chatHistory[mode];
        // Scroll'u en aşağı çek
        setTimeout(() => {
            currentContainer.scrollTo({ top: currentContainer.scrollHeight, behavior: 'instant' });
        }, 10);
    } else {
        // İlk kez giriliyorsa temizle ve hoşgeldin mesajı bas
        currentContainer.innerHTML = '';
        addBotMessage(cfg.welcome);
    }
}

// 🔥 ÇÖP KUTUSU FONKSİYONU 🔥
function clearCurrentChat() {
    const container = document.getElementById('chatContainer');
    const mode = window.currentAppMode || 'chat';
    const cfg = MODE_CONFIG[mode];
    
    if(container) {
        container.innerHTML = ''; // Hepsini sil
        addBotMessage(cfg.welcome); // Sadece hoşgeldin mesajını geri koy
        // Hafızayı da güncelle
        chatHistory[mode] = container.innerHTML;
    }
}

// Yardımcı: Bot mesajı basma (Main içinden)
function addBotMessage(text) {
    const container = document.getElementById('chatContainer');
    const wrap = document.createElement("div");
    wrap.className = "msg-row bot";
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble bot";
    bubble.innerHTML = text;
    wrap.appendChild(bubble);
    container.appendChild(wrap);
}

function updateFooterBars(currentMode) {
    const idx = MODULE_ORDER.indexOf(currentMode);
    if(idx === -1) return;
    const lines = [document.getElementById('line1'), document.getElementById('line2'), document.getElementById('line3'), document.getElementById('line4')];
    for(let i=0; i<4; i++) {
        const targetIdx = (idx + i) % MODULE_ORDER.length; 
        const targetMode = MODULE_ORDER[targetIdx];
        const color = MODE_CONFIG[targetMode].color;
        if(lines[i]) lines[i].style.background = color;
    }
}

// Global Erişimler
window.triggerAuth = triggerAuth;
window.clearCurrentChat = clearCurrentChat;

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Main System Loaded v21");
    initChat();
    initDock();
    // İlk açılışta history'yi boş başlat, varsayılan mesaj HTML'de var zaten
    // Ama biz yine de setAppMode çağırarak renkleri ve state'i oturtalım
    // HTML'deki mesajı 'chat' historysine alalım
    const container = document.getElementById('chatContainer');
    if(container) chatHistory['chat'] = container.innerHTML;
    
    setAppMode('chat');
});
