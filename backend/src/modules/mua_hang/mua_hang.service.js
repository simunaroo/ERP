import { query, withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './mua_hang.repository.js';
import { damBaoPhuTrach, vanHanhCua } from '../don_hang/don_hang.service.js';
import { taoCocTuNcc, taoQuyetToanNcc, thongBaoDeXuat, xoaQuyetToanChuaDuyet } from '../cong_no/cong_no.service.js';
import * as tg from '../../integrations/telegram.client.js';
import * as thongBao from '../thong_bao/thong_bao.service.js';

const homNay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const chu = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const so = (n) => (n === null || n === undefined ? null : Number(n));

// Trang thai dong mua KHONG chon tay tung dong — suy ra tu thao tac:
//   chon NCC -> dang_hoi ("Da chon NCC"), bo NCC -> cho_xu_ly
//   nut "Dat hang" theo NCC -> da_dat_hang (gui don dat hang cho NCC)
//   NCC phan hoi: cho xuat -> san_hang | yeu cau coc -> cho_coc -> (coc da chi) san_hang
//   nut "Da lay hang" (buoc Giao hang) -> da_lay_hang;  roi buoc Giao hang -> da_giao_hang
const TRANG_THAI_KHOA = ['da_lay_hang', 'da_giao_hang'];
const CO_NCC = ['da_dat_hang', 'cho_coc', 'san_hang', 'da_lay_hang', 'da_giao_hang'];
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
  const [dong, dxc, mbs, dsDatHang] = await Promise.all([repo.dongCuaDon(donHangId), repo.deXuatChiCuaDon(donHangId), repo.dsMuaBoSung({ donHangId }), repo.datHangCuaDon(donHangId)]);
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
    if (!theoNcc.has(d.ncc_id)) theoNcc.set(d.ncc_id, { ncc_id: d.ncc_id, ncc: d.ncc, so_dong: 0, tien_hang: 0, dong_da_dat: 0, dong_san_sang: 0, dong_cho_dat: 0 });
    const n = theoNcc.get(d.ncc_id);
    n.so_dong++;
    n.tien_hang += d.thanh_tien || 0;
    if (CO_NCC.includes(d.trang_thai)) n.dong_da_dat++;
    // Cho dat = da chon NCC; dong cu "da dat hang" chua co don dat hang (du lieu truoc khi co tinh nang) cung dat lai duoc.
    if (d.trang_thai === 'dang_hoi' || (d.trang_thai === 'da_dat_hang' && !d.dat_hang_ncc_id)) n.dong_cho_dat++;
    if (['san_hang', 'da_lay_hang', 'da_giao_hang'].includes(d.trang_thai)) n.dong_san_sang++;
  }
  const dxcSo = dxc.map((c) => ({ ...c, gia_tri_hang: Number(c.gia_tri_hang), coc_da_tru: Number(c.coc_da_tru), so_tien: Number(c.so_tien) }));
  const nccTong = [...theoNcc.values()].map((n) => {
    const cuaNcc = dxcSo.filter((c) => c.ncc_id === n.ncc_id && !c.mua_bo_sung_id);
    return {
      ...n,
      coc: cuaNcc.filter((c) => c.loai_chi === 'coc' && ['da_duyet', 'da_thanh_toan'].includes(c.trang_thai)).reduce((s, c) => s + c.so_tien, 0),
      de_xuat: cuaNcc,
      dat_hang: dsDatHang.filter((h) => h.ncc_id === n.ncc_id),
      // Quyet toan lap tay (du phong): khi co dong san hang chua nam trong quyet toan nao.
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
    if (d.dat_hang_ncc_id && ['da_dat_hang', 'cho_coc'].includes(d.trang_thai) && (doiGia || body.huy === true)) {
      throw new AppError(409, `Đã gửi đơn đặt hàng ĐH-${d.dat_hang_ncc_id} cho NCC — huỷ đơn đặt hàng trước khi đổi NCC/giá hoặc huỷ dòng`);
    }
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

// ---------- Dat hang NCC (thay cho doi trang thai tay) ----------
// Da chon NCC -[Dat hang]-> Da dat hang: sinh "don dat hang" (van ban chep gui NCC + gui nhom Telegram NCC neu co)
//   NCC "Cho xuat hang"           -> San hang + tu lap de xuat quyet toan
//   NCC "Xuat hang - yeu cau coc" -> Cho coc + tu lap de xuat coc -> Admin duyet -> Ke toan chi (bill) -> San hang + quyet toan phan con lai
// NCC tra loi qua Telegram (nut bam) hoac qua dien thoai/Zalo (nguoi mua ghi nhan tren web) - dung chung 1 ham.
const tienVn = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')} đ`;
const slVn = (n) => Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const thanhTien = (d) => Math.round(Number(d.so_luong_can) * Number(d.gia_chot) * (1 + Number(d.vat_pct) / 100));

// Khong dua ten/SDT/dia chi khach vao don gui NCC (NCC khong can, tranh lo thong tin khach).
function noiDungDatHang({ id, ncc, don, dong, tong, nguoiDat }) {
  const han = don.ngay_yc_lap_dat ? ` · cần hàng trước ${new Date(don.ngay_yc_lap_dat).toLocaleDateString('vi-VN')}` : '';
  return [
    `ĐƠN ĐẶT HÀNG ĐH-${id} — Công ty NST`,
    `Gửi: ${ncc}`,
    `Mã công trình: ${don.ma_don}${han}`,
    '',
    ...dong.map((d, i) => `${i + 1}. ${d.vat_tu}${d.quy_cach ? ` (${d.quy_cach})` : ''}: ${slVn(d.so_luong_can)} ${d.don_vi_tinh} × ${tienVn(d.gia_chot)}`
      + `${Number(d.vat_pct) ? ` + VAT ${Number(d.vat_pct)}%` : ''} = ${tienVn(thanhTien(d))}`),
    '',
    `Tổng cộng (gồm VAT): ${tienVn(tong)}`,
    `Người đặt: ${nguoiDat}`,
    'Vui lòng xác nhận: CHO XUẤT HÀNG, hoặc XUẤT HÀNG – YÊU CẦU CỌC (kèm số tiền cọc).',
  ].join('\n');
}

export async function datHang(user, donHangId, nccId) {
  if (!nccId) throw new AppError(400, 'Chọn nhà cung cấp');
  const dh = await withTransaction(async (client) => {
    const don = await repo.khoaDon(client, donHangId);
    if (!don || don.trang_thai === 'nhap') throw new AppError(404, 'Không tìm thấy đơn hàng');
    await damBaoPhuTrach(user, donHangId, client);
    if (['hoan_tat', 'huy'].includes(don.giai_doan)) throw new AppError(409, 'Đơn đã đóng');
    const dong = await repo.dongChoDat(client, donHangId, nccId);
    if (!dong.length) throw new AppError(409, 'Không có dòng "Đã chọn NCC" nào của nhà cung cấp này để đặt hàng');
    const tong = dong.reduce((s, d) => s + thanhTien(d), 0);
    const id = await repo.taoDatHang(client, { donHangId, nccId, nguoiId: user.id, tongTien: tong });
    const [thongTin, ncc] = await Promise.all([
      repo.donCoBan(donHangId, client),
      client.query('SELECT ten FROM nha_cung_cap WHERE id = $1', [nccId]).then((r) => r.rows[0].ten),
    ]);
    const noiDung = noiDungDatHang({ id, ncc, don: thongTin, dong, tong, nguoiDat: user.ho_ten });
    await repo.capNhatDatHang(client, id, { noi_dung: noiDung });
    await repo.ganDongDatHang(client, dong.map((d) => d.id), id, user.id);
    return { id, noi_dung: noiDung, so_dong: dong.length, tong_tien: tong };
  });
  // Gui nhom Telegram NCC SAU commit; loi Telegram khong lam mat don dat hang (van chep van ban gui NCC duoc).
  let telegram = 'chua_cau_hinh';
  if (tg.daCauHinhNcc()) {
    try {
      const m = await tg.guiDatHangNcc(dh);
      await repo.capNhatDatHang({ query }, dh.id, { tg_chat_id: m.chat_id, tg_message_id: m.message_id });
      telegram = 'da_gui';
    } catch (e) { console.error('Telegram NCC:', e.message); telegram = 'loi'; }
  }
  return { ...dh, telegram };
}

// Ghi phan hoi cua NCC (dung chung web + Telegram). nguoiId = null khi tu Telegram.
async function ghiPhanHoiNcc({ datHangId, loai, soTienCoc = null, qua, nguoi, nguoiId = null, user = null }) {
  const kq = await withTransaction(async (client) => {
    const dh = await repo.khoaDatHang(client, datHangId);
    if (!dh) throw new AppError(404, 'Không tìm thấy đơn đặt hàng');
    if (user) await damBaoPhuTrach(user, dh.don_hang_id, client);
    if (dh.trang_thai !== 'cho_phan_hoi') throw new AppError(409, `ĐH-${dh.id} đã được xử lý trước đó`);
    const chung = { phan_hoi_qua: qua, nguoi_phan_hoi: nguoi, phan_hoi_luc: new Date() };
    if (loai === 'xuat') {
      if (!(await repo.doiDongDatHang(client, dh.id, ['da_dat_hang'], 'san_hang', { nguoiId }))) throw new AppError(409, 'Đơn đặt hàng không còn dòng vật tư nào');
      await repo.capNhatDatHang(client, dh.id, { ...chung, trang_thai: 'xuat_hang' });
      const qtId = await taoQuyetToanNcc(client, { donHangId: dh.don_hang_id, nccId: dh.ncc_id, nguoiId: dh.nguoi_dat_id, ghiChu: `Tự động: NCC cho xuất hàng (ĐH-${dh.id})` });
      await thongBao.deXuatChi(client, qtId, 'moi', { nguoiGayId: nguoiId });
      await thongBao.gui(client, {
        nguoiIds: [dh.vanhanh_phu_trach_id, dh.nguoi_dat_id], nguoiGayId: nguoiId, loai: 'ncc_xuat_hang',
        tieuDe: `${dh.ncc} cho xuất hàng — vật tư đơn ${dh.ma_don} sẵn hàng`, noiDung: `ĐH-${dh.id}, ghi nhận bởi ${nguoi}`, link: `/mua-hang/don/${dh.don_hang_id}`,
      });
      return { dh, dxcId: qtId };
    }
    const cocId = await taoCocTuNcc(client, {
      donHangId: dh.don_hang_id, nccId: dh.ncc_id, nguoiId: dh.nguoi_dat_id, soTienCoc, ghiChu: `NCC yêu cầu cọc trước khi xuất hàng (ĐH-${dh.id})`,
    });
    await repo.doiDongDatHang(client, dh.id, ['da_dat_hang'], 'cho_coc', { nguoiId });
    await repo.capNhatDatHang(client, dh.id, { ...chung, trang_thai: 'cho_coc', so_tien_coc: Math.round(Number(soTienCoc)), de_xuat_chi_id: cocId });
    await thongBao.deXuatChi(client, cocId, 'coc_ncc', { nguoiGayId: nguoiId, ghiChu: `${dh.ncc} yêu cầu cọc (ĐH-${dh.id}), ghi nhận bởi ${nguoi}` });
    return { dh, dxcId: cocId };
  });
  const deXuat = await thongBaoDeXuat(kq.dxcId); // de xuat (quyet toan / coc) -> nhom Telegram duyet chi
  if (kq.dh.tg_message_id && tg.daCauHinhNcc()) {
    const ketQua = loai === 'xuat' ? `✅ Đã xác nhận CHO XUẤT HÀNG — ${nguoi}` : `💰 Yêu cầu cọc ${tienVn(soTienCoc)} — ${nguoi}. Công ty đang làm thủ tục chi cọc.`;
    tg.goi('editMessageText', { chat_id: kq.dh.tg_chat_id, message_id: Number(kq.dh.tg_message_id), text: `${kq.dh.noi_dung}\n\n${ketQua}` })
      .catch((e) => console.error('Telegram NCC:', e.message));
  }
  return { dat_hang_id: kq.dh.id, de_xuat: deXuat };
}

// NCC tra loi qua dien thoai/Zalo -> Van hanh/Ke toan ghi nhan tren web.
export function phanHoiNccWeb(user, datHangId, { loai, so_tien_coc }) {
  if (!['xuat', 'coc'].includes(loai)) throw new AppError(400, 'Phản hồi không hợp lệ');
  return ghiPhanHoiNcc({ datHangId, loai, soTienCoc: so_tien_coc, qua: 'web', nguoi: user.ho_ten, nguoiId: user.id, user });
}

// Huy don dat hang chua xong: dong ve "Da chon NCC" (doi NCC / dat lai duoc). De xuat coc chua duyet bi xoa theo.
export async function huyDatHang(user, datHangId) {
  const kq = await withTransaction(async (client) => {
    const dh = await repo.khoaDatHang(client, datHangId);
    if (!dh) throw new AppError(404, 'Không tìm thấy đơn đặt hàng');
    await damBaoPhuTrach(user, dh.don_hang_id, client);
    if (!['cho_phan_hoi', 'cho_coc'].includes(dh.trang_thai)) throw new AppError(409, 'Chỉ huỷ được đơn đặt hàng đang chờ NCC phản hồi hoặc chờ cọc');
    if (['da_duyet', 'da_thanh_toan'].includes(dh.coc_trang_thai)) throw new AppError(409, 'Cọc đã được duyệt/đã chi — không huỷ được (Admin thu hồi cọc trước)');
    let tinDuyet = null;
    if (dh.de_xuat_chi_id) {
      const { rows } = await client.query(
        `DELETE FROM de_xuat_chi WHERE id = $1 AND trang_thai IN ('cho_duyet', 'tu_choi') RETURNING telegram_chat_id, telegram_message_id`, [dh.de_xuat_chi_id],
      );
      tinDuyet = rows[0] || null;
    }
    await repo.doiDongDatHang(client, dh.id, ['da_dat_hang', 'cho_coc'], 'dang_hoi', { nguoiId: user.id, boGan: true });
    await repo.capNhatDatHang(client, dh.id, { trang_thai: 'huy' });
    return { dh, tinDuyet };
  });
  if (tg.coBot()) {
    const sua = (chat, msg, text) => tg.goi('editMessageText', { chat_id: chat, message_id: Number(msg), text }).catch((e) => console.error('Telegram:', e.message));
    if (kq.dh.tg_message_id) sua(kq.dh.tg_chat_id, kq.dh.tg_message_id, `${kq.dh.noi_dung}\n\n❌ Công ty đã HUỶ đơn đặt hàng này (${user.ho_ten}).`);
    if (kq.tinDuyet?.telegram_message_id) {
      tg.capNhatTinNhan(kq.tinDuyet.telegram_chat_id, kq.tinDuyet.telegram_message_id, `❌ Đề xuất cọc ĐH-${kq.dh.id} đã huỷ theo đơn đặt hàng.`)
        .catch((e) => console.error('Telegram:', e.message));
    }
  }
  return { ok: true };
}

// "2000000", "2.000.000", "2tr", "2,5tr", "500k", "2000000đ" -> so dong; khong doc duoc -> null.
export function docSoTien(text) {
  const t = String(text || '').toLowerCase().replace(/\s+/g, '').replace(/(vnd|vnđ|đ|d)$/, '');
  let m = /^(\d+(?:[.,]\d+)?)(tr|triệu|trieu|m)$/.exec(t);
  if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 1e6);
  m = /^(\d+(?:[.,]\d+)?)(k|nghìn|nghin)$/.exec(t);
  if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 1e3);
  if (/^\d{1,3}([.,]\d{3})+$/.test(t) || /^\d+$/.test(t)) return Number(t.replace(/[.,]/g, '')) || null;
  return null;
}

const tenTg = (from) => (from?.username ? `@${from.username}` : from?.first_name || 'NCC');

// Update tu nhom Telegram NCC: nut "Cho xuat hang" / "Yeu cau coc", va tin tra loi so tien coc.
export async function xuLyTelegramNcc(update) {
  const nhomNcc = String(process.env.TELEGRAM_CHAT_ID_NCC || '');
  const cb = update.callback_query;
  if (cb) {
    const m = /^dh:(\d+):(xuat|coc)$/.exec(cb.data || '');
    if (!m) return tg.traLoiNut(cb.id, 'Nút không hợp lệ');
    // Chi nhan nut bam trong dung nhom NCC va dung tin nhan cua don dat hang do (khong gia mao callback tu nhom khac).
    if (!nhomNcc || String(cb.message?.chat?.id) !== nhomNcc) return tg.traLoiNut(cb.id, 'Không đúng nhóm nhà cung cấp');
    const id = Number(m[1]);
    if ((await repo.datHangTheoTelegram({ query }, { messageId: cb.message.message_id })) !== id) return tg.traLoiNut(cb.id, 'Không tìm thấy đơn đặt hàng');
    if (m[2] === 'xuat') {
      try {
        await ghiPhanHoiNcc({ datHangId: id, loai: 'xuat', qua: 'telegram', nguoi: tenTg(cb.from) });
        return tg.traLoiNut(cb.id, 'Đã xác nhận cho xuất hàng');
      } catch (e) { return tg.traLoiNut(cb.id, e instanceof AppError ? e.message : 'Lỗi xử lý'); }
    }
    const { rows } = await query('SELECT trang_thai FROM dat_hang_ncc WHERE id = $1', [id]);
    if (rows[0]?.trang_thai !== 'cho_phan_hoi') return tg.traLoiNut(cb.id, 'Đơn đặt hàng đã được xử lý');
    const hoiId = await tg.hoiSoTienCoc(cb.message.chat.id, cb.message.message_id, id);
    await repo.capNhatDatHang({ query }, id, { tg_hoi_coc_message_id: hoiId });
    return tg.traLoiNut(cb.id, 'Trả lời tin nhắn của bot bằng số tiền cọc');
  }
  const msg = update.message;
  if (!msg?.reply_to_message || !nhomNcc || String(msg.chat?.id) !== nhomNcc) return;
  const id = await repo.datHangTheoTelegram({ query }, { messageId: msg.reply_to_message.message_id, hoiCoc: true });
  if (!id) return; // tra loi tin khac -> bo qua
  const soTien = docSoTien(msg.text);
  if (!soTien) return tg.guiTin(msg.chat.id, '⚠️ Không đọc được số tiền — trả lời lại tin hỏi cọc, vd: 2000000 hoặc 2tr.', msg.message_id);
  try {
    await ghiPhanHoiNcc({ datHangId: id, loai: 'coc', soTienCoc: soTien, qua: 'telegram', nguoi: tenTg(msg.from) });
    return tg.guiTin(msg.chat.id, `✅ Đã ghi nhận yêu cầu cọc <b>${tienVn(soTien)}</b> cho ĐH-${id}. Công ty sẽ chuyển cọc sau khi duyệt.`, msg.message_id);
  } catch (e) {
    return tg.guiTin(msg.chat.id, `⚠️ ${tg.esc(e instanceof AppError ? e.message : 'Lỗi xử lý')} — trả lời lại tin hỏi cọc với số khác.`, msg.message_id);
  }
}

// Lui "San hang" khi ghi nham NCC cho xuat hang: quyet toan chua duyet bi xoa, dong ve "Da dat hang", don dat hang ve "cho NCC phan hoi".
// Khong lui duoc khi quyet toan da duyet/da chi, hoac hang da duoc coc (tien da ra khoi cong ty).
export async function luiSanHang(user, donHangId, nccId) {
  if (!nccId) throw new AppError(400, 'Chọn nhà cung cấp');
  return withTransaction(async (client) => {
    const don = await repo.khoaDon(client, donHangId);
    if (!don || don.trang_thai === 'nhap') throw new AppError(404, 'Không tìm thấy đơn hàng');
    await damBaoPhuTrach(user, donHangId, client);
    if (!['len_phuong_an', 'boc_khoi_luong', 'mua_hang'].includes(don.giai_doan)) throw new AppError(409, 'Đơn đã qua bước Mua hàng — sai sót xử lý bằng Mua bổ sung');
    if (await repo.daCocDongSanHang(client, donHangId, nccId)) throw new AppError(409, 'Hàng của NCC này đã được cọc — không lùi được');
    const daXoa = await xoaQuyetToanChuaDuyet(client, donHangId, nccId);
    const soDong = await repo.doiTrangThaiTheoNcc(client, { donHangId, nccId, tu: ['san_hang'], den: 'da_dat_hang', nguoiId: user.id, boQuaQuyetToan: true });
    if (!soDong) throw new AppError(409, 'Không có dòng nào lùi được (đề xuất quyết toán đã duyệt/đã chi — liên hệ Admin thu hồi)');
    await repo.moLaiDatHang(client, donHangId, nccId);
    return { so_dong: soDong, da_xoa_de_xuat: daXoa };
  });
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
