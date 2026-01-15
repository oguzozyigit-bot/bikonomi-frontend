# app/main.py (FINAL v9601 - RENDER PORT FIX)
# ✅ Render'ın verdiği portu otomatik alır ($PORT).
# ✅ CORS ve Rotalar (Prefixler) mükemmel ayarlandı.

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# -------------------------------------------------
# APP
# -------------------------------------------------
app = FastAPI(
    title="CAYNANA.AI API",
    version="v9601"
)

# -------------------------------------------------
# CORS  (⚠️ EN KRİTİK KISIM – ROUTERLARDAN ÖNCE)
# -------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://caynana.ai",
        "https://www.caynana.ai",
        "https://bikonomi-web.onrender.com",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# ROUTER IMPORTS
# -------------------------------------------------
# Hata almamak için try-except blokları ile import ediyoruz
try:
    from .models.auth import router as auth_router
    from .models.memory import router as memory_router
    from .models.chat import router as chat_router
    from .models.fal import router as fal_router
    from .models.plans import router as plans_router
    from .models.tts import router as tts_router
    # Eğer profile.py diye ayrı bir dosyan varsa onu da ekle, yoksa memory yeterli
    # from .models.profile import router as profile_router 
except ImportError as e:
    print(f"Router import hatası: {e}")

# -------------------------------------------------
# ROUTER MOUNTS
# -------------------------------------------------

if 'auth_router' in locals():
    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

# Hafıza ve Profil işlemleri genellikle memory.py içindedir
if 'memory_router' in locals():
    app.include_router(memory_router, prefix="/api/profile", tags=["profile"])

if 'chat_router' in locals():
    app.include_router(chat_router, prefix="/api", tags=["chat"])

if 'fal_router' in locals():
    app.include_router(fal_router, prefix="/api/fal", tags=["fal"])

if 'plans_router' in locals():
    app.include_router(plans_router, prefix="/api/plans", tags=["plans"])

if 'tts_router' in locals():
    app.include_router(tts_router, prefix="/api", tags=["tts"])

# -------------------------------------------------
# HEALTH
# -------------------------------------------------
@app.get("/health")
def health():
    return {
        "ok": True,
        "app": "CAYNANA.AI API",
        "cors": "fixed",
        "version": "v9601"
    }

# ROOT
@app.get("/")
def root():
    return {"message": "Caynana API çalışıyor."}

# -------------------------------------------------
# STARTUP (RENDER UYUMLU - KRİTİK NOKTA)
# -------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    # Render $PORT verirse onu kullanır, vermezse (Lokalde) 10000 kullanır.
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )
