import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { TRANG_THAI_CHAM_SOC, ngayGio } from '../utils.js';

const CAN_LY_DO = ['khong_quan_tam', 'sai_so'];
const gioMin = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

// Hoi Sale co len don ngay khi vua chot khach.
export function HoiLenDon({ khachHangId, onDong }) {
  const navigate = useNavigate();
  const nutDau = useRef(null);
  useEffect(() => {
    nutDau.current?.focus();
    const esc = (e) => e.key === 'Escape' && onDong();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onDong]);
  const di = () => navigate(`/don-hang/tao?khach_hang_id=${khachHangId}`);
  return (
    <div className="modal-backdrop" onClick={onDong}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="hoi-len-don" onClick={(e) => e.stopPropagation()}>
        <h3 id="hoi-len-don">Khách đã chốt — lên đơn ngay?</h3>
        <p className="muted">Nhập vật tư, địa chỉ công trình và điều khoản để chuyển đơn sang Vận hành.</p>
        <div className="modal-choices">
          <button ref={nutDau} className="btn" onClick={di}>Lên đơn ngay</button>
          <button className="link" onClick={onDong}>Để sau</button>
        </div>
      </div>
    </div>
  );
}

// Form ghi ket qua lan lien he (dung o chi tiet khach va ngay tren tung dong danh sach khach).
// kh: { id, trang_thai_cham_soc, hen_goi_lai_luc }. gon = ban gon cho danh sach (khong tieu de).
export default function CapNhatChamSoc({ kh, onXong, gon = false }) {
  const [trangThai, setTrangThai] = useState(kh.trang_thai_cham_soc === 'moi' ? '' : kh.trang_thai_cham_soc);
  const [noiDung, setNoiDung] = useState('');
  const [henLuc, setHenLuc] = useState('');
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [hoiLenDon, setHoiLenDon] = useState(false);

  const ghi = async (e) => {
    e.preventDefault();
    setLoi(''); setDangGui(true);
    try {
      await api.post(`/khach-hang/${kh.id}/cham-soc`, {
        trang_thai: trangThai, noi_dung: noiDung, hen_goi_lai_luc: trangThai === 'hen_goi_lai' && henLuc ? new Date(henLuc).toISOString() : undefined,
      });
      const vuaChot = trangThai === 'chot' && kh.trang_thai_cham_soc !== 'chot';
      setNoiDung(''); setHenLuc('');
      if (vuaChot) setHoiLenDon(true); else onXong?.();
    } catch (err) { setLoi(loiCua(err)); } finally { setDangGui(false); }
  };
  const denGio = kh.hen_goi_lai_luc && new Date(kh.hen_goi_lai_luc) <= new Date();

  return (
    <form onSubmit={ghi} className={gon ? 'cs-gon' : ''}>
      {!gon && <h3>Cập nhật chăm sóc</h3>}
      {kh.trang_thai_cham_soc === 'hen_goi_lai' && kh.hen_goi_lai_luc && (
        <p className={`small ${denGio ? 'error-text' : 'muted'}`}>Đang hẹn gọi lại lúc <b>{ngayGio(kh.hen_goi_lai_luc)}</b>{denGio ? ' — đã đến giờ' : ''}</p>
      )}
      {trangThai === 'chot' && kh.trang_thai_cham_soc !== 'chot' && <p className="muted small">Lưu xong sẽ hỏi bạn có muốn lên đơn ngay không.</p>}
      <div className="toolbar">
        <select aria-label="Kết quả chăm sóc" value={trangThai} onChange={(e) => setTrangThai(e.target.value)} required autoFocus={gon}>
          <option value="" disabled>— Kết quả lần liên hệ —</option>
          {Object.entries(TRANG_THAI_CHAM_SOC).filter(([v]) => v !== 'moi').map(([v, t]) => <option key={v} value={v}>{t.nhan}</option>)}
        </select>
        {trangThai === 'hen_goi_lai' && (
          <input type="datetime-local" aria-label="Thời điểm hẹn gọi lại" value={henLuc} onChange={(e) => setHenLuc(e.target.value)} required min={gioMin()} />
        )}
        <input className="grow" placeholder={CAN_LY_DO.includes(trangThai) ? 'Lý do (bắt buộc): khách nói gì / số sai thế nào' : 'Ghi chú lần liên hệ (khách nói gì, hẹn gì...)'}
          value={noiDung} onChange={(e) => setNoiDung(e.target.value)} required={CAN_LY_DO.includes(trangThai)} />
        <button className="btn" disabled={dangGui || !trangThai}>Lưu</button>
      </div>
      {loi && <div className="error small">{loi}</div>}
      {hoiLenDon && <HoiLenDon khachHangId={kh.id} onDong={() => { setHoiLenDon(false); onXong?.(); }} />}
    </form>
  );
}
