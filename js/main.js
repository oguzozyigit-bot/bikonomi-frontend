/* js/main.js (v48.0 - CLICK TO SPEAK & SHORT COMMENT) */

// --- 1. AYARLAR ---
const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const GOOGLE_CLIENT_ID = "530064560706-03ga0q36t703ve7gmahr98.apps.googleusercontent.com"; 
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";

const MODE_CONFIG = {
    'chat': { title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", icon: "fa-comments", showCam: false, showMic: true },
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", icon: "fa-bag-shopping", showCam: true, showMic: true },
    // ... Diğer modlar aynı kalsın ...
    'trans': { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", icon: "fa-language", showCam: true, showMic: true }
};
const MODULE_ORDER = ['chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'];

// --- 2. DEĞİŞKENLER ---
let isBusy = false;
let currentPersona = "normal";
let currentAudio = null;
let lastBotResponseText = ""; // Son cevabı burada tutacağız
window.currentAppMode = 'chat';

// --- 3. BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    initDock(); setAppMode('chat'); updateUIForUser(); initSwipeDetection();
    if(typeof google !== 'undefined' && GOOGLE_CLIENT_ID) { try { google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse, auto_select: false }); } catch(e) {} }
    const sendBtn = document.getElementById("sendBtn");
    const textInput = document.getElementById("text");
    if(sendBtn) sendBtn.addEventListener("click", sendMessage);
    if(textInput) textInput.addEventListener("keydown", (e) => { if(e.key==="Enter") sendMessage(); });
});

// --- 4. SOHBET VE ZEKÂ ---
async function sendMessage() {
    if(isBusy) return;
    const txt = document.getElementById("text").value.trim();
    if(!txt) return;
    if(!localStorage.getItem("auth_token")) { triggerAuth("Giriş yap önce."); return; }

    isBusy = true;
    document.getElementById("text").value = "";
    addBubble(txt, 'user');
    
    // Düşünüyor badge'i
    const badge = document.getElementById("caynanaSpeaking");
    if(badge) { badge.style.display = "flex"; badge.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Düşünüyor...`; }

    try {
        const token = localStorage.getItem("auth_token");
        const user = JSON.parse(localStorage.getItem("user_info") || "{}");
        
        // Sadece YAZI İsteği (use_voice yok, hızlı ve ucuz)
        const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ 
                message: txt, 
                mode: window.currentAppMode, 
                persona: currentPersona,
                system_instruction: generateSystemContext(currentPersona, user.hitap || "Evladım")
            })
        });
        
        const data = await res.json();
        const ans = data.assistant_text || "...";
        lastBotResponseText = ans; // Metni hafızaya al (Ses için lazım olacak)

        typeWriter(ans, () => {
            if(badge) badge.style.display = "none";
            
            // Cevabın altına "Dinle" butonu ekle (Onclick global fonksiyona gider)
            const rows = document.querySelectorAll('.msg-row.bot');
            const lastRow = rows[rows.length - 1];
            if(lastRow) {
                lastRow.querySelector('.msg-bubble').insertAdjacentHTML('beforeend', 
                    `<div class="speak-btn-inline" onclick="window.fetchAndPlayAudio()">
                        <i class="fa-solid fa-volume-high"></i> Dinle
                    </div>`
                );
            }
        });

    } catch(e) {
        addBubble("Bağlantı koptu.", 'bot');
        if(badge) badge.style.display = "none";
    } finally {
        isBusy = false;
    }
}

// --- 5. SES İŞLEMLERİ (TIKLA - ÖDE - DİNLE) ---
window.fetchAndPlayAudio = async () => {
    if(!lastBotResponseText) return;
    
    // UI Güncelle (Yükleniyor)
    const btn = document.querySelector('.speak-btn-inline:last-child'); // Son buton
    if(btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Hazırlanıyor...`;

    try {
        const res = await fetch(`${BASE_DOMAIN}/api/speech`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                text_to_comment: lastBotResponseText, // Son cevabı gönder
                persona: currentPersona 
            })
        });
        const data = await res.json();
        
        if(data.audio_data) {
            playAudioRaw(data.audio_data);
            if(btn) btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Tekrarla`;
        } else {
            alert("Ses oluşturulamadı.");
            if(btn) btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Hata`;
        }
    } catch(e) {
        console.error(e);
        if(btn) btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Hata`;
    }
};

function playAudioRaw(b64) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    const audio = new Audio("data:audio/mp3;base64," + b64);
    
    const badge = document.getElementById("caynanaSpeaking");
    if(badge) { badge.style.display = "flex"; badge.innerHTML = `<i class="fa-solid fa-volume-high fa-beat-fade"></i> Konuşuyor...`; }
    
    audio.play();
    audio.onended = () => { if(badge) badge.style.display = "none"; };
    currentAudio = audio;
}

// --- 6. DİĞER YARDIMCILAR (AYNI) ---
function generateSystemContext(p, n) { 
    return `Adın Caynana. Rolün: ${p}. Kullanıcı: ${n}. Kısa ve öz konuş.`; 
}
function addBubble(text, role) { 
    const c=document.getElementById("chatContainer"); 
    c.innerHTML+=`<div class="msg-row ${role}"><div class="msg-bubble ${role}">${text}</div></div>`; 
    c.scrollTop=c.scrollHeight; 
}
function typeWriter(text, cb) { 
    const c=document.getElementById("chatContainer"); 
    const id="b"+Date.now(); 
    c.innerHTML+=`<div class="msg-row bot"><div class="msg-bubble bot" id="${id}"></div></div>`; 
    const el=document.getElementById(id); let i=0; 
    function step(){ if(i>=text.length){if(cb)cb();return;} el.innerHTML+=text.charAt(i); i++; c.scrollTop=c.scrollHeight; setTimeout(step,15); } step(); 
}

// --- GLOBAL WINDOW BINDINGS ---
window.openDrawer = () => document.getElementById('drawerMask').style.display='flex';
window.closeDrawer = () => document.getElementById('drawerMask').style.display='none';
window.openPersonaModal = () => document.getElementById('personaModal').style.display='flex';
window.changePersona = (p) => { currentPersona = p; document.getElementById('personaModal').style.display='none'; addBubble(`Mod: ${p.toUpperCase()}`, 'bot'); };
window.clearCurrentChat = () => { document.getElementById('chatContainer').innerHTML=''; };
window.handleGoogleLogin = () => google.accounts.id.prompt();
window.handleLogout = () => { localStorage.clear(); window.location.reload(); };
window.toggleVoice = () => { alert("Artık her cevapta 'Dinle' butonu çıkacak."); };

// Diğer modüller
function initDock() { /* v45 ile aynı */ const d=document.getElementById('dock'); d.innerHTML=''; MODULE_ORDER.forEach(k=>{d.innerHTML+=`<div class="dock-item" onclick="setAppMode('${k}')"><div class="dock-icon"><i class="fa-solid ${MODE_CONFIG[k].icon}"></i></div></div>`}); }
function setAppMode(m) { window.currentAppMode=m; const c=MODE_CONFIG[m]; document.getElementById('heroTitle').innerHTML=c.title; document.getElementById('heroDesc').innerHTML=c.desc; document.documentElement.style.setProperty('--primary',c.color); document.getElementById('chatContainer').innerHTML=''; }
function updateUIForUser() { const r=localStorage.getItem("user_info"); if(r){document.getElementById('userInfoBar').classList.add('visible'); const u=JSON.parse(r); document.getElementById('headerHitap').innerText=u.hitap.toUpperCase();} }
function initSwipeDetection() {} // Basit kalsın
async function handleGoogleResponse(r) { const p=JSON.parse(atob(r.credential.split('.')[1])); localStorage.setItem("user_info",JSON.stringify({hitap:p.given_name, picture:p.picture})); localStorage.setItem("auth_token", "demo_token"); window.location.href="pages/profil.html"; }
