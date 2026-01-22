import { apiGET } from "./api.js";
import { STORAGE_KEY } from "./config.js";

export async function initNotif() {
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if(!user?.id) return;

  const check = async () => {
     try {
       const res = await apiGET(`/api/reminders/today?user_id=${user.id}`);
       const list = document.getElementById('notifList');
       const badge = document.getElementById('notifBadge');
       if(!list) return;
       
       list.innerHTML = "";
       const items = res.items || [];
       if(items.length > 0) badge.style.display = 'block';
       
       items.forEach(it => {
          list.innerHTML += `<div class="notif-item">
             <div class="notif-title">${it.title}</div>
             <div class="notif-desc">${it.message}</div>
          </div>`;
       });
     } catch(e) {}
  };
  
  check();
  setInterval(check, 60000);
}
