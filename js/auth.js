import { GOOGLE_CLIENT_ID } from "./config.js";

export function initAuth({ onAuthed }){
  const token = localStorage.getItem("auth_token");
  if (token) {
    markAuthed(true);
    if (onAuthed) onAuthed(getUserInfo());
  } else {
    markAuthed(false);
    showLoginModal(onAuthed);
  }

  // Google GIS init
  window.google?.accounts?.id?.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => {
      localStorage.setItem("auth_token", resp.credential);
      const info = decodeJwt(resp.credential);
      // ID sabit (sub)
      const user_info = getUserInfo() || {};
      user_info.id = info.sub;
      user_info.email = info.email;
      user_info.name = info.name || info.email || "Kullanıcı";
      user_info.avatar = info.picture || "";
      // profil objesi
      user_info.profile = user_info.profile || {};
      localStorage.setItem("user_info", JSON.stringify(user_info));
      hideLoginModal();
      markAuthed(true);
      if (onAuthed) onAuthed(user_info);
    }
  });
}

function decodeJwt(token){
  const payload = token.split(".")[1];
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decodeURIComponent(escape(json)));
}

export function getUserInfo(){
  try { return JSON.parse(localStorage.getItem("user_info") || "{}"); }
  catch { return {}; }
}

export function logout(){
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_info");
  location.reload();
}

function markAuthed(ok){
  const dot = document.getElementById("authDot");
  if (!dot) return;
  dot.style.background = ok ? "#55d38a" : "#777";
}

function showLoginModal(onAuthed){
  // Tek ekranı “kilitleyen” basit modal
  let modal = document.getElementById("loginModal");
  if (!modal){
    modal = document.createElement("div");
    modal.id = "loginModal";
    modal.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:10000;
      display:flex; align-items:center; justify-content:center; padding:16px;`;
    modal.innerHTML = `
      <div style="width:min(420px,100%); background:#0b0b0b; border:1px solid #222; border-radius:18px; padding:16px;">
        <div style="font-weight:800; color:#ffb300; margin-bottom:8px;">CAYNANA.AI</div>
        <div style="color:#ddd; margin-bottom:14px;">Devam etmek için Google ile giriş yap.</div>
        <div id="gBtn"></div>
      </div>`;
    document.body.appendChild(modal);
  }
  // Button render
  setTimeout(() => {
    window.google?.accounts?.id?.renderButton(
      document.getElementById("gBtn"),
      { theme: "outline", size: "large", text: "continue_with", shape: "pill" }
    );
  }, 200);
}

function hideLoginModal(){
  const modal = document.getElementById("loginModal");
  if (modal) modal.remove();
}
