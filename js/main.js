/* js/main.js (v34.0 - MODULAR FINAL) */

// İMPORTLAR (DOSYALARDAN ÇAĞIRIYORUZ)
import { GOOGLE_CLIENT_ID, MODE_CONFIG, MODULE_ORDER } from './config.js';
import { checkLoginStatus, parseJwt, verifyBackendToken } from './auth.js';
import { getDietCardHTML, getAstroCardHTML, getProductCardHTML } from './cards.js';
import { addBubble, typeWriter, fetchBotResponse } from './chat.js';

// DEĞİŞKENLER
let currentPersona = "normal";
let voiceEnabled = false;
let isBusy = false;
window.currentAppMode = 'chat'; // Global erişim için

// --- BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Caynana Modular System v34.0 Started");
    
    initDock();
    setAppMode('chat');
    checkLoginStatus();
    
    // Google Başlat
    if(typeof google !== 'undefined' && GOOGLE_CLIENT_ID) {
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
                auto_select: false
            });
        } catch(e) { console.error(e); }
    }

    // Event Listeners
    document.getElementById("sendBtn").addEventListener("click", sendMessage);
    document.getElementById("text").addEventListener("keydown", (e) => { if(e.key==="Enter") sendMessage(); });
});

// --- GLOBAL FONKSİYONLAR (HTML'den çağrılanlar) ---
window.openDrawer = () => document.getElementById('drawerMask').style.display='flex';
window.closeDrawer = () => document.getElementById('drawerMask').style.display='none';
window.clearCurrentChat = () => { 
    document.getElementById('chatContainer').innerHTML=''; 
    addBubble(MODE_CONFIG[window.currentAppMode].desc, 'bot'); 
};
window.handleGoogleLogin = () => google.accounts.id.prompt();
window.handleLogout = () => { localStorage.clear(); window.location.reload(); };
window.changePersona = (p) => { currentPersona = p; alert("Kaynana Huyu Değişti!"); window.closeDrawer(); };
window.toggleVoice = () => {
    voiceEnabled = !voiceEnabled;
    document.getElementById('voiceIcon').style.color = voiceEnabled ? "#4CAF50" : "#fff";
};

// --- MODÜL YÖNETİMİ ---
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

    // Buton Gizle/Göster
    document.getElementById('falInputArea').style.display = (cfg.specialInput === 'fal') ? 'flex' : 'none';
    document.getElementById('stdInputArea').style.display = (cfg.specialInput === 'fal') ? 'none' : 'flex';
    document.getElementById('dietActions').style.display = (cfg.specialInput === 'diet') ? 'flex' : 'none';
    document.getElementById('astroActions').style.display = (cfg.specialInput === 'astro') ? 'flex' : 'none';

    // İçerik Temizle & Yükle
    const container = document.getElementById('chatContainer');
    container.innerHTML = '';

    if (mode === 'diet') loadDietContent();
    else if (mode === 'astro') loadAstroContent();
    else addBubble(`Gel evladım, ${cfg.title} modundayız.`, 'bot');
}

// --- GOOGLE RESPONSE ---
async function handleGoogleResponse(response) {
    const user = parseJwt(response.credential);
    const userInfo = { name: user.name, picture: user.picture, hitap: user.given_name };
    localStorage.setItem("user_info", JSON.stringify(userInfo));
    
    await verifyBackendToken(response.credential);
    window.location.href = "pages/profil.html";
}

// --- ÖZEL MODÜL MANTIKLARI ---
function loadDietContent() {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    if (!user.profile || !user.profile.weight) {
        addBubble("Önce profilini doldur da boyunu kilonu bilelim.", 'bot');
        return;
    }
    // Basit mantık: Her gün aynı menü (İlerde burası cards.js'den gelecek)
    const bmi = (user.profile.weight / ((user.profile.height/100)**2)).toFixed(1);
    const html = getDietCardHTML(bmi);
    document.getElementById('chatContainer').innerHTML = html;
}

function loadAstroContent() {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    if (!user.profile || !user.profile.birthDate) {
        addBubble("Doğum tarihini bilmeden yıldıza bakamam.", 'bot');
        return;
    }
    // Burç hesaplama fonksiyonu eklenebilir buraya
    const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    const html = getAstroCardHTML("Bilinmeyen", today);
    document.getElementById('chatContainer').innerHTML = html;
}

// --- MESAJ GÖNDERME ---
async function sendMessage() {
    if(isBusy) return;
    const txt = document.getElementById("text").value.trim();
    if(!txt) return;
    if(!localStorage.getItem("auth_token")) { window.triggerAuth("Giriş yap önce."); return; }

    isBusy = true;
    document.getElementById("text").value = "";
    addBubble(txt, 'user');
    
    document.getElementById("caynanaSpeaking").style.display = "block";

    try {
        const data = await fetchBotResponse(txt, window.currentAppMode, currentPersona);
        const ans = data.assistant_text || "...";
        
        typeWriter(ans, () => {
            if(data.data) {
                data.data.forEach(p => {
                    document.getElementById('chatContainer').innerHTML += getProductCardHTML(p);
                });
            }
        });

    } catch(e) {
        addBubble("Bağlantı koptu evladım.", 'bot');
    } finally {
        isBusy = false;
        document.getElementById("caynanaSpeaking").style.display = "none";
    }
}

// Window'a özel fonksiyonları bağla (Astro/Diet butonları için)
window.generateDietList = () => loadDietContent();
window.showZodiacFeatures = () => alert("Burç özellikleri yakında...");
