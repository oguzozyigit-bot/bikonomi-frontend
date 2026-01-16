# app/models/chat.py (v10.0 - NEUTRAL & OBJECTIVE PERSONA)
import os
import requests
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

try:
    from openai import OpenAI
except Exception:
    OpenAI = None

# --- AYARLAR ---
SERPAPI_KEY = os.getenv("SERPAPI_KEY") or os.getenv("SERPAPI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY) if (OpenAI and OPENAI_API_KEY) else None
router = APIRouter()

class ChatRequest(BaseModel):
    message: str = ""
    mode: str = "chat"
    persona: str = "normal"

class ChatResponse(BaseModel):
    assistant_text: str
    speech_text: str = ""
    data: List[Dict[str, Any]] = []

# --- PERSONA AYARLARI (GÜNCELLENDİ) ---
SYSTEM_PROMPTS = {
    "default": "Sen CAYNANA'sın. Geleneksel Türk kaynanası. Samimi ama otoriter. 'Evladım' diye hitap et.",
    
    # ALIŞVERİŞ MODU İÇİN YENİ TARAFSIZ PERSONA
    "shopping": """
    Sen CAYNANA'sın. Alışveriş asistanısın.
    KURALLAR:
    1. Asla 'Google'dan buldum', 'İnternete baktım' deme. Sadece 'Buldum', 'Çıkardım' de.
    2. Ürünleri ne göklere çıkar ne de yerin dibine sok. OBJEKTİF ve TEMKİNLİ ol.
    3. 'Harika', 'Mükemmel' gibi abartılı kelimeler yasak.
    4. 'Fena durmuyor', 'İş görür gibi', 'Fiyatı ortalama', 'Kumaşına dikkat et', 'Yorumlarına bakmak lazım' gibi dengeli konuş.
    5. Satıcı ağzıyla konuşma, alıcıyı koruyan tecrübeli kadın gibi konuş.
    """
}

# --- ARAMA MOTORU (Google Web Search - En Stabil Olan) ---
def search_products_google_web(query: str) -> List[Dict[str, Any]]:
    if not SERPAPI_KEY:
        print("⚠️ HATA: SERPAPI_KEY bulunamadı!")
        return []

    try:
        # Arama motoru Google ama kullanıcıya hissettirmiyoruz.
        params = {
            "engine": "google",
            "q": f"site:trendyol.com {query}", 
            "gl": "tr",
            "hl": "tr",
            "api_key": SERPAPI_KEY,
            "num": 6
        }
        
        resp = requests.get("https://serpapi.com/search", params=params)
        data = resp.json()
        
        results = []
        if "organic_results" in data:
            for item in data["organic_results"]:
                link = item.get("link", "")
                # Sadece Trendyol ürün linklerini al
                if "trendyol.com" in link and "/p/" in link: 
                    
                    # Fiyatı çekmeye çalış
                    price = "Fiyat Gör"
                    if "rich_snippet" in item and "top" in item["rich_snippet"]:
                        extensions = item["rich_snippet"]["top"].get("extensions", [])
                        for ext in extensions:
                            if "TL" in ext:
                                price = ext
                                break
                    
                    img = item.get("thumbnail", "https://via.placeholder.com/200?text=Resim+Yok")
                    
                    # Temiz Başlık
                    title = item.get("title", "Ürün").replace(" - Trendyol", "").split("|")[0].strip()

                    results.append({
                        "title": title,
                        "price": price,
                        "image": img,
                        "url": link,
                        "source": "Trendyol",
                        # KART ÜZERİNDEKİ NOT (Tarafsız)
                        "reason": "İncelemeye değer, bir bak." 
                    })
        return results

    except Exception as e:
        print(f"Hata: {e}")
        return []

# --- ENDPOINT ---
@router.post("/chat", response_model=ChatResponse)
async def api_chat(req: ChatRequest, authorization: Optional[str] = Header(default=None)):
    user_msg = (req.message or "").strip()
    mode = req.mode or "chat"
    
    reply = "Bir şey diyemedim evladım."
    product_data = []

    # 1. ALIŞVERİŞ MODU
    if mode == "shopping" and len(user_msg) > 1:
        product_data = search_products_google_web(user_msg)
        
        if product_data:
            # Yapay Zeka Mesajı (Tarafsız Başlangıç)
            reply = f"Evladım senin için baktım, '{user_msg}' için şunlar çıktı karşıma. Ne çok pahalı ne çok ucuz, bir incele bakalım işini görür mü?"
        else:
            reply = "Evladım aradım taradım ama tam istediğin gibi bir şey denk gelmedi. Başka türlü mü yazsak?"

    # 2. OPENAI YORUMU (Ürünler üzerine konuşsun)
    if client and (not product_data or mode != "shopping"):
        sys_msg = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["default"])
        try:
            if product_data:
                # Ürün isimlerini ver ki spesifik yorum yapabilsin
                titles = [p['title'] for p in product_data]
                sys_msg += f"\nBulunan Ürün Listesi: {titles}. Bu ürünlere dengeli, ne öven ne yeren, objektif yorum yap."
            
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": sys_msg},{"role": "user", "content": user_msg}],
                max_tokens=250
            )
            reply = completion.choices[0].message.content.strip()
        except Exception as e:
            reply = f"Tansiyonum düştü evladım, sonra konuşalım. ({str(e)})"

    return ChatResponse(assistant_text=reply, speech_text=reply, data=product_data)
