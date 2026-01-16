/* js/main.js (v19.1 - GLOBAL BRIDGE & DOCK) */

// 1. Gerekli Fonksiyonları İçe Aktar
import { initChat, triggerAuth } from './chat.js';

// 2. Mod Yapılandırması (Dock İkonları İçin)
const MODE_CONFIG = {
    'chat':     { title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", icon: "fa-comments" },
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", icon: "fa-bag-shopping" },
    'dedikodu': { title: "Dedikodu Odası<br>Bize Özel.", desc: "Duvarların kulağı var.", color: "#90A4AE", icon: "fa-user-secret" },
    'fal':      { title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#CE93D8", icon: "fa-mug-hot" },
    'astro':    { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Merkür retrosu hayırdır.", color: "#7986CB", icon: "fa-star" },
    'ruya':     { title: "Rüyalar Alemi<br>Hayırdır.", desc: "Kabus mu gördün?", color: "#81D4FA", icon: "fa-cloud-moon" },
    'health':   { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor?", color: "#E57373", icon: "fa-heart-pulse" },
    'diet':     { title: "Boğazını Tut<br>Rahat Et.", desc: "O böreği bırak.", color: "#AED581", icon: "fa-carrot" },
    'trans':    { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", icon: "fa-language" }
};
const MODULE_ORDER = ['chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'];

// 3. Dock (Alt İkonlar) Oluşturma
function initDock() {
    const dock = document.getElementById('dock');
    if (!dock) return;
    dock.innerHTML = ''; 
    
    MODULE_ORDER.forEach(key => {
        const conf = MODE_CONFIG[key];
        const item = document.createElement('div');
        item.className = 'dock-item';
        item.onclick = () => setAppMode(key);
        
        item.innerHTML = `
            <div class="dock-icon"><i class="fa-solid ${conf.icon}"></i></div>
            <div class="dock-label">${key.toUpperCase()}</div>
        `;
        dock.appendChild(item);
    });
}

// 4. Mod Değiştirme Fonksiyonu
function setAppMode(mode) {
    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode] || MODE_CONFIG['chat'];
    
    // UI Güncelle
    const titleEl = document.getElementById('heroTitle');
    const descEl = document.getElementById('heroDesc');
    
    if(titleEl) titleEl.innerHTML = cfg.title;
    if(descEl) descEl.innerHTML = cfg.desc;
    
    // Renk Teması
    document.documentElement.style.setProperty('--primary', cfg.color);
    
    // İkon Aktifliği
    document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
    // Basit bir indis hesabı ile aktif sınıfı ekle (veya data attribute ile)
    // Şimdilik sadece renk ve metin değişimi yeterli.
}

// 🔥 5. KRİTİK NOKTA: HTML İÇİN FONKSİYONLARI AÇIYORUZ 🔥
// HTML'deki onclick="triggerAuth(...)" artık çalışacak!
window.triggerAuth = triggerAuth;

// 6. Başlatma
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Main System Loaded");
    
    // Sohbeti Başlat
    initChat();
    
    // Dock'u Çiz
    initDock();
    
    // Varsayılan Mod
    setAppMode('chat');
});
