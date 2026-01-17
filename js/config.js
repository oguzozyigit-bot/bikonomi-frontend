// API base
export const BASE_DOMAIN = "https://caynana-api-py310-final.onrender.com";

// Endpointler
export const API_CHAT = `${BASE_DOMAIN}/api/chat`;
export const API_HEALTH = `${BASE_DOMAIN}/healthz`;

// İstek ayarları
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json"
};

// Zaman aşımı (ms)
export const REQUEST_TIMEOUT = 30000;
