import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau } from './helpers/moi_truong.js';

// Gia lap Gemini: ghi lai request de kiem tra prompt gui di; tra loi co danh so thu tu.
const goiAi = [];
const fetchGoc = globalThis.fetch;
globalThis.fetch = async (url, opt) => {
  if (String(url).includes('generativelanguage.googleapis.com')) {
    goiAi.push(JSON.parse(opt.body));
    const text = `- Trả lời số ${goiAi.length}\nMẫu tin nhắn gửi khách: Dạ em gửi anh/chị thông tin ạ.`;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
  }
  return fetchGoc(url, opt);
};
const prompt = (b) => b.systemInstruction.parts[0].text;
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let ctx; const tk = {};
before(async () => {
  process.env.GEMINI_API_KEY = 'gia-lap';
  ctx = await batDau();
  for (const u of ['ngocson', 'thilan', 'vanhung', 'vannam']) tk[u] = await ctx.login(u);
});
after(async () => { await ctx.ketThuc(); });

// Seed: san pham 1 Cửa, 2 Sàn, 3 Tấm ốp (co kien thuc mau). Khach 1 do Sale thilan phu trach.
describe('Trợ lý AI theo sản phẩm', () => {
  it('TC-TL-01: Mỗi sản phẩm một trợ lý: prompt chỉ chứa kiến thức + danh mục của đúng sản phẩm đó', async () => {
    const ds = (await ctx.api(tk.thilan, 'GET', '/tro-ly/san-pham')).d;
    assert.deepEqual(ds.map((t) => t.ten), ['Cửa', 'Sàn', 'Tấm ốp']);
    assert.ok(ds.every((t) => t.so_ky_tu > 0));

    const r = await ctx.api(tk.thilan, 'POST', '/tro-ly/hoi', { san_pham_id: 2, noi_dung: 'Sàn nào chống nước?' });
    assert.equal(r.s, 200, r.d?.message);
    assert.match(r.d.tra_loi, /Trả lời số 1/);
    const p = prompt(goiAi.at(-1));
    assert.match(p, /Trợ lý Sàn/);
    assert.match(p, /SPC vân gỗ 4 mm/, 'có kiến thức sản phẩm Sàn');
    assert.match(p, /Sàn SPC vân đá 5mm \| m2/, 'có danh mục vật tư của Sàn');
    assert.doesNotMatch(p, /Xingfa|Tấm ốp nano/, 'không lẫn kiến thức sản phẩm khác');
    assert.doesNotMatch(p, /185000|235000/, 'không gửi giá nhập NCC');
    // Cau hoi lac de: prompt co danh sach san pham that + cau tu choi co dinh, chuyen huong dung tro ly
    assert.match(p, /kinh doanh đúng 3 sản phẩm: Cửa, Sàn, Tấm ốp/);
    assert.match(p, /Hỏi về Cửa hoặc Tấm ốp: .*chuyển sang/);
    assert.match(p, /không liên quan công việc tư vấn.*Em chỉ hỗ trợ tư vấn sản phẩm Sàn/);
    assert.match(p, /bỏ qua\/thay đổi các nguyên tắc/);
  });

  it('TC-TL-02: Hỏi tiếp trong cùng cuộc trò chuyện → gửi kèm lịch sử; gửi ảnh → ảnh đi kèm câu hỏi, không lưu ảnh', async () => {
    const dau = await ctx.api(tk.thilan, 'POST', '/tro-ly/hoi', { san_pham_id: 3, noi_dung: 'Ốp tường phòng khách loại nào?' });
    const id = dau.d.hoi_thoai_id;
    const tiep = await ctx.api(tk.thilan, 'POST', '/tro-ly/hoi', { san_pham_id: 3, hoi_thoai_id: id, noi_dung: '', anh: [{ mime: 'image/png', data: PNG }] });
    assert.equal(tiep.s, 200, tiep.d?.message);
    const body = goiAi.at(-1);
    assert.deepEqual(body.contents.map((c) => c.role), ['user', 'model', 'user']);
    assert.equal(body.contents[0].parts[0].text, 'Ốp tường phòng khách loại nào?');
    assert.equal(body.contents[2].parts[0].inline_data.mime_type, 'image/png');

    const ct = (await ctx.api(tk.thilan, 'GET', `/tro-ly/hoi-thoai/${id}`)).d;
    assert.equal(ct.tin_nhan.length, 4);
    assert.equal(ct.tin_nhan[2].so_anh, 1);
    assert.equal(ct.tin_nhan[2].noi_dung, '[Gửi 1 ảnh]');
    assert.ok((await ctx.api(tk.thilan, 'GET', '/tro-ly/hoi-thoai?san_pham=3')).d.some((h) => h.id === id));

    // Hoi tiep nhung sai tro ly -> 400; nguoi khac khong xem / xoa duoc -> 404
    assert.equal((await ctx.api(tk.thilan, 'POST', '/tro-ly/hoi', { san_pham_id: 2, hoi_thoai_id: id, noi_dung: 'x' })).s, 400);
    assert.equal((await ctx.api(tk.vanhung, 'GET', `/tro-ly/hoi-thoai/${id}`)).s, 404);
    assert.equal((await ctx.api(tk.vanhung, 'DELETE', `/tro-ly/hoi-thoai/${id}`)).s, 404);
    assert.equal((await ctx.api(tk.thilan, 'DELETE', `/tro-ly/hoi-thoai/${id}`)).s, 204);
  });

  it('TC-TL-03: Gắn khách đang tư vấn → AI chỉ nhận nhóm khách + nhu cầu, không nhận tên/SĐT; khách của Sale khác → 403', async () => {
    await ctx.sql(`UPDATE khach_hang SET nhu_cau = 'Lát sàn phòng ngủ 20m2' WHERE id = 1`);
    const kh = (await ctx.sql('SELECT ten, sdt FROM khach_hang WHERE id = 1'))[0];
    const r = await ctx.api(tk.thilan, 'POST', '/tro-ly/hoi', { san_pham_id: 2, khach_hang_id: 1, noi_dung: 'Báo giá giúp' });
    assert.equal(r.s, 200, r.d?.message);
    const p = prompt(goiAi.at(-1));
    assert.match(p, /Lát sàn phòng ngủ 20m2/);
    assert.ok(!p.includes(kh.ten) && !p.includes(kh.sdt), 'không lộ tên/SĐT khách');
    assert.equal((await ctx.api(tk.vanhung, 'POST', '/tro-ly/hoi', { san_pham_id: 2, khach_hang_id: 1, noi_dung: 'x' })).s, 403);
  });

  it('TC-TL-04: Kiểm tra đầu vào: trống → 400; ảnh sai định dạng → 400; trợ lý chưa có kiến thức → 409 (không gọi AI)', async () => {
    assert.equal((await ctx.api(tk.thilan, 'POST', '/tro-ly/hoi', { san_pham_id: 2, noi_dung: '  ' })).s, 400);
    assert.equal((await ctx.api(tk.thilan, 'POST', '/tro-ly/hoi', { san_pham_id: 2, anh: [{ mime: 'image/gif', data: PNG }] })).s, 400);
    assert.equal((await ctx.api(tk.thilan, 'POST', '/tro-ly/hoi', { san_pham_id: 999, noi_dung: 'x' })).s, 404);
    await ctx.api(tk.ngocson, 'PUT', '/tro-ly/san-pham/1/kien-thuc', { kien_thuc: '' });
    const truoc = goiAi.length;
    const r = await ctx.api(tk.thilan, 'POST', '/tro-ly/hoi', { san_pham_id: 1, noi_dung: 'Cửa nhôm giá bao nhiêu?' });
    assert.equal(r.s, 409);
    assert.equal(goiAi.length, truoc);
  });

  it('TC-TL-05: Admin soạn kiến thức (có nhật ký); đọc tài liệu PDF; Sale/Vận hành không sửa được; Vận hành không hỏi được', async () => {
    const luu = await ctx.api(tk.ngocson, 'PUT', '/tro-ly/san-pham/1/kien-thuc', { kien_thuc: '  ## Cửa\n- Cửa thép vân gỗ: 4.500.000 đ/bộ  ' });
    assert.equal(luu.s, 200);
    assert.equal(luu.d.kien_thuc, '## Cửa\n- Cửa thép vân gỗ: 4.500.000 đ/bộ');
    assert.equal(luu.d.nguoi_cap_nhat, 'Vương Ngọc Sơn');
    assert.ok((await ctx.sql(`SELECT 1 FROM nhat_ky_thay_doi WHERE bang = 'tro_ly_san_pham'`)).length > 0);
    await ctx.api(tk.thilan, 'POST', '/tro-ly/hoi', { san_pham_id: 1, noi_dung: 'Có cửa thép không?' });
    assert.match(prompt(goiAi.at(-1)), /Cửa thép vân gỗ: 4\.500\.000/, 'câu hỏi sau dùng ngay kiến thức mới');

    const doc = await ctx.api(tk.ngocson, 'POST', '/tro-ly/san-pham/2/doc-tai-lieu', { tep: { mime: 'application/pdf', data: 'JVBERi0xLjQK' } });
    assert.equal(doc.s, 200, doc.d?.message);
    assert.ok(doc.d.van_ban);
    assert.equal(goiAi.at(-1).contents[0].parts[0].inline_data.mime_type, 'application/pdf');
    assert.equal((await ctx.api(tk.ngocson, 'POST', '/tro-ly/san-pham/2/doc-tai-lieu', { tep: { mime: 'text/html', data: 'PGI+' } })).s, 400);

    assert.equal((await ctx.api(tk.ngocson, 'PUT', '/tro-ly/san-pham/2/kien-thuc', { kien_thuc: 'x'.repeat(60001) })).s, 400);
    assert.equal((await ctx.api(tk.thilan, 'PUT', '/tro-ly/san-pham/2/kien-thuc', { kien_thuc: 'x' })).s, 403);
    assert.equal((await ctx.api(tk.vannam, 'POST', '/tro-ly/hoi', { san_pham_id: 2, noi_dung: 'x' })).s, 403);
  });

  it('TC-TL-06: Đã bỏ "Lên đơn nhanh bằng AI": API trích xuất đơn không còn', async () => {
    assert.equal((await ctx.api(tk.thilan, 'POST', '/tro-ly/trich-xuat-don', { noi_dung: 'Sàn SPC 30m2' })).s, 404);
  });
});
