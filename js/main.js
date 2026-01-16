/* js/main.js (v33.0 - ASTROLOGY UPDATE) */

const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";
const GOOGLE_CLIENT_ID = "530064560706-03ga0q36t703ve7gmahr98.apps.googleusercontent.com"; 

let isBusy = false;
let currentPersona = "normal";
let voiceEnabled = false;
const chatHistory = {};

const MODE_CONFIG = {
    'chat': { title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", icon: "fa-comments", showCam: false, showMic: true },
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", icon: "fa-bag-shopping", showCam: true, showMic: true },
    'dedikodu': { title: "Dedikodu Odası<br>Bize Özel.", desc: "Duvarların kulağı var.", color: "#90A4AE", icon: "fa-user-secret", showCam: false, showMic: true },
    'fal': { title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#CE93D8", icon: "fa-mug-hot", showCam: true, showMic: false, specialInput: 'fal' },
    'astro': { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Yıldızlar senin için parlıyor.", color: "#7986CB", icon: "fa-star", showCam: false, showMic: true, specialInput: 'astro' },
    'ruya': { title: "Rüyalar Alemi<br>Hayırdır.", desc: "Kabus mu gördün?", color: "#81D4FA", icon: "fa-cloud-moon", showCam: false, showMic: false },
    'health': { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor?", color: "#E57373", icon: "fa-heart-pulse", showCam: true, showMic: true },
    'diet': { title: "Boğazını Tut<br>Rahat Et.", desc: "Diyet Listeni Hazırladım.", color: "#AED581", icon: "fa-carrot", showCam: false, showMic: true, specialInput: 'diet' },
    'trans': { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", icon: "fa-language", showCam: true, showMic: true }
};
const MODULE_ORDER = ['chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'];

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Caynana v33.0 Astro Ready");
    initDock(); setAppMode('chat'); checkLoginStatus(); initSwipeDetection();
    if(typeof google!=='undefined'&&GOOGLE_CLIENT_ID) try{google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:handleGoogleResponse,auto_select:false})}catch(e){}
    document.getElementById("sendBtn").addEventListener("click", sendMessage);
    document.getElementById("text").addEventListener("keydown", (e) => { if(e.key==="Enter") sendMessage(); });
});

// GLOBAL UI HELPERS
window.openDrawer = () => { document.getElementById('drawerMask').style.display='flex'; };
window.closeDrawer = () => { document.getElementById('drawerMask').style.display='none'; };
window.triggerAuth = (msg) => { addBotMessage(msg); document.getElementById("authModal").style.display="flex"; };
window.handleGoogleLogin = () => { google.accounts.id.prompt(); };
window.clearCurrentChat = () => { document.getElementById('chatContainer').innerHTML=''; addBotMessage(MODE_CONFIG[window.currentAppMode].desc); };
window.changePersona = (p) => { currentPersona = p; alert(`Kaynana Modu: ${p.toUpperCase()}`); window.closeDrawer(); };
window.toggleVoice = () => { voiceEnabled = !voiceEnabled; document.getElementById('voiceIcon').style.color = voiceEnabled ? "#4CAF50" : "#fff"; };
window.triggerCommentary = () => {
    if(!localStorage.getItem("auth_token")) { window.triggerAuth("Giriş yap önce."); return; }
    const badge = document.getElementById("caynanaSpeaking");
    badge.style.display = "block"; badge.innerHTML = `<i class="fa-solid fa-lips fa-beat"></i> Yorumluyor...`;
    setTimeout(() => { addBotMessage("Ay ben ne diyeyim şimdi... (Ses çalınıyor)"); badge.style.display = "none"; }, 2000);
};

// UI & NAV
function initDock() {
    const dock = document.getElementById('dock'); dock.innerHTML = ''; 
    MODULE_ORDER.forEach(key => {
        const item = document.createElement('div'); item.className = 'dock-item'; item.dataset.mode = key;
        item.onclick = () => setAppMode(key); item.innerHTML = `<div class="dock-icon"><i class="fa-solid ${MODE_CONFIG[key].icon}"></i></div>`;
        dock.appendChild(item);
    });
}

function setAppMode(mode) {
    const cc = document.getElementById('chatContainer');
    if(cc) chatHistory[window.currentAppMode || 'chat'] = cc.innerHTML;
    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode];
    
    document.getElementById('heroTitle').innerHTML = cfg.title;
    document.getElementById('heroDesc').innerHTML = cfg.desc;
    document.documentElement.style.setProperty('--primary', cfg.color);
    document.getElementById('currentModeIcon').innerHTML = `<i class="fa-solid ${cfg.icon}"></i>`;
    document.getElementById('currentModeIcon').style.background = cfg.color;
    
    const heroImg = document.getElementById('heroImage');
    heroImg.style.opacity = '0';
    setTimeout(() => { heroImg.src = `./images/hero-${mode}.png`; heroImg.onload = () => heroImg.style.opacity = '1'; heroImg.onerror = () => { heroImg.src = './images/hero-chat.png'; heroImg.style.opacity='1'; }; }, 200);

    document.querySelectorAll('.dock-item').forEach(el => { el.classList.remove('active'); if(el.dataset.mode === mode) el.classList.add('active'); });
    updateFooterBars(mode);

    // BUTON GİZLEME/GÖSTERME
    document.getElementById('falInputArea').style.display = (cfg.specialInput === 'fal') ? 'flex' : 'none';
    document.getElementById('stdInputArea').style.display = (cfg.specialInput === 'fal') ? 'none' : 'flex';
    document.getElementById('dietActions').style.display = (cfg.specialInput === 'diet') ? 'flex' : 'none';
    document.getElementById('astroActions').style.display = (cfg.specialInput === 'astro') ? 'flex' : 'none'; // 🔥 ASTRO BUTON
    
    document.getElementById('camBtn').style.display = cfg.showCam ? 'flex' : 'none';
    document.getElementById('micBtn').style.display = cfg.showMic ? 'flex' : 'none';

    cc.innerHTML = '';
    if (mode === 'diet') loadDietContent();
    else if (mode === 'astro') loadAstroContent(); // 🔥 ASTRO YÜKLE
    else if (chatHistory[mode]) { cc.innerHTML = chatHistory[mode]; setTimeout(() => cc.scrollTop=cc.scrollHeight, 10); }
    else {
        const user = JSON.parse(localStorage.getItem("user_info") || "{}");
        addBotMessage(`Gel ${user.hitap || 'evladım'}, ne var ne yok?`);
    }
}

// --- ASTROLOJİ MODÜLÜ ---
function getZodiacSign(dateString) {
    if(!dateString) return null;
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    
    if((month==1 && day<=19)||(month==12 && day>=22)) return "Oğlak";
    if((month==1 && day>=20)||(month==2 && day<=18)) return "Kova";
    if((month==2 && day>=19)||(month==3 && day<=20)) return "Balık";
    if((month==3 && day>=21)||(month==4 && day<=19)) return "Koç";
    if((month==4 && day>=20)||(month==5 && day<=20)) return "Boğa";
    if((month==5 && day>=21)||(month==6 && day<=20)) return "İkizler";
    if((month==6 && day>=21)||(month==7 && day<=22)) return "Yengeç";
    if((month==7 && day>=23)||(month==8 && day<=22)) return "Aslan";
    if((month==8 && day>=23)||(month==9 && day<=22)) return "Başak";
    if((month==9 && day>=23)||(month==10 && day<=22)) return "Terazi";
    if((month==10 && day>=23)||(month==11 && day<=21)) return "Akrep";
    if((month==11 && day>=22)||(month==12 && day<=21)) return "Yay";
    return null;
}

function loadAstroContent() {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const p = user.profile;
    
    if (!p || !p.birthDate) {
        addBotMessage(`Evladım doğum tarihini bilmeden yıldızına nasıl bakayım? Git profilini doldur.`);
        return;
    }

    const sign = getZodiacSign(p.birthDate);
    const today = new Date().toDateString();
    
    // Günde 1 kez yorum
    if (localStorage.getItem("daily_astro") && localStorage.getItem("astro_date") === today) {
        addBotMessage(`Burcun: <b>${sign}</b>. Yıldızların bugünkü mesajı:`);
        document.getElementById('chatContainer').innerHTML += localStorage.getItem("daily_astro");
    } else {
        // Yeni Fal Üret (Simülasyon)
        const horoscope = `
        <div class="astro-card">
            <div class="astro-sign">⭐ ${sign} Burcu</div>
            Bugün şansın açık ama harcamalarına dikkat et. Bir telefon alabilirsin, hazırlıklı ol.
            <br><br><i>Şanslı Rengin: Mor</i>
        </div>`;
        
        localStorage.setItem("daily_astro", horoscope);
        localStorage.setItem("astro_date", today);
        
        addBotMessage(`Senin burcun <b>${sign}</b> evladım. Bakalım gökyüzü ne diyor:`);
        document.getElementById('chatContainer').innerHTML += horoscope;
    }
}

window.showZodiacFeatures = () => {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const p = user.profile;
    if (!p || !p.birthDate) { alert("Doğum tarihi yok!"); return; }
    const sign = getZodiacSign(p.birthDate);
    
    // Backend'e gidip uzun özellik çekecek, şimdilik statik
    const features = `
    <div class="astro-card">
        <div class="astro-sign">📜 ${sign} Genel Özellikleri</div>
        Senin gibisi az bulunur. İnatçısın ama kalbin temiz. İşine geleni duyarsın, gelmeyeni duymazsın.
    </div>`;
    document.getElementById('chatContainer').innerHTML += `<div class="msg-row bot">${features}</div>`;
    document.getElementById('chatContainer').scrollTop = document.getElementById('chatContainer').scrollHeight;
};

// --- DİYET MODÜLÜ ---
window.generateDietList = (force) => { generateDietList(force); };
window.showBmiStatus = () => { const p = JSON.parse(localStorage.getItem("user_info")||"{}").profile; if(p) alert(`Boy: ${p.height}, Kilo: ${p.weight}`); };
function loadDietContent() {
    const user = JSON.parse(localStorage.getItem("user_info")||"{}");
    if(!user.profile || !user.profile.weight) { addBotMessage("Profilini doldur gel."); return; }
    const today = new Date().toDateString();
    if(localStorage.getItem("daily_diet") && localStorage.getItem("diet_date") === today) {
        addBotMessage(`Bugünkü listen burada.`);
        document.getElementById('chatContainer').innerHTML += localStorage.getItem("daily_diet");
    } else { generateDietList(false); }
}
function generateDietList(force) {
    const p = JSON.parse(localStorage.getItem("user_info")||"{}").profile;
    const bmi = (p.weight/((p.height/100)**2)).toFixed(1);
    const menu = `<div class="info-card"><div class="info-header">🥗 Menü</div>Sabah: Yumurta<br>Öğle: Çorba<br>Akşam: Salata<br><i>Endeks: ${bmi}</i></div>`;
    localStorage.setItem("daily_diet", menu); localStorage.setItem("diet_date", new Date().toDateString());
    const c = document.getElementById('chatContainer'); if(force) c.innerHTML='';
    addBotMessage(`Endeks: ${bmi}. İşte liste:`); c.innerHTML+=menu; c.scrollTop=c.scrollHeight;
}

// --- MESAJLAŞMA ---
async function sendMessage() {
    if(isBusy) return;
    const txt = document.getElementById("text").value.trim();
    if(!txt) return;
    if(!localStorage.getItem("auth_token")) { window.triggerAuth("Giriş yap."); return; }
    isBusy=true; document.getElementById("text").value=""; addBubble(txt,'user');
    
    document.getElementById("caynanaSpeaking").style.display="block";
    addLoading("...");
    
    try {
        const u = JSON.parse(localStorage.getItem("user_info")||"{}");
        const res = await fetch(`${BASE_DOMAIN}/api/chat`, { method:"POST", headers:{"Content-Type":"application/json", "Authorization":`Bearer ${localStorage.getItem("auth_token")}`}, body:JSON.stringify({message:txt, mode:window.currentAppMode, persona:currentPersona, user_name:u.hitap}) });
        removeLoading();
        const data = await res.json();
        const ans = data.assistant_text || "...";
        
        if(window.currentAppMode === 'shopping') {
            document.getElementById('chatContainer').innerHTML += `<div class="msg-row bot"><div class="info-card">${ans}</div></div>`;
        } else { typeWriterBubble(ans); }
        
        if(data.data) setTimeout(()=>renderProducts(data.data),500);
    } catch(e) { removeLoading(); addBotMessage("Hata."); }
    finally { isBusy=false; document.getElementById("caynanaSpeaking").style.display="none"; }
}

// --- YARDIMCILAR ---
function addBubble(t, r) { const c=document.getElementById("chatContainer"); c.innerHTML+=`<div class="msg-row ${r}"><div class="msg-bubble ${r}">${t}</div></div>`; c.scrollTop=c.scrollHeight; }
function addBotMessage(t) { const c=document.getElementById("chatContainer"); c.innerHTML+=`<div class="msg-row bot"><div class="msg-bubble bot">${t}</div></div>`; c.scrollTop=c.scrollHeight; }
function typeWriterBubble(t, cb) { const c=document.getElementById("chatContainer"); const id="b"+Date.now(); c.innerHTML+=`<div class="msg-row bot"><div class="msg-bubble bot" id="${id}"></div></div>`; const el=document.getElementById(id); let i=0; function s(){ if(i>=t.length){if(cb)cb();return;} el.innerHTML+=t.charAt(i); i++; c.scrollTop=c.scrollHeight; setTimeout(s,10); } s(); }
function addLoading(t) { const c=document.getElementById("chatContainer"); removeLoading(); c.innerHTML+=`<div class="msg-row bot loading-bubble-wrap"><div class="msg-bubble bot">${t} <i class="fa-solid fa-spinner fa-spin"></i></div></div>`; c.scrollTop=c.scrollHeight; }
function removeLoading() { document.querySelectorAll('.loading-bubble-wrap').forEach(e=>e.remove()); }
function updateFooterBars(mode) { const idx=MODULE_ORDER.indexOf(mode); for(let i=0;i<4;i++) document.getElementById(`line${i+1}`).style.background=MODE_CONFIG[MODULE_ORDER[(idx+i)%9]].color; }
function initSwipeDetection() { let ts=0; const m=document.getElementById('main'); m.addEventListener('touchstart',e=>{ts=e.changedTouches[0].screenX}); m.addEventListener('touchend',e=>{const te=e.changedTouches[0].screenX; if(te<ts-50)changeModule(1); if(te>ts+50)changeModule(-1)}); }
function changeModule(d) { let i=MODULE_ORDER.indexOf(window.currentAppMode)+d; if(i>=9)i=0; if(i<0)i=8; setAppMode(MODULE_ORDER[i]); }
function parseJwt(t) { try{return JSON.parse(decodeURIComponent(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')))}catch(e){return{}} }
async function handleGoogleResponse(r) { const u=parseJwt(r.credential); localStorage.setItem("user_info",JSON.stringify({name:u.name,picture:u.picture,hitap:u.given_name})); try{const res=await fetch(`${BASE_DOMAIN}/api/auth/google`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:r.credential})});const d=await res.json();if(d.token)localStorage.setItem("auth_token",d.token);}catch(e){} window.location.href="pages/profil.html"; }
function checkLoginStatus() {
    const raw=localStorage.getItem("user_info"); const m=document.querySelector('.menu-list'); const b=document.getElementById('userInfoBar');
    if(raw) {
        const u=JSON.parse(raw); b.classList.add('visible'); document.getElementById('headerAvatar').src=u.picture||PLACEHOLDER_IMG; document.getElementById('headerHitap').innerText=(u.hitap||"DAMAT").toUpperCase(); document.getElementById('headerName').innerText=u.name||"";
        m.innerHTML=`<a href="pages/profil.html" class="menu-item highlight" style="border:1px solid var(--primary);"><i class="fa-solid fa-user-pen"></i> Profil</a><a href="pages/hakkimizda.html" class="menu-item link-item">Hakkımızda</a><a href="pages/gizlilik.html" class="menu-item link-item">Gizlilik</a><div style="margin-top:10px;border-top:1px solid #333;"></div><div class="menu-item link-item" onclick="window.handleLogout()">Çıkış</div><div class="menu-item link-item" style="color:red" onclick="window.handleDeleteAccount()">Sil</div>`;
    } else { b.classList.remove('visible'); m.innerHTML=`<div class="menu-item highlight" onclick="window.triggerAuth('')">Giriş Yap</div>`; }
}
function renderProducts(p) { const c=document.getElementById("chatContainer"); p.slice(0,5).forEach((x,i)=>{ setTimeout(()=>{ c.innerHTML+=`<div class="msg-row bot"><div class="product-card"><img src="${x.image||PLACEHOLDER_IMG}" class="pc-img"><div class="pc-content"><div class="pc-title">${x.title}</div><div class="pc-price">${x.price}</div><a href="${x.url}" target="_blank" class="pc-btn-mini">Git</a></div></div></div>`; c.scrollTop=c.scrollHeight; },i*200); }); }
window.handleLogout=()=>{localStorage.clear();window.location.reload()}; window.handleDeleteAccount=()=>{if(confirm("Silinsin mi?")){localStorage.clear();window.location.reload()}};
