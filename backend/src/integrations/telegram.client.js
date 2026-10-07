// Goi Telegram Bot API. Khong co token/chat id thi cac ham "gui" bo qua (he thong van duyet duoc tren web).
const API = 'https://api.telegram.org/bot';

export const daCauHinh = () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID_DUYET);

// Nguoi duoc phep bam Duyet: danh sach username (khong phan biet hoa thuong, co/khong '@').
export function duocDuyet(username) {
  const ds = (process.env.TELEGRAM_NGUOI_DUYET || '').split(',').map((x) => x.trim().replace(/^@/, '').toLowerCase()).filter(Boolean);
  return Boolean(username) && ds.includes(username.toLowerCase());
}

export async function goi(method, body, timeoutMs = 10000) {
  const res = await fetch(`${API}${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(`Telegram ${method}: ${data.description || res.status}`);
  return data.result;
}

// Ten NCC, ghi chu do nguoi dung nhap -> phai escape khi dung parse_mode HTML (tranh vo dinh dang/chen the).
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tien = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')} đ`;

const LOAI = { coc: 'Cọc', quyet_toan: 'Quyết toán', chi_bo_sung: 'Chi bổ sung', tra_cong: 'Trả công thợ', ung_cong: 'Ứng công thợ' };

export function noiDungDeXuatChi(dxc, ketQua) {
  const dong = [
    `💳 <b>ĐỀ XUẤT CHI #${dxc.id} — ${LOAI[dxc.loai_chi]}</b>`,
    `Đơn: <b>${esc(dxc.ma_don)}</b>`,
    dxc.ncc ? `Nhà cung cấp: <b>${esc(dxc.ncc)}</b>` : `Đội thợ: <b>${esc(dxc.doi_tho)}</b>`,
    `Số tiền: <b>${tien(dxc.so_tien)}</b>`,
  ];
  if (dxc.loai_chi === 'quyet_toan') dong.push(`Tiền hàng (gồm VAT) ${tien(dxc.gia_tri_hang)} − cọc ${tien(dxc.coc_da_tru)}; ${dxc.dong.length} dòng vật tư`);
  dong.push(`Người lập: ${esc(dxc.nguoi_tao)}`);
  if (dxc.ghi_chu) dong.push(`Ghi chú: ${esc(dxc.ghi_chu)}`);
  if (ketQua) dong.push('', ketQua);
  return dong.join('\n');
}

export async function guiDeXuatChi(dxc) {
  const msg = await goi('sendMessage', {
    chat_id: process.env.TELEGRAM_CHAT_ID_DUYET,
    text: noiDungDeXuatChi(dxc),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[
      { text: '✅ Duyệt', callback_data: `dxc:${dxc.id}:duyet` },
      { text: '❌ Từ chối', callback_data: `dxc:${dxc.id}:tu_choi` },
    ]] },
  });
  return { message_id: String(msg.message_id), chat_id: String(msg.chat.id) };
}

// Sau khi duyet/tu choi: sua tin nhan, bo nut bam (khong bam lai duoc).
export const capNhatTinNhan = (chatId, messageId, text) =>
  goi('editMessageText', { chat_id: chatId, message_id: Number(messageId), text, parse_mode: 'HTML' });

export const traLoiNut = (callbackId, text) => goi('answerCallbackQuery', { callback_query_id: callbackId, text, show_alert: false });
