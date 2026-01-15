/* js/fal.js
   Fal ve Resim Yükleme İşlemleri
*/
import { BASE_DOMAIN } from './main.js';

export function initFal() {
    console.log("☕ Fal Modülü Hazır...");
    // Fal butonu veya resim yükleme inputlarını burada dinleyebilirsin
}

export async function checkFalImage(base64Image) {
    try {
        const res = await fetch(`${BASE_DOMAIN}/api/fal/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Image })
        });
        return await res.json();
    } catch (err) {
        console.error("Fal kontrol hatası:", err);
        return { ok: false };
    }
}
