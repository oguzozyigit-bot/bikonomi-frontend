/* js/main.js
   CAYNANA.AI - Ana Giriş Dosyası
   Bu dosya modülleri başlatır ve Backend adresini tutar.
*/

// 1. Backend Adresi (Render'daki Canlı Adresin)
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";

// 2. Modülleri İçe Aktar
import { initAuth } from './auth.js';
import { initChat } from './chat.js';
import { initFal } from './fal.js';
import { initUi } from './ui_modals.js'; 

// 3. Sayfa Yüklendiğinde Sistemi Başlat
document.addEventListener('DOMContentLoaded', async () => {
    console.log("👵 Caynana Web Başlatılıyor... (v9600)");

    try {
        // Önce UI elementlerini ve Modalları hazırla
        if (typeof initUi === 'function') {
            initUi();
        }

        // Kullanıcı giriş yapmış mı kontrol et
        if (typeof initAuth === 'function') {
            await initAuth();
        }

        // Sohbet balonlarını ve olaylarını başlat
        if (typeof initChat === 'function') {
            initChat();
        }

        // Fal modülünü hazırla
        if (typeof initFal === 'function') {
            initFal();
        }

    } catch (error) {
        console.error("Başlatma hatası:", error);
    }
});
