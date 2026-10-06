export const TRANG_THAI_DON = {
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
