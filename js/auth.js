/* js/auth.js - TEK GİRİŞ (AUTO ID + TERMS + PROFILE SUGGEST) - FAIL-SAFE FIXED */
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
  // Apple şimdilik placeholder
  alert("Apple yakında evladım. Şimdilik Google ile devam et.");
}

/**
 * FAIL-SAFE STRATEJİ:
 * 1) Önce Google userinfo endpoint’ini dene
 * 2) Patlarsa (CORS / network / 3rd party), access token JWT ise içinden email çek
 * 3) Yine email yoksa: Uygulamayı kilitleme -> kullanıcıya uyarı + chat'e misafir devam
 */
async function fetchGoogleProfile(accessToken) {
  try {
    let googleData = null;

    // 1) Normal yöntem: Google userinfo endpoint
    try {
      const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      // bazı durumlarda 401/403 vb
      if (r.ok) {
        googleData = await r.json();
      } else {
        // response body okunamayabilir, geç
        googleData = null;
      }
    } catch (e) {
      // CORS/network hatası
      console.warn("Google userinfo fetch failed (will fallback):", e);
      googleData = null;
    }

    // 2) Fallback: token içinden email çıkar (JWT ise)
    // NOT: access_token her zaman JWT olmayabilir; olursa çalışır.
    const fallbackClaims = decodeJwtPayload(accessToken);

    const email =
      ((googleData?.email || "") || (fallbackClaims?.email || "")).trim().toLowerCase();

    // Email yoksa: uygulamayı öldürme, misafir devam
    if (!email) {
      console.warn("Google email alınamadı. Misafir moduna geçiliyor.");
      // Misafir session aç
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

    // Localdeki eski veriyi bozmadan merge
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

    // ✅ Sunucudan profile meta çek (terms / profile completeness)
    // Fail olursa bile app kilitlenmesin
    const serverMeta = await fetchServerProfile(uid, email);

    if (serverMeta) {
      Object.assign(updatedUser, serverMeta);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    }

    // ✅ Terms yoksa -> sözleşme overlay aç
    // (Server meta gelmese bile localde varsa kullan)
    const termsOk = !!(serverMeta?.terms_accepted_at || updatedUser.terms_accepted_at);

    if (!termsOk) {
      window.showTermsOverlay?.();
      return;
    }

    // ✅ İçeri al
    window.enterApp?.();

  } catch (err) {
    console.error("Auth Error:", err);

    // 🔥 EN KRİTİK: burada app'i kilitlemiyoruz
    // kullanıcı chat'e girebilsin
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

/**
 * JWT payload decode (signature doğrulamaz; sadece fallback amaçlı)
 * access_token JWT değilse null döner.
 */
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
  } catch (e) {
    return null;
  }
}
