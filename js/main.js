/* js/main.js (v44.0 - AUDIO PLAYER INTEGRATED) */

import { GOOGLE_CLIENT_ID, MODE_CONFIG, MODULE_ORDER } from './config.js';
import { checkLoginStatus, parseJwt, verifyBackendToken } from './auth.js';
import { getDietCardHTML, getAstroCardHTML, getProductCardHTML } from './cards.js';
import { addBubble, typeWriter, fetchBotResponse } from './chat.js';

let currentPersona = "normal";
let voiceEnabled = true; // Varsayılan açık olsun
let isBusy = false;
let currentAudio = null; // Çalan sesi tutmak için
window.currentAppMode = 'chat';

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Caynana v44.0 Voice Ready");
    initDock(); setAppMode('chat'); updateUIForUser(); initSwipeDetection();
    if(typeof google !== 'undefined' && GOOGLE_CLIENT_ID) {
        try { google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse, auto_select: false }); } catch(e) {}
    }
    document.getElementById("sendBtn").addEventListener("click", sendMessage);
    document.getElementById("text").addEventListener("keydown", (e) => { if(e.key==="Enter") sendMessage(); });
});

// 🔥 SES OYNATMA FONKSİYONU 🔥
function playAudioResponse(base64Audio) {
    if (!base64Audio || !voiceEnabled) return;

    // Varsa eski sesi durdur
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }

    try {
        const audioSrc = "data:audio/mp3;base64," + base64Audio;
        currentAudio = new Audio(audioSrc);
        
        // UI Animasyonu Başlat
        const badge = document.getElementById("caynanaSpeaking");
        badge.style.display = "flex";
        badge.innerHTML = `<i class="fa-solid fa-volume-high fa-beat-fade"></i> Kaynana Konuşuyor...`;

        currentAudio.play();

        // Bitince Animasyonu Durdur
        currentAudio.onended = () => {
            badge.style.display = "none";
        };
    } catch (e) {
        console.error("Ses oynatma hatası:", e);
    }
}

// MESAJ GÖNDERME (GÜNCELLENDİ)
async function sendMessage() {
    if(isBusy) return;
    const txt = document.getElementById("text").value.trim();
    if(!txt) return;
    if(!localStorage.getItem("auth_token")) { triggerAuth("Giriş yap önce."); return; }

    isBusy = true; document.getElementById("text").value = ""; addBubble(txt, 'user');
    
    // Düşünüyor animasyonu
    const badge = document.getElementById("caynanaSpeaking");
    badge.style.display = "flex";
    badge.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Düşünüyor...`;

    try {
        // Chat.js'den cevabı al
        const data = await fetchBotResponse(txt, window.currentAppMode, currentPersona);
        const ans = data.assistant_text || "...";
        
        // Yazıyı Yazdır
        typeWriter(ans, () => {
            // Yazı bitince SESİ ÇAL (Varsa)
            if (data.audio_data) {
                playAudioResponse(data.audio_data);
            } else {
                badge.style.display = "none";
            }
            
            // Konuştur Butonu Ekle (Tekrar dinlemek için)
            const rows = document.querySelectorAll('.msg-row.bot');
            const lastRow = rows[rows.length - 1];
            if(lastRow && data.audio_data) {
                // Sesi butona sakla (tekrar çalabilmek için)
                lastRow.querySelector('.msg-bubble').insertAdjacentHTML('beforeend', 
                    `<div class="speak-btn-inline" onclick="window.replayLastAudio('${data.audio_data}')"><i class="fa-solid fa-volume-high"></i> Tekrar Oku</div>`
                );
            }

            if(data.data) renderProducts(data.data);
        });

    } catch(e) { 
        addBubble("Bağlantı koptu veya Kaynana uyudu.", 'bot'); 
        badge.style.display = "none";
    }
    finally { isBusy = false; }
}

// Window'a replay fonksiyonunu ekle
window.replayLastAudio = (b64) => playAudioResponse(b64);

// ... DİĞER STANDART FONKSİYONLAR (AYNI KALSIN) ...
// openDrawer, closeDrawer, handleGoogleLogin vb. buraya gelecek (v40'taki gibi)
// Sadece `sendMessage` ve `playAudioResponse` değişti.

// KISALTILMIŞ HALİ (Kopyalarken v40'taki diğer fonksiyonları silme)
window.openDrawer = () => document.getElementById('drawerMask').style.display='flex';
window.closeDrawer = () => document.getElementById('drawerMask').style.display='none';
window.openPersonaModal = () => document.getElementById('personaModal').style.display='flex';
window.triggerAuth = (msg) => { addBubble(msg, 'bot'); document.getElementById("authModal").style.display="flex"; };
window.handleGoogleLogin = () => google.accounts.id.prompt();
window.handleLogout = () => { localStorage.clear(); window.location.reload(); };
window.handleDeleteAccount = () => { if(confirm("Silinecek?")) { localStorage.clear(); window.location.reload(); } };
window.changePersona = (p) => { currentPersona = p; document.getElementById('personaModal').style.display='none'; addBubble(`Mod değişti: ${p.toUpperCase()}`, 'bot'); };
window.clearCurrentChat = () => { document.getElementById('chatContainer').innerHTML=''; addBubble(MODE_CONFIG[window.currentAppMode].desc, 'bot'); };
window.toggleVoice = () => {
    voiceEnabled = !voiceEnabled;
    const icon = document.getElementById('voiceIcon');
    icon.className = voiceEnabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
    icon.style.color = voiceEnabled ? "#4CAF50" : "#fff";
};
window.generateDietList = () => { /* ... v40 aynısı ... */ };
window.showZodiacFeatures = () => { /* ... v40 aynısı ... */ };
window.showBmiStatus = () => { /* ... v40 aynısı ... */ };

function updateUIForUser() { /* ... v40 aynısı ... */ }
function initDock() { /* ... v40 aynısı ... */ }
function setAppMode(mode) { /* ... v40 aynısı ... */ }
function loadDietContent() { /* ... v40 aynısı ... */ }
function loadAstroContent() { /* ... v40 aynısı ... */ }
function parseJwt(t) { try{return JSON.parse(decodeURIComponent(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')))}catch(e){return{}} }
async function handleGoogleResponse(r) { /* ... v40 aynısı ... */ }
function renderProducts(p) { /* ... v40 aynısı ... */ }
function initSwipeDetection() { /* ... v40 aynısı ... */ }
function changeModule(d) { /* ... v40 aynısı ... */ }
