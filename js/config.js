// js/config.js - (v13.2 FINAL - DOMAIN & API UYUMLU)

/*
  AMAÇ:
  - Tek ve net backend adresi
  - chat.js / diğer JS dosyalarıyla %100 uyum
  - CORS + payload karmaşası çıkarmasın
*/

// --------------------------------------------------
// 1. BACKEND (TEK KAYNAK – BEYİN)
// --------------------------------------------------
export const BASE_DOMAIN = "https://caynana-api-py310-final.onrender.com";

// API endpoint'leri (tek yerden yönetim)
export const API_CHAT   = `${BASE_DOMAIN}/api/chat`;
export const API_SPEECH = `${BASE_DOMAIN}/api/speech`;
export const API_HEALTH = `${BASE_DOMAIN}/healthz`;
export const API_PROFILE_GET    = `${BASE_DOMAIN}/api/profile/get`;
export const API_PROFILE_UPDATE = `${BASE_DOMAIN}/api/profile/update`;
export const API_REMINDERS_TODAY = `${BASE_DOMAIN}/api/reminders/today`;
export const API_FAL_READ       = `${BASE_DOMAIN}/api/fal/read`;
export const API_SHOPPING       = `${BASE_DOMAIN}/api/shopping/analyze`;

// --------------------------------------------------
// 2. GOOGLE (KİMLİK)
// --------------------------------------------------
export const GOOGLE_CLIENT_ID =
  "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";

// --------------------------------------------------
// 3. SUPABASE (KALICI HAFIZA – FRONTEND OKUMA)
// ⚠️ publishable key, server secret DEĞİL
// --------------------------------------------------
export const SUPABASE_URL =
  "https://uujfzidelfjciltfbqvf.supabase.co";

export const SUPABASE_KEY =
  "sb_publishable_i8UzxtVtXNWM-UV0Kk3lbQ_TkJsPBf";

// --------------------------------------------------
// 4. UYGULAMA AYARLARI
// --------------------------------------------------
export const APP_VERSION = "v13.6-CORS-FINAL";

// LocalStorage tek anahtar (tüm modüller aynı şeyi kullansın)
export const STORAGE_KEY = "caynana_user_v13";

// --------------------------------------------------
// 5. DEBUG / GELİŞTİRME
// --------------------------------------------------
export const IS_PROD = location.hostname.includes("caynana.ai");
