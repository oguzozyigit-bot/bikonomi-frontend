/* js/auth.js - FINAL STABLE */
import { GOOGLE_CLIENT_ID, STORAGE_KEY } from "./config.js";

let tokenClient;
let currentMode = 'login'; 

export function initAuth() {
    if (window.google) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    fetchGoogleProfile(tokenResponse.access_token);
                }
            },
        });
    }
}

export function handleLogin(provider, mode) {
    currentMode = mode; 
    
    if (currentMode === 'signup') {
        const check = document.getElementById('agreementCheck');
        if (check && !check.checked) {
            alert("Üye olmak için sözleşmeyi kabul etmelisin evladım.");
            return;
        }
    }

    if (provider === 'google') {
        if(tokenClient) tokenClient.requestAccessToken();
        else alert("Google servisi yüklenemedi. Sayfayı yenile.");
    } else {
        window.location.href = 'pages/apple-yakinda.html';
    }
}

function fetchGoogleProfile(accessToken) {
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    .then(r => r.json())
    .then(googleData => {
        let storedUser = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        const newGoogleID = "CYN-" + googleData.sub.substr(0, 10);

        const updatedUser = {
            ...storedUser, 
            id: storedUser.id || newGoogleID, 
            fullname: googleData.name, 
            email: googleData.email,   
            avatar: googleData.picture,
            provider: 'google'
        };

        if (currentMode === 'login') {
            if (!updatedUser.isProfileCompleted) {
                alert("Seni tanıyamadım evladım. Önce 'ÜYE OL' butonuna basmalısın.");
                return; 
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
            window.location.href = 'index.html'; // Ana sayfaya git (Redirect loop önlemek için)

        } else {
            if (updatedUser.isProfileCompleted) {
                if(confirm("Zaten kayıtlısın. Giriş yapılsın mı?")) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
                    window.location.href = 'index.html';
                    return;
                }
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
            window.location.href = 'pages/profil.html';
        }
    })
    .catch(err => {
        console.error("Google Hatası:", err);
        alert("Bağlantı hatası oluştu.");
    });
}

// Global Çıkış Fonksiyonu
export function logout() {
    if (confirm("Çıkış yapmak istiyor musun?")) {
        localStorage.removeItem(STORAGE_KEY); 
        localStorage.clear(); // Temizlik
        window.location.href = '/index.html'; 
    }
}
