import { BASE_DOMAIN } from './config.js';

let photoCount = 0;
let photos = [];
const loadingMessages = [
    "Vay vay vay...",
    "Neler görüyorum neler...",
    "Bir yol var ama ucu kapalı gibi...",
    "Bak sen şu işe, fincan kabarmış...",
    "Kısmetin taşmış evladım...",
    "Biraz bekle gözlüğümü sileyim..."
];

export function openFalPanel() {
    const overlay = document.getElementById('falOverlay');
    overlay.classList.add('active');
    resetFal();
}

export function closeFalPanel() {
    document.getElementById('falOverlay').classList.remove('active');
}

function resetFal() {
    photoCount = 0;
    photos = [];
    document.getElementById('falStep1').style.display = 'flex';
    document.getElementById('falStep2').style.display = 'none';
    document.getElementById('falResult').style.display = 'none';
    updateStatus("Fincanın içini çek bakayım evladım.");
}

function updateStatus(text) {
    const statusEl = document.getElementById('falStatus');
    if(statusEl) statusEl.innerText = text;
}

// Fotoğraf Çekme İşlemi
export async function handleFalPhoto(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    // Yükleniyor bilgisi ver
    updateStatus("Resim işleniyor, bekle...");

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64 = e.target.result.split(',')[1];
        
        // İlk resimde fincan kontrolü yap
        if (photoCount === 0) {
            updateStatus("Dur bakayım bu fincan mı...");
            try {
                const checkRes = await fetch(`${BASE_DOMAIN}/api/fal/check`, {
                    method: "POST", headers: {"Content-Type":"application/json"},
                    body: JSON.stringify({ image: base64 })
                });
                
                // HATA KONTROLÜ (GÜNCELLENDİ)
                if (!checkRes.ok) {
                    const errData = await checkRes.json().catch(() => ({}));
                    alert(errData.detail || errData.reason || "Sunucu hatası oluştu evladım. İnternetini kontrol et.");
                    updateStatus("Hata oldu, tekrar dene.");
                    fileInput.value = ""; // Inputu temizle
                    return;
                }

                const checkData = await checkRes.json();
                if (!checkData.ok) {
                    alert(checkData.reason || "Bu fincana benzemiyor."); 
                    updateStatus("Düzgün çek şunu!");
                    fileInput.value = "";
                    return;
                }
            } catch(e) { 
                console.error(e);
                alert("Bağlantı hatası evladım.");
                updateStatus("Bağlantı koptu.");
                return;
            }
        }

        photos.push(base64);
        photoCount++;

        if (photoCount < 3) {
            updateStatus(`Tamamdır. Şimdi ${photoCount + 1}. açıyı çek. (Tabak veya yan taraf)`);
        } else {
            startFalAnalysis();
        }
        
        // Inputu temizle ki aynı dosyayı tekrar seçebilsin
        fileInput.value = ""; 
    };
    reader.readAsDataURL(file);
}

async function startFalAnalysis() {
    document.getElementById('falStep1').style.display = 'none';
    document.getElementById('falStep2').style.display = 'flex';
    
    const statusEl = document.getElementById('loadingText');
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
        if(statusEl) statusEl.innerText = loadingMessages[msgIndex % loadingMessages.length];
        msgIndex++;
    }, 2000);

    const user = JSON.parse(localStorage.getItem('caynana_user_v8') || "{}");
    try {
        const res = await fetch(`${BASE_DOMAIN}/api/fal/read`, {
            method: "POST", headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ 
                user_id: user.id || "guest", 
                images: photos 
            })
        });
        
        const data = await res.json();
        clearInterval(msgInterval);
        
        if(!res.ok) {
             alert(data.detail || "Fal bakarken başıma ağrılar girdi.");
             closeFalPanel();
             return;
        }
        
        showResult(data);

    } catch (err) {
        clearInterval(msgInterval);
        alert("Bağlantı koptu evladım.");
        closeFalPanel();
    }
}

function showResult(data) {
    document.getElementById('falStep2').style.display = 'none';
    const resDiv = document.getElementById('falResult');
    const txtDiv = document.getElementById('falText');
    
    resDiv.style.display = 'flex';
    
    if (!data.ok && data.limit_reached) {
        txtDiv.innerHTML = `<h3 style="color:#ff5252">Bugünlük Bitti!</h3><p>${data.text}</p>`;
    } else if (!data.ok) {
        txtDiv.innerText = data.text || "Bir hata oldu.";
    } else {
        txtDiv.innerText = data.text;
    }
}
