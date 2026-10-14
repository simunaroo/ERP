// Telegram duoc gia lap (helpers/moi_truong.js): goi xuLyUpdate() nhu khi Telegram day update ve qua polling/webhook.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau, quaLenPhuongAn, taoDonChot, telegram, tinCuoi } from './helpers/moi_truong.js';

let ctx; let sale; let vh; let admin; let xuLyUpdate; let don; let d1; let d2;
const tt = async (id) => (await ctx.sql('SELECT trang_thai FROM mua_hang_dong WHERE id = $1', [id]))[0].trang_thai;
const nut = (data, username, chat, messageId) => xuLyUpdate({ callback_query: { id: `c${Math.random()}`, data, from: { username }, message: { message_id: messageId, chat: { id: chat } } } });
const traLoi = (chat, replyTo, from, them) => xuLyUpdate({ message: { message_id: Math.floor(Math.random() * 1e6), chat: { id: chat }, from: { username: from }, reply_to_message: { message_id: replyTo }, ...them } });
const traLoiNut = () => tinCuoi('answerCallbackQuery').body.text;

before(async () => {
  ctx = await batDau();
  ({ xuLyUpdate } = await import('../src/integrations/telegram.router.js'));
  [sale, vh, admin] = await Promise.all([ctx.login('doanha'), ctx.login('hanha'), ctx.login('ngocson')]);
  don = await taoDonChot(ctx, sale);
  await quaLenPhuongAn(ctx, vh, don.id);
  const ct = (await ctx.api(vh, 'GET', `/mua-hang/don/${don.id}`)).d;
  [d1, d2] = ct.dong;
  await ctx.api(vh, 'PUT', `/mua-hang/dong/${d1.id}`, { ncc_id: d1.gia_ncc[0].ncc_id });
  await ctx.api(vh, 'PUT', `/mua-hang/dong/${d2.id}`, { ncc_id: d2.gia_ncc.find((g) => g.ncc_id !== d1.gia_ncc[0].ncc_id).ncc_id });
});
after(async () => { await ctx.ketThuc(); });

describe('Telegram: nhóm NCC và nhóm duyệt chi', () => {
  let dhA; let msgA;
  it('TC-TG-01: Nút bấm từ nhóm khác hoặc sai tin nhắn bị từ chối', async () => {
    dhA = (await ctx.api(vh, 'POST', `/mua-hang/don/${don.id}/dat-hang`, { ncc_id: d1.gia_ncc[0].ncc_id })).d;
    msgA = telegram.msgId;
    await nut(`dh:${dhA.id}:xuat`, 'ke_gian', -999, msgA);
    assert.match(traLoiNut(), /Không đúng nhóm/);
    await nut(`dh:${dhA.id}:xuat`, 'ncc', -100, 1);
    assert.match(traLoiNut(), /Không tìm thấy/);
    assert.equal(await tt(d1.id), 'da_dat_hang');
  });

  it('TC-TG-02: NCC bấm "Cho xuất hàng" → Sẵn hàng, tin nhóm NCC được sửa, quyết toán gửi nhóm duyệt chi', async () => {
    await nut(`dh:${dhA.id}:xuat`, 'ncc_a', -100, msgA);
    assert.equal(await tt(d1.id), 'san_hang');
    assert.match(tinCuoi('editMessageText').body.text, /CHO XUẤT HÀNG — @ncc_a/);
    assert.match(tinCuoi('sendPhoto', -200).body.caption, /Quyết toán/);
    const ghi = (await ctx.sql('SELECT phan_hoi_qua, nguoi_phan_hoi FROM dat_hang_ncc WHERE id = $1', [dhA.id]))[0];
    assert.deepEqual(ghi, { phan_hoi_qua: 'telegram', nguoi_phan_hoi: '@ncc_a' });
  });

  let dhB; let msgHoi;
  it('TC-TG-03: NCC bấm "Yêu cầu cọc" → bot hỏi số tiền; trả lời sai định dạng / vượt tiền hàng → báo lỗi', async () => {
    const nccB = (await ctx.sql('SELECT ncc_id FROM mua_hang_dong WHERE id = $1', [d2.id]))[0].ncc_id;
    dhB = (await ctx.api(vh, 'POST', `/mua-hang/don/${don.id}/dat-hang`, { ncc_id: nccB })).d;
    const msgB = telegram.msgId;
    await nut(`dh:${dhB.id}:coc`, 'ncc_b', -100, msgB);
    assert.equal(tinCuoi('sendMessage', -100).body.reply_markup.force_reply, true);
    msgHoi = telegram.msgId;
    await traLoi(-100, msgHoi, 'ncc_b', { text: 'abc' });
    assert.match(tinCuoi('sendMessage', -100).body.text, /Không đọc được số tiền/);
    await traLoi(-100, msgHoi, 'ncc_b', { text: '999tr' });
    assert.match(tinCuoi('sendMessage', -100).body.text, /phải nhỏ hơn/);
    await traLoi(-999, msgHoi, 'x', { text: '1000' });
    assert.equal(await tt(d2.id), 'da_dat_hang');
  });

  it('TC-TG-04: NCC trả lời "50k" → Chờ cọc + đề xuất cọc 50.000 đ gửi nhóm duyệt chi (ảnh QR + nút Duyệt)', async () => {
    await traLoi(-100, msgHoi, 'ncc_b', { text: '50k' });
    assert.equal(await tt(d2.id), 'cho_coc');
    const c = (await ctx.sql('SELECT c.so_tien, c.trang_thai FROM dat_hang_ncc h JOIN de_xuat_chi c ON c.id = h.de_xuat_chi_id WHERE h.id = $1', [dhB.id]))[0];
    assert.equal(Number(c.so_tien), 50000);
    assert.ok(JSON.stringify(tinCuoi('sendPhoto', -200).body.reply_markup).includes(':duyet'));
  });

  let dxc; let msgDxc;
  it('TC-TG-05: Duyệt trên Telegram: người lạ bị từ chối; người được phép duyệt → nút "Đã chi" xuất hiện', async () => {
    dxc = (await ctx.sql('SELECT de_xuat_chi_id AS id FROM dat_hang_ncc WHERE id = $1', [dhB.id]))[0].id;
    msgDxc = Number((await ctx.sql('SELECT telegram_message_id FROM de_xuat_chi WHERE id = $1', [dxc]))[0].telegram_message_id);
    await nut(`dxc:${dxc}:duyet`, 'nguoi_la', -200, msgDxc);
    assert.match(traLoiNut(), /không có quyền/);
    await nut(`dxc:${dxc}:duyet`, 'giamdoc', -200, msgDxc);
    await ctx.cho(300);
    assert.equal((await ctx.sql('SELECT trang_thai FROM de_xuat_chi WHERE id = $1', [dxc]))[0].trang_thai, 'da_duyet');
    const sua = tinCuoi('editMessageCaption');
    assert.ok(JSON.stringify(sua.body.reply_markup).includes(`dxc:${dxc}:chi`), 'ảnh QR được sửa caption + nút Đã chi');
  });

  it('TC-TG-06: Kế toán chi ngay trong nhóm: phải gắn Telegram; gửi ảnh bill → Đã chi, vật tư Sẵn hàng, tin bỏ nút', async () => {
    await nut(`dxc:${dxc}:chi`, 'ketoan_nst', -200, msgDxc);
    assert.match(traLoiNut(), /chưa gắn với Kế toán/);
    await ctx.api(admin, 'PUT', '/nguoi-dung/5', { telegram_username: '@ketoan_nst' });
    await nut(`dxc:${dxc}:chi`, 'ketoan_nst', -200, msgDxc);
    assert.equal(tinCuoi('sendMessage', -200).body.reply_markup.force_reply, true);
    const hoi = telegram.msgId;
    await traLoi(-200, hoi, 'ketoan_nst', { text: 'đã chuyển' });
    assert.match(tinCuoi('sendMessage', -200).body.text, /Cần gửi ẢNH/);
    await traLoi(-200, hoi, 'nguoi_la', { photo: [{ file_id: 'x' }] });
    assert.match(tinCuoi('sendMessage', -200).body.text, /chưa gắn với Kế toán/);
    await traLoi(-200, hoi, 'ketoan_nst', { photo: [{ file_id: 'nho' }, { file_id: 'lon' }] });
    await ctx.cho(300);
    const p = (await ctx.sql('SELECT c.trang_thai, p.nguoi_tao_id FROM de_xuat_chi c JOIN phieu_thanh_toan p ON p.de_xuat_chi_id = c.id WHERE c.id = $1', [dxc]))[0];
    assert.deepEqual(p, { trang_thai: 'da_thanh_toan', nguoi_tao_id: 5 });
    assert.equal(await tt(d2.id), 'san_hang');
    assert.ok(telegram.goi.some((x) => x.method === 'getFile' && x.body.file_id === 'lon'), 'tải bản ảnh lớn nhất');
    await traLoi(-200, hoi, 'ketoan_nst', { photo: [{ file_id: 'lon' }] });
    assert.match(tinCuoi('sendMessage', -200).body.text, /Chỉ xác nhận đã chi/, 'không chi 2 lần');
  });

  it('TC-TG-07: Telegram không tải được ảnh QR → tự gửi dạng chữ kèm link QR', async () => {
    telegram.loiGuiAnh = true;
    const keToan = await ctx.login('toana');
    const r = await ctx.api(keToan, 'POST', '/cong-no/de-xuat-chi', { loai_chi: 'coc', don_hang_id: 1, ncc_id: 2, so_tien: 1000 });
    telegram.loiGuiAnh = false;
    assert.equal(r.s, 201);
    assert.match(tinCuoi('sendMessage', -200).body.text, /Mở mã QR/);
  });
});
