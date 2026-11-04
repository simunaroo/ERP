import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { NHOM_KHACH, TRANG_THAI_CHAM_SOC, ngayGio } from '../utils.js';
import CapNhatChamSoc from '../components/CapNhatChamSoc.jsx';
import { TabKhachHang } from './BaoCaoChamSoc.jsx';

function FormThemKhach({ onDong }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ten: '', sdt: '', dia_chi: '', nhom_khach_hang: 'nha_dan' });
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);

  const luu = async (e) => {
    e.preventDefault();
    setLoi(''); setDangGui(true);
    try {
      const { data } = await api.post('/khach-hang', form);
      navigate(`/khach-hang/${data.id}`);
    } catch (err) { setLoi(loiCua(err)); setDangGui(false); }
  };

  return (
    <form className="card" onSubmit={luu}>
      <h3>Thêm khách hàng</h3>
      <div className="grid2">
        <div className="field"><label htmlFor="kh-ten">Tên khách hàng</label>
          <input id="kh-ten" value={form.ten} onChange={(e) => setForm({ ...form, ten: e.target.value })} autoFocus /></div>
        <div className="field"><label htmlFor="kh-sdt">Số điện thoại</label>
          <input id="kh-sdt" value={form.sdt} onChange={(e) => setForm({ ...form, sdt: e.target.value })} /></div>
        <div className="field"><label htmlFor="kh-nhom">Nhóm khách hàng</label>
          <select id="kh-nhom" value={form.nhom_khach_hang} onChange={(e) => setForm({ ...form, nhom_khach_hang: e.target.value })}>
            {Object.entries(NHOM_KHACH).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select></div>
        <div className="field"><label htmlFor="kh-dc">Địa chỉ</label>
          <input id="kh-dc" value={form.dia_chi} onChange={(e) => setForm({ ...form, dia_chi: e.target.value })} /></div>
      </div>
      {loi && <div className="error mt">{loi}</div>}
      <div className="actions">
        <button type="button" className="btn sec" onClick={onDong}>Huỷ</button>
        <button className="btn" disabled={dangGui}>Lưu khách hàng</button>
      </div>
    </form>
  );
}

export default function KhachHangList() {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const trangThai = params.get('trang_thai') || '';
  const q = params.get('q') || '';
  const [oTim, setOTim] = useState(q);
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  const [hienForm, setHienForm] = useState(false);
  const [moCs, setMoCs] = useState(null); // khach dang mo form cap nhat cham soc tren dong
  const [lanTai, setLanTai] = useState(0);

  const capNhat = (thayDoi) => {
    const moi = new URLSearchParams(params);
    for (const [k, v] of Object.entries(thayDoi)) (v ? moi.set(k, v) : moi.delete(k));
    if (!('page' in thayDoi)) moi.delete('page');
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
    api.get('/khach-hang', { params: { page, trang_thai: trangThai || undefined, q: q || undefined }, signal: ctrl.signal })
      .then((r) => { setKq(r.data); setLoi(''); })
      .catch((e) => { if (!ctrl.signal.aborted) setLoi(loiCua(e)); });
    return () => ctrl.abort();
  }, [page, trangThai, q, lanTai]);

  return (
    <>
      <h1>Khách hàng</h1>
      <TabKhachHang />
      {hienForm && <FormThemKhach onDong={() => setHienForm(false)} />}
      <div className="card">
        <div className="chips">
          <button className={!trangThai ? 'chip on' : 'chip'} onClick={() => capNhat({ trang_thai: '' })}>Tất cả</button>
          {Object.entries(TRANG_THAI_CHAM_SOC).map(([v, t]) => (
            <button key={v} className={trangThai === v ? 'chip on' : 'chip'} onClick={() => capNhat({ trang_thai: v })}>{t.nhan}</button>
          ))}
        </div>
        <div className="toolbar">
          <input className="search" placeholder="Tìm theo tên, số điện thoại..." value={oTim} onChange={(e) => setOTim(e.target.value)} />
          <span className="grow" />
          {vaiTro === 'sale' && !hienForm && <button className="btn" onClick={() => setHienForm(true)}>+ Thêm khách hàng</button>}
        </div>
        {loi && <div className="error">{loi}</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Khách hàng</th><th>Nhóm</th><th>Số điện thoại</th><th>Địa chỉ</th>{vaiTro === 'admin' && <th>Sale</th>}<th>Trạng thái</th><th className="num">Đơn</th><th>Nhận số</th><th>Chăm sóc gần nhất</th>{vaiTro === 'sale' && <th />}</tr></thead>
            <tbody>
              {(kq?.items || []).map((k) => (
                <Fragment key={k.id}>
                <tr className={moCs === k.id ? 'dong-dang-sua' : ''}>
                  <td><Link to={`/khach-hang/${k.id}`}>{k.ten}</Link></td>
                  <td className="nowrap">{NHOM_KHACH[k.nhom_khach_hang]}</td>
                  <td className="nowrap">{k.sdt ? <a className="sdt-link" href={`tel:${k.sdt}`} title="Bấm để gọi">{k.sdt}</a> : '—'}</td>
                  <td>{k.dia_chi || '—'}</td>
                  {vaiTro === 'admin' && <td>{k.sale}</td>}
                  <td><span className={`pill ${TRANG_THAI_CHAM_SOC[k.trang_thai_cham_soc].lop}`}>{TRANG_THAI_CHAM_SOC[k.trang_thai_cham_soc].nhan}</span>
                    {k.trang_thai_cham_soc === 'hen_goi_lai' && k.hen_goi_lai_luc && <div className={`small ${new Date(k.hen_goi_lai_luc) <= new Date() ? 'error-text' : 'muted'}`}>{ngayGio(k.hen_goi_lai_luc)}</div>}</td>
                  <td className="num">{k.so_don}</td>
                  <td className="nowrap">{ngayGio(k.nhan_so_luc)}</td>
                  <td className="cs-cuoi">{k.lan_cham_soc_cuoi ? (
                    <>
                      <div className="small muted nowrap">{ngayGio(k.lan_cham_soc_cuoi)} · {k.so_lan_cham_soc} lần</div>
                      {k.ghi_chu_cuoi ? <div className="cs-ghi-chu" title={k.ghi_chu_cuoi}>{k.ghi_chu_cuoi}</div> : <div className="small muted">Không ghi chú</div>}
                    </>
                  ) : <span className="muted">Chưa liên hệ</span>}</td>
                  {vaiTro === 'sale' && <td className="nowrap"><button className="link small" onClick={() => setMoCs(moCs === k.id ? null : k.id)}>{moCs === k.id ? 'Đóng' : 'Cập nhật'}</button></td>}
                </tr>
                {moCs === k.id && (
                  <tr className="dong-cs"><td colSpan={10}>
                    <CapNhatChamSoc gon kh={k} onXong={() => { setMoCs(null); setLanTai((n) => n + 1); }} />
                  </td></tr>
                )}
                </Fragment>
              ))}
              {kq && kq.items.length === 0 && <tr><td colSpan="10" className="muted center">Không có khách hàng nào</td></tr>}
            </tbody>
          </table>
        </div>
        {kq && kq.tong > 0 && (
          <div className="pager">
            <span className="muted">{(kq.page - 1) * kq.limit + 1}–{Math.min(kq.page * kq.limit, kq.tong)} / {kq.tong.toLocaleString('vi-VN')} khách</span>
            <span className="grow" />
            <button className="btn sec" disabled={page <= 1} onClick={() => capNhat({ page: String(page - 1) })}>← Trước</button>
            <span>Trang {kq.page}/{kq.soTrang}</span>
            <button className="btn sec" disabled={page >= kq.soTrang} onClick={() => capNhat({ page: String(page + 1) })}>Sau →</button>
          </div>
        )}
      </div>
    </>
  );
}
