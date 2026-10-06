import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { ngay } from '../utils.js';

export const TRANG_THAI_NCC = {
  active: { nhan: 'Đang hợp tác', lop: 'p-done' },
  ngung_hoat_dong: { nhan: 'Ngừng hợp tác', lop: 'p-gray' },
};

export function TabNcc() {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  return (
    <div className="tabs" role="tablist">
      <NavLink end to="/nha-cung-cap" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>Danh sách</NavLink>
      <NavLink to="/nha-cung-cap/so-sanh-gia" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>So sánh giá</NavLink>
      {['ke_toan', 'admin'].includes(vaiTro) && (
        <NavLink to="/nha-cung-cap/phan-tich" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>📊 Phân tích & AI</NavLink>
      )}
    </div>
  );
}

function FormThemNcc({ onDong }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ten: '', ma_so_thue: '', dia_chi: '' });
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const dat = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const luu = async (e) => {
    e.preventDefault();
    setLoi(''); setDangGui(true);
    try {
      const { data } = await api.post('/nha-cung-cap', form);
      navigate(`/nha-cung-cap/${data.id}`);
    } catch (err) { setLoi(loiCua(err)); setDangGui(false); }
  };

  return (
    <form className="card" onSubmit={luu}>
      <h3>Thêm nhà cung cấp</h3>
      <div className="grid2">
        <div className="field"><label htmlFor="ncc-ten">Tên nhà cung cấp *</label>
          <input id="ncc-ten" value={form.ten} onChange={dat('ten')} autoFocus /></div>
        <div className="field"><label htmlFor="ncc-mst">Mã số thuế</label>
          <input id="ncc-mst" value={form.ma_so_thue} onChange={dat('ma_so_thue')} placeholder="10 chữ số" inputMode="numeric" /></div>
        <div className="field span2"><label htmlFor="ncc-dc">Địa chỉ</label>
          <input id="ncc-dc" value={form.dia_chi} onChange={dat('dia_chi')} /></div>
      </div>
      {loi && <div className="error mt">{loi}</div>}
      <div className="actions">
        <button type="button" className="btn sec" onClick={onDong}>Huỷ</button>
        <button className="btn" disabled={dangGui}>Lưu nhà cung cấp</button>
      </div>
    </form>
  );
}

export default function NhaCungCapList() {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const duocSua = ['ke_toan', 'admin'].includes(vaiTro);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const trangThai = params.get('trang_thai') || 'active';
  const [oTim, setOTim] = useState(q);
  const [ds, setDs] = useState(null);
  const [loi, setLoi] = useState('');
  const [hienForm, setHienForm] = useState(false);

  const capNhat = (thayDoi) => {
    const moi = new URLSearchParams(params);
    for (const [k, v] of Object.entries(thayDoi)) (v ? moi.set(k, v) : moi.delete(k));
    setParams(moi, { replace: 'q' in thayDoi });
  };

  useEffect(() => setOTim(q), [q]);
  useEffect(() => {
    if (oTim === q) return;
    const t = setTimeout(() => capNhat({ q: oTim.trim() }), 350);
    return () => clearTimeout(t);
  }, [oTim]);

  useEffect(() => {
    const ctrl = new AbortController();
    api.get('/nha-cung-cap', { params: { q: q || undefined, trang_thai: trangThai === 'tat_ca' ? undefined : trangThai }, signal: ctrl.signal })
      .then((r) => { setDs(r.data); setLoi(''); })
      .catch((e) => { if (!ctrl.signal.aborted) setLoi(loiCua(e)); });
    return () => ctrl.abort();
  }, [q, trangThai]);

  return (
    <>
      <h1>Nhà cung cấp</h1>
      <TabNcc />
      {hienForm && <FormThemNcc onDong={() => setHienForm(false)} />}
      <div className="card">
        <div className="chips">
          {[['active', 'Đang hợp tác'], ['ngung_hoat_dong', 'Ngừng hợp tác'], ['tat_ca', 'Tất cả']].map(([v, n]) => (
            <button key={v} className={trangThai === v ? 'chip on' : 'chip'} onClick={() => capNhat({ trang_thai: v === 'active' ? '' : v })}>{n}</button>
          ))}
        </div>
        <div className="toolbar">
          <input className="search" placeholder="Tìm theo tên, mã số thuế..." value={oTim} onChange={(e) => setOTim(e.target.value)} />
          <span className="grow" />
          {duocSua && !hienForm && <button className="btn" onClick={() => setHienForm(true)}>+ Thêm nhà cung cấp</button>}
        </div>
        {loi && <div className="error">{loi}</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nhà cung cấp</th><th>Mã số thuế</th><th>Địa chỉ</th><th className="num">Mặt hàng đang báo giá</th><th>Giá cập nhật gần nhất</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {(ds || []).map((n) => (
                <tr key={n.id}>
                  <td><Link to={`/nha-cung-cap/${n.id}`}>{n.ten}</Link></td>
                  <td className="nowrap">{n.ma_so_thue || '—'}</td>
                  <td>{n.dia_chi || '—'}</td>
                  <td className="num">{n.so_mat_hang}</td>
                  <td className="nowrap">{n.cap_nhat_gia ? ngay(n.cap_nhat_gia) : <span className="muted">Chưa có giá</span>}</td>
                  <td><span className={`pill ${TRANG_THAI_NCC[n.trang_thai].lop}`}>{TRANG_THAI_NCC[n.trang_thai].nhan}</span></td>
                </tr>
              ))}
              {ds && ds.length === 0 && <tr><td colSpan="6" className="muted center">Không có nhà cung cấp nào</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
