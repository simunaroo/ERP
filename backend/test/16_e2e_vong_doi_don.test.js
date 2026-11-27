// KIEM THU DAU-CUOI (E2E): mot khach di tron vong doi nghiep vu, tu so dien thoai den khi doi so xong cong no va bao cao.
// Website day so -> chia Sale -> cham soc -> chot don hoan thien -> tu phan Van hanh -> phuong an -> boc khoi luong
// -> mua hang (NCC A cho xuat qua Telegram, NCC B yeu cau coc) -> duyet chi qua Telegram -> chi qua sao ke ngan hang
// -> khach tam ung qua ngan hang -> giao hang -> thi cong -> phat sinh -> nghiem thu -> quyet toan -> khach tra du
// -> tra cong tho -> bao cao lai/lo, nhat ky thay doi, thong bao.
// Cac buoc chay noi tiep, dung chung trang thai (buoc sau dua tren ket qua buoc truoc).
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau, homNay, telegram, tinCuoi, ANH_BILL } from './helpers/moi_truong.js';

let ctx; let xuLyUpdate; const tk = {};
const S = {}; // trang thai dung chung giua cac buoc

before(async () => {
  ctx = await batDau();
  ({ xuLyUpdate } = await import('../src/integrations/telegram.router.js'));
  for (const u of ['ngocson', 'thilan', 'vanhung', 'vannam', 'thihong']) tk[u] = await ctx.login(u);
});
after(async () => { await ctx.ketThuc(); });

// ---------- tien ich ----------
const goiNgoai = async (url, headers, body) => {
  const r = await fetch(`${ctx.goc}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { s: r.status, d: await r.json() };
};
let soGd = 0;
const nganHang = (loai, soTien, noiDung) => goiNgoai('/ngan-hang/webhook', { Authorization: 'Apikey khoa-ngan-hang-test' }, {
  id: `E2E-${++soGd}`, gateway: 'Vietcombank', transactionDate: '2026-11-02 09:00:00', accountNumber: '0123456789',
  content: noiDung, transferType: loai, transferAmount: soTien, referenceCode: `FT${soGd}`,
});
const nut = (data, username, chat, messageId) => xuLyUpdate({ callback_query: { id: `c${Math.random()}`, data, from: { username }, message: { message_id: messageId, chat: { id: chat } } } });
const traLoi = (chat, replyTo, from, them) => xuLyUpdate({ message: { message_id: Math.floor(Math.random() * 1e6), chat: { id: chat }, from: { username: from }, reply_to_message: { message_id: replyTo }, ...them } });
const don = async (t = tk.vannam) => (await ctx.api(t, 'GET', `/don-hang/${S.donId}`)).d;
const tien = async () => (await ctx.sql('SELECT tong_don, con_phai_thu, da_thu_khach FROM v_don_hang_tien WHERE don_hang_id = $1', [S.donId]))[0];
const thongBaoCua = async (t, chua) => (await ctx.api(t, 'GET', '/thong-bao')).d.items.some((x) => x.tieu_de.includes(chua));
const dxc = async (id) => (await ctx.sql('SELECT id, loai_chi, so_tien, trang_thai, noi_dung_ck, telegram_message_id FROM de_xuat_chi WHERE id = $1', [id]))[0];

describe('E2E — vòng đời một khách hàng: từ số điện thoại đến quyết toán và báo cáo', () => {
  it('E2E-01: Website đẩy số qua API → chia cho Sale theo tỷ lệ, Sale được thông báo', async () => {
    await ctx.api(tk.ngocson, 'PUT', '/nhap-so/ty-le', { ds: [{ sale_id: 2, ty_le: 100 }, { sale_id: 3, ty_le: 0 }] });
    const r = await goiNgoai('/nhap-so/tu-dong', { 'X-Api-Key': 'khoa-api-test' },
      { sdt: '+84 912 888 001', ten: 'Anh Quang E2E', dia_chi: 'Số 12 Trần Duy Hưng, Cầu Giấy, Hà Nội', nhu_cau: 'Lát sàn gỗ + ốp tường phòng khách', nguon: 'website' });
    assert.equal(r.s, 201);
    assert.equal(r.d.tao, 1);
    S.khachId = r.d.ket_qua[0].khach_hang_id;
    assert.equal(r.d.ket_qua[0].sale, 'Nguyễn Thị Lan');
    const [kh] = await ctx.sql('SELECT sdt, nguon, trang_thai_cham_soc FROM khach_hang WHERE id = $1', [S.khachId]);
    assert.deepEqual(kh, { sdt: '0912888001', nguon: 'website', trang_thai_cham_soc: 'moi' });
    assert.ok(await thongBaoCua(tk.thilan, 'Số mới: Anh Quang E2E'));
    // Website gui trung so (khac dinh dang) -> khong tao khach thu hai
    const lai = await goiNgoai('/nhap-so/tu-dong', { 'X-Api-Key': 'khoa-api-test' }, { sdt: '0912888001' });
    assert.equal(lai.d.trung, 1);
  });

  it('E2E-02: Sale thấy số trong "Việc cần làm", chăm sóc đến chốt; Sale khác không xem được khách này', async () => {
    const viec = (await ctx.api(tk.thilan, 'GET', '/tong-quan')).d.viec.find((v) => v.nhan === 'Số mới chưa liên hệ');
    assert.ok(viec.so >= 1);
    for (const [trang_thai, noi_dung] of [['quan_tam', 'Gọi lại, khách gửi ảnh mặt bằng 45m2'], ['quan_tam', 'Gửi báo giá sàn SPC + tấm ốp'], ['chot', 'Khách đồng ý, hẹn khảo sát']]) {
      assert.equal((await ctx.api(tk.thilan, 'POST', `/khach-hang/${S.khachId}/cham-soc`, { trang_thai, noi_dung })).s, 201);
    }
    assert.equal((await ctx.api(tk.thilan, 'GET', `/khach-hang/${S.khachId}`)).d.trang_thai_cham_soc, 'chot');
    assert.equal((await ctx.api(tk.vanhung, 'GET', `/khach-hang/${S.khachId}`)).s, 403);
  });

  it('E2E-03: Sale lên đơn hoàn thiện và chốt → đơn tự giao cho Vận hành, Vận hành được thông báo', async () => {
    const r = await ctx.api(tk.thilan, 'POST', '/don-hang', {
      khach_hang_id: S.khachId, hinh_thuc: 'hoan_thien', tinh_thanh: 'Hà Nội', dia_chi_cong_trinh: 'Số 12 Trần Duy Hưng, Cầu Giấy',
      dieu_khoan_nghiem_thu: 'so_m2_thi_cong', ngay_yc_lap_dat: homNay(), tien_coc: 0, ty_le_tam_ung: 50,
      vat_tu: [{ vat_tu_id: 3, so_luong_can: 10, don_gia: 300000 }, { vat_tu_id: 5, so_luong_can: 5, don_gia: 250000 }], chot: true,
    });
    assert.equal(r.s, 201, r.d?.message);
    S.donId = r.d.id; S.maDon = r.d.ma_don;
    const d = await don();
    assert.equal(d.giai_doan, 'len_phuong_an');
    assert.equal(d.van_hanh, 'Đỗ Văn Nam');
    assert.ok(await thongBaoCua(tk.vannam, S.maDon));
    assert.equal(Number((await tien()).tong_don), 4250000);
  });

  it('E2E-04: Lên phương án → tính KLVT (đo thực tế 12 m²) → tổng đơn đổi, Sale được báo → sang Mua hàng', async () => {
    await ctx.api(tk.vannam, 'PATCH', `/don-hang/${S.donId}/phuong-an`, { phuong_an_van_chuyen: 'Xe tải 1,5 tấn giao sáng', phuong_an_thi_cong: 'Lát sàn ngày 1, ốp tường ngày 2' });
    assert.equal((await ctx.api(tk.vannam, 'POST', `/don-hang/${S.donId}/giai-doan`, { huong: 'tiep' })).d.giai_doan, 'boc_khoi_luong');
    // Chua xac nhan khoi luong thi khong sang Mua hang
    assert.equal((await ctx.api(tk.vannam, 'POST', `/don-hang/${S.donId}/giai-doan`, { huong: 'tiep' })).s, 400);
    const vt = (await don()).vat_tu;
    const r = await ctx.api(tk.vannam, 'PUT', `/don-hang/${S.donId}/boc-khoi-luong`, {
      dong: vt.map((v) => ({ id: v.id, so_luong_can: v.vat_tu_id === 3 ? 12 : v.so_luong_can })), ghi_chu: 'Đo thực tế phòng khách 12 m²',
    });
    assert.equal(r.s, 200, r.d?.message);
    assert.equal(Number((await tien()).tong_don), 4850000);
    assert.equal((await ctx.api(tk.vannam, 'POST', `/don-hang/${S.donId}/giai-doan`, { huong: 'tiep' })).d.giai_doan, 'mua_hang');
  });

  it('E2E-05: Chưa đủ hàng → không đăng ký giao hàng được (kể cả khi chưa ai mở màn Mua hàng)', async () => {
    const r = await ctx.api(tk.vannam, 'POST', `/don-hang/${S.donId}/giai-doan`, { huong: 'tiep' });
    assert.equal(r.s, 400);
    assert.match(r.d.message, /2 dòng vật tư chưa sẵn hàng/); // hoi quy: truoc day don chua mo man Mua hang bi coi la du hang
  });

  it('E2E-06: Chọn NCC rẻ nhất; đặt hàng NCC A → NCC bấm "Cho xuất hàng" trên Telegram → sẵn hàng, tự lập quyết toán', async () => {
    const ct = (await ctx.api(tk.vannam, 'GET', `/mua-hang/don/${S.donId}`)).d;
    [S.dongA, S.dongB] = ct.dong;
    S.nccA = S.dongA.gia_ncc[0].ncc_id;
    S.nccB = S.dongB.gia_ncc.find((g) => g.ncc_id !== S.nccA).ncc_id;
    await ctx.api(tk.vannam, 'PUT', `/mua-hang/dong/${S.dongA.id}`, { ncc_id: S.nccA });
    await ctx.api(tk.vannam, 'PUT', `/mua-hang/dong/${S.dongB.id}`, { ncc_id: S.nccB });
    S.dhA = (await ctx.api(tk.vannam, 'POST', `/mua-hang/don/${S.donId}/dat-hang`, { ncc_id: S.nccA })).d;
    const msg = telegram.msgId;
    assert.doesNotMatch(tinCuoi('sendMessage', -100).body.text, /Anh Quang|0912888001/, 'đơn gửi NCC không lộ thông tin khách');
    await nut(`dh:${S.dhA.id}:xuat`, 'ncc_a', -100, msg);
    const [m] = await ctx.sql('SELECT trang_thai FROM mua_hang_dong WHERE id = $1', [S.dongA.id]);
    assert.equal(m.trang_thai, 'san_hang');
    const [qt] = await ctx.sql(`SELECT id FROM de_xuat_chi WHERE don_hang_id = $1 AND ncc_id = $2 AND loai_chi = 'quyet_toan'`, [S.donId, S.nccA]);
    assert.ok(qt, 'có đề xuất quyết toán NCC A');
    S.qtA = qt.id;
  });

  it('E2E-07: Đặt hàng NCC B → NCC "Yêu cầu cọc" 100k → chờ cọc; giám đốc duyệt cọc trên Telegram', async () => {
    S.dhB = (await ctx.api(tk.vannam, 'POST', `/mua-hang/don/${S.donId}/dat-hang`, { ncc_id: S.nccB })).d;
    await nut(`dh:${S.dhB.id}:coc`, 'ncc_b', -100, telegram.msgId);
    await traLoi(-100, telegram.msgId, 'ncc_b', { text: '100k' });
    const [m] = await ctx.sql('SELECT trang_thai FROM mua_hang_dong WHERE id = $1', [S.dongB.id]);
    assert.equal(m.trang_thai, 'cho_coc');
    S.coc = (await ctx.sql('SELECT de_xuat_chi_id AS id FROM dat_hang_ncc WHERE id = $1', [S.dhB.id]))[0].id;
    const c = await dxc(S.coc);
    assert.equal(Number(c.so_tien), 100000);
    await nut(`dxc:${S.coc}:duyet`, 'giamdoc', -200, Number(c.telegram_message_id));
    await ctx.cho(200);
    assert.equal((await dxc(S.coc)).trang_thai, 'da_duyet');
    assert.ok(await thongBaoCua(tk.thihong, `DXC-${S.coc}`));
  });

  it('E2E-08: Kế toán chuyển cọc → sao kê ngân hàng tự ghi "đã chi" → vật tư B sẵn hàng, tự lập quyết toán phần còn lại', async () => {
    const c = await dxc(S.coc);
    const r = await nganHang('out', 100000, `IBFT ${c.noi_dung_ck}`);
    assert.equal(r.d.cach, 'da_chi');
    assert.equal((await dxc(S.coc)).trang_thai, 'da_thanh_toan');
    const [m] = await ctx.sql('SELECT trang_thai FROM mua_hang_dong WHERE id = $1', [S.dongB.id]);
    assert.equal(m.trang_thai, 'san_hang');
    const [qt] = await ctx.sql(`SELECT id, coc_da_tru FROM de_xuat_chi WHERE don_hang_id = $1 AND ncc_id = $2 AND loai_chi = 'quyet_toan'`, [S.donId, S.nccB]);
    assert.equal(Number(qt.coc_da_tru), 100000, 'quyết toán NCC B trừ cọc đã chi');
    S.qtB = qt.id;
  });

  it('E2E-09: Admin duyệt hai quyết toán NCC trên web; ngân hàng báo đã chuyển → công nợ NCC của đơn về 0', async () => {
    for (const id of [S.qtA, S.qtB]) {
      assert.equal((await ctx.api(tk.ngocson, 'POST', `/cong-no/de-xuat-chi/${id}/duyet`, { hanh_dong: 'duyet' })).s, 200);
      const c = await dxc(id);
      assert.equal((await nganHang('out', Number(c.so_tien), `MBVCB ${c.noi_dung_ck} CK`)).d.cach, 'da_chi');
    }
    const conNo = await ctx.sql(`SELECT count(*)::int AS n FROM de_xuat_chi WHERE don_hang_id = $1 AND trang_thai <> 'da_thanh_toan'`, [S.donId]);
    assert.equal(conNo[0].n, 0);
  });

  it('E2E-10: Đủ hàng nhưng khách chưa tạm ứng 50% → chặn giao hàng; khách chuyển khoản → ngân hàng tự xác nhận → giao hàng', async () => {
    const chan = await ctx.api(tk.vannam, 'POST', `/don-hang/${S.donId}/giai-doan`, { huong: 'tiep' });
    assert.equal(chan.s, 400);
    assert.match(chan.d.message, /tạm ứng/i);
    const goiY = (await ctx.api(tk.thilan, 'GET', `/thu-tien/don/${S.donId}`)).d;
    assert.equal(goiY.noi_dung_ck, `${S.maDon} THANH TOAN`);
    const r = await nganHang('in', goiY.tom_tat.goi_y.so_tien, `${S.maDon.replaceAll('-', '')} THANH TOAN`); // ngan hang bo dau gach
    assert.equal(r.d.trang_thai, 'da_khop');
    assert.equal(Number((await tien()).da_thu_khach), 2425000);
    assert.ok(await thongBaoCua(tk.thilan, 'ngân hàng tự xác nhận'));
    const qua = await ctx.api(tk.vannam, 'POST', `/don-hang/${S.donId}/giai-doan`, { huong: 'tiep' });
    assert.equal(qua.s, 200, qua.d?.message);
    assert.equal(qua.d.giai_doan, 'giao_hang');
  });

  it('E2E-11: Lấy hàng từ hai NCC; lập giai đoạn thi công, phân đội thợ → thợ bắt đầu → đơn tự sang Thi công', async () => {
    for (const ncc of [S.nccA, S.nccB]) assert.equal((await ctx.api(tk.vannam, 'POST', `/mua-hang/don/${S.donId}/lay-hang`, { ncc_id: ncc })).s, 200);
    const r = await ctx.api(tk.vannam, 'POST', '/thi-cong', { don_hang_id: S.donId, ten_giai_doan: 'Lát sàn + ốp tường', doi_tho_id: 1, kl_du_kien: 17, gia_cong: 60000, ngay_du_kien: homNay() });
    assert.ok(r.s < 300, r.d?.message);
    S.gd = (await ctx.sql('SELECT id FROM thi_cong WHERE don_hang_id = $1', [S.donId]))[0].id;
    await ctx.api(tk.vannam, 'POST', `/thi-cong/${S.gd}/bat-dau`);
    assert.equal((await don()).giai_doan, 'thi_cong');
  });

  it('E2E-12: Ghi phụ thu thi công; báo xong → nghiệm thu theo thực tế → quyết toán → hoàn tất, ghi công thợ', async () => {
    assert.ok((await ctx.api(tk.vannam, 'POST', '/thi-cong/phat-sinh', { don_hang_id: S.donId, loai: 'phu_thu', so_tien: 300000, ly_do: 'Thi công ngoài giờ theo yêu cầu khách' })).s < 300);
    await ctx.api(tk.vannam, 'POST', `/thi-cong/${S.gd}/bao-xong`);
    assert.equal((await don()).giai_doan, 'nghiem_thu');
    const nt = (await ctx.api(tk.vannam, 'GET', `/thi-cong/nghiem-thu/${S.donId}`)).d;
    const luu = await ctx.api(tk.vannam, 'PUT', `/thi-cong/nghiem-thu/${S.donId}`, {
      dong: nt.dong.map((d) => ({ id: d.id, so_luong_thuc_te: d.so_luong_can })),
      giai_doan: nt.giai_doan.map((x) => ({ id: x.id, kl_thuc_te: 16 })),
    });
    assert.equal(luu.s, 200, luu.d?.message);
    assert.equal((await ctx.api(tk.vannam, 'POST', `/thi-cong/nghiem-thu/${S.donId}/xac-nhan`)).s, 200);
    assert.equal((await ctx.api(tk.vannam, 'POST', `/thi-cong/quyet-toan/${S.donId}/chot`)).s, 200);
    const d = await don();
    assert.equal(d.giai_doan, 'hoan_tat');
    const t = await tien();
    assert.equal(Number(t.tong_don), 5150000, 'tổng đơn = 4.850.000 + phụ thu 300.000');
    assert.equal(Number(t.con_phai_thu), 2725000);
    const [tho] = await ctx.sql(`SELECT so_tien FROM giao_dich_tho WHERE don_hang_id = $1 AND loai = 'phai_tra'`, [S.donId]);
    assert.equal(Number(tho.so_tien), 16 * 60000);
  });

  it('E2E-13: Đơn hoàn tất còn nợ hiện trong công nợ đến hạn; khách trả nốt qua ngân hàng → hết nợ', async () => {
    const cn = (await ctx.api(tk.thihong, 'GET', '/thu-tien/cong-no?loc=den_han')).d.items;
    assert.ok(cn.some((x) => x.id === S.donId));
    assert.ok((await ctx.api(tk.thilan, 'GET', '/tong-quan')).d.viec.some((v) => v.nhan.includes('khách còn nợ') && v.so >= 1));
    const r = await nganHang('in', 2725000, `Thanh toan ${S.maDon} con lai`);
    assert.equal(r.d.cach, 'tao_phieu');
    assert.equal(Number((await tien()).con_phai_thu), 0);
    const sau = (await ctx.api(tk.thihong, 'GET', '/thu-tien/cong-no')).d.items;
    assert.ok(!sau.some((x) => x.id === S.donId));
  });

  it('E2E-14: Kế toán đề xuất trả công thợ → Admin duyệt → chi kèm bill trên web → công nợ thợ của đơn về 0', async () => {
    const r = await ctx.api(tk.thihong, 'POST', '/cong-no/de-xuat-chi', { loai_chi: 'tra_cong', doi_tho_id: 1, don_hang_id: S.donId, so_tien: 960000 });
    assert.equal(r.s, 201, r.d?.message);
    assert.equal((await ctx.api(tk.ngocson, 'POST', `/cong-no/de-xuat-chi/${r.d.id}/duyet`, { hanh_dong: 'duyet' })).s, 200);
    assert.equal((await ctx.api(tk.thihong, 'POST', `/cong-no/de-xuat-chi/${r.d.id}/da-chi`, { bill: ANH_BILL })).s, 200);
    const [so] = await ctx.sql(`SELECT sum(CASE loai WHEN 'phai_tra' THEN so_tien ELSE -so_tien END) AS con FROM giao_dich_tho WHERE don_hang_id = $1 AND doi_tho_id = 1`, [S.donId]);
    assert.equal(Number(so.con), 0);
  });

  it('E2E-15: Báo cáo lãi/lỗ có đơn (đã quyết toán, lãi = doanh thu − NCC − công thợ); nhật ký và thông báo đủ vết', async () => {
    const bc = (await ctx.api(tk.thihong, 'GET', `/bao-cao/lai-lo?tu=${homNay()}&den=${homNay()}&limit=100`)).d;
    const x = bc.items.find((d) => d.id === S.donId);
    assert.equal(x.tam_tinh, false);
    assert.equal(x.doanh_thu, 5150000);
    assert.equal(x.cong_tho, 960000);
    assert.equal(x.chi_ncc_uoc_tinh, 0);
    const [ncc] = await ctx.sql(`SELECT sum(gia_tri_hang)::bigint AS v FROM de_xuat_chi WHERE don_hang_id = $1 AND loai_chi = 'quyet_toan'`, [S.donId]);
    assert.equal(x.chi_ncc, Number(ncc.v), 'chi NCC trong báo cáo = tổng tiền hàng các quyết toán');
    assert.equal(x.lai_gop, x.doanh_thu - x.chi_ncc - x.cong_tho);
    // Nhat ky: du dau vet theo don qua ca 3 kenh web / telegram / ngan hang
    const nk = (await ctx.api(tk.ngocson, 'GET', `/nhat-ky?don_hang_id=${S.donId}`)).d;
    const kenh = new Set(nk.items.map((i) => i.kenh));
    for (const k of ['web', 'telegram', 'ngan_hang']) assert.ok(kenh.has(k), `nhật ký có kênh ${k}`);
    // Sale theo duoc tien do don qua thong bao
    const tb = (await ctx.api(tk.thilan, 'GET', '/thong-bao')).d.items.filter((t) => t.tieu_de.includes(S.maDon));
    assert.ok(tb.length >= 4, `Sale nhận ${tb.length} thông báo về đơn`);
  });
});
