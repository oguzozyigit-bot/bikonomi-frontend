// TEMEL AYARLAR
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
export const GOOGLE_CLIENT_ID = "530064560706-03ga0q36t703ve7gmahr98.apps.googleusercontent.com";
export const STORAGE_KEY = "caynana_user_v8";
export const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";

// 🔥 GELİŞTİRİCİ İÇİN MASTER MODÜL LİSTESİ 🔥
// Menüleri ve yetkileri buradan yöneteceksin.
export const APP_MODULES = {
  "app_version": "v16.0",
  "modules": [
    {
      "group": "core",
      "title": "Ana Modüller",
      "items": [
        {
          "code": "chat",
          "name": "Sohbet",
          "icon": "💬",
          "desc": "Genel dertleşme",
          "action": "chat"
        },
        {
          "code": "shopping",
          "name": "Alışveriş",
          "icon": "🛍️",
          "desc": "Cimri Kaynana",
          "action": "mode_shopping"
        },
        {
          "code": "dedikodu",
          "name": "Dedikodu",
          "icon": "🔥",
          "desc": "Grup & Kaos",
          "action": "dedikodu"
        },
        {
          "code": "trans",
          "name": "Tercüman",
          "icon": "🌍",
          "desc": "Çeviri",
          "action": "mode_trans"
        },
        {
          "code": "diet",
          "name": "Diyet",
          "icon": "🥗",
          "desc": "Sağlıklı yaşam",
          "action": "mode_diet"
        },
        {
          "code": "health",
          "name": "Sağlık",
          "icon": "❤️",
          "desc": "Tıbbi danışma",
          "action": "mode_health"
        }
      ]
    },
    {
      "group": "mystic",
      "title": "Fal & Gizem",
      "items": [
        {
          "code": "fal",
          "name": "Kahve Falı",
          "icon": "☕",
          "desc": "Fincan yorumu",
          "action": "fal"
        },
        {
          "code": "tarot",
          "name": "Tarot",
          "icon": "🃏",
          "desc": "Kart açılımı",
          "action": "page_tarot"
        },
        {
          "code": "horoscope",
          "name": "Burç",
          "icon": "♈",
          "desc": "Günlük yorum",
          "action": "page_burc"
        },
        {
          "code": "dream",
          "name": "Rüya Tabiri",
          "icon": "🌙",
          "desc": "Rüya yorumu",
          "action": "page_ruya"
        }
      ]
    }
  ]
};
