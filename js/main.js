/* js/main.js - (v9906 - CANLI GÖRSEL + ESPİRİLİ LAFLAR - FIXED) */
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";

import { initAuth, checkLoginStatus } from "./auth.js";
import { initChat } from "./chat.js";
import { initUi, setupPersonaModal, setupNotifications } from "./ui_modals.js";
import { initProfile } from "./profile.js";
import { initDock } from "./dock.js";

/* --------------------------------------------------
   GLOBAL APP STATE (tek yerden yönet)
-------------------------------------------------- */
window.CaynanaApp = window.CaynanaApp || {
  mode: "chat",
  setMode: null,
};

/* --------------------------------------------------
   CAYNANA ESPİRİLİ LAFLARI (Modüle Göre)
-------------------------------------------------- */
const MODULE_WIT = {
  chat: "Anlat bakalım, yine ne derdin var?",
  fal: "Kapat fincanı, soğut gel. Bakalım neler çıkacak...",
  shopping: "Paran cebine batıyor herhalde? Gel bakalım...",
  dedikodu: "Kız kim ne demiş? Çatlarım anlat hadi!",
  health: "Ayol ben doktor muyum? Ama dur bir nane limon...",
  diet: "O böreği yavaşça yere bırak evladım.",
  astro: "Yıldızlar tersine dönmüş diyorlar, hayırdır inşallah.",
  default: "Hayırdır evladım, bir sessizlik oldu?",
};

/* --------------------------------------------------
   HERO IMAGE PATHS (import.meta.url ile garanti)
-------------------------------------------------- */
function heroUrl(rel) {
  // main.js: /js/main.js -> ../images/.. doğru çözülür
  return new URL(`../images/${rel}`, import.meta.url).href;
}

const HERO_IMAGES = {
  chat: heroUrl("hero-chat.png"),
  fal: heroUrl("hero-fal.png"),
  dream: heroUrl("hero-dream.png"),
  shopping: heroUrl("hero-shopping.png"),
  diet: heroUrl("hero-diet.png"),
  health: heroUrl("hero-health.png"),
  astro: heroUrl("hero-astro.png"),
  dedikodu: heroUrl("hero-dedikodu.png"),
  default: heroUrl("hero-chat.png"),
};

/* --------------------------------------------------
   UTIL: Fade
-------------------------------------------------- */
function fadeEl(el, toOpacity, ms = 180) {
  if (!el) return;
  el.style.transition = `opacity ${ms}ms ease`;
  el.style.opacity = String(toOpacity);
}

/* --------------------------------------------------
   MOD DEĞİŞTİRME (Resim + Laf + Fal UI)
-------------------------------------------------- */
export const setHeroMode = (mode) => {
  const m = mode || "chat";

  // 1) Global modu yaz (iki isimle de)
  window.currentAppMode = m;                 // geriye uyum
  window.CaynanaApp.mode = m;                // yeni standart

  // 2) Hero Image değiştir (fade)
  const img = document.getElementById("heroImage");
  const targetSrc = HERO_IMAGES[m] || HERO_IMAGES.default;

  if (img) {
    // önce söndür
    fadeEl(img, 0, 160);

    // sonra src değiştir ve tekrar yak
    setTimeout(() => {
      // src set
      img.src = targetSrc;

      // cache olsa bile yakalım
      // (onload bazen cache'de tetiklenmeyebiliyor)
      const bringBack = () => fadeEl(img, 0.9, 220);

      img.onload = bringBack;
      img.onerror = () => {
        // fallback
        img.src = HERO_IMAGES.default;
        bringBack();
      };

      // garanti: 80ms sonra geri getir
      setTimeout(bringBack, 80);
    }, 170);
  }

  // 3) suggestionText değiştir (fade)
  const suggestionText = document.getElementById("suggestionText");
  if (suggestionText) {
    fadeEl(suggestionText, 0, 120);
    setTimeout(() => {
      suggestionText.innerText = MODULE_WIT[m] || MODULE_WIT.default;
      fadeEl(suggestionText, 1, 180);
    }, 130);
  }

  // 4) Fal modu CSS
  if (m === "fal") document.body.classList.add("fal-mode");
  else document.body.classList.remove("fal-mode");
};

// dışarıdan erişim
window.CaynanaApp.setMode = setHeroMode;

/* --------------------------------------------------
   BOOT
-------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("👵 Caynana Web Başlatılıyor... (v9906 - Fixed)");

  // başlangıç hero ayarları
  const heroImage = document.getElementById("heroImage");
  if (heroImage) {
    heroImage.src = HERO_IMAGES.chat;
    heroImage.style.display = "block";
    heroImage.style.opacity = "0.9";
  }

  // başlangıç modu
  setHeroMode("chat");

  // modülleri başlat
  try {
    if (typeof initUi === "function") initUi();
    if (typeof setupPersonaModal === "function") setupPersonaModal();
    if (typeof setupNotifications === "function") setupNotifications();

    if (typeof initDock === "function") initDock();

    // Auth + Profile sıralı
    if (typeof initAuth === "function") await initAuth();
    if (typeof checkLoginStatus === "function") await checkLoginStatus();
    if (typeof initProfile === "function") initProfile();

    if (typeof initChat === "function") initChat();

    console.log("✅ Sistem Aktif! Modüller Yerleşti.");
  } catch (error) {
    console.error("Başlatma hatası:", error);
  }
});
