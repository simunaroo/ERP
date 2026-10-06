export const TRANG_THAI_DON = {
  nhap: { nhan: 'Nháp', lop: 'p-gray' },
  moi: { nhan: 'Mới', lop: 'p-new' },
  dang_xu_ly: { nhan: 'Đang xử lý', lop: 'p-wip' },
  hoan_tat: { nhan: 'Hoàn tất', lop: 'p-done' },
};

export const TRANG_THAI_CHAM_SOC = {
  moi: { nhan: 'Mới', lop: 'p-gray' },
  dang_tu_van: { nhan: 'Đang tư vấn', lop: 'p-new' },
  da_bao_gia: { nhan: 'Đã báo giá', lop: 'p-wip' },
  chot: { nhan: 'Chốt', lop: 'p-done' },
  khong_mua: { nhan: 'Không mua', lop: 'p-lost' },
};

export const VAI_TRO = { sale: 'Sale', van_hanh: 'Vận hành', ke_toan: 'Kế toán', admin: 'Admin' };

export const HINH_THUC = {
  hoan_thien: { nhan: 'Hoàn thiện', moTa: 'Giao hàng + thi công' },
  vat_tu: { nhan: 'Vật tư', moTa: 'Chỉ giao hàng' },
};

export const NHOM_KHACH = { nha_dan: 'Nhà dân', nha_thau: 'Nhà thầu', doi_tac: 'Đối tác', khac: 'Khác' };
export const NGHIEM_THU = { vat_tu_tieu_hao: 'Vật tư tiêu hao', so_m2_thi_cong: 'Số m² thi công', theo_hop_dong: 'Theo hợp đồng' };
export const LOAI_THI_CONG = {
  op_tran_phang: 'Ốp trần phẳng', op_tran_giat_cap: 'Ốp trần giật cấp',
  op_tuong_khong_xuong: 'Ốp tường không xương', op_tuong_co_xuong: 'Ốp tường + xương', khac: 'Khác',
};
export const kichThuoc = (d, r) => (d || r ? `${d || '?'} × ${r || '?'} mm` : '');

// 34 tinh/thanh sau sap xep don vi hanh chinh (hieu luc tu 01/07/2025), khong con cap quan/huyen.
export const TINH_THANH = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ', 'Huế',
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
  'Gia Lai', 'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai',
  'Nghệ An', 'Ninh Bình', 'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh',
  'Thái Nguyên', 'Thanh Hóa', 'Tuyên Quang', 'Vĩnh Long',
];

export const tien = (v) => `${Math.round(Number(v) || 0).toLocaleString('vi-VN')} đ`;

// Giu dong bo voi dieuKhoanThanhToan() o backend: cau dieu khoan sinh tu MOT con so.
export function dieuKhoanThanhToan(tyLe, hinhThuc) {
  const t = Number(tyLe);
  if (t >= 100) return 'Thanh toán 100% giá trị đơn hàng khi nhận hàng.';
  const sau = hinhThuc === 'vat_tu' ? 'sau khi giao đủ hàng' : 'ngay sau khi nghiệm thu';
  if (t <= 0) return `Thanh toán 100% giá trị đơn hàng ${sau}.`;
  return `Nhận hàng tạm ứng ${t}% giá trị đơn hàng, ${100 - t}% còn lại thanh toán ${sau}.`;
}

// Xem truoc tien khi dang nhap form; so chinh thuc luon do backend tinh (view v_don_hang_tien).
export function tinhTien(dong, { chiet_khau_pct, phi_van_chuyen, phu_thu, tien_coc }) {
  const tongVatTu = dong.reduce((s, d) => s + (Number(d.so_luong_can) || 0) * (Number(d.don_gia) || 0), 0);
  const tienChietKhau = Math.round(tongVatTu * (Number(chiet_khau_pct) || 0) / 100);
  const tongDon = tongVatTu - tienChietKhau + (Number(phi_van_chuyen) || 0) + (Number(phu_thu) || 0);
  return { tongVatTu, tienChietKhau, tongDon, conPhaiThu: tongDon - (Number(tien_coc) || 0) };
}

export const ngay = (s) => new Date(s).toLocaleDateString('vi-VN');
export const ngayGio = (s) => new Date(s).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

// Thu nho anh ngay tren trinh duyet truoc khi gui: anh dien thoai 5-10 MB con vai tram KB,
// giam thoi gian tai len va so token AI phai doc, chu van du ro de doc chu.
export function thuNhoAnh(file, canhDaiToiDa = 1600, chatLuong = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const tiLe = Math.min(1, canhDaiToiDa / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * tiLe);
      canvas.height = Math.round(img.height * tiLe);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', chatLuong);
      resolve({ mime: 'image/jpeg', data: dataUrl.split(',')[1], xemTruoc: dataUrl });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}
