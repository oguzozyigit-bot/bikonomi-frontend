import { apiSpeak } from "./api.js";

export async function bindAudio(ui, state){
  ui.chat.addEventListener("click", async (e)=>{
    const btn = e.target.closest(".audio-btn");
    if(!btn) return;

    // stop existing
    if(state.currentAudio){
      state.currentAudio.pause();
      state.currentAudio = null;
    }

    const text = btn.getAttribute("data-speech") || "";
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor`;

    const res = await apiSpeak(text, state.currentPersona);
    if(!res.ok){
      btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
      return;
    }

    const a = new Audio(URL.createObjectURL(res.blob));
    state.currentAudio = a;
    a.onended = ()=> btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    btn.innerHTML = `<i class="fa-solid fa-stop"></i> Durdur`;
    await a.play();
  });
}
