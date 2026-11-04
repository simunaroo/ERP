import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau } from './helpers/moi_truong.js';

let ctx; const tk = {}; const id = {}; let goc; // goc: so lieu truoc khi tao du lieu thu (seed da co san khach)
// Gia lap Gemini: tra JSON co ca ten Sale khong ton tai va 1 so AI tu bia (9999) de kiem tra hau kiem.
let goiAi = 0;
const fetchGoc = globalThis.fetch;
globalThis.fetch = async (url, opt) => {
  if (String(url).includes('generativelanguage.googleapis.com')) {
    goiAi++;
    const kq = {
      tom_tat: 'Kỳ này có 3 số được chia, Sale cần gọi nhanh hơn; ước tính 9999 cuộc gọi.',
      sale: [{ ten: 'Nguyễn Thị Lan', danh_gia: 'can_cai_thien', nhan_xet: 'Còn số quá 1 ngày chưa gọi.' }, { ten: 'Sale Ma', danh_gia: 'tot', nhan_xet: 'x' }],
      canh_bao: ['Khách quan tâm bị bỏ quên.'], hanh_dong: ['Nhắc Nguyễn Thị Lan gọi ngay các số tồn.'],
    };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(kq) }] } }] }), { status: 200 });
  }
  return fetchGoc(url, opt);
};

before(async () => {
  process.env.GEMINI_API_KEY = 'gia-lap';
  ctx = await batDau();
  for (const u of ['ngocson', 'thilan']) tk[u] = await ctx.login(u);
  goc = (await ctx.api(tk.ngocson, 'GET', '/cham-soc/bao-cao')).d.sale.find((x) => x.sale === 'Nguyễn Thị Lan');
  await ctx.api(tk.ngocson, 'PUT', '/nhap-so/ty-le', { ds: [{ sale_id: 2, ty_le: 100 }, { sale_id: 3, ty_le: 0 }] });
  const r = await ctx.api(tk.ngocson, 'POST', '/nhap-so', { ds: [{ sdt: '0913000001', ten: 'Số Bỏ Quên' }, { sdt: '0913000002', ten: 'Khách Quan Tâm' }, { sdt: '0913000003', ten: 'Khách Chốt' }] });
  [id.boQuen, id.quanTam, id.chot] = r.d.ket_qua.map((k) => k.khach_hang_id);
  // So bo quen: nhan tu 2 ngay truoc, chua goi
  await ctx.sql(`UPDATE khach_hang SET chia_luc = now() - interval '2 days' WHERE id = $1`, [id.boQuen]);
  // Khach quan tam: goi lan cuoi 4 ngay truoc
  await ctx.api(tk.thilan, 'POST', `/khach-hang/${id.quanTam}/cham-soc`, { trang_thai: 'quan_tam', noi_dung: 'Hỏi giá' });
  await ctx.sql(`UPDATE khach_hang_cham_soc SET created_at = now() - interval '4 days' WHERE khach_hang_id = $1`, [id.quanTam]);
  // Khach chot: goi ngay
  await ctx.api(tk.thilan, 'POST', `/khach-hang/${id.chot}/cham-soc`, { trang_thai: 'chot', noi_dung: 'Đồng ý' });
});
after(async () => { await ctx.ketThuc(); globalThis.fetch = fetchGoc; });

const baoCao = async () => (await ctx.api(tk.ngocson, 'GET', '/cham-soc/bao-cao')).d;
const lan = async () => (await baoCao()).sale.find((x) => x.sale === 'Nguyễn Thị Lan');

describe('Báo cáo chăm sóc khách theo Sale', () => {
  it('TC-BCS-01: Đếm đúng: được chia 3, đã liên hệ 2, chốt 1; tồn đọng: 1 số quá 1 ngày, 1 khách quan tâm quá 3 ngày', async () => {
    const x = await lan();
    assert.equal(x.so_duoc_chia, 3);
    assert.equal(x.da_lien_he, 2);
    assert.equal(x.chot, 1);
    assert.equal(x.ty_le_chot_pct, 33.3);
    assert.equal(x.qua_1_ngay_chua_goi - goc.qua_1_ngay_chua_goi, 1);
    assert.equal(x.quan_tam_qua_3_ngay - goc.quan_tam_qua_3_ngay, 1);
  });

  it('TC-BCS-02: Danh sách tồn đọng trả đúng khách; loại lạ → 400', async () => {
    const a = (await ctx.api(tk.ngocson, 'GET', '/cham-soc/ton-dong?loai=qua_1_ngay')).d;
    assert.ok(a.some((k) => k.id === id.boQuen) && !a.some((k) => k.id === id.chot));
    const b = (await ctx.api(tk.ngocson, 'GET', '/cham-soc/ton-dong?loai=quan_tam_3_ngay')).d;
    assert.ok(b.some((k) => k.id === id.quanTam) && !b.some((k) => k.id === id.chot));
    assert.equal((await ctx.api(tk.ngocson, 'GET', '/cham-soc/ton-dong?loai=xyz')).s, 400);
  });

  it('TC-BCS-03: Chuyển nhiều số sang Sale khác (bắt buộc lý do) → hết tồn đọng ở Sale cũ, Sale mới được tính lại thời hạn từ lúc nhận', async () => {
    assert.equal((await ctx.api(tk.ngocson, 'POST', '/cham-soc/chuyen-nhieu', { khach_ids: [id.boQuen, id.quanTam], sale_id: 3 })).s, 400);
    const r = await ctx.api(tk.ngocson, 'POST', '/cham-soc/chuyen-nhieu', { khach_ids: [id.boQuen, id.quanTam], sale_id: 3, ly_do: 'Lan để tồn quá lâu' });
    assert.equal(r.d.thanh_cong, 2);
    const truocHung = goc && (await ctx.sql(`SELECT count(*)::int AS n FROM khach_hang WHERE sale_phu_trach_id = 3 AND id = ANY($1)`, [[id.boQuen, id.quanTam]]))[0].n;
    assert.equal(truocHung, 2, 'hai khách đã thuộc Trần Văn Hùng');
    const x = await lan();
    assert.equal(x.qua_1_ngay_chua_goi, goc.qua_1_ngay_chua_goi);
    assert.equal(x.quan_tam_qua_3_ngay, goc.quan_tam_qua_3_ngay);
    // Sale moi duoc tinh lai thoi han tu luc nhan: so vua chuyen chua bi coi la "qua 1 ngay"
    assert.ok(!(await ctx.api(tk.ngocson, 'GET', '/cham-soc/ton-dong?loai=qua_1_ngay&sale_id=3')).d.some((k) => k.id === id.boQuen));
  });

  it('TC-BCS-04: AI nhận xét: bỏ tên Sale bịa, đánh dấu số không có trong dữ liệu, dùng bộ nhớ đệm', async () => {
    const r = await ctx.api(tk.ngocson, 'POST', '/cham-soc/ai-nhan-xet', {});
    assert.equal(r.s, 200, r.d?.message);
    assert.deepEqual(r.d.sale.map((x) => x.ten), ['Nguyễn Thị Lan']);
    assert.equal(r.d.kiem_chung.so_ten_sale_khong_co, 1);
    assert.ok(r.d.kiem_chung.so_khong_co_trong_du_lieu.includes(9999));
    const lan2 = await ctx.api(tk.ngocson, 'POST', '/cham-soc/ai-nhan-xet', {});
    assert.equal(lan2.d.tu_bo_nho_dem, true);
    assert.equal(goiAi, 1);
  });

  it('TC-BCS-06: Mỗi lần AI phân tích mới được lưu nhật ký (lần lấy từ bộ nhớ đệm không lưu trùng), xem lại được nguyên bản', async () => {
    const ls = (await ctx.api(tk.ngocson, 'GET', '/cham-soc/ai-lich-su')).d;
    assert.equal(ls.tong, 1, 'TC-BCS-04 chạy 2 lần nhưng lần 2 lấy từ bộ nhớ đệm');
    assert.equal(ls.ds[0].nguoi_tao, 'Vương Ngọc Sơn');
    assert.equal(ls.ds[0].so_can_cai_thien, 1);
    const moi = (await ctx.api(tk.ngocson, 'POST', '/cham-soc/ai-nhan-xet', { lam_moi: true })).d;
    assert.ok(moi.id && moi.id !== ls.ds[0].id);
    const ls2 = (await ctx.api(tk.ngocson, 'GET', '/cham-soc/ai-lich-su')).d;
    assert.equal(ls2.tong, 2);
    assert.equal(ls2.ds[0].id, moi.id, 'mới nhất lên đầu');
    const xem = (await ctx.api(tk.ngocson, 'GET', `/cham-soc/ai-lich-su/${ls.ds[0].id}`)).d;
    assert.equal(xem.ban_luu, true);
    assert.deepEqual(xem.sale.map((x) => x.ten), ['Nguyễn Thị Lan']);
    assert.ok(xem.kiem_chung.so_khong_co_trong_du_lieu.includes(9999));
    assert.ok(xem.so_lieu.sale.some((x) => x.sale === 'Nguyễn Thị Lan'), 'lưu kèm số liệu đã gửi AI');
    assert.equal((await ctx.api(tk.ngocson, 'GET', '/cham-soc/ai-lich-su/999999')).s, 404);
  });

  it('TC-BCS-05: Sale không xem được báo cáo chăm sóc', async () => {
    assert.equal((await ctx.api(tk.thilan, 'GET', '/cham-soc/ai-lich-su')).s, 403);
    assert.equal((await ctx.api(tk.thilan, 'GET', '/cham-soc/bao-cao')).s, 403);
    assert.equal((await ctx.api(tk.thilan, 'POST', '/cham-soc/chuyen-nhieu', { khach_ids: [1], sale_id: 3, ly_do: 'x' })).s, 403);
  });
});
