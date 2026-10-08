import { goi, coBot } from './telegram.client.js';
import { xuLyUpdate } from './telegram.router.js';

// Che do POLLING cho may ca nhan (khong co dia chi public de Telegram goi webhook):
// backend tu hoi Telegram "co ai bam nut khong" (long polling 25s). Server that dung webhook.
export async function batDauPolling() {
  if (!coBot() || process.env.TELEGRAM_CHE_DO !== 'polling') return;
  await goi('deleteWebhook', {}).catch(() => {}); // webhook va polling khong dung dong thoi duoc
  console.log('Telegram: đang nhận nút bấm/tin trả lời bằng polling');
  let offset = 0;
  for (;;) {
    try {
      const updates = await goi('getUpdates', { offset, timeout: 25, allowed_updates: ['callback_query', 'message'] }, 35000);
      for (const u of updates) {
        offset = u.update_id + 1;
        await xuLyUpdate(u).catch((e) => console.error('Telegram:', e.message));
      }
    } catch (e) {
      console.error('Telegram polling:', e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
