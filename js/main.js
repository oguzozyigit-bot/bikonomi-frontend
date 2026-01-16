/* js/main.js (v34.0 - MODULAR MAIN ENTRY POINT) */

// 1. İMPORTLAR (DİĞER DOSYALARDAN FONKSİYONLARI ÇEKİYORUZ)
import { GOOGLE_CLIENT_ID, MODE_CONFIG, MODULE_ORDER } from './config.js';
import { checkLoginStatus, parseJwt, verifyBackendToken } from './auth.js';
import { getDietCardHTML, getAstroCardHTML, getProductCardHTML } from './cards.js';
import { addBubble, typeWriter, fetchBotResponse } from './chat.js';

// 2. DEĞİŞKENLER
let currentPersona = "normal";
let voiceEnabled = false;
let isBusy = false;
window.currentAppMode = 'chat'; // Global erişim için window'a atadık

// 3. BAŞLATMA (INIT)
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Caynana Modular System v34.0 Started");
    
    initDock();
    setAppMode('chat');
    checkLoginStatus();
    initSwipeDetection();
    
    // Google Kütüphanesi Başlatma
    if(typeof google !== 'undefined' && GOOGLE_CLIENT_ID) {
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
                auto_select: false
            });
        } catch(e) { console.error("Google Init Hatası:", e); }
    }

    // Event Listeners (Enter tuşu ve Gönder butonu)
    document.getElementById("sendBtn").addEventListener("click", sendMessage);
    document.getElementById("text").addEventListener("keydown", (e) => { if(e.key==="Enter") sendMessage(); });
});

// 4. 🔥 HTML İÇİN GLOBAL FONKSİYONLAR (WINDOW BINDING) 🔥
// Hamburger, butonlar vb. onclick="window.openDrawer()" diyebilsin diye.
window.openDrawer = () => document.getElementById('drawerMask').style.display='flex';
window.closeDrawer = () => document.getElementById('drawerMask').style.display='none';
window.triggerAuth = (msg) => { 
    addBubble(msg, 'bot'); 
    document.getElementById("authModal").style.display="flex"; 
};
window.handleGoogleLogin = () => google.accounts.id.prompt();
window.handleLogout = () => { localStorage.clear(); window.location.reload(); };
window.handleDeleteAccount = () => { if(confirm("Emin misin?")) { localStorage.clear(); window.location.reload(); } };
window.changePersona = (p) => { currentPersona = p; alert("Kaynana Huyu Değişti!"); window.closeDrawer(); };
window.clearCurrentChat = () => { 
    document.getElementById('chatContainer').innerHTML=''; 
    addBubble(MODE_CONFIG[window.currentAppMode].desc, 'bot'); 
};
window.toggleVoice = () => {
    voiceEnabled = !voiceEnabled;
    const icon = document.getElementById('voiceIcon');
    icon.className = voiceEnabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
    icon.style.color = voiceEnabled ? "#4CAF50" : "#fff";
};
window.triggerCommentary = () => {
    if(!localStorage.getItem("auth_token")) { window.triggerAuth("Giriş yap önce."); return; }
    const badge = document.getElementById("caynanaSpeaking");
    badge.style.display = "block"; 
    badge.innerHTML = `<i class="fa-solid fa-lips fa-beat"></i> Yorumluyor...`;
    setTimeout(() => { 
        addBubble("Ay şuna bak, ben ne diyeyim şimdi... (Sesli Yorum)", 'bot'); 
        badge.style.display = "none"; 
    }, 2000);
};

// 5. MODÜL VE ARAYÜZ YÖNETİMİ
function initDock() {
    const dock = document.getElementById('dock');
    dock.innerHTML = '';
    MODULE_ORDER.forEach(key => {
        const item = document.createElement('div');
        item.className = 'dock-item';
        item.onclick = () => setAppMode(key);
        item.innerHTML = `<div class="dock-icon"><i class="fa-solid ${MODE_CONFIG[key].icon}"></i></div>`;
        dock.appendChild(item);
    });
}

function setAppMode(mode) {
    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode];
    
    // UI Güncelle
    document.getElementById('heroTitle').innerHTML = cfg.title;
    document.getElementById('heroDesc').innerHTML = cfg.desc;
    document.documentElement.style.setProperty('--primary', cfg.color);
    document.getElementById('currentModeIcon').innerHTML = `<i class="fa-solid ${cfg.icon}"></i>`;
    document.getElementById('currentModeIcon').style.background = cfg.color;

    // Arka Plan Resmi
    const heroImg = document.getElementById('heroImage');
    heroImg.style.opacity = '0';
    setTimeout(() => { 
        heroImg.src = `./images/hero-${mode}.png`; 
        heroImg.onload = () => heroImg.style.opacity = '1';
        heroImg.onerror = () => { heroImg.src = './images/hero-chat.png'; heroImg.style.opacity='1'; };
    }, 200);

    // Buton Gizle/Göster
    document.getElementById('falInputArea').style.display = (cfg.specialInput === 'fal') ? 'flex' : 'none';
    document.getElementById('stdInputArea').style.display = (cfg.specialInput === 'fal') ? 'none' : 'flex';
    document.getElementById('dietActions').style.display = (cfg.specialInput === 'diet') ? 'flex' : 'none';
    document.getElementById('astroActions').style.display = (cfg.specialInput === 'astro') ? 'flex' : 'none';
    document.getElementById('camBtn').style.display = cfg.showCam ? 'flex' : 'none';
    document.getElementById('micBtn').style.display = cfg.showMic ? 'flex' : 'none';

    // Dock Aktiflik
    document.querySelectorAll('.dock-item').forEach(el => {
        el.classList.remove('active');
        if(el.innerHTML.includes(cfg.icon)) el.classList.add('active');
    });

    // Çizgi Renkleri
    const idx = MODULE_ORDER.indexOf(mode);
    for(let i=0; i<4; i++) {
        document.getElementById(`line${i+1}`).style.background = MODE_CONFIG[MODULE_ORDER[(idx+i)%9]].color;
    }

    // İçerik Temizle & Yükle
    const container = document.getElementById('chatContainer');
    container.innerHTML = '';

    if (mode === 'diet') loadDietContent();
    else if (mode === 'astro') loadAstroContent();
    else addBubble(`Gel evladım, ${cfg.title} modundayız.`, 'bot');
}

// 6. ÖZEL MODÜL MANTIKLARI
function loadDietContent() {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    if (!user.profile || !user.profile.weight) {
        addBubble("Önce profilini doldur da boyunu kilonu bilelim.", 'bot');
        return;
    }
    const bmi = (user.profile.weight / ((user.profile.height/100)**2)).toFixed(1);
    const html = getDietCardHTML(bmi); // cards.js'den gelir
    document.getElementById('chatContainer').innerHTML = html;
}

function loadAstroContent() {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    if (!user.profile || !user.profile.birthDate) {
        addBubble("Doğum tarihini bilmeden yıldıza bakamam.", 'bot');
        return;
    }
    // Burç hesaplama
    const date = new Date(user.profile.birthDate);
    const day = date.getDate(); const month = date.getMonth() + 1;
    let sign = "Bilinmeyen";
    // Basit burç kontrolü
    if((month==3 && day>=21)||(month==4 && day<=19)) sign="Koç";
    // ... (Diğer burçlar buraya eklenebilir veya config'den çekilebilir)
    
    const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    const html = getAstroCardHTML(sign || "Koç", today); // cards.js'den gelir
    document.getElementById('chatContainer').innerHTML = html;
}

// Window'a özel fonksiyonları bağla (Astro/Diet butonları için)
window.generateDietList = () => loadDietContent();
window.showZodiacFeatures = () => addBubble("Senin burcun inatçı ama kalbi temiz...", 'bot');
window.showBmiStatus = () => {
    const p = JSON.parse(localStorage.getItem("user_info")||"{}").profile;
    if(p) alert(`Boy: ${p.height}, Kilo: ${p.weight}`);
};

// 7. MESAJ GÖNDERME
async function sendMessage() {
    if(isBusy) return;
    const txt = document.getElementById("text").value.trim();
    if(!txt) return;
    if(!localStorage.getItem("auth_token")) { window.triggerAuth("Giriş yap önce."); return; }

    isBusy = true;
    document.getElementById("text").value = "";
    addBubble(txt, 'user');
    
    const badge = document.getElementById("caynanaSpeaking");
    badge.style.display = "block";
    badge.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Yazıyor...`;

    try {
        const data = await fetchBotResponse(txt, window.currentAppMode, currentPersona); // chat.js'den
        const ans = data.assistant_text || "...";
        
        if(voiceEnabled) badge.innerHTML = `<i class="fa-solid fa-volume-high fa-beat"></i> Konuşuyor...`;
        else badge.style.display = "none";

        typeWriter(ans, () => {
            if(data.data) {
                data.data.forEach(p => {
                    document.getElementById('chatContainer').innerHTML += getProductCardHTML(p); // cards.js'den
                });
            }
            if(voiceEnabled) setTimeout(() => badge.style.display="none", 4000);
        });

    } catch(e) {
        addBubble("Bağlantı koptu evladım.", 'bot');
        badge.style.display = "none";
    } finally {
        isBusy = false;
    }
}

// 8. GOOGLE RESPONSE HANDLER
async function handleGoogleResponse(response) {
    const user = parseJwt(response.credential);
    // İsimleri garantile
    const userData = {
        name: user.name, 
        picture: user.picture, 
        hitap: user.given_name 
    };
    
    // Önce LocalStorage'a yaz ki UI güncellensin
    localStorage.setItem("user_info", JSON.stringify(userData));
    
    // Backend'e token gönder
    await verifyBackendToken(response.credential);
    
    // Profil sayfasına yönlendir
    window.location.href = "pages/profil.html";
}

// 9. SWIPE (KAYDIRMA)
function initSwipeDetection() {
    let ts = 0;
    const m = document.getElementById('main');
    m.addEventListener('touchstart', e => { ts = e.changedTouches[0].screenX; });
    m.addEventListener('touchend', e => {
        const te = e.changedTouches[0].screenX;
        if (te < ts - 50) changeModule(1);
        if (te > ts + 50) changeModule(-1);
    });
}
function changeModule(dir) {
    let idx = MODULE_ORDER.indexOf(window.currentAppMode) + dir;
    if(idx >= MODULE_ORDER.length) idx = 0;
    if(idx < 0) idx = MODULE_ORDER.length - 1;
    setAppMode(MODULE_ORDER[idx]);
}
