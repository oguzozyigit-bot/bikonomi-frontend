/* js/auth.js - TEK GİRİŞ (ID_TOKEN) + TERMS + PROFILE - FINAL (CORS FIX + PAD FIX) */
import { GOOGLE_CLIENT_ID, STORAGE_KEY, BASE_DOMAIN } from "./config.js";

let _gisInitialized = false;

export function initAuth() {
  if (_gisInitialized) return;

  if (!window.google || !google.accounts || !google.accounts.id) {
    console.warn("Google Identity henüz hazır değil.");
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      const idToken = (response && response.credential) ? String(response.credential) : "";
      if (!idToken) {
        console.warn("Google credential (id_token) gelmedi.");
        return;
      }
      localStorage.setItem("google_id_token", idToken);
      fetchGoogleProfileFromIdToken(idToken);
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  _gisInitialized = true;

  // (Opsiyonel) renderButton mount varsa bas (mobil/PC fallback)
  const mount = document.getElementById("googleBtnMount");
  if (mount) {
    try {
      google.accounts.id.renderButton(mount, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 280
      });
    } catch (e) {
      console.warn("renderButton failed:", e);
    }
  }
}

export function handleLogin(provider) {
  if (provider === "google") {
    if (!window.google || !google.accounts || !google.accounts.id) {
      alert("Google servisi bekleniyor...");
      return;
    }
    google.accounts.id.prompt((notif) => {
      if (notif.isNotDisplayed?.() || notif.isSkippedMoment?.()) {
        console.warn("Google prompt gösterilemedi:", notif.getNotDisplayedReason?.() || notif.getSkippedReason?.());
        window.showGoogleButtonFallback?.(notif.getNotDisplayedReason?.() || notif.getSkippedReason?.() || "unknown");
      }
    });
    return;
  }
  alert("Apple yakında evladım. Şimdilik Google ile devam et.");
}

async function fetchGoogleProfileFromIdToken(idToken) {
  try {
    const claims = decodeJwtPayload(idToken) || {};
    const email = String(claims.email || "").trim().toLowerCase();
    const name = String(claims.name || "").trim();
    const picture = String(claims.picture || "").trim();

    if (!email) {
      console.warn("Google email alınamadı. Misafir moduna geçiliyor.");
      const storedUser = safeJson(localStorage.getItem(STORAGE_KEY), {});
      const updatedUser = {
        ...storedUser,
        id: storedUser?.id || "guest",
        provider: "guest",
        isSessionActive: true,
        lastLoginAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      window.enterApp?.();
      return;
    }

    const uid = email;

    const storedUser = safeJson(localStorage.getItem(STORAGE_KEY), {});
    const updatedUser = {
      ...storedUser,
      id: uid,
      email,
      fullname: name || storedUser.fullname || "",
      avatar: picture || storedUser.avatar || "",
      provider: "google",
      isSessionActive: true,
      lastLoginAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));

    let serverMeta = {};
    try {
      serverMeta = await fetchServerProfile(uid, email);
    } catch (e) {
      console.warn("Server profile alınamadı, chat devam ediyor", e);
      serverMeta = {};
    }

    if (serverMeta && typeof serverMeta === "object") {
      Object.assign(updatedUser, serverMeta);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    }

    const termsOk = !!(serverMeta?.terms_accepted_at || updatedUser.terms_accepted_at);
    if (!termsOk) window.showTermsOverlay?.();

    window.enterApp?.();
    return;

  } catch (err) {
    console.error("Auth Error:", err);

    const storedUser = safeJson(localStorage.getItem(STORAGE_KEY), {});
    const updatedUser = {
      ...storedUser,
      id: storedUser?.id || "guest",
      provider: storedUser?.provider || "guest",
      isSessionActive: true,
      lastLoginAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    window.enterApp?.();
  }
}

async function fetchServerProfile(uid, email) {
  try {
    const url = `${BASE_DOMAIN}/api/profile/get?user_id=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.found && data?.meta) return data.meta;
    return {};
  } catch (e) {
    console.log("Profile get failed:", e);
    return {};
  }
}

export async function acceptTerms() {
  const user = safeJson(localStorage.getItem(STORAGE_KEY), {});
  if (!user?.id || !user?.email) return false;

  const payload = {
    user_id: user.id,
    meta: {
      email: user.email,
      terms_accepted_at: new Date().toISOString(),
    },
  };

  try {
    const res = await fetch(`${BASE_DOMAIN}/api/profile/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await res.json();
    if (out?.ok) {
      user.terms_accepted_at = payload.meta.terms_accepted_at;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return true;
    }
  } catch (e) {
    console.log("acceptTerms failed:", e);
  }
  return false;
}

export function logout() {
  if (confirm("Oturumu kapatmak istiyor musun? (Bilgilerin silinmez)")) {
    const user = safeJson(localStorage.getItem(STORAGE_KEY), {});
    user.isSessionActive = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.removeItem("google_id_token");
    window.location.href = "/index.html";
  }
}

function safeJson(s, fallback) {
  try { return JSON.parse(s || ""); } catch { return fallback; }
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;

    let base64Url = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64Url.length % 4;
    if (pad) base64Url += "=".repeat(4 - pad);

    const json = decodeURIComponent(
      atob(base64Url)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
