import { apiFalCheck } from "./api.js";

export const FAL_STEPS = ["1/3: Üstten çek", "2/3: Yandan çek", "3/3: Diğer yandan çek"];

export async function falCheckOneImage(dataUrl){
  const { data } = await apiFalCheck(dataUrl);
  return data;
}

export function resetFal(state, ui){
  state.falImages = [];
  ui.falStepText.textContent = "Fal için 3 fotoğraf çek";
  ui.falStepSub.textContent = FAL_STEPS[0];
}
