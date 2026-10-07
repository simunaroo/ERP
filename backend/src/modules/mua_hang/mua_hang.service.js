import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './mua_hang.repository.js';
import { damBaoPhuTrach, vanHanhCua } from '../don_hang/don_hang.service.js';
import { taoQuyetToanNcc, thongBaoDeXuat, xoaQuyetToanChuaDuyet } from '../cong_no/cong_no.service.js';
import * as thongBao from '../thong_bao/thong_bao.service.js';

const homNay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const chu = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const so = (n) => (n === null || n === undefined ? null : Number(n));

// Trang thai dong mua KHONG chon tay tung dong — suy ra tu thao tac:
//   chon NCC -> dang_hoi ("Da chon NCC"), bo NCC -> cho_xu_ly
//   nut "Dat hang" theo NCC -> da_dat_hang;  nut "NCC bao san hang" theo NCC -> san_hang
//   nut "Da lay hang" (buoc Giao hang) -> da_lay_hang;  roi buoc Giao hang -> da_giao_hang
const TRANG_THAI_KHOA = ['da_lay_hang', 'da_giao_hang'];
const CO_NCC = ['da_dat_hang', 'san_hang', 'da_lay_hang', 'da_giao_hang'];
const LOC = ['san_sang', 'dang_chuan_bi', 'chua_xu_ly'];
export const LOAI_MBS = ['hang_hong', 'giao_thieu_sai', 'boc_khoi_luong_thieu', 'tho_lam_hong', 'khach_bo_sung', 'mat_hang', 'khac'];
export const NGUON = ['ncc', 'van_chuyen', 'tho', 'khao_sat', 'sale', 'khach_hang', 'cong_ty', 'chua_xac_dinh'];

export async function dsDon(user, q) {
  if (q.loc && !LOC.includes(q.loc)) throw new AppError(400, 'Bộ lọc không hợp lệ');
  await repo.dongBo();
  return repo.dsDon({ loc: q.loc, tuKhoa: chu(q.q), vanHanhId: vanHanhCua(user) });
}

// Chi tiet mua hang cua 1 don: tung dong (kem top NCC re nhat hom nay) + bang tong theo NCC + de xuat chi.
export async function chiTietDon(user, donHangId) {
  const don = await repo.donCoBan(donHangId);
  if (!don || don.trang_thai === 'nhap') throw new AppError(404, 'Không tìm thấy đơn hàng');
  await damBaoPhuTrach(user, donHangId);
  await repo.dongBo(donHangId);
  const [dong, dxc, mbs] = await Promise.all([repo.dongCuaDon(donHangId), repo.deXuatChiCuaDon(donHangId), repo.dsMuaBoSung({ donHangId })]);
  const gia = await repo.giaHomNay([...new Set(dong.map((d) => d.vat_tu_id))], homNay());
  const ds = dong.map((d) => {
    const lua = gia.filter((g) => g.vat_tu_id === d.vat_tu_id).map((g) => ({ ncc_id: g.ncc_id, ncc: g.ncc, don_gia: Number(g.don_gia) }));
    const sl = Number(d.so_luong_can);
    const thanhTien = d.gia_chot === null ? null : Math.round(sl * Number(d.gia_chot) * (1 + Number(d.vat_pct) / 100));
    return {
      ...d, so_luong_can: sl, gia_chot: so(d.gia_chot), vat_pct: Number(d.vat_pct), thanh_tien: thanhTien,
      top_ncc: lua.slice(0, 3), gia_ncc: lua,
      // Khoa sua NCC/gia khi dong da nam trong de xuat quyet toan con hieu luc (tru khi bi tu choi), hoac da lay/giao.
      khoa: TRANG_THAI_KHOA.includes(d.trang_thai) || (d.dxc_quyet_toan_id && d.dxc_quyet_toan_trang_thai !== 'tu_choi'),
    };
  });

  // Bang tong theo NCC: tien hang (gom VAT) cac dong da dat tro di, coc dang hieu luc, quyet toan.
  const theoNcc = new Map();
  for (const d of ds.filter((x) => x.ncc_id && x.trang_thai !== 'huy')) {
    if (!theoNcc.has(d.ncc_id)) theoNcc.set(d.ncc_id, { ncc_id: d.ncc_id, ncc: d.ncc, so_dong: 0, tien_hang: 0, dong_da_dat: 0, dong_san_sang: 0, dong_cho_dat: 0, dong_cho_san: 0 });
    const n = theoNcc.get(d.ncc_id);
    n.so_dong++;
    n.tien_hang += d.thanh_tien || 0;
    if (CO_NCC.includes(d.trang_thai)) n.dong_da_dat++;
    if (d.trang_thai === 'dang_hoi') n.dong_cho_dat++;
    if (['dang_hoi', 'da_dat_hang'].includes(d.trang_thai)) n.dong_cho_san++;
    if (['san_hang', 'da_lay_hang', 'da_giao_hang'].includes(d.trang_thai)) n.dong_san_sang++;
  }
  const dxcSo = dxc.map((c) => ({ ...c, gia_tri_hang: Number(c.gia_tri_hang), coc_da_tru: Number(c.coc_da_tru), so_tien: Number(c.so_tien) }));
  const nccTong = [...theoNcc.values()].map((n) => {
    const cuaNcc = dxcSo.filter((c) => c.ncc_id === n.ncc_id && !c.mua_bo_sung_id);
    return {
      ...n,
      coc: cuaNcc.filter((c) => c.loai_chi === 'coc' && ['da_duyet', 'da_thanh_toan'].includes(c.trang_thai)).reduce((s, c) => s + c.so_tien, 0),
      de_xuat: cuaNcc,
      // Coc: khi co dong da dat hang; Quyet toan: khi co dong san hang chua nam trong quyet toan nao.
      duoc_coc: n.dong_da_dat > 0,
      duoc_quyet_toan: ds.some((d) => d.ncc_id === n.ncc_id && ['san_hang', 'da_lay_hang', 'da_giao_hang'].includes(d.trang_thai) && !d.dxc_quyet_toan_id),
    };
  });
  const conDong = ds.filter((d) => d.trang_thai !== 'huy');
  return {
    don, dong: ds, ncc: nccTong, mua_bo_sung: mbs,
    tong_dong: conDong.length,
    dong_san_sang: conDong.filter((d) => ['san_hang', 'da_lay_hang', 'da_giao_hang'].includes(d.trang_thai)).length,
  };
}

// Chon NCC / VAT / trang thai cho 1 dong. Gia chot = bang gia hom nay (hoac gia nhap tay), chup lai vao dong.
export async function capNhatDong(user, id, body) {
  return withTransaction(async (client) => {
    const d = await repo.khoaDong(client, id);
    if (!d) throw new AppError(404, 'Không tìm thấy dòng mua hàng');
    await damBaoPhuTrach(user, d.don_hang_id, client);
    if (['hoan_tat', 'huy'].includes(d.giai_doan)) throw new AppError(409, 'Đơn đã đóng');
    if (TRANG_THAI_KHOA.includes(d.trang_thai)) throw new AppError(409, 'Hàng đã lấy/giao — sai sót xử lý bằng Mua bổ sung');

    const nccId = body.ncc_id === undefined ? d.ncc_id : (body.ncc_id ? Number(body.ncc_id) : null);
    const vat = body.vat_pct === undefined ? Number(d.vat_pct) : Number(body.vat_pct);
    const doiNcc = nccId !== d.ncc_id;
    const doiGia = body.gia_chot !== undefined || doiNcc || vat !== Number(d.vat_pct);
    if (d.trang_thai === 'huy' && body.huy !== false) throw new AppError(409, 'Dòng đã huỷ — khôi phục trước khi sửa');
    if (body.huy === true && d.khoa_quyet_toan) throw new AppError(409, 'Dòng đã nằm trong đề xuất quyết toán — không huỷ được');
    // Doi NCC = dat lai tu dau voi NCC moi (don dat voi NCC cu coi nhu bo).
    let trangThai = d.trang_thai;
    if (doiNcc || body.huy === false) trangThai = nccId ? 'dang_hoi' : 'cho_xu_ly';
    if (body.huy === true) trangThai = 'huy';
    if (!Number.isFinite(vat) || vat < 0 || vat > 20) throw new AppError(400, 'VAT phải từ 0 đến 20%');
    // Giong ERP: dong da nam trong de xuat quyet toan -> khoa NCC, gia, VAT; da co coc voi NCC -> khoa NCC.
    if (d.khoa_quyet_toan && doiGia) throw new AppError(409, 'Dòng đã nằm trong đề xuất quyết toán — muốn sửa NCC/giá phải từ chối đề xuất đó trước');
    if (d.khoa_coc && doiNcc) throw new AppError(409, 'Đã có đề xuất cọc với NCC này — không đổi NCC được');

    let gia = d.gia_chot === null ? null : Number(d.gia_chot);
    if (doiNcc) gia = nccId ? await repo.giaMot(client, nccId, d.vat_tu_id, homNay()) : null;
    if (nccId && doiNcc && gia === null) throw new AppError(400, 'Nhà cung cấp chưa có giá hiệu lực hôm nay cho vật tư này');
    if (body.gia_chot !== undefined && body.gia_chot !== null && body.gia_chot !== '') {
      gia = Number(body.gia_chot);
      if (!Number.isFinite(gia) || gia < 0) throw new AppError(400, 'Giá chốt không hợp lệ');
    }
    return repo.capNhatDong(client, id, {
      ncc_id: nccId, gia_chot: nccId ? gia : null, vat_pct: vat, trang_thai: trangThai,
      ghi_chu: body.ghi_chu === undefined ? d.ghi_chu : chu(body.ghi_chu), nguoiId: user.id,
    });
  });
}

// Thao tac theo NCC (1 lan cho moi dong cua NCC do trong don), thay vi doi trang thai tung dong:
//   dat_hang: Da chon NCC -> Da dat hang (sau khi goi/gui don cho NCC)
//   san_hang: Da chon NCC / Da dat hang -> San hang (NCC bao co hang; NCC co san kho thi bam thang)
//   lui:      bam nham -> lui 1 nac (quyet toan chua duyet bi xoa theo; da duyet/da chi hoac NCC da co coc thi khong lui)
// San hang -> TU LAP de xuat quyet toan NCC (cho Admin duyet), giong ERP: mua hang xong la sinh de xuat chi.
const HANH_DONG_NCC = {
  dat_hang: { tu: ['dang_hoi'], den: 'da_dat_hang', nhan: 'đặt hàng' },
  san_hang: { tu: ['dang_hoi', 'da_dat_hang'], den: 'san_hang', nhan: 'sẵn hàng' },
};
export async function thaoTacNcc(user, donHangId, nccId, hanhDong) {
  if (!nccId) throw new AppError(400, 'Chọn nhà cung cấp');
  if (hanhDong !== 'lui' && !HANH_DONG_NCC[hanhDong]) throw new AppError(400, 'Thao tác không hợp lệ');
  const kq = await withTransaction(async (client) => {
    const don = await repo.khoaDon(client, donHangId);
    if (!don || don.trang_thai === 'nhap') throw new AppError(404, 'Không tìm thấy đơn hàng');
    await damBaoPhuTrach(user, donHangId, client);
    if (['hoan_tat', 'huy'].includes(don.giai_doan)) throw new AppError(409, 'Đơn đã đóng');
    let soDong;
    let deXuatId = null;
    let daXoa = [];
    if (hanhDong === 'lui') {
      daXoa = await xoaQuyetToanChuaDuyet(client, donHangId, nccId);
      soDong = await repo.doiTrangThaiTheoNcc(client, { donHangId, nccId, tu: ['san_hang'], den: 'da_dat_hang', nguoiId: user.id, boQuaQuyetToan: true });
      if (!soDong) {
        if (await repo.coCocHieuLuc(client, donHangId, nccId)) throw new AppError(409, 'Đã có đề xuất cọc với NCC này — không lùi về chưa đặt được');
        soDong = await repo.doiTrangThaiTheoNcc(client, { donHangId, nccId, tu: ['da_dat_hang'], den: 'dang_hoi', nguoiId: user.id });
      }
      if (!soDong) throw new AppError(409, 'Không có dòng nào lùi được (đề xuất quyết toán đã duyệt/đã chi — liên hệ Admin thu hồi)');
    } else {
      const h = HANH_DONG_NCC[hanhDong];
      soDong = await repo.doiTrangThaiTheoNcc(client, { donHangId, nccId, tu: h.tu, den: h.den, nguoiId: user.id });
      if (!soDong) throw new AppError(409, `Không có dòng nào của NCC này để chuyển sang ${h.nhan}`);
      if (hanhDong === 'san_hang') {
        deXuatId = await taoQuyetToanNcc(client, { donHangId, nccId, nguoiId: user.id, ghiChu: 'Tự động khi NCC báo sẵn hàng' });
        await thongBao.deXuatChi(client, deXuatId, 'moi', { nguoiGayId: user.id, ghiChu: 'Tự lập khi NCC báo sẵn hàng' });
      }
    }
    return { so_dong: soDong, deXuatId, daXoa };
  });
  // Gui Telegram cho Admin SAU commit (giong lap tay).
  const deXuat = kq.deXuatId ? await thongBaoDeXuat(kq.deXuatId) : null;
  return { so_dong: kq.so_dong, de_xuat: deXuat, da_xoa_de_xuat: kq.daXoa };
}

// Don dang giao hang: xac nhan da lay hang cua 1 NCC.
export async function layHang(user, donHangId, nccId) {
  await damBaoPhuTrach(user, donHangId);
  const don = await repo.donCoBan(donHangId);
  if (!don) throw new AppError(404, 'Không tìm thấy đơn hàng');
  if (don.giai_doan !== 'giao_hang') throw new AppError(409, 'Chỉ xác nhận lấy hàng khi đơn ở bước Giao hàng');
  const soDong = await repo.layHang(donHangId, nccId);
  if (!soDong) throw new AppError(409, 'Không có dòng sẵn hàng nào của nhà cung cấp này');
  return { so_dong: soDong };
}

// ---------- Mua bo sung ----------
export const dsMuaBoSung = (user, q) => repo.dsMuaBoSung({ trangThai: q.trang_thai, donHangId: q.don_hang_id ? Number(q.don_hang_id) : null, vanHanhId: vanHanhCua(user) });

export async function taoMuaBoSung(user, body) {
  if (!LOAI_MBS.includes(body.loai_phat_sinh)) throw new AppError(400, 'Chọn loại phát sinh');
  const lyDo = chu(body.ly_do);
  if (!lyDo) throw new AppError(400, 'Vui lòng ghi lý do mua bổ sung');
  const nguon = [...new Set(body.nguon || [])];
  if (!nguon.length || nguon.some((n) => !NGUON.includes(n))) throw new AppError(400, 'Chọn ít nhất một nguồn trách nhiệm hợp lệ');
  const dong = (body.dong || []).map((x) => ({ vat_tu_id: Number(x.vat_tu_id), so_luong: Number(x.so_luong) }));
  if (!dong.length || dong.some((x) => !x.vat_tu_id || !(x.so_luong > 0))) throw new AppError(400, 'Thêm ít nhất một vật tư với số lượng > 0');
  const don = await repo.donCoBan(Number(body.don_hang_id));
  if (!don) throw new AppError(404, 'Không tìm thấy đơn hàng');
  await damBaoPhuTrach(user, don.id);
  if (!['giao_hang', 'thi_cong', 'nghiem_thu', 'quyet_toan'].includes(don.giai_doan)) {
    throw new AppError(409, 'Mua bổ sung khi đơn đã giao hàng/thi công (trước đó hãy sửa số lượng trong đơn)');
  }
  return withTransaction(async (client) => {
    const id = await repo.taoMuaBoSung(client, { donHangId: don.id, loai: body.loai_phat_sinh, lyDo, nguoiId: user.id, dong, nguon });
    await thongBao.gui(client, {
      vaiTro: ['ke_toan'], nguoiGayId: user.id, loai: 'mua_bo_sung',
      tieuDe: `Cần mua bổ sung MBS-${id} cho đơn ${don.ma_don}`, noiDung: lyDo, link: '/mua-hang/bo-sung',
    });
    return id;
  });
}

// Da mua: chon NCC, chot gia tung dong (mac dinh bang gia), chia trach nhiem - tong phai bang tien hang.
export async function daMuaBoSung(user, id, body) {
  const nccId = Number(body.ncc_id);
  if (!nccId) throw new AppError(400, 'Chọn nhà cung cấp');
  return withTransaction(async (client) => {
    const b = await repo.khoaMuaBoSung(client, id);
    if (!b) throw new AppError(404, 'Không tìm thấy phiếu mua bổ sung');
    if (b.trang_thai !== 'cho_xu_ly') throw new AppError(409, 'Phiếu đã xử lý');
    const dong = await repo.dongMuaBoSung(client, id);
    const giaNhap = new Map((body.dong || []).map((x) => [Number(x.id), x.don_gia]));
    const gia = [];
    let tong = 0;
    for (const x of dong) {
      let g = giaNhap.get(x.id);
      g = g === undefined || g === '' || g === null ? await repo.giaMot(client, nccId, x.vat_tu_id, homNay()) : Number(g);
      if (g === null || !Number.isFinite(g) || g < 0) throw new AppError(400, 'Có vật tư chưa có giá — nhập giá hoặc chọn NCC khác');
      gia.push([x.id, g]);
      tong += Number(x.so_luong) * g;
    }
    const trachNhiem = (body.trach_nhiem || []).map((t) => ({ nguon: t.nguon, so_tien: Number(t.so_tien) || 0 })).filter((t) => t.so_tien > 0);
    if (!trachNhiem.length || trachNhiem.some((t) => !NGUON.includes(t.nguon) || t.so_tien < 0)) throw new AppError(400, 'Chia tiền trách nhiệm cho ít nhất một nguồn');
    const cong = trachNhiem.reduce((s, t) => s + t.so_tien, 0);
    if (Math.abs(cong - tong) > 1) throw new AppError(400, `Tổng tiền trách nhiệm (${Math.round(cong).toLocaleString('vi-VN')}) phải bằng tiền hàng (${Math.round(tong).toLocaleString('vi-VN')})`);
    await repo.chotMuaBoSung(client, id, { nccId, gia, trachNhiem });
    const { rows } = await client.query('SELECT ma_don, vanhanh_phu_trach_id, id AS don_id FROM don_hang WHERE id = $1', [b.don_hang_id]);
    await thongBao.gui(client, {
      nguoiIds: [rows[0].vanhanh_phu_trach_id, b.nguoi_tao_id], nguoiGayId: user.id, loai: 'mua_bo_sung_xong',
      tieuDe: `Đã mua bổ sung MBS-${id} — đơn ${rows[0].ma_don}`, link: `/mua-hang/don/${rows[0].don_id}`,
    });
    return { id, tong_tien: Math.round(tong) };
  });
}

export async function huyMuaBoSung(id) {
  if (!(await repo.huyMuaBoSung(id))) throw new AppError(409, 'Chỉ huỷ được phiếu chưa mua');
}
