import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { TRANG_THAI_CHAM_SOC, TRANG_THAI_DON, ngay, ngayGio } from '../utils.js';

function HoiLenDon({ khachHangId, onDong }) {
  const navigate = useNavigate();
  const nutDau = useRef(null);
  useEffect(() => {
    nutDau.current?.focus();
    const esc = (e) => e.key === 'Escape' && onDong();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onDong]);

  const di = (cheDo) => navigate(`/don-hang/tao?khach_hang_id=${khachHangId}&che_do=${cheDo}`);
  return (
    <div className="modal-backdrop" onClick={onDong}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="hoi-len-don" onClick={(e) => e.stopPropagation()}>
        <h3 id="hoi-len-don">Khách đã chốt — lên đơn ngay?</h3>
        <p className="muted">Bạn có thể tải ảnh tin nhắn hoặc phiếu ghi chép để AI điền sẵn đơn hàng, hoặc tự nhập.</p>
        <div className="modal-choices">
          <button ref={nutDau} className="btn" onClick={() => di('ai')}>✨ Lên đơn nhanh bằng AI</button>
          <button className="btn sec" onClick={() => di('tay')}>Nhập đơn thủ công</button>
          <button className="link" onClick={onDong}>Để sau</button>
        </div>
      </div>
    </div>
  );
}

export default function KhachHangChiTiet() {
  const { id } = useParams();
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [kh, setKh] = useState(null);
  const [loi, setLoi] = useState('');
  const [trangThai, setTrangThai] = useState('');
  const [noiDung, setNoiDung] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [hoiLenDon, setHoiLenDon] = useState(false);

  const tai = useCallback(() => {
    api.get(`/khach-hang/${id}`)
      .then((r) => { setKh(r.data); setTrangThai(r.data.trang_thai_cham_soc); })
      .catch((e) => setLoi(loiCua(e)));
  }, [id]);
  useEffect(tai, [tai]);

  const ghi = async (e) => {
    e.preventDefault();
    setLoi(''); setDangGui(true);
    try {
      await api.post(`/khach-hang/${id}/cham-soc`, { trang_thai: trangThai, noi_dung: noiDung });
      const vuaChot = trangThai === 'chot' && kh.trang_thai_cham_soc !== 'chot';
      setNoiDung('');
      tai();
      if (vuaChot) setHoiLenDon(true);
    } catch (err) { setLoi(loiCua(err)); }
    finally { setDangGui(false); }
  };

  if (!kh) return loi ? <div className="error">{loi}</div> : <p className="muted">Đang tải...</p>;
  const tt = TRANG_THAI_CHAM_SOC[kh.trang_thai_cham_soc];

  return (
    <>
      <p><Link to="/khach-hang">← Danh sách khách hàng</Link></p>
      <h1>{kh.ten} <span className={`pill ${tt.lop}`}>{tt.nhan}</span></h1>
      {loi && <div className="error">{loi}</div>}

      <div className="grid2">
        <div className="card">
          <h3>Thông tin</h3>
          <dl className="kv">
            <dt>Số điện thoại</dt><dd>{kh.sdt || '—'}</dd>
            <dt>Địa chỉ</dt><dd>{kh.dia_chi || '—'}</dd>
            <dt>Sale phụ trách</dt><dd>{kh.sale}</dd>
          </dl>
          {vaiTro === 'sale' && kh.trang_thai_cham_soc === 'chot' && (
            <div className="actions">
              <Link className="btn sec" to={`/don-hang/tao?khach_hang_id=${kh.id}&che_do=tay`}>Nhập đơn thủ công</Link>
              <Link className="btn" to={`/don-hang/tao?khach_hang_id=${kh.id}&che_do=ai`}>✨ Lên đơn nhanh bằng AI</Link>
            </div>
          )}
        </div>
        <div className="card">
          <h3>Đơn hàng ({kh.don_hang.length})</h3>
          {kh.don_hang.length === 0 ? <p className="muted">Chưa có đơn hàng</p> : (
            <ul className="list">
              {kh.don_hang.map((d) => (
                <li key={d.id}>
                  <Link to={`/don-hang/${d.id}`}>{d.ma_don}</Link>
                  <span className={`pill ${TRANG_THAI_DON[d.trang_thai].lop}`}>{TRANG_THAI_DON[d.trang_thai].nhan}</span>
                  <span className="muted small">{ngay(d.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {vaiTro === 'sale' && (
        <form className="card" onSubmit={ghi}>
          <h3>Cập nhật chăm sóc</h3>
          <div className="toolbar">
            <select aria-label="Trạng thái chăm sóc" value={trangThai} onChange={(e) => setTrangThai(e.target.value)}>
              {Object.entries(TRANG_THAI_CHAM_SOC).map(([v, t]) => <option key={v} value={v}>{t.nhan}</option>)}
            </select>
            <input className="grow" placeholder="Ghi chú lần chăm sóc này (gọi điện, báo giá, hẹn khảo sát...)"
              value={noiDung} onChange={(e) => setNoiDung(e.target.value)} />
            <button className="btn" disabled={dangGui}>Lưu</button>
          </div>
        </form>
      )}

      <div className="card">
        <h3>Lịch sử chăm sóc</h3>
        {kh.lich_su.length === 0 ? <p className="muted">Chưa có lần chăm sóc nào</p> : (
          <ol className="timeline">
            {kh.lich_su.map((ls) => (
              <li key={ls.id}>
                <span className={`pill ${TRANG_THAI_CHAM_SOC[ls.trang_thai].lop}`}>{TRANG_THAI_CHAM_SOC[ls.trang_thai].nhan}</span>
                <span>{ls.noi_dung || <span className="muted">(không ghi chú)</span>}</span>
                <span className="muted small">{ls.nguoi_cham_soc} · {ngayGio(ls.created_at)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {hoiLenDon && <HoiLenDon khachHangId={kh.id} onDong={() => setHoiLenDon(false)} />}
    </>
  );
}
