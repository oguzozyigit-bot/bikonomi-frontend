/* js/main.js - (v9907 - CANLI + GARANTİ YOL + initProfile) */
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";

import { initAuth, checkLoginStatus } from './auth.js';
import { initChat } from './chat.js';
import { initUi, setupPersonaModal, setupNotifications } from './ui_modals.js';
import { initProfile } from './profile.js'; // ✅ EKSİK PARÇA TAMAMLANDI
import { initDock } from './dock.js';

/* --- CAYNANA ESPİRİLİ LAFLARI (Modüle Göre) --- */
const MODULE_WIT = {
    'chat':     "Anlat bakalım, yine ne derdin var?",
    'fal':      "Kapat fincanı, soğut gel. Bakalım neler çıkacak...",
    'shopping': "Paran cebine batıyor herhalde? Gel bakalım...",
    'dedikodu': "Kız kim ne demiş? Çatlarım anlat hadi!",
    'health':   "Ayol ben doktor muyum? Ama dur bir nane limon...",
    'diet':     "O böreği yavaşça yere bırak evladım.",
    'astro':    "Yıldızlar tersine dönmüş diyorlar, hayırdır inşallah.",
    'default':  "Hayırdır evladım, bir sessizlik oldu?"
};

/* --- RESİM YOLLARI (Basit ve Garanti) --- */
const HERO_IMAGES = {
    'chat':     './images/hero-chat.png',
    'fal':      './images/hero-fal.png',
    'dream':    './images/hero-dream.png',
    'shopping': './images/hero-shopping.png',
    'diet':     './images/hero-diet.png',
    'health':   './images/hero-health.png',
    'astro':    './images/hero-astro.png',
    'dedikodu': './images/hero-dedikodu.png',
    'default':  './images/hero-chat.png'
};

/* --- MOD DEĞİŞTİRME --- */
export const setHeroMode = (mode) => {
    // 1. Global modu güncelle
    window.currentAppMode = mode;

    // 2. Resmi Değiştir (Efektli)
    const img = document.getElementById('heroImage');
    const targetSrc = HERO_IMAGES[mode] || HERO_IMAGES['default'];
    
    if (img) {
        // Önce söndür
        img.style.transition = 'opacity 0.2s ease';
        img.style.opacity = '0'; 
        
        setTimeout(() => {
            img.src = targetSrc;
            
            // Yüklendiğinde TAM CANLI (1.0) yap
            img.onload = () => { img.style.opacity = '1.0'; };
            img.onerror = () => { 
                console.error("Resim yüklenemedi:", targetSrc);
                img.src = HERO_IMAGES['default']; 
                img.style.opacity = '1.0';
            };
            
            // Cache durumunda garanti tetikleyici
            setTimeout(() => { img.style.opacity = '1.0'; }, 50);
        }, 200);
    }

    // 3. Espirili Lafı Değiştir
    const suggestionText = document.getElementById('suggestionText');
    if (suggestionText) {
        suggestionText.style.transition = 'opacity 0.2s ease';
        suggestionText.style.opacity = '0';
        setTimeout(() => {
            suggestionText.innerText = MODULE_WIT[mode] || MODULE_WIT['default'];
            suggestionText.style.opacity = '1';
        }, 200);
    }

    // 4. Fal Modu Kontrolü
    if (mode === 'fal') {
        document.body.classList.add('fal-mode');
    } else {
        document.body.classList.remove('fal-mode');
    }
};

/* --- BAŞLATMA --- */
document.addEventListener('DOMContentLoaded', async () => {
    console.log("👵 Caynana Web Başlatılıyor... (v9907)");

    const heroImage = document.getElementById('heroImage');
    
    // Resim ayarları (TAM CANLI)
    if (heroImage) {
        heroImage.src = HERO_IMAGES.chat;
        heroImage.style.display = 'block';
        heroImage.style.opacity = '1.0'; // <-- KARARMAYI ENGELLEYEN AYAR
    }

    // Modu başlat
    setHeroMode('chat');

    // Modülleri yükle
    try {
        if (typeof initUi === 'function') initUi();
        if (typeof setupPersonaModal === 'function') setupPersonaModal();
        if (typeof setupNotifications === 'function') setupNotifications();
        
        if (typeof initDock === 'function') initDock();
        
        // Auth ve Profil
        if (typeof initAuth === 'function') await initAuth();
        await checkLoginStatus(); 
        if (typeof initProfile === 'function') initProfile(); // ✅ ARTIK HATA VERMEZ
        
        if (typeof initChat === 'function') initChat();
        
        console.log("✅ Sistem Aktif! Modüller Yerleşti.");
    } catch (error) {
        console.error("Başlatma hatası:", error);
    }
});
