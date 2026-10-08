import { xuLyUpdateTelegram as xuLyDuyetChi } from '../modules/cong_no/cong_no.service.js';
import { xuLyTelegramNcc } from '../modules/mua_hang/mua_hang.service.js';

// Mot bot, hai nhom: nhom duyet chi (nut dxc:*) va nhom NCC (nut dh:*, tin tra loi so tien coc).
// Polling va webhook deu goi ham nay.
export async function xuLyUpdate(update) {
  const cb = update?.callback_query;
  if (cb?.data?.startsWith('dh:') || (update?.message?.reply_to_message && !cb)) return xuLyTelegramNcc(update);
  if (cb) return xuLyDuyetChi(update);
}
