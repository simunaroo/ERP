import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

// San pham = loai vat tu trong danh muc (Cửa, Sàn, Tấm ốp...). Admin/Ke toan them loai moi la tu hien o day.
export function useDsSanPham() {
  const [ds, setDs] = useState([]);
  useEffect(() => {
    api.get('/danh-muc/loai-vat-tu').then((r) => setDs(r.data)).catch(() => setDs([]));
  }, []);
  return ds;
}

// Hien danh sach san pham dang the nho (danh sach khach, ho so khach).
export function NhanSanPham({ ds, trong = null }) {
  if (!ds?.length) return trong;
  return <span className="sp-nhan">{ds.map((sp) => <span key={sp.id ?? sp.ten} className="pill p-new">{sp.ten}</span>)}</span>;
}

// Chon nhieu san pham bang chip bat/tat. giaTri: mang id.
export function ChonSanPham({ dsSanPham, giaTri, onChange, disabled }) {
  const bat = (id) => onChange(giaTri.includes(id) ? giaTri.filter((x) => x !== id) : [...giaTri, id]);
  if (!dsSanPham.length) return <span className="muted small">Chưa có sản phẩm trong danh mục</span>;
  return (
    <div className="chips sp-chon" role="group" aria-label="Sản phẩm quan tâm">
      {dsSanPham.map((sp) => (
        <button key={sp.id} type="button" disabled={disabled} aria-pressed={giaTri.includes(sp.id)}
          className={giaTri.includes(sp.id) ? 'chip on' : 'chip'} onClick={() => bat(sp.id)}>
          {sp.ten}
        </button>
      ))}
    </div>
  );
}
