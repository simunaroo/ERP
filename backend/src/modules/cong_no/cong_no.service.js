import crypto from 'crypto';
import fs from 'fs/promises';
import { query, withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { luuAnhBase64, duongDanAnh } from '../../utils/luuAnh.js';
import * as repo from './cong_no.repository.js';
import * as tg from '../../integrations/telegram.client.js';
import * as thongBao from '../thong_bao/thong_bao.service.js';
import * as muaRepo from '../mua_hang/mua_hang.repository.js';

const TRANG_THAI = ['cho_duyet', 'da_duyet', 'tu_choi', 'da_thanh_toan', 'thu_hoi'];
const LOAI = ['coc', 'quyet_toan', 'chi_bo_sung', 'tra_cong', 'ung_cong'];
const SAN_SANG = ['san_hang', 'da_lay_hang', 'da_giao_hang'];
const DA_DAT = ['da_dat_hang', 'cho_coc', ...SAN_SANG];
const tien = (n) => `${Math.round(n).toLocaleString('vi-VN')} đ`;
const soTien = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new AppError(400, 'Số tiền phải lớn hơn 0');
  return Math.round(n);
};

// Ma ngan hang theo chuan VietQR (img.vietqr.io).
const MA_NGAN_HANG = {
  vietcombank: 'VCB', vcb: 'VCB', techcombank: 'TCB', tcb: 'TCB', bidv: 'BIDV', vpbank: 'VPB', mbbank: 'MB', mb: 'MB',
  acb: 'ACB', vietinbank: 'ICB', agribank: 'VBA', sacombank: 'STB', tpbank: 'TPB', hdbank: 'HDB', vib: 'VIB', shb: 'SHB',
};
export function linkVietQr({ ten_ngan_hang, so_tk, chu_tk }, soTienCk, noiDung) {
  const ma = MA_NGAN_HANG[String(ten_ngan_hang).toLowerCase().replace(/\s|ngân hàng/g, '')];
  if (!ma) return null;
  const q = new URLSearchParams({ amount: String(Math.round(soTienCk)), addInfo: noiDung, accountName: chu_tk });
  return `https://img.vietqr.io/image/${ma}-${so_tk}-compact2.png?${q}`;
}

const chuanSo = (r) => ({ ...r, gia_tri_hang: Number(r.gia_tri_hang), coc_da_tru: Number(r.coc_da_tru), so_tien: Number(r.so_tien) });

export async function dsDeXuatChi(q) {
  if (q.trang_thai && !TRANG_THAI.includes(q.trang_thai)) throw new AppError(400, 'Trạng thái không hợp lệ');
  if (q.loai_chi && !LOAI.includes(q.loai_chi)) throw new AppError(400, 'Loại chi không hợp lệ');
  const trang = Math.max(1, parseInt(q.page, 10) || 1);
  const kq = await repo.dsDeXuatChi({
    trangThai: q.trang_thai, loaiChi: q.loai_chi, doiTuong: q.doi_tuong, tuKhoa: q.q?.trim() || null, limit: 30, offset: (trang - 1) * 30,
  });
  return { ...kq, items: kq.items.map(chuanSo), page: trang, soTrang: Math.max(1, Math.ceil(kq.tong / 30)) };
}

export async function chiTiet(id) {
  const dxc = await repo.findDxc(id);
  if (!dxc) throw new AppError(404, 'Không tìm thấy đề xuất chi');
  const [dong, log, phieu, stk] = await Promise.all([repo.dongCua(id), repo.lichSuDuyet(id), repo.phieuCua(id), repo.stkNguoiNhan({ query }, dxc)]);
  // QR VietQR (ngan hang + STK + so tien + noi dung CK) kem ngay tu luc lap: Admin thay chuyen cho ai bao nhieu, Ke toan quet de chi.
  const conHieuLuc = ['cho_duyet', 'da_duyet', 'da_thanh_toan'].includes(dxc.trang_thai) && Number(dxc.so_tien) > 0;
  const qr = conHieuLuc && stk ? linkVietQr(stk, Number(dxc.so_tien), dxc.noi_dung_ck) : null;
  const qrLyDo = !conHieuLuc || qr ? null : !stk ? 'Người nhận chưa có tài khoản ngân hàng — bổ sung ở hồ sơ NCC/đội thợ' : `Ngân hàng "${stk.ten_ngan_hang}" chưa hỗ trợ tạo QR — chuyển khoản tay theo STK`;
  return { ...chuanSo(dxc), dong, lich_su_duyet: log, phieu, nguoi_nhan: stk, qr, qr_ly_do: qrLyDo };
}

// ---------- Tinh so tien tung loai (server tinh, khong nhan so tien tu client tru coc/ung) ----------
async function tinhQuyetToan(client, donHangId, nccId, boQuaId = 0) {
  const dong = await repo.dongCuaNcc(client, donHangId, nccId);
  // Gui lai: dong cu cua chinh de xuat nay da duoc xoa truoc khi tinh, nen chi can loai dong dang o de xuat KHAC.
  const chon = dong.filter((d) => SAN_SANG.includes(d.trang_thai) && !d.da_quyet_toan);
  if (!chon.length) throw new AppError(400, 'Chưa có dòng "Đã sẵn hàng" nào của NCC này chưa quyết toán');
  const ds = chon.map((d) => {
    const sl = Number(d.so_luong_can);
    const gia = Number(d.gia_chot);
    const vat = Number(d.vat_pct);
    return { id: d.id, so_luong: sl, don_gia: gia, vat_pct: vat, thanh_tien: Math.round(sl * gia * (1 + vat / 100)) };
  });
  const giaTriHang = ds.reduce((s, d) => s + d.thanh_tien, 0);
  const coc = await repo.cocCua(client, donHangId, nccId, boQuaId);
  // Tru phan coc DA DUYET chua tru vao quyet toan khac; khong tru qua gia tri hang.
  const cocTru = Math.min(giaTriHang, Math.max(0, coc.cocDuyet - coc.daTru));
  return { dong: ds, giaTriHang, cocTru, soTien: giaTriHang - cocTru };
}

// Lap de xuat quyet toan NCC cho cac dong san hang chua quyet toan (so tien he thong tinh, khong nhap tay).
// Mua hang goi ham nay ngay khi NCC bao san hang -> nguoi dung khong phai lap tay.
export async function taoQuyetToanNcc(client, { donHangId, nccId, nguoiId, ghiChu = null }) {
  const qt = await tinhQuyetToan(client, donHangId, nccId);
  const id = await repo.tao(client, { loai: 'quyet_toan', nccId, donHangId, nguoiId, giaTriHang: qt.giaTriHang, cocTru: qt.cocTru, soTien: qt.soTien, ghiChu });
  await repo.themDong(client, id, qt.dong); // trigger CSDL chan 1 dong vao 2 quyet toan
  return id;
}

// Lui "san hang" (bam nham): quyet toan CHUA duyet cua NCC trong don bi xoa theo; da duyet/da chi thi khong lui duoc.
export async function xoaQuyetToanChuaDuyet(client, donHangId, nccId) {
  const { rows } = await client.query(
    `DELETE FROM de_xuat_chi WHERE loai_chi = 'quyet_toan' AND don_hang_id = $1 AND ncc_id = $2 AND trang_thai IN ('cho_duyet', 'tu_choi')
     RETURNING id`,
    [donHangId, nccId],
  );
  return rows.map((r) => r.id);
}

export const thongBaoDeXuat = (id) => guiTelegramSauCommit(id);

// NCC tra loi don dat hang "xuat hang nhung yeu cau coc" -> sinh de xuat coc (cho Admin duyet), nguoi lap = nguoi dat hang.
export async function taoCocTuNcc(client, { donHangId, nccId, nguoiId, soTienCoc, ghiChu }) {
  const so = soTien(soTienCoc);
  await kiemTraCoc(client, donHangId, nccId, so);
  return repo.tao(client, { loai: 'coc', nccId, donHangId, nguoiId, soTien: so, ghiChu });
}

// Coc da chi (co bill): cac dong cua don dat hang dang "cho coc" -> San hang, NCC xuat hang, tu lap quyet toan phan con lai.
async function sauKhiChiCoc(client, c, nguoiId) {
  const dhId = await muaRepo.datHangTheoDxc(client, c.id);
  if (!dhId) return null;
  const dh = await muaRepo.khoaDatHang(client, dhId);
  if (dh.trang_thai !== 'cho_coc') return null;
  await muaRepo.doiDongDatHang(client, dhId, ['cho_coc'], 'san_hang', { nguoiId });
  await muaRepo.capNhatDatHang(client, dhId, { trang_thai: 'xuat_hang' });
  const qtId = await taoQuyetToanNcc(client, { donHangId: dh.don_hang_id, nccId: dh.ncc_id, nguoiId: dh.nguoi_dat_id, ghiChu: 'Tự động: cọc đã chi, NCC xuất hàng' });
  await thongBao.deXuatChi(client, qtId, 'moi', { nguoiGayId: nguoiId });
  await thongBao.gui(client, {
    nguoiIds: [dh.vanhanh_phu_trach_id, dh.nguoi_dat_id], nguoiGayId: nguoiId, loai: 'ncc_xuat_hang',
    tieuDe: `Đã chi cọc — ${dh.ncc} xuất hàng, vật tư đơn ${dh.ma_don} sẵn hàng`, link: `/mua-hang/don/${dh.don_hang_id}`,
  });
  return { qtId, dh };
}

async function kiemTraCoc(client, donHangId, nccId, so, boQuaId = 0) {
  const dong = await repo.dongCuaNcc(client, donHangId, nccId);
  const daDat = dong.filter((d) => DA_DAT.includes(d.trang_thai));
  if (!daDat.length) throw new AppError(400, 'Chỉ đề xuất cọc khi đã có dòng "Đã đặt hàng" với NCC này');
  // Lam tron tung dong ve dong (VND) truoc khi cong/so sanh: 40 x 180000 x 1.08 = 7776000.000000001 trong so thuc
  // -> neu khong lam tron, phep so sanh "coc >= gia tri hang" sai dung o ranh gioi.
  const giaTri = daDat.reduce((s, d) => s + Math.round(Number(d.so_luong_can) * Number(d.gia_chot) * (1 + Number(d.vat_pct) / 100)), 0);
  const coc = await repo.cocCua(client, donHangId, nccId, boQuaId);
  if (coc.cocHieuLuc + so >= giaTri) {
    throw new AppError(400, `Tổng cọc (${tien(coc.cocHieuLuc + so)}) phải nhỏ hơn giá trị hàng đã đặt (${tien(giaTri)})`);
  }
}

async function tinhTho(client, loai, thoId, don, so) {
  const sd = await repo.soDuThoTheoDon(client, thoId, don.id);
  if (!sd.so_giai_doan) throw new AppError(400, 'Đội thợ không làm giai đoạn nào của đơn này');
  if (loai === 'tra_cong') {
    if (!don.quyet_toan_luc) throw new AppError(409, 'Chỉ trả công khi đơn đã chốt quyết toán');
    const con = sd.phai_tra - sd.da_tra - sd.tam_ung - sd.thu_ho - sd.dang_cho;
    if (con <= 0) throw new AppError(400, 'Đội thợ không còn công cần trả cho đơn này');
    return con; // tra du phan con lai, server tinh
  }
  if (don.quyet_toan_luc) throw new AppError(409, 'Đơn đã quyết toán — dùng "Trả công"');
  const tran = Math.floor(sd.cong_du_kien * 0.5) - sd.tam_ung - sd.dang_cho;
  if (so > tran) throw new AppError(400, `Ứng công tối đa 50% công dự kiến — còn ứng được ${tien(Math.max(0, tran))}`);
  return so;
}

// ---------- Lap de xuat ----------
export async function taoDeXuat(user, body) {
  const loai = body.loai_chi;
  if (!LOAI.includes(loai)) throw new AppError(400, 'Loại chi không hợp lệ');
  const ghiChu = body.ghi_chu?.trim() || null;
  const id = await withTransaction(async (client) => {
    const moi = await taoTrongGiaoDich(client);
    await thongBao.deXuatChi(client, moi, 'moi', { nguoiGayId: user.id });
    return moi;
  });
  return guiTelegramSauCommit(id);

  async function taoTrongGiaoDich(client) {
    if (loai === 'chi_bo_sung') {
      const b = await repo.khoaMbs(client, Number(body.mua_bo_sung_id));
      if (!b) throw new AppError(404, 'Không tìm thấy phiếu mua bổ sung');
      if (b.trang_thai !== 'da_mua') throw new AppError(409, 'Phiếu mua bổ sung chưa mua xong');
      if (b.da_de_xuat) throw new AppError(409, 'Phiếu này đã có đề xuất chi');
      const t = Math.round(Number(b.tong));
      return repo.tao(client, { loai, nccId: b.ncc_id, donHangId: b.don_hang_id, mbsId: b.id, nguoiId: user.id, giaTriHang: t, soTien: t, ghiChu });
    }
    const don = await repo.khoaDon(client, Number(body.don_hang_id));
    if (!don) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (don.giai_doan === 'huy') throw new AppError(409, 'Đơn đã huỷ');
    if (loai === 'coc' || loai === 'quyet_toan') {
      const nccId = Number(body.ncc_id);
      if (loai === 'coc') {
        const so = soTien(body.so_tien);
        await kiemTraCoc(client, don.id, nccId, so);
        return repo.tao(client, { loai, nccId, donHangId: don.id, nguoiId: user.id, soTien: so, ghiChu });
      }
      return taoQuyetToanNcc(client, { donHangId: don.id, nccId, nguoiId: user.id, ghiChu });
    }
    const thoId = Number(body.doi_tho_id);
    const so = await tinhTho(client, loai, thoId, don, loai === 'ung_cong' ? soTien(body.so_tien) : 0);
    return repo.tao(client, { loai, thoId, donHangId: don.id, nguoiId: user.id, soTien: so, ghiChu });
  }
}

// Bi tu choi -> Ke toan sua (coc: so tien moi; quyet toan/tra cong: tinh lai) -> gui lai, ve "cho duyet".
export async function guiLai(user, id, body) {
  await withTransaction(async (client) => {
    const c = await repo.khoaDxc(client, id);
    if (!c) throw new AppError(404, 'Không tìm thấy đề xuất chi');
    if (c.trang_thai !== 'tu_choi') throw new AppError(409, 'Chỉ gửi lại đề xuất bị từ chối');
    const ghiChu = body.ghi_chu?.trim() || null;
    await thongBao.deXuatChi(client, id, 'gui_lai', { nguoiGayId: user.id, ghiChu }); // ghi truoc; so tien hien tai = so cu (thong bao chi bao co viec)
    if (c.loai_chi === 'coc') {
      const so = soTien(body.so_tien ?? c.so_tien);
      await kiemTraCoc(client, c.don_hang_id, c.ncc_id, so, c.id);
      return repo.capNhatSoTien(client, id, { giaTriHang: 0, cocTru: 0, soTien: so, ghiChu });
    }
    if (c.loai_chi === 'quyet_toan') {
      await repo.xoaDong(client, id);
      const qt = await tinhQuyetToan(client, c.don_hang_id, c.ncc_id, c.id);
      await repo.themDong(client, id, qt.dong);
      return repo.capNhatSoTien(client, id, { giaTriHang: qt.giaTriHang, cocTru: qt.cocTru, soTien: qt.soTien, ghiChu });
    }
    if (c.loai_chi === 'chi_bo_sung') return repo.capNhatSoTien(client, id, { giaTriHang: Number(c.gia_tri_hang), cocTru: 0, soTien: Number(c.so_tien), ghiChu });
    const don = await repo.khoaDon(client, c.don_hang_id);
    const so = await tinhTho(client, c.loai_chi, c.doi_tho_id, don, c.loai_chi === 'ung_cong' ? soTien(body.so_tien ?? c.so_tien) : 0);
    return repo.capNhatSoTien(client, id, { giaTriHang: 0, cocTru: 0, soTien: so, ghiChu });
  });
  return guiTelegramSauCommit(id);
}

// Gui Telegram SAU khi commit: Telegram loi khong lam mat de xuat (van duyet duoc tren web).
async function guiTelegramSauCommit(id) {
  let canhBao = null;
  if (tg.daCauHinh()) {
    try { await repo.luuTelegram(id, await tg.guiDeXuatChi(await chiTiet(id))); }
    catch (e) { console.error(e.message); canhBao = 'Không gửi được tin nhắn Telegram — có thể duyệt trực tiếp trên web'; }
  } else canhBao = 'Chưa cấu hình Telegram — Admin duyệt trực tiếp trên web';
  return { ...(await chiTiet(id)), canh_bao: canhBao };
}

// ---------- Duyet / tu choi / thu hoi (web + Telegram dung chung) ----------
async function xuLyDuyet({ id, hanhDong, nguoiDuyet, nguoiId, ghiChu }) {
  if (!['duyet', 'tu_choi'].includes(hanhDong)) throw new AppError(400, 'Hành động không hợp lệ');
  if (hanhDong === 'tu_choi' && !ghiChu) throw new AppError(400, 'Vui lòng ghi lý do từ chối');
  await withTransaction(async (client) => {
    const c = await repo.khoaDxc(client, id);
    if (!c) throw new AppError(404, 'Không tìm thấy đề xuất chi');
    // De xuat 0d (coc da tru het) duyet xong khong can chuyen tien -> coi nhu da chi.
    const den = hanhDong === 'tu_choi' ? 'tu_choi' : Number(c.so_tien) === 0 ? 'da_thanh_toan' : 'da_duyet';
    if (!(await repo.doiTrangThai(client, id, 'cho_duyet', den, hanhDong === 'tu_choi' ? ghiChu : null))) {
      throw new AppError(409, 'Đề xuất chi đã được xử lý trước đó');
    }
    await repo.ghiLogDuyet(client, { id, nguoiDuyet, nguoiId, hanhDong, ghiChu });
    await thongBao.deXuatChi(client, id, den === 'tu_choi' ? 'tu_choi' : den === 'da_thanh_toan' ? 'duyet_0d' : 'duyet', { nguoiGayId: nguoiId, ghiChu });
  });
  const dxc = await chiTiet(id);
  if (dxc.telegram_message_id && tg.daCauHinh()) {
    const kq = hanhDong === 'duyet' ? `✅ <b>Đã duyệt</b> bởi ${tg.esc(nguoiDuyet)}` : `❌ <b>Từ chối</b> bởi ${tg.esc(nguoiDuyet)}: ${tg.esc(ghiChu)}`;
    // Duyet xong (con phai chuyen tien) -> them nut cho Ke toan bao da chi ngay trong nhom.
    const nut = hanhDong === 'duyet' && dxc.trang_thai === 'da_duyet' ? tg.nutDaChi(dxc.id) : null;
    const loiNhac = nut ? '\n💳 Kế toán: quét QR chuyển khoản rồi bấm nút bên dưới, gửi ảnh bill.' : '';
    tg.capNhatTinNhan(dxc.telegram_chat_id, dxc.telegram_message_id, tg.noiDungDeXuatChi(dxc, kq + loiNhac), nut).catch((e) => console.error(e.message));
  }
  return dxc;
}

export const duyetTrenWeb = (user, id, { hanh_dong, ghi_chu }) =>
  xuLyDuyet({ id, hanhDong: hanh_dong, nguoiDuyet: `web:${user.ho_ten}`, nguoiId: user.id, ghiChu: ghi_chu?.trim() || null });

// Thu hoi (huy duyet) khi da duyet nhung CHUA chi: dong hang duoc giai phong de lap lai.
export async function thuHoi(user, id, { ly_do }) {
  const lyDo = ly_do?.trim();
  if (!lyDo) throw new AppError(400, 'Vui lòng ghi lý do thu hồi');
  await withTransaction(async (client) => {
    if (!(await repo.doiTrangThai(client, id, 'da_duyet', 'thu_hoi', lyDo))) throw new AppError(409, 'Chỉ thu hồi đề xuất đã duyệt mà chưa chi');
    await repo.ghiLogDuyet(client, { id, nguoiDuyet: `web:${user.ho_ten}`, nguoiId: user.id, hanhDong: 'tu_choi', ghiChu: `Thu hồi: ${lyDo}` });
    await thongBao.deXuatChi(client, id, 'thu_hoi', { nguoiGayId: user.id, ghiChu: lyDo });
  });
  const dxc = await chiTiet(id);
  suaTinDuyet(dxc, `↩️ <b>Admin thu hồi duyệt</b> (${tg.esc(user.ho_ten)}): ${tg.esc(lyDo)}`);
  return dxc;
}

// "Da chi": bat buoc anh bill/UNC. Chi cho tho -> ghi so tho (da_tra / tam_ung).
export async function daChi(user, id, { bill }, kenh = 'web') {
  const ten = await luuAnhBase64(bill, 'bill');
  let sauCoc = null;
  try {
    await withTransaction(async (client) => {
      const c = await repo.khoaDxc(client, id);
      if (!c) throw new AppError(404, 'Không tìm thấy đề xuất chi');
      if (c.trang_thai !== 'da_duyet') throw new AppError(409, 'Chỉ xác nhận đã chi cho đề xuất đã duyệt');
      const stk = await repo.stkNguoiNhan(client, c);
      await repo.taoPhieu(client, {
        id, maQr: stk ? linkVietQr(stk, Number(c.so_tien), c.noi_dung_ck) : null, soTien: c.so_tien, nguoiId: user.id, noiDung: c.noi_dung_ck, bill: ten,
      });
      await repo.doiTrangThai(client, id, 'da_duyet', 'da_thanh_toan');
      await thongBao.deXuatChi(client, id, 'da_chi', { nguoiGayId: user.id });
      if (c.loai_chi === 'coc') sauCoc = await sauKhiChiCoc(client, c, user.id);
      if (c.doi_tho_id) {
        await repo.ghiGiaoDichTho(client, {
          thoId: c.doi_tho_id, donHangId: c.don_hang_id, loai: c.loai_chi === 'tra_cong' ? 'da_tra' : 'tam_ung',
          soTien: c.so_tien, dxcId: id, ghiChu: `${c.loai_chi === 'tra_cong' ? 'Trả công' : 'Ứng công'} theo DXC-${id}`,
        });
      }
    });
  } catch (e) {
    await fs.unlink(duongDanAnh(ten).file).catch(() => {}); // giao dich loi -> xoa anh vua luu
    throw e;
  }
  const dxc = await chiTiet(id);
  suaTinDuyet(dxc, `💸 <b>Đã chi</b> bởi ${tg.esc(user.ho_ten)}${kenh === 'telegram' ? ' (qua Telegram)' : ''}`);
  if (sauCoc) {
    await guiTelegramSauCommit(sauCoc.qtId); // quyet toan phan con lai -> nhom duyet chi
    if (sauCoc.dh.tg_message_id && tg.daCauHinhNcc()) {
      tg.guiTin(sauCoc.dh.tg_chat_id, `✅ <b>ĐH-${sauCoc.dh.id}</b>: công ty đã chuyển cọc <b>${tien(sauCoc.dh.so_tien_coc)}</b>. Đề nghị xuất hàng.`, sauCoc.dh.tg_message_id)
        .catch((e) => console.error('Telegram NCC:', e.message));
    }
  }
  return dxc;
}

export async function anhBill(id) {
  const phieu = await repo.phieuCua(id);
  const f = duongDanAnh(phieu?.bill_anh);
  if (!f) throw new AppError(404, 'Không có ảnh bill');
  return f;
}

export async function xoa(id) {
  if (!(await repo.xoa(id))) throw new AppError(409, 'Chỉ xoá được đề xuất chờ duyệt hoặc bị từ chối');
}

// ---------- Telegram ----------
// Tai khoan ERP gan voi Telegram (Admin gan o trang Nguoi dung). Dung de biet AI duyet / AI chi.
async function nguoiDungTheoTelegram(username, vaiTro) {
  if (!username) return null;
  const { rows } = await query(
    `SELECT id, ho_ten, vai_tro FROM users WHERE lower(telegram_username) = lower($1) AND trang_thai = 'active' AND vai_tro::text = ANY($2)`,
    [username, vaiTro],
  );
  return rows[0] || null;
}

// Sua tin de xuat trong nhom duyet chi (bo nut) sau khi thu hoi / da chi. Loi Telegram khong anh huong nghiep vu.
function suaTinDuyet(dxc, ketQua) {
  if (!dxc.telegram_message_id || !tg.daCauHinh()) return;
  tg.capNhatTinNhan(dxc.telegram_chat_id, dxc.telegram_message_id, tg.noiDungDeXuatChi(dxc, ketQua)).catch((e) => console.error('Telegram:', e.message));
}

export async function xuLyUpdateTelegram(update) {
  const cb = update?.callback_query;
  if (!cb) return;
  const m = /^dxc:(\d+):(duyet|tu_choi|chi)$/.exec(cb.data || '');
  if (!m) return tg.traLoiNut(cb.id, 'Nút không hợp lệ');
  if (String(cb.message?.chat?.id) !== String(process.env.TELEGRAM_CHAT_ID_DUYET)) return tg.traLoiNut(cb.id, 'Không đúng nhóm duyệt chi');
  const dxc = await repo.findDxc(Number(m[1]));
  if (!dxc || String(cb.message?.message_id) !== dxc.telegram_message_id) return tg.traLoiNut(cb.id, 'Không tìm thấy đề xuất chi');
  if (m[2] === 'chi') {
    // Chi Ke toan da gan Telegram trong ERP moi bao chi duoc (phieu chi phai gan voi 1 nguoi dung that).
    const keToan = await nguoiDungTheoTelegram(cb.from?.username, ['ke_toan']);
    if (!keToan) return tg.traLoiNut(cb.id, 'Tài khoản Telegram này chưa gắn với Kế toán trong ERP (Admin gắn ở trang Người dùng)');
    if (dxc.trang_thai !== 'da_duyet') return tg.traLoiNut(cb.id, 'Đề xuất không ở trạng thái chờ chi');
    const hoiId = await tg.hoiAnhBill(cb.message.chat.id, cb.message.message_id, dxc.id);
    await query('UPDATE de_xuat_chi SET tg_hoi_bill_message_id = $2 WHERE id = $1', [dxc.id, hoiId]);
    return tg.traLoiNut(cb.id, 'Trả lời tin nhắn của bot bằng ảnh bill');
  }
  // Duyet: username trong TELEGRAM_NGUOI_DUYET hoac tai khoan Admin da gan Telegram.
  const admin = await nguoiDungTheoTelegram(cb.from?.username, ['admin']);
  if (!admin && !tg.duocDuyet(cb.from?.username)) return tg.traLoiNut(cb.id, 'Bạn không có quyền duyệt chi');
  try {
    // Tu choi tren Telegram: ghi ly do mac dinh, nguoi duyet bo sung chi tiet tren web neu can.
    await xuLyDuyet({ id: dxc.id, hanhDong: m[2], nguoiDuyet: `@${cb.from.username}`, nguoiId: admin?.id ?? null, ghiChu: m[2] === 'tu_choi' ? 'Từ chối qua Telegram' : null });
    return tg.traLoiNut(cb.id, m[2] === 'duyet' ? 'Đã duyệt' : 'Đã từ chối');
  } catch (e) {
    return tg.traLoiNut(cb.id, e instanceof AppError ? e.message : 'Lỗi xử lý, vui lòng duyệt trên web');
  }
}

// Ke toan tra loi tin "gui anh bill" bang anh -> ghi nhan da chi (giong bam tren web). Tra true neu tin nay la anh bill.
export async function xuLyAnhBill(msg) {
  if (String(msg.chat?.id) !== String(process.env.TELEGRAM_CHAT_ID_DUYET)) return false;
  const { rows } = await query('SELECT id FROM de_xuat_chi WHERE tg_hoi_bill_message_id = $1', [String(msg.reply_to_message.message_id)]);
  if (!rows[0]) return false;
  const id = rows[0].id;
  const keToan = await nguoiDungTheoTelegram(msg.from?.username, ['ke_toan']);
  if (!keToan) { await tg.guiTin(msg.chat.id, '⛔ Tài khoản Telegram này chưa gắn với Kế toán trong ERP.', msg.message_id).catch(() => {}); return true; }
  // Anh nen (photo: lay ban lon nhat) hoac file anh gui dang tai lieu.
  const fileId = msg.photo?.length ? msg.photo[msg.photo.length - 1].file_id : (msg.document?.mime_type?.startsWith('image/') ? msg.document.file_id : null);
  if (!fileId) { await tg.guiTin(msg.chat.id, '⚠️ Cần gửi ẢNH bill (trả lời lại tin nhắn của bot).', msg.message_id).catch(() => {}); return true; }
  try {
    const buf = await tg.taiFile(fileId);
    await daChi(keToan, id, { bill: { data: buf.toString('base64') } }, 'telegram');
    await tg.guiTin(msg.chat.id, `✅ Đã ghi nhận chi DXC-${id} (${tg.esc(keToan.ho_ten)}).`, msg.message_id);
  } catch (e) {
    await tg.guiTin(msg.chat.id, `⚠️ ${tg.esc(e instanceof AppError ? e.message : 'Lỗi xử lý, vui lòng xác nhận chi trên web')}`, msg.message_id).catch(() => {});
    if (!(e instanceof AppError)) console.error('Telegram bill:', e.message);
  }
  return true;
}

export function dungSecret(nhan) {
  const that = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  if (!that || typeof nhan !== 'string') return false;
  const a = Buffer.from(nhan);
  const b = Buffer.from(that);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- Cong no ----------
export async function congNoNcc() {
  const rows = (await repo.congNoNcc()).map((r) => {
    const x = { ...r, tien_hang: Number(r.tien_hang), da_chi: Number(r.da_chi), cho_chi: Number(r.cho_chi), cho_duyet: Number(r.cho_duyet) };
    const con = x.tien_hang - x.da_chi;
    // Giong ERP: con phai tra / chi thua (chi truoc = coc chua co hang) / da thanh toan du (dung sai 1d).
    return { ...x, con_phai_tra: Math.max(0, con), chi_thua: Math.max(0, -con), trang_thai: con > 1 ? 'con_phai_tra' : con < -1 ? 'chi_thua' : 'da_thanh_toan_du' };
  });
  const cong = (k) => rows.reduce((s, r) => s + r[k], 0);
  return {
    tong: { tien_hang: cong('tien_hang'), da_chi: cong('da_chi'), con_phai_tra: cong('con_phai_tra'), chi_thua: cong('chi_thua'), cho_chi: cong('cho_chi'), cho_duyet: cong('cho_duyet') },
    ncc: rows.sort((a, b) => b.con_phai_tra - a.con_phai_tra || b.chi_thua - a.chi_thua),
    telegram: { da_cau_hinh: tg.daCauHinh() },
  };
}

export const congNoNccTheoDon = async (nccId) => (await repo.congNoNccTheoDon(nccId)).map((r) => ({
  ...r, tien_hang: Number(r.tien_hang), da_chi: Number(r.da_chi), con: Number(r.tien_hang) - Number(r.da_chi),
}));

export async function congNoTho() {
  return (await repo.congNoTho()).map((r) => {
    const x = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, ['doi_tho', 'sdt'].includes(k) ? v : Number(v)]));
    return { ...x, con_phai_tra: x.phai_tra - x.da_tra - x.tam_ung - x.thu_ho };
  });
}

export const soTho = async (thoId) => (await repo.soTho(thoId)).map((r) => ({ ...r, so_tien: Number(r.so_tien) }));
