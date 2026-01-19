/* js/auth.js - TEK GİRİŞ (AUTO ID + TERMS + PROFILE SUGGEST) - FINAL */
import { GOOGLE_CLIENT_ID, STORAGE_KEY, BASE_DOMAIN } from "./config.js";

let tokenClient;

export function initAuth() {
  if (window.google) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          fetchGoogleProfile(tokenResponse.access_token);
        }
      },
    });
  }
}

export function handleLogin(provider) {
  if (provider === "google") {
    if (tokenClient) tokenClient.requestAccessToken();
    else alert("Google servisi bekleniyor...");
    return;
  }
  alert("Apple yakında evladım. Şimdilik Google ile devam et.");
}

async function fetchGoogleProfile(accessToken) {
  try {
    let googleData = null;

    // 1) Google userinfo (başarısız olabilir)
    try {
      const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (r.ok) googleData = await r.json();
    } catch (e) {
      console.warn("Google userinfo fetch failed (will fallback):", e);
    }

    // 2) Fallback: token JWT ise email çek
    const fallbackClaims = decodeJwtPayload(accessToken);
    const email = ((googleData?.email || "") || (fallbackClaims?.email || "")).trim().toLowerCase();

    // Email yoksa: misafir devam (chat açılsın)
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

    // ✅ Ana kimlik: email
    const uid = email;

    // Local merge
    const storedUser = safeJson(localStorage.getItem(STORAGE_KEY), {});
    const updatedUser = {
      ...storedUser,
      id: uid,
      email,
      fullname: googleData?.name || storedUser.fullname || "",
      avatar: googleData?.picture || storedUser.avatar || "",
      provider: "google",
      isSessionActive: true,
      lastLoginAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));

    // ✅ Sunucu profili (fail olursa kilitleme)
    let serverMeta = {};
    try {
      serverMeta = await fetchServerProfile(uid, email);
    } catch (e) {
      console.warn("Server profile alınamadı, chat devam ediyor", e);
      serverMeta = {};
    }

    // Sunucu meta varsa local’e göm
    if (serverMeta && typeof serverMeta === "object") {
      Object.assign(updatedUser, serverMeta);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    }

    // ✅ Terms varsa iyi, yoksa sadece overlay göster (kilitleme yok)
    const termsOk = !!(serverMeta?.terms_accepted_at || updatedUser.terms_accepted_at);
    if (!termsOk) {
      window.showTermsOverlay?.();
      // return YOK: chat açılsın
    }

    // ✅ Tek noktadan içeri al (chat açılsın)
    window.enterApp?.();
    return;

  } catch (err) {
    console.error("Auth Error:", err);

    // Burada da kilitleme yok → misafir devam
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

// ✅ Terms onayını backend’e yaz
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

// Soft logout (hafıza kalsın)
export function logout() {
  if (confirm("Oturumu kapatmak istiyor musun? (Bilgilerin silinmez)")) {
    const user = safeJson(localStorage.getItem(STORAGE_KEY), {});
    user.isSessionActive = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
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
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
