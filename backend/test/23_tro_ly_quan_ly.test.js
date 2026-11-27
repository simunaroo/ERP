import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau } from './helpers/moi_truong.js';

// Gia lap Gemini cho function calling: luot 1 model yeu cau goi cong cu (theo kich ban), luot sau (da co
// functionResponse) model tra loi bang chu. Ghi lai moi request de kiem tra du lieu gui ra ngoai.
const goiAi = [];
let kichBan = [];   // [{ name, args }] cong cu model se goi o luot dau
const fetchGoc = globalThis.fetch;
globalThis.fetch = async (url, opt) => {
  if (String(url).includes('generativelanguage.googleapis.com')) {
    const body = JSON.parse(opt.body);
    goiAi.push(body);
    const cuoi = body.contents.at(-1);
    const daCoKetQua = cuoi.parts.some((p) => p.functionResponse);
    const parts = !daCoKetQua && kichBan.length
      ? kichBan.map((c) => ({ functionCall: c, thoughtSignature: 'chu-ky-gia-lap' }))
      : [{ text: '**Lan** đang chăm sóc ổn. - Gọi lại KH-1 trong tuần.' }];
    return new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts } }] }), { status: 200 });
  }
  return fetchGoc(url, opt);
};
const ketQuaCongCu = (body) => body.contents.flatMap((c) => c.parts).filter((p) => p.functionResponse).map((p) => p.functionResponse);

let ctx; const tk = {};
before(async () => {
  process.env.GEMINI_API_KEY = 'gia-lap';
  ctx = await batDau();
  for (const u of ['ngocson', 'thilan', 'vannam']) tk[u] = await ctx.login(u);
});
after(async () => { await ctx.ketThuc(); });

describe('Trợ lý AI quản lý (chăm sóc khách của Sale)', () => {
  it('TC-QL-01: Hỏi về một Sale → AI gọi công cụ, backend trả số liệu thật, lưu cuộc trò chuyện loại "quản lý"', async () => {
    kichBan = [{ name: 'bao_cao_cham_soc', args: { tu_ngay: '2026-09-01', den_ngay: '2026-12-31' } },
      { name: 'nhat_ky_cham_soc', args: { sale: 'Lan', tu_ngay: '2026-09-01', den_ngay: '2026-12-31' } }];
    const r = await ctx.api(tk.ngocson, 'POST', '/tro-ly/quan-ly/hoi', { noi_dung: 'Lan đang chăm sóc khách thế nào?' });
    assert.equal(r.s, 200, r.d?.message);
    assert.match(r.d.tra_loi, /Lan/);
    assert.deepEqual(r.d.nguon, ['Báo cáo chăm sóc', 'Nhật ký chăm sóc']);
    // Luot 2 gui lai dung phan model (kem chu ky) + ket qua 2 cong cu
    const luot2 = goiAi.at(-1);
    assert.equal(luot2.contents.at(-2).parts[0].thoughtSignature, 'chu-ky-gia-lap');
    const [bc, nk] = ketQuaCongCu(luot2);
    assert.ok(bc.response.ket_qua.sale.some((s) => s.sale === 'Nguyễn Thị Lan'), 'báo cáo có Sale thật');
    // Doanh thu la bi mat kinh doanh: gui AI duoi dang ma [[Tn]] kem ty trong %
    // (so 0 = chua co doanh thu: gui thang 0, khong phai bi mat)
    assert.ok(bc.response.ket_qua.sale.every((s) => (s.doanh_thu === 0 || /^\[\[T\d+\]\]$/.test(s.doanh_thu)) && 'ty_trong_doanh_thu_pct' in s));
    assert.ok(bc.response.ket_qua.tong.doanh_thu === 0 || /^\[\[T\d+\]\]$/.test(bc.response.ket_qua.tong.doanh_thu));
    assert.ok(nk.response.ket_qua.cham_soc.length > 0, 'nhật ký có dữ liệu');
    assert.ok(nk.response.ket_qua.cham_soc.every((c) => c.sale === 'Nguyễn Thị Lan'), '"Lan" được hiểu đúng là Nguyễn Thị Lan');
    assert.ok(nk.response.ket_qua.cham_soc.every((c) => /^KH-\d+$/.test(c.ma_khach)));

    const ht = (await ctx.sql(`SELECT loai, loai_vat_tu_id FROM tro_ly_hoi_thoai WHERE id = ${r.d.hoi_thoai_id}`))[0];
    assert.deepEqual(ht, { loai: 'quan_ly', loai_vat_tu_id: null });
    const ds = (await ctx.api(tk.ngocson, 'GET', '/tro-ly/quan-ly/hoi-thoai')).d;
    assert.ok(ds.some((h) => h.id === r.d.hoi_thoai_id));
    assert.equal((await ctx.api(tk.ngocson, 'GET', `/tro-ly/hoi-thoai/${r.d.hoi_thoai_id}`)).d.tin_nhan.length, 2);
  });

  it('TC-QL-02: Không gửi tên, SĐT khách ra ngoài: ghi chú có SĐT/tên khách bị che', async () => {
    // Ghi chu tu do: SDT nhieu kieu viet, ten khong dau, "danh xung + ten", gia chot (so tien cung khong gui AI).
    await ctx.sql(`INSERT INTO khach_hang_cham_soc (khach_hang_id, sale_id, trang_thai, noi_dung) VALUES
      (1, 2, 'quan_tam', 'Gọi Nguyễn Văn Hùng số 0901 000 001, khách muốn thêm cửa phòng ngủ'),
      (1, 2, 'quan_tam', 'SĐT khác (+84) 901 000 001 / +84901000001; a Hùng hẹn chốt 12.500.000đ, nguyen van hung đã xem mẫu')`);
    kichBan = [{ name: 'nhat_ky_cham_soc', args: { ma_khach: 'KH-1' } }, { name: 'khach_hang_cua_sale', args: { sale: 'Nguyễn Thị Lan' } }];
    const truoc = goiAi.length;
    const r = await ctx.api(tk.ngocson, 'POST', '/tro-ly/quan-ly/hoi', { noi_dung: 'Khách KH-1 đang được chăm sóc ra sao?' });
    assert.equal(r.s, 200, r.d?.message);
    const guiDi = JSON.stringify(goiAi.slice(truoc));
    const kh = await ctx.sql('SELECT ten, sdt, dia_chi FROM khach_hang WHERE id IN (1, 2)');
    for (const k of kh) {
      assert.ok(!guiDi.includes(k.ten), `lộ tên ${k.ten}`);
      assert.ok(!guiDi.includes(k.sdt), `lộ SĐT ${k.sdt}`);
      assert.ok(!guiDi.includes(k.dia_chi), 'lộ địa chỉ');
    }
    assert.ok(!guiDi.includes('0901 000 001'));
    for (const lo of ['901 000 001', '84901000001', 'a Hùng', 'nguyen van hung', '12.500.000']) assert.ok(!guiDi.includes(lo), `lộ "${lo}"`);
    assert.match(guiDi, /\[SĐT\]/);
    assert.match(guiDi, /\[khách\]/);
    assert.match(guiDi, /chốt \[\[T\d+\]\]/, 'giá chốt trong ghi chú gửi AI dưới dạng mã');
  });

  it('TC-QL-03: Tên Sale mơ hồ / không tồn tại → công cụ báo lại để AI hỏi người dùng', async () => {
    kichBan = [{ name: 'khach_hang_cua_sale', args: { sale: 'Hùng' } }, { name: 'nhat_ky_cham_soc', args: { sale: 'Không Có Ai' } }];
    const r = await ctx.api(tk.ngocson, 'POST', '/tro-ly/quan-ly/hoi', { noi_dung: 'Hùng với Không Có Ai làm thế nào?' });
    assert.equal(r.s, 200, r.d?.message);
    const [mot, hai] = ketQuaCongCu(goiAi.at(-1));
    assert.equal(mot.response.ket_qua.sale, 'Trần Văn Hùng', 'tên gọi "Hùng" khớp đúng 1 Sale');
    assert.match(hai.response.ket_qua.loi, /Không tìm thấy Sale/);
    assert.ok(hai.response.ket_qua.cac_sale.includes('Nguyễn Thị Lan'));
  });

  it('TC-QL-04: Hỏi tiếp trong cùng cuộc trò chuyện gửi kèm lịch sử; trợ lý sản phẩm không nhận cuộc trò chuyện quản lý', async () => {
    kichBan = [];
    const dau = await ctx.api(tk.ngocson, 'POST', '/tro-ly/quan-ly/hoi', { noi_dung: 'Tháng này ai chốt nhiều nhất?' });
    const tiep = await ctx.api(tk.ngocson, 'POST', '/tro-ly/quan-ly/hoi', { hoi_thoai_id: dau.d.hoi_thoai_id, noi_dung: 'Còn người thấp nhất?' });
    assert.equal(tiep.s, 200, tiep.d?.message);
    assert.deepEqual(goiAi.at(-1).contents.map((c) => c.role), ['user', 'model', 'user']);
    assert.equal((await ctx.api(tk.ngocson, 'POST', '/tro-ly/hoi', { san_pham_id: 2, hoi_thoai_id: dau.d.hoi_thoai_id, noi_dung: 'x' })).s, 400);
  });

  it('TC-QL-05: Phân quyền: Sale, Vận hành không dùng được; câu hỏi trống → 400', async () => {
    assert.equal((await ctx.api(tk.thilan, 'POST', '/tro-ly/quan-ly/hoi', { noi_dung: 'x' })).s, 403);
    assert.equal((await ctx.api(tk.vannam, 'GET', '/tro-ly/quan-ly/hoi-thoai')).s, 403);
    assert.equal((await ctx.api(tk.ngocson, 'POST', '/tro-ly/quan-ly/hoi', { noi_dung: '  ' })).s, 400);
    // Sale khong xem duoc cuoc tro chuyen quan ly cua Admin
    const id = (await ctx.sql(`SELECT id FROM tro_ly_hoi_thoai WHERE loai = 'quan_ly' LIMIT 1`))[0].id;
    assert.equal((await ctx.api(tk.thilan, 'GET', `/tro-ly/hoi-thoai/${id}`)).s, 404);
  });
});
