/* js/profile.js - FINAL+ (ID STABILITY PATCH + NO LOSS + SAFE CLIPBOARD) */
import { STORAGE_KEY } from "./config.js";

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    window.location.href = "../index.html";
    return;
  }

  try {
    currentUser = JSON.parse(data);
  } catch {
    window.location.href = "../index.html";
    return;
  }

  // ✅ Kimlik emniyeti (email/id karışıklığı ve boş id durumları)
  ensureIdentity();

  fillForm();
});

// ✅ Kimlik emniyeti (id/email/user_id sabitle)
function ensureIdentity() {
  if (!currentUser || typeof currentUser !== "object") currentUser = {};

  const norm = (v) => String(v || "").trim();

  currentUser.id = norm(currentUser.id);
  currentUser.email = norm(currentUser.email);
  currentUser.user_id = norm(currentUser.user_id);

  // email varsa id yoksa id=email yap
  if (!currentUser.id && currentUser.email) currentUser.id = currentUser.email;

  // id email gibi ise email'i doldur
  if (!currentUser.email && currentUser.id && currentUser.id.includes("@")) {
    currentUser.email = currentUser.id;
  }

  // user_id boşsa en sağlam kimliği kopyala
  if (!currentUser.user_id) currentUser.user_id = currentUser.email || currentUser.id;

  // hala yoksa - bu kullanıcı profil ekranına düşmemeli
  const hasAnyIdentity = !!(currentUser.id || currentUser.email || currentUser.user_id);
  if (!hasAnyIdentity) {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    window.location.href = "../index.html";
    return;
  }

  // id hala yoksa user_id'den tamamla (extra emniyet)
  if (!currentUser.id) currentUser.id = currentUser.user_id;

  // localStorage'ı da güncelle (sadece normalize)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
  } catch {}
}

// ID Kopyalama
window.copyID = async function () {
  // ✅ copyID öncesi emniyet
  ensureIdentity();

  const id = (currentUser && currentUser.id) ? currentUser.id : "";
  if (!id) return;

  // Clipboard bazen patlar (http, bazı Android WebView vs.)
  try {
    await navigator.clipboard.writeText(id);
    alert("ID Kopyalandı: " + id);
    return;
  } catch {}

  // Fallback
  try {
    const ta = document.createElement("textarea");
    ta.value = id;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    alert("ID Kopyalandı: " + id);
  } catch {
    alert("ID kopyalanamadı. ID: " + id);
  }
};

// UI Yardımcıları
window.toggleMarriedFields = function () {
  const val = document.getElementById("formStatus")?.value;
  const div = document.getElementById("marriedFields");
  if (!div) return;
  val === "Evli" ? div.classList.add("show") : div.classList.remove("show");
};

window.toggleChildFields = function () {
  const val = document.getElementById("formChildCount")?.value;
  const div = document.getElementById("childFields");
  if (!div) return;
  val !== "0" ? div.classList.add("show") : div.classList.remove("show");
};

// ÇIKIŞ (Veriyi Silmeden)
window.logoutFromProfile = function () {
  if (confirm("İptal edip ana sayfaya dönmek ister misin?")) {
    // Profildeyken vazgeçerse oturumu kapatırız
    ensureIdentity();
    currentUser.isSessionActive = false;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    } catch {}

    window.location.replace("../index.html");
  }
};

// KAYDET
window.saveProfile = function () {
  // ✅ Kaydetmeden önce kimlik normalize (id/email/user_id garanti)
  ensureIdentity();

  const hitap = document.getElementById("formHitap")?.value?.trim() || "";
  const botName = document.getElementById("formBotName")?.value?.trim() || "";
  const dob = document.getElementById("formDob")?.value || "";
  const gender = document.getElementById("formGender")?.value || "";

  if (!hitap || !botName || !dob || !gender) {
    alert("Lütfen mecburi alanları doldur evladım.");
    return;
  }

  // ✅ Hala kimlik yoksa kaydetme
  currentUser.id = String(currentUser.id || "").trim();
  currentUser.email = String(currentUser.email || "").trim();
  currentUser.user_id = String(currentUser.user_id || "").trim();

  if (!currentUser.user_id) currentUser.user_id = currentUser.email || currentUser.id;
  if (!currentUser.id) currentUser.id = currentUser.user_id;

  if (!currentUser.id) {
    alert("User ID bulunamadı. Lütfen çıkış yapıp tekrar giriş yap.");
    return;
  }

  // Verileri işle
  currentUser.hitap = hitap;
  currentUser.botName = botName;
  currentUser.dob = dob;
  currentUser.gender = gender;

  currentUser.maritalStatus = document.getElementById("formStatus")?.value || "";
  currentUser.spouse = document.getElementById("formSpouse")?.value || "";
  currentUser.childCount = document.getElementById("formChildCount")?.value || "0";
  currentUser.childNames = document.getElementById("formChildNames")?.value || "";
  currentUser.childAges = document.getElementById("formChildAges")?.value || "";
  currentUser.team = document.getElementById("formTeam")?.value || "";
  currentUser.city = document.getElementById("formCity")?.value || "";

  // Kilitler
  currentUser.isProfileCompleted = true;
  currentUser.isSessionActive = true; // Oturumu AÇIK tut

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
  } catch {
    alert("Kaydetme başarısız (storage). Tarayıcı depolaması dolu olabilir.");
    return;
  }

  const btn = document.querySelector(".save-btn");
  if (btn) {
    btn.innerHTML = "✔ KAYDEDİLDİ";
    btn.style.background = "#4CAF50";
  }

  setTimeout(() => {
    window.location.replace("../index.html");
  }, 800);
};

// Helper: Form Doldurma
function fillForm() {
  // ✅ Form doldurmadan önce de normalize
  ensureIdentity();

  const avatarEl = document.getElementById("formAvatar");
  const nameEl = document.getElementById("formFullname");
  const idEl = document.getElementById("formID");

  if (avatarEl) avatarEl.src = currentUser.avatar || "https://via.placeholder.com/100";
  if (nameEl) nameEl.value = currentUser.fullname || "Misafir";
  if (idEl) idEl.innerText = currentUser.id || currentUser.user_id || currentUser.email || "---";

  setVal("formHitap", currentUser.hitap);
  setVal("formBotName", currentUser.botName);
  setVal("formDob", currentUser.dob);
  setVal("formGender", currentUser.gender);
  // ... diğer alanlar ...
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el && v) el.value = v;
}
