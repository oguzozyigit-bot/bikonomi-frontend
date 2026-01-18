/* js/profile.js - FINAL */
import { STORAGE_KEY } from './config.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if(!data) { window.location.href = '../index.html'; return; }
    try { currentUser = JSON.parse(data); } catch { window.location.href = '../index.html'; }
    fillForm();
});

// ID Kopyalama
window.copyID = function() {
    if(currentUser && currentUser.id) {
        navigator.clipboard.writeText(currentUser.id);
        alert("ID Kopyalandı: " + currentUser.id);
    }
}

// UI Yardımcıları
window.toggleMarriedFields = function() {
    const val = document.getElementById('formStatus').value;
    const div = document.getElementById('marriedFields');
    if(div) val === 'Evli' ? div.classList.add('show') : div.classList.remove('show');
}
window.toggleChildFields = function() {
    const val = document.getElementById('formChildCount').value;
    const div = document.getElementById('childFields');
    if(div) val !== '0' ? div.classList.add('show') : div.classList.remove('show');
}

// ÇIKIŞ (Veriyi Silmeden)
window.logoutFromProfile = function() {
    if(confirm("İptal edip ana sayfaya dönmek ister misin?")) {
        // Profildeyken vazgeçerse oturumu kapatırız
        currentUser.isSessionActive = false;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
        window.location.replace('../index.html');
    }
}

// KAYDET
window.saveProfile = function() {
    const hitap = document.getElementById('formHitap').value.trim();
    const botName = document.getElementById('formBotName').value.trim();
    const dob = document.getElementById('formDob').value;
    const gender = document.getElementById('formGender').value;

    if(!hitap || !botName || !dob || !gender) {
        alert("Lütfen mecburi alanları doldur evladım.");
        return;
    }

    // Verileri işle
    currentUser.hitap = hitap;
    currentUser.botName = botName;
    currentUser.dob = dob;
    currentUser.gender = gender;
    currentUser.maritalStatus = document.getElementById('formStatus').value;
    currentUser.spouse = document.getElementById('formSpouse').value;
    currentUser.childCount = document.getElementById('formChildCount').value;
    currentUser.childNames = document.getElementById('formChildNames').value;
    currentUser.childAges = document.getElementById('formChildAges').value;
    currentUser.team = document.getElementById('formTeam').value;
    currentUser.city = document.getElementById('formCity').value;
    
    // Kilitler
    currentUser.isProfileCompleted = true;
    currentUser.isSessionActive = true; // Oturumu AÇIK tut

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));

    const btn = document.querySelector('.save-btn');
    if(btn) { btn.innerHTML = "✔ KAYDEDİLDİ"; btn.style.background = "#4CAF50"; }

    setTimeout(() => { window.location.replace('../index.html'); }, 800);
}

// Helper: Form Doldurma
function fillForm() {
    const avatarEl = document.getElementById('formAvatar');
    const nameEl = document.getElementById('formFullname');
    const idEl = document.getElementById('formID');

    if(avatarEl) avatarEl.src = currentUser.avatar || "https://via.placeholder.com/100";
    if(nameEl) nameEl.value = currentUser.fullname || "Misafir";
    if(idEl) idEl.innerText = currentUser.id || "---";

    setVal('formHitap', currentUser.hitap);
    setVal('formBotName', currentUser.botName);
    setVal('formDob', currentUser.dob);
    setVal('formGender', currentUser.gender);
    // ... Diğer alanlar varsa doldur ...
}
function setVal(id, v) { const el = document.getElementById(id); if(el && v) el.value = v; }
