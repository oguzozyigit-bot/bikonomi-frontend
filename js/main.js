/* js/main.js - (v9606 - Resim ve Modül Entegrasyonu) */
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";

import { initAuth } from './auth.js';
import { initChat } from './chat.js';
import { initFal } from './fal.js';
import { initUi } from './ui_modals.js'; 

// Resim Haritası (GitHub'daki dosya isimlerine göre)
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

// Resim Değiştirme Fonksiyonu
const setHeroMode = (mode) => {
    const img = document.getElementById('heroImage');
    const targetSrc = HERO_IMAGES[mode] || HERO_IMAGES['default'];
    
    if (img) {
        console.log(`🖼️ Mod Değişiyor: ${mode} -> ${targetSrc}`);
        // Hafif bir geçiş efekti için
        img.style.opacity = '0';
        setTimeout(() => {
            img.src = targetSrc;
            img.onload = () => { img.style.opacity = '0.4'; };
            // Resim önbellekteyse onload tetiklenmeyebilir, garanti olsun:
            setTimeout(() => { img.style.opacity = '0.4'; }, 100);
        }, 200);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("👵 Caynana Web Başlatılıyor... (v9606 - Final)");

    // --- 1. BAŞLANGIÇ AYARLARI ---
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
        // initUi'ye resim değiştirme yetkisini veriyoruz!
        if (typeof initUi === 'function') initUi(setHeroMode);
        
        if (typeof initAuth === 'function') await initAuth();
        if (typeof initChat === 'function') initChat();
        if (typeof initFal === 'function') initFal();
        
        console.log("✅ Sistem Aktif! Resimler bağlandı.");
    } catch (error) {
        console.error("Başlatma hatası:", error);
    }
});
