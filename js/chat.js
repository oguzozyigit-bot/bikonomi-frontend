import { apiChat } from "./api.js";
import { renderCards } from "./cards.js";

export async function sendMessage(state, ui){
  if(state.isSending) return;
  let val = (ui.text.value || "").trim();
  if(state.pendingImage && !val) val = "Bu resmi yorumla";
  if(!val && !state.pendingImage) return;

  state.isSending = true;
  ui.sendBtn.disabled = true;

  await ui.addBubble("user", val, false, null, state.pendingImage);
  ui.text.value = "";

  const loaderId = "ldr_" + Date.now();
  await ui.addBubble("ai", "<i class='fa-solid fa-spinner fa-spin'></i>", true, null, null, loaderId);

  const payload = { message: val, session_id: state.sessionId, image: state.pendingImage, mode: state.currentMode, persona: state.currentPersona };
  state.pendingImage = null;

  try{
    const { ok, data } = await apiChat(payload);
    document.getElementById(loaderId)?.remove();
    await ui.addBubble("ai", data.assistant_text || "Bir şey diyemedim evladım.", false, data.speech_text || "");

    if(state.currentMode === "shopping" && data.data && data.data.length){
      renderCards(data.data);
      ui.scrollToBottom(true);
    }

  }catch(e){
    document.getElementById(loaderId)?.remove();
    await ui.addBubble("ai", "Bağlantı hatası oldu evladım. Bir daha dene.", false, "");
  }finally{
    state.isSending = false;
    ui.sendBtn.disabled = false;
  }
}
