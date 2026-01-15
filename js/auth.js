/* js/auth.js
   Kullanıcı Giriş/Çıkış İşlemleri
*/
import { BASE_DOMAIN } from './main.js';

// Mevcut kullanıcı durumu
export let currentUser = null;

// Başlatıcı Fonksiyon (Main.js bunu arıyor!)
export async function initAuth() {
    console.log("🔒 Auth Modülü Başlatılıyor...");
    checkLoginStatus();

    // Giriş butonlarını dinle (Eğer sayfada varsa)
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            // Burada normalde modal açılır
            console.log("Giriş butonu tıklandı");
            // window.openLoginModal(); // UI Modals içinde tanımlıysa
        });
    }
}

// Kullanıcı giriş yapmış mı kontrol et
export function checkLoginStatus() {
    const token = localStorage.getItem("auth_token");
    if (token) {
        console.log("✅ Kullanıcı giriş yapmış görünüyor.");
        document.body.classList.add("logged-in");
        // İstersen burada /api/auth/me servisine sorup teyit edebilirsin
    } else {
        console.log("👤 Misafir kullanıcıs.");
        document.body.classList.remove("logged-in");
    }
}

// Giriş Yapma Fonksiyonu
export async function login(email, password) {
    try {
        const res = await fetch(`${BASE_DOMAIN}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem("auth_token", data.token);
            checkLoginStatus();
            return { success: true };
        } else {
            return { success: false, message: data.detail || "Giriş başarısız" };
        }
    } catch (err) {
        console.error("Login hatası:", err);
        return { success: false, message: "Sunucu hatası" };
    }
}

// Çıkış Yapma
export function logout() {
    localStorage.removeItem("auth_token");
    location.reload();
}
