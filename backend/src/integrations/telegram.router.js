import { xuLyUpdateTelegram as xuLyDuyetChi, xuLyAnhBill } from '../modules/cong_no/cong_no.service.js';
import { xuLyTelegramNcc } from '../modules/mua_hang/mua_hang.service.js';

// Mot bot, hai nhom: nhom duyet chi (nut dxc:*, anh bill tra loi bot) va nhom NCC (nut dh:*, tin tra loi so tien coc).
// Polling va webhook deu goi ham nay.
export async function xuLyUpdate(update) {
  const cb = update?.callback_query;
  if (cb) return cb.data?.startsWith('dh:') ? xuLyTelegramNcc(update) : xuLyDuyetChi(update);
  if (!update?.message?.reply_to_message) return;
  // Tin tra loi: neu la anh bill cho de xuat chi thi xu ly xong, con lai chuyen nhom NCC.
  if (await xuLyAnhBill(update.message)) return;
  return xuLyTelegramNcc(update);
}
