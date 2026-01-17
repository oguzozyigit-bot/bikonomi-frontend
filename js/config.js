// js/config.js

export const BASE_DOMAIN =
  window.location.hostname.includes("localhost")
    ? "http://localhost:8000"
    : (window.NEXT_PUBLIC_API_BASE || "https://caynana-api-py310-final.onrender.com");

export const API_CHAT = `${BASE_DOMAIN}/api/chat`;
export const API_HEALTH = `${BASE_DOMAIN}/healthz`;

export const DEFAULT_HEADERS = {
  "Content-Type": "application/json"
};

export const REQUEST_TIMEOUT = 30000;
