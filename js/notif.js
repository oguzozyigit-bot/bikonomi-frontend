// notif.js
import { apiGET } from "./api.js";
import { STORAGE_KEY } from "./config.js";

export async function initNotif(){
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  if (!user?.id) return;

  const check = async () => {
    try {
      const res = await apiGET(`/api/reminders/today?user_id=${encodeURIComponent(user.id)}`);
      // devamı aynı
    } catch(e){}
  };

  check();
  setInterval(check, 60000);
}
