import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau, homNay } from './helpers/moi_truong.js';
import { anDanhNccTrongCau } from '../src/utils/an_danh.js';

// Gia lap Gemini: luot 1 model goi cong cu theo kichBan, luot sau (da co functionResponse) tra loi bang chu
// do ham traLoi(ketQua) dung tu ket qua cong cu (giong model that: chep lai ma NCC-…, [[Tn]]).
// Yeu cau JSON (nhan xet phan tich NCC) tra ve nhanXet. Moi request duoc ghi lai de kiem tra du lieu gui ra ngoai.
const goiAi = [];
let kichBan = [];
let traLoi = () => 'Không có dữ liệu.';
let nhanXet = null;
const fetchGoc = globalThis.fetch;
globalThis.fetch = async (url, opt) => {
  if (String(url).includes('generativelanguage.googleapis.com')) {
    const body = JSON.parse(opt.body);
    goiAi.push(body);
    let parts;
    if (body.generationConfig?.responseMimeType === 'application/json') parts = [{ text: JSON.stringify(nhanXet) }];
    else {
      const kq = body.contents.flatMap((c) => c.parts).filter((p) => p.functionResponse).map((p) => p.functionResponse.response.ket_qua);
      parts = !kq.length && kichBan.length
        ? kichBan.map((c) => ({ functionCall: c, thoughtSignature: 'chu-ky' }))
        : [{ text: traLoi(kq, body) }];
    }
    return new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts } }] }), { status: 200 });
  }
  return fetchGoc(url, opt);
};
const ketQua = (body) => body.contents.flatMap((c) => c.parts).filter((p) => p.functionResponse).map((p) => p.functionResponse.response.ket_qua);

// Bi mat kinh doanh khong duoc xuat hien trong bat ky request nao gui Gemini.
const TEN_NCC = ['Sàn Việt Phát', 'Nano Hoàng Gia', 'Minh Khang', 'San Viet Phat', 'Minh Khang'];
const GIA = ['175000', '185000', '235000', '180000', '165000', '210000', '170000'];
function khongLo(reqs, them = []) {
  const s = JSON.stringify(reqs);
  for (const t of [...TEN_NCC, ...them]) assert.ok(!s.toLowerCase().includes(t.toLowerCase()), `lộ "${t}" ra AI`);
  for (const g of GIA) assert.ok(!new RegExp(`(?<!\\d)${g}(?!\\d)`).test(s), `lộ giá ${g} ra AI`);
}
// Moi so trong ket qua cong cu phai nho (%, so lan, so luong): so tien da bi doi thanh ma [[Tn]].
function soLonNhat(o) {
  if (typeof o === 'number') return Math.abs(o);
  if (o && typeof o === 'object') return Math.max(0, ...Object.values(o).map(soLonNhat));
  return 0;
}

let ctx; const tk = {};
before(async () => {
  process.env.GEMINI_API_KEY = 'gia-lap';
  ctx = await batDau();
  for (const u of ['ngocson', 'thilan', 'vannam', 'thihong']) tk[u] = await ctx.login(u);
});
after(async () => { await ctx.ketThuc(); });

describe('Trợ lý AI nhà cung cấp + ẩn danh dữ liệu gửi AI', () => {
  it('TC-NCC-01: "Vật tư này nên mua của NCC nào" → so sánh giá thật; AI chỉ thấy mã NCC + mã tiền, câu trả lời được đổi lại tên và số thật', async () => {
    kichBan = [{ name: 'so_sanh_ncc_cho_vat_tu', args: { vat_tu: 'sàn spc vân gỗ' } }];
    traLoi = ([kq]) => `Nên mua **${kq.ncc[0].ma}** giá ${kq.ncc[0].don_gia}/${kq.vat_tu.don_vi_tinh}, rẻ hơn ${kq.ncc[1].ma} (${kq.ncc[1].don_gia}) ${kq.ncc[1].chenh_so_voi_re_nhat_pct}%.`;
    const truoc = goiAi.length;
    const r = await ctx.api(tk.ngocson, 'POST', '/tro-ly/ncc/hoi', { noi_dung: 'Sàn SPC vân gỗ 4mm nên mua của NCC nào?' });
    assert.equal(r.s, 200, r.d?.message);
    assert.deepEqual(r.d.nguon, ['So sánh giá NCC']);

    const [kq] = ketQua(goiAi.at(-1));
    assert.equal(kq.vat_tu.ma, 'VT-3');
    assert.deepEqual(kq.ncc.map((n) => [n.ma, n.hang_gia, n.chenh_so_voi_re_nhat_pct]), [['NCC-3', 1, 0], ['NCC-1', 2, 2.8]]);
    assert.ok(kq.ncc.every((n) => /^\[\[T\d+\]\]$/.test(n.don_gia)), 'giá gửi AI là mã');
    assert.equal(kq.ncc.find((n) => n.ma === 'NCC-1').so_lan_da_mua_mat_hang_nay, 2, 'đã mua sàn vân gỗ của NCC-1 hai lần');
    khongLo(goiAi.slice(truoc));

    assert.match(r.d.tra_loi, /Vật liệu Minh Khang \(giả lập\)\*\* giá 180\.000 đ\/m2/);
    assert.match(r.d.tra_loi, /Công ty Sàn Việt Phát \(giả lập\) \(185\.000 đ\) 2\.8%/);
    assert.doesNotMatch(r.d.tra_loi, /\[\[T|NCC-\d/);

    // Luu 2 ban: noi_dung (that, cho nguoi xem) va noi_dung_ai (an danh, gui lai lam lich su)
    const tn = await ctx.sql(`SELECT vai_tro, noi_dung, noi_dung_ai FROM tro_ly_tin_nhan WHERE hoi_thoai_id = ${r.d.hoi_thoai_id} ORDER BY id`);
    assert.match(tn[1].noi_dung, /Minh Khang/);
    assert.match(tn[1].noi_dung_ai, /\*\*NCC-3\*\* giá \[\[T\d+\]\]/);
    const ct = (await ctx.api(tk.ngocson, 'GET', `/tro-ly/hoi-thoai/${r.d.hoi_thoai_id}`)).d;
    assert.equal(ct.loai, 'ncc');
    assert.ok(ct.tin_nhan.every((m) => !('noi_dung_ai' in m)), 'trình duyệt không cần bản ẩn danh');
    ctx.htDau = r.d.hoi_thoai_id;
  });

  it('TC-NCC-02: Người dùng gõ tên NCC → đổi thành mã trước khi gửi; hỏi tiếp gửi lịch sử ẩn danh, mã tiền đánh số tiếp', async () => {
    kichBan = [{ name: 'thong_tin_ncc', args: { ncc: 'NCC-3' } }, { name: 'cong_no_ncc', args: {} }];
    // Cau tra loi nhac lai ma tien cua luot truoc (lay tu lich su) -> van phai doi dung so.
    traLoi = ([hs, cn], body) => `${hs.ma} có ${hs.so_mat_hang_dang_bao_gia} mặt hàng, giá sàn ${hs.mat_hang[0].don_gia}. Tổng còn phải trả ${cn.tong.con_phai_tra}. Lúc nãy: ${body.contents[1].parts[0].text.match(/\[\[T\d+\]\]/)[0]}.`;
    const truoc = goiAi.length;
    const r = await ctx.api(tk.ngocson, 'POST', '/tro-ly/ncc/hoi', { hoi_thoai_id: ctx.htDau, noi_dung: 'So với vật liệu minh khang thì Sàn Việt Phát có rẻ hơn không?' });
    assert.equal(r.s, 200, r.d?.message);
    const guiDi = goiAi.slice(truoc);
    khongLo(guiDi);
    // Luot 1: lich su (cau hoi + tra loi truoc) + cau hoi moi, deu an danh
    assert.deepEqual(guiDi[0].contents.map((c) => c.role), ['user', 'model', 'user']);
    assert.match(guiDi[0].contents[1].parts[0].text, /NCC-3/);
    assert.equal(guiDi[0].contents[2].parts[0].text, 'So với NCC-3 thì NCC-1 có rẻ hơn không?');
    // Ma tien moi khong trung ma luot truoc (luot truoc dung T1, T2 ...)
    const maCu = Math.max(...[...guiDi[0].contents[1].parts[0].text.matchAll(/\[\[T(\d+)\]\]/g)].map((m) => Number(m[1])));
    const [hs] = ketQua(guiDi.at(-1));
    assert.ok(Number(hs.mat_hang[0].don_gia.match(/\d+/)[0]) > maCu, 'mã tiền đánh số tiếp');
    assert.match(r.d.tra_loi, /^Vật liệu Minh Khang \(giả lập\) có 2 mặt hàng, giá sàn 180\.000 đ\. Tổng còn phải trả 0\. Lúc nãy: 180\.000 đ\.$/);

    // Ten goi tat / khong dau, go kieu to hop (Unicode NFD: Unikey "tổ hợp", macOS) + so tien nguoi dung go -> deu thanh ma.
    // Truoc day: ten ngan (ma NCC-12 dai hon ten) go kieu to hop lam vong thay ten lap vo han, treo ca server.
    assert.equal(anDanhNccTrongCau('Công nợ của An Phú?'.normalize('NFD'), [{ id: 12, ten: 'Công ty An Phú' }]), 'Công nợ của NCC-12?');
    kichBan = [];
    traLoi = (_kq, body) => `Mức bạn nêu: ${body.contents.at(-1).parts[0].text.match(/\[\[T\d+\]\]/)[0]}.`;
    const truoc2 = goiAi.length;
    const cau = 'Minh Khang có rẻ hơn viet phat không? Giá 185.000đ của Hoàng Gia, tấm ốp nano thì sao?'.normalize('NFD');
    const r2 = await ctx.api(tk.ngocson, 'POST', '/tro-ly/ncc/hoi', { noi_dung: cau });
    assert.equal(r2.s, 200, r2.d?.message);
    khongLo(goiAi.slice(truoc2), ['viet phat', 'Hoàng Gia', '185.000']);
    assert.equal(goiAi.at(-1).contents.at(-1).parts[0].text, 'NCC-3 có rẻ hơn NCC-1 không? Giá [[T1]] của NCC-2, tấm ốp nano thì sao?');
    assert.equal(r2.d.tra_loi, 'Mức bạn nêu: 185.000 đ.', 'AI chép lại mã tiền của câu hỏi → đổi lại đúng số');
    const [hoi] = await ctx.sql(`SELECT ma_tien FROM tro_ly_tin_nhan WHERE hoi_thoai_id = ${r2.d.hoi_thoai_id} AND vai_tro = 'user'`);
    assert.deepEqual(hoi.ma_tien, { '[[T1]]': 185000 }, 'lưu mã tiền của câu hỏi để lượt sau đổi lại được');

    // Tin cu chua co ban an danh (luu truoc migration 039): gui lai lich su van an danh ca ten NCC lan so tien da giai ma.
    await ctx.sql(`UPDATE tro_ly_tin_nhan SET noi_dung_ai = NULL WHERE hoi_thoai_id = ${r2.d.hoi_thoai_id}`);
    traLoi = () => 'Đã rõ.';
    const truoc3 = goiAi.length;
    const r3 = await ctx.api(tk.ngocson, 'POST', '/tro-ly/ncc/hoi', { hoi_thoai_id: r2.d.hoi_thoai_id, noi_dung: 'Còn gì cần lưu ý?' });
    assert.equal(r3.s, 200, r3.d?.message);
    khongLo(goiAi.slice(truoc3), ['viet phat', 'Hoàng Gia', '185.000']);
  });

  it('TC-NCC-03: Lịch sử giá, vật tư mơ hồ, AI truyền tên NCC thay vì mã → vẫn chỉ trả mã', async () => {
    kichBan = [
      { name: 'lich_su_gia', args: { vat_tu: 'VT-3', ncc: 'NCC-1' } },
      { name: 'so_sanh_ncc_cho_vat_tu', args: { vat_tu: 'sàn' } },
      { name: 'thong_tin_ncc', args: { ncc: 'Minh Khang' } },
    ];
    traLoi = () => 'Bạn muốn xem loại sàn nào?';
    const truoc = goiAi.length;
    const r = await ctx.api(tk.ngocson, 'POST', '/tro-ly/ncc/hoi', { noi_dung: 'Giá sàn của các NCC thay đổi thế nào?' });
    assert.equal(r.s, 200, r.d?.message);
    const [ls, mh, hs] = ketQua(goiAi.at(-1));
    assert.deepEqual(ls.lich_su.map((x) => [x.ncc, x.ap_dung_tu, x.doi_so_voi_muc_truoc_pct]), [['NCC-1', '2026-06-01', null], ['NCC-1', '2026-09-01', 5.7]]);
    assert.match(mh.loi, /Có 2 vật tư khớp/);
    assert.deepEqual(mh.ung_vien.map((v) => v.ma), ['VT-3', 'VT-4']);
    assert.equal(hs.ma, 'NCC-3');
    // Phan model tu viet (tham so "Minh Khang" cua kich ban gia lap) khong tinh; xet du lieu he thong gui di.
    khongLo(goiAi.slice(truoc).map((b) => b.contents.filter((c) => c.role === 'user')));

    // Gia cu bang 0 (CHECK cho phep don_gia >= 0): % doi gia so voi muc truoc khong chia cho 0 (truoc day cong cu loi).
    await ctx.sql(`INSERT INTO ncc_bang_gia (ncc_id, vat_tu_id, don_gia, ngay_hieu_luc, ngay_het_hieu_luc) VALUES
      (2, 3, 0, '2025-01-01', '2025-01-31'), (2, 3, 150000, '2025-02-01', '2025-02-28')`);
    kichBan = [{ name: 'so_sanh_ncc_cho_vat_tu', args: { vat_tu: 'VT-3', ngay: '2025-02-15' } }];
    const r2 = await ctx.api(tk.ngocson, 'POST', '/tro-ly/ncc/hoi', { noi_dung: 'Giá VT-3 giữa tháng 2 năm 2025?' });
    assert.equal(r2.s, 200, r2.d?.message);
    const [ss] = ketQua(goiAi.at(-1));
    assert.equal(ss.loi, undefined, ss.loi);
    assert.deepEqual(ss.ncc.map((n) => n.ma), ['NCC-2']);
    await ctx.sql(`DELETE FROM ncc_bang_gia WHERE ncc_id = 2 AND vat_tu_id = 3 AND ngay_hieu_luc IN ('2025-01-01', '2025-02-01')`);
  });

  it('TC-NCC-04: Xếp hạng NCC, vật tư bán chạy, công nợ: mọi số tiền gửi AI đều là mã', async () => {
    kichBan = [
      { name: 'xep_hang_ncc', args: { tu_ngay: '2026-01-01', den_ngay: homNay() } },
      { name: 'vat_tu_ban_chay', args: { tu_ngay: '2026-01-01', den_ngay: homNay() } },
      { name: 'cong_no_ncc', args: { ncc: 'NCC-1' } },
      { name: 'tim_vat_tu', args: { tu_khoa: 'tấm ốp' } },
    ];
    // AI dung sai ma tien cho ty le ("[[T5]]%") -> khong hien so tien thanh phan tram.
    traLoi = ([, bc]) => `Tăng ${bc.vat_tu[0].doanh_thu}%`;
    const truoc = goiAi.length;
    const r = await ctx.api(tk.ngocson, 'POST', '/tro-ly/ncc/hoi', { noi_dung: 'Tình hình NCC năm nay?' });
    assert.equal(r.s, 200, r.d?.message);
    assert.equal(r.d.tra_loi, 'Tăng (không rõ)');
    const [xh, bc, cn, vt] = ketQua(goiAi.at(-1));
    assert.ok(xh.ncc.length >= 2 && xh.ncc.every((n) => /^NCC-\d+$/.test(n.ma)));
    assert.ok(bc.vat_tu.length > 0 && bc.vat_tu.every((v) => /^VT-\d+$/.test(v.ma) && /^\[\[T\d+\]\]$/.test(v.doanh_thu)));
    assert.equal(cn.ma, 'NCC-1');
    assert.deepEqual(vt.vat_tu.map((v) => v.ma), ['VT-5', 'VT-6']);
    for (const k of [xh, bc, cn, vt]) assert.ok(soLonNhat(k) < 10000, `có số tiền chưa mã hoá: ${JSON.stringify(k).slice(0, 200)}`);
    khongLo(goiAi.slice(truoc));
  });

  it('TC-NCC-05: Nhận xét AI ở trang Phân tích NCC: không gửi tên NCC / số tiền; mã NCC trong kết quả đổi về tên thật', async () => {
    nhanXet = {
      tom_tat: 'NCC-3 có chỉ số giá thấp nhất.', diem_noi_bat: ['NCC-1 bán nhiều mặt hàng.'], vat_tu: [],
      ncc_de_xuat: [{ vat_tu: 'Sàn SPC vân gỗ 4mm', ncc: 'NCC-3', ly_do: 'Rẻ hơn NCC-1.' }], canh_bao: [], hanh_dong: [],
    };
    const truoc = goiAi.length;
    const r = await ctx.api(tk.ngocson, 'POST', '/phan-tich/nhan-xet-ai', { tu: '2026-01-01', den: homNay() });
    assert.equal(r.s, 200, r.d?.message);
    khongLo(goiAi.slice(truoc));
    const gui = JSON.stringify(goiAi.at(-1));
    assert.match(gui, /NCC-3/);
    assert.doesNotMatch(gui, /doanh_thu\\":\d|tien_mua\\":\d|gia_mua_re_nhat|gia_ban_tb/);
    assert.equal(r.d.tom_tat, 'Vật liệu Minh Khang (giả lập) có chỉ số giá thấp nhất.');
    assert.equal(r.d.ncc_de_xuat[0].ncc, 'Vật liệu Minh Khang (giả lập)');
    assert.equal(r.d.ncc_de_xuat[0].ly_do, 'Rẻ hơn Công ty Sàn Việt Phát (giả lập).');
  });

  it('TC-NCC-06: Phân quyền: Sale, Vận hành, Kế toán (mặc định) không dùng được; cuộc trò chuyện NCC không dùng chéo trợ lý khác', async () => {
    for (const u of ['thilan', 'vannam', 'thihong']) {
      assert.equal((await ctx.api(tk[u], 'POST', '/tro-ly/ncc/hoi', { noi_dung: 'x' })).s, 403, u);
      assert.equal((await ctx.api(tk[u], 'GET', '/tro-ly/ncc/hoi-thoai')).s, 403, u);
    }
    assert.ok((await ctx.api(tk.ngocson, 'GET', '/tro-ly/ncc/hoi-thoai')).d.some((h) => h.id === ctx.htDau));
    assert.equal((await ctx.api(tk.ngocson, 'POST', '/tro-ly/quan-ly/hoi', { hoi_thoai_id: ctx.htDau, noi_dung: 'x' })).s, 400);
    assert.equal((await ctx.api(tk.ngocson, 'POST', '/tro-ly/hoi', { san_pham_id: 2, hoi_thoai_id: ctx.htDau, noi_dung: 'x' })).s, 400);
    assert.equal((await ctx.api(tk.ngocson, 'POST', '/tro-ly/ncc/hoi', { noi_dung: ' ' })).s, 400);
  });
});
