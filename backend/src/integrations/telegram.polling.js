import { goi, daCauHinh } from './telegram.client.js';
import { xuLyUpdateTelegram } from '../modules/cong_no/cong_no.service.js';

// Che do POLLING cho may ca nhan (khong co dia chi public de Telegram goi webhook):
// backend tu hoi Telegram "co ai bam nut khong" (long polling 25s). Server that dung webhook.
export async function batDauPolling() {
  if (!daCauHinh() || process.env.TELEGRAM_CHE_DO !== 'polling') return;
  await goi('deleteWebhook', {}).catch(() => {}); // webhook va polling khong dung dong thoi duoc
  console.log('Telegram: đang nhận nút duyệt bằng polling');
  let offset = 0;
  for (;;) {
    try {
      const updates = await goi('getUpdates', { offset, timeout: 25, allowed_updates: ['callback_query'] }, 35000);
      for (const u of updates) {
        offset = u.update_id + 1;
        await xuLyUpdateTelegram(u).catch((e) => console.error('Telegram:', e.message));
      }
    } catch (e) {
      console.error('Telegram polling:', e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
