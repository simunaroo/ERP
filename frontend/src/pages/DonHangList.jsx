import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { TRANG_THAI_DON, ngay } from '../utils.js';

export default function DonHangList() {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const trangThai = params.get('trang_thai') || '';
  const q = params.get('q') || '';

  const [oTim, setOTim] = useState(q);
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  const [dangTai, setDangTai] = useState(false);

  const capNhat = (thayDoi) => {
    const moi = new URLSearchParams(params);
    for (const [k, v] of Object.entries(thayDoi)) (v ? moi.set(k, v) : moi.delete(k));
    if (!('page' in thayDoi)) moi.delete('page');
    setParams(moi, { replace: 'q' in thayDoi });
  };

  useEffect(() => setOTim(q), [q]); // dong bo o tim khi bam Back/Forward

  // Chi goi API sau khi ngung go 350ms, tranh moi phim bam la mot request.
  useEffect(() => {
    if (oTim === q) return;
    const t = setTimeout(() => capNhat({ q: oTim.trim() }), 350);
    return () => clearTimeout(t);
  }, [oTim]);

  useEffect(() => {
    const ctrl = new AbortController();
    setDangTai(true);
    api.get('/don-hang', { params: { page, trang_thai: trangThai || undefined, q: q || undefined }, signal: ctrl.signal })
      .then((r) => { setKq(r.data); setLoi(''); })
      .catch((e) => { if (!ctrl.signal.aborted) setLoi(loiCua(e)); })
      .finally(() => { if (!ctrl.signal.aborted) setDangTai(false); });
    return () => ctrl.abort();
  }, [page, trangThai, q]);

  const items = kq?.items || [];

  return (
    <>
      <h1>Đơn hàng</h1>
      <div className="card">
        <div className="toolbar">
          <input className="search" placeholder="Tìm theo mã đơn, khách hàng..." value={oTim} onChange={(e) => setOTim(e.target.value)} />
          <select value={trangThai} onChange={(e) => capNhat({ trang_thai: e.target.value })}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(TRANG_THAI_DON).map(([v, t]) => <option key={v} value={v}>{t.nhan}</option>)}
          </select>
          <span className="grow" />
          {vaiTro === 'sale' && <Link className="btn" to="/don-hang/tao">+ Tạo đơn hàng</Link>}
        </div>
        {loi && <div className="error">{loi}</div>}
        <div className={`table-wrap ${dangTai ? 'loading' : ''}`}>
          <table>
            <thead>
              <tr><th>Mã đơn</th><th>Khách hàng</th><th>Địa chỉ công trình</th><th>Sale</th><th>Vận hành</th><th>Trạng thái</th><th>Ngày tạo</th></tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td className="nowrap"><Link to={`/don-hang/${d.id}`}>{d.ma_don}</Link></td>
                  <td>{d.khach_hang}</td>
                  <td>{d.dia_chi_cong_trinh}</td>
                  <td>{d.sale}</td>
                  <td>{d.van_hanh || '—'}</td>
                  <td className="nowrap"><span className={`pill ${TRANG_THAI_DON[d.trang_thai].lop}`}>{TRANG_THAI_DON[d.trang_thai].nhan}</span></td>
                  <td className="nowrap">{ngay(d.created_at)}</td>
                </tr>
              ))}
              {kq && items.length === 0 && <tr><td colSpan="7" className="muted center">Không có đơn hàng nào</td></tr>}
            </tbody>
          </table>
        </div>
        {kq && kq.tong > 0 && (
          <div className="pager">
            <span className="muted">
              {(kq.page - 1) * kq.limit + 1}–{Math.min(kq.page * kq.limit, kq.tong)} / {kq.tong.toLocaleString('vi-VN')} đơn
            </span>
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
