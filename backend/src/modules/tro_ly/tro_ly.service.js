import { AppError } from '../../utils/AppError.js';
import * as danhMuc from '../danh_muc/danh_muc.repository.js';
import { sinhJson } from '../../integrations/gemini.client.js';

const SO_KY_TU_TOI_DA = 3000;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    ten_khach_hang: { type: 'STRING', nullable: true },
    sdt: { type: 'STRING', nullable: true },
    dia_chi_cong_trinh: { type: 'STRING', nullable: true },
    vat_tu: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          mo_ta_goc: { type: 'STRING' },
          vat_tu_id: { type: 'INTEGER', nullable: true },
          so_luong: { type: 'NUMBER', nullable: true },
        },
        required: ['mo_ta_goc'],
      },
    },
    ghi_chu: { type: 'STRING', nullable: true },
  },
  required: ['vat_tu'],
};

function taoPrompt(vatTu) {
  const bang = vatTu.map((v) => `${v.id} | ${v.ten} | ${v.loai} | ${v.don_vi_tinh}`).join('\n');
  return `Bạn là trợ lý nhập đơn hàng cho doanh nghiệp vật liệu hoàn thiện (cửa, sàn, tấm ốp).
Đọc tin nhắn của khách và trích xuất thông tin đơn hàng.

Danh mục vật tư (id | tên | loại | đơn vị tính):
${bang}

Quy tắc:
- Mỗi vật tư khách nhắc tới là một phần tử trong "vat_tu"; "mo_ta_goc" chép đúng cụm từ khách viết.
- "vat_tu_id": id trong danh mục khớp rõ ràng nhất. Nếu không chắc hoặc danh mục không có, để null — tuyệt đối không đoán.
- "so_luong": theo đơn vị tính của danh mục (m², bộ...). Khách không nói số lượng thì để null.
- "sdt": chỉ giữ chữ số. Không có thông tin nào thì để null, không tự bịa.
- "ghi_chu": yêu cầu khác của khách (thời gian giao, lưu ý thi công), nếu có.`;
}

const chuanHoa = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
const chiSo = (s) => (s || '').replace(/\D/g, '');

// Khop khach hang ngay trong DB cua Sale: khong gui danh sach khach hang sang dich vu AI.
function khopKhachHang(trichXuat, dsKhach, canhBao) {
  const sdt = chiSo(trichXuat.sdt);
  if (sdt.length >= 9) {
    const theoSdt = dsKhach.find((k) => chiSo(k.sdt).endsWith(sdt.slice(-9)));
    if (theoSdt) return theoSdt;
  }
  const ten = chuanHoa(trichXuat.ten_khach_hang);
  if (ten) {
    const theoTen = dsKhach.filter((k) => chuanHoa(k.ten) === ten);
    if (theoTen.length === 1) {
      canhBao.push('Khách hàng được khớp theo tên (không có SĐT trùng), vui lòng kiểm tra lại.');
      return theoTen[0];
    }
    if (theoTen.length > 1) canhBao.push(`Có ${theoTen.length} khách cùng tên "${trichXuat.ten_khach_hang}", vui lòng tự chọn.`);
  }
  if (trichXuat.ten_khach_hang || sdt) {
    canhBao.push(`Khách "${trichXuat.ten_khach_hang || ''}${sdt ? ' – ' + sdt : ''}" chưa có trong danh sách bạn phụ trách.`);
  }
  return null;
}

export async function trichXuatDonHang(user, noiDung) {
  const text = (noiDung || '').trim();
  if (!text) throw new AppError(400, 'Vui lòng dán nội dung tin nhắn của khách');
  if (text.length > SO_KY_TU_TOI_DA) throw new AppError(400, `Nội dung quá dài (tối đa ${SO_KY_TU_TOI_DA} ký tự)`);

  const [vatTu, dsKhach] = await Promise.all([danhMuc.vatTu(), danhMuc.khachHang(user.id)]);
  const kq = await sinhJson({ systemPrompt: taoPrompt(vatTu), userText: text, schema: SCHEMA });

  // Khong tin tuyet doi vao AI: kiem tra lai moi id va so luong truoc khi tra ve giao dien.
  const canhBao = [];
  const vatTuHopLe = new Map(vatTu.map((v) => [v.id, v]));
  const dong = (Array.isArray(kq.vat_tu) ? kq.vat_tu : []).map((it) => {
    const vt = vatTuHopLe.get(it.vat_tu_id);
    if (!vt) canhBao.push(`Không khớp được "${it.mo_ta_goc}" với danh mục vật tư, vui lòng chọn tay.`);
    const soLuong = Number(it.so_luong) > 0 ? Number(it.so_luong) : null;
    if (vt && !soLuong) canhBao.push(`Chưa rõ số lượng cho "${it.mo_ta_goc}".`);
    return { mo_ta_goc: it.mo_ta_goc, vat_tu_id: vt ? vt.id : null, so_luong_can: soLuong };
  });

  const khach = khopKhachHang(kq, dsKhach, canhBao);
  return {
    khach_hang_id: khach?.id ?? null,
    khach_hang_trich_xuat: { ten: kq.ten_khach_hang || null, sdt: chiSo(kq.sdt) || null },
    dia_chi_cong_trinh: kq.dia_chi_cong_trinh || khach?.dia_chi || null,
    vat_tu: dong,
    ghi_chu: kq.ghi_chu || null,
    canh_bao: canhBao,
  };
}
