/* js/main.js - (v9705 - DOCK EKLENDİ) */
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";

import { initAuth } from './auth.js';
import { initChat } from './chat.js';
import { initFal } from './fal.js'; // Varsa
import { initUi } from './ui_modals.js'; 
import { initDock } from './dock.js'; // ✅ YENİ EKLENEN

// Resim Haritası
const HERO_IMAGES = {
    'chat': './images/hero-chat.png',
    'fal': './images/hero-fal.png',
    'dream': './images/hero-dream.png',
    'shopping': './images/hero-shopping.png',
    'diet': './images/hero-diet.png',
    'health': './images/hero-health.png',
    'astro': './images/hero-astro.png',
    'dedikodu': './images/hero-dedikodu.png',
    'default': './images/hero-chat.png'
};

// Resim Değiştirme Fonksiyonu (Dışarıya açıyoruz)
export const setHeroMode = (mode) => {
    const img = document.getElementById('heroImage');
    const targetSrc = HERO_IMAGES[mode] || HERO_IMAGES['default'];
    
    if (img) {
        // img.src = targetSrc; // Basit geçiş
        // Efektli geçiş:
        img.style.opacity = '0';
        setTimeout(() => {
            img.src = targetSrc;
            img.onload = () => { img.style.opacity = '0.4'; };
            // Cache durumunda onload tetiklenmezse diye güvenlik:
            setTimeout(() => { img.style.opacity = '0.4'; }, 100);
        }, 200);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("👵 Caynana Web Başlatılıyor... (v9705)");

    // --- 1. GÖRSELLERİ VE METİNLERİ YÜKLE ---
    const heroTitle = document.getElementById('heroTitle');
    const heroDesc = document.getElementById('heroDesc');
    const heroImage = document.getElementById('heroImage');
    const suggestionText = document.getElementById('suggestionText');

    if (heroTitle) heroTitle.innerText = "CAYNANA";
    if (heroDesc) heroDesc.innerHTML = "Yapay Zekânın<br>Geleneksel Aklı";
    if (suggestionText) suggestionText.innerText = "Fal baktırmak için kameraya, sohbet için mikrofona bas evladım.";

    // Başlangıç resmi (Chat)
    if (heroImage) {
        heroImage.src = HERO_IMAGES.chat;
        heroImage.style.display = 'block';
        heroImage.style.opacity = '0.4';
    }

    // --- 2. MODÜLLERİ BAŞLAT ---
    try {
        if (typeof initUi === 'function') initUi(setHeroMode);
        if (typeof initDock === 'function') initDock(); // ✅ DOCK BAŞLATILIYOR
        if (typeof initAuth === 'function') await initAuth();
        if (typeof initChat === 'function') initChat();
        // if (typeof initFal === 'function') initFal();
        
        console.log("✅ Sistem Aktif! Modüller Yerleşti.");
    } catch (error) {
        console.error("Başlatma hatası:", error);
    }
});
