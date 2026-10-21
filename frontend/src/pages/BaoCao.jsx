import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, loiCua, taiFile } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import Icon from '../components/Icon.jsx';
import { GIAI_DOAN, HINH_THUC, ngay, tien } from '../utils.js';

const homNay = () => new Date().toLocaleDateString('sv-SE');
const dauThang = () => `${homNay().slice(0, 8)}01`;
const tr = (v) => `${(Math.round(Number(v) / 1e5) / 10).toLocaleString('vi-VN')} tr`;
const MOC = {
  thang_nay: () => [dauThang(), homNay()],
  thang_truoc: () => { const d = new Date(); d.setDate(0); const c = d.toLocaleDateString('sv-SE'); return [`${c.slice(0, 8)}01`, c]; },
  nam_nay: () => [`${homNay().slice(0, 4)}-01-01`, homNay()],
  '12_thang': () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return [d.toLocaleDateString('sv-SE'), homNay()]; },
};

// Tham so bao cao: Admin sua ty le gia von hang tu san xuat ngay tren trang (bang cau_hinh).
function ThamSo({ onDoi }) {
  const laAdmin = useAuthStore((s) => s.user.vai_tro) === 'admin';
  const [ds, setDs] = useState([]);
  const [sua, setSua] = useState(null);
  const [loi, setLoi] = useState('');
  useEffect(() => { api.get('/cau-hinh').then((r) => setDs(r.data)).catch(() => {}); }, []);
  const th = ds.find((x) => x.khoa === 'ty_le_gia_von_tu_sx');
  if (!th) return null;
  const luu = async () => {
    try { const { data } = await api.put(`/cau-hinh/${th.khoa}`, { gia_tri: sua }); setDs(data); setSua(null); setLoi(''); onDoi(); } catch (e) { setLoi(loiCua(e)); }
  };
  return (
    <p className="muted small">
      Giá vốn cửa tự sản xuất ước tính <b>{th.gia_tri}%</b> giá bán.{' '}
      {laAdmin && (sua === null
        ? <button className="link small" onClick={() => setSua(th.gia_tri)}>Sửa</button>
        : <><input type="number" min={th.toi_thieu} max={th.toi_da} value={sua} onChange={(e) => setSua(e.target.value)} style={{ width: 70 }} /> % <button className="link small" onClick={luu}>Lưu</button> <button className="link small" onClick={() => setSua(null)}>Huỷ</button></>)}
      {loi && <span className="error-text"> {loi}</span>}
    </p>
  );
}

export default function BaoCao() {
  const [params, setParams] = useSearchParams();
  const tu = params.get('tu') || dauThang();
  const den = params.get('den') || homNay();
  const saleId = params.get('sale_id') || '';
  const hinhThuc = params.get('hinh_thuc') || '';
  const chiLo = params.get('chi_lo') === '1';
  const sapXep = params.get('sap_xep') || '';
  const page = Number(params.get('page')) || 1;
  const [kq, setKq] = useState(null);
  const [dsSale, setDsSale] = useState([]);
  const [loi, setLoi] = useState('');
  const [lanTai, setLanTai] = useState(0);

  const loc = { tu, den, sale_id: saleId || undefined, hinh_thuc: hinhThuc || undefined, chi_lo: chiLo ? '1' : undefined, sap_xep: sapXep || undefined };
  const datLoc = (moi) => {
    const p = new URLSearchParams(params);
    Object.entries({ ...moi, page: '' }).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p);
  };
  useEffect(() => { api.get('/danh-muc/sale').then((r) => setDsSale(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    api.get('/bao-cao/lai-lo', { params: { ...loc, page } }).then((r) => { setKq(r.data); setLoi(''); }).catch((e) => setLoi(loiCua(e)));
  }, [params, lanTai]);

  const t = kq?.tong;
  const chiPhi = t ? t.chi_ncc + t.chi_ncc_uoc_tinh + t.gia_von_tu_sx + t.mua_bo_sung + t.cong_tho : 0;
  return (
    <>
      <h1>Báo cáo lãi/lỗ theo đơn</h1>
      {loi && <div className="error">{loi}</div>}
      <div className="card">
        <div className="toolbar">
          <input type="date" value={tu} max={den} onChange={(e) => datLoc({ tu: e.target.value })} aria-label="Từ ngày" />
          <span>→</span>
          <input type="date" value={den} min={tu} onChange={(e) => datLoc({ den: e.target.value })} aria-label="Đến ngày" />
          {Object.entries({ thang_nay: 'Tháng này', thang_truoc: 'Tháng trước', nam_nay: 'Năm nay', '12_thang': '12 tháng' }).map(([k, n]) => (
            <button key={k} className="chip" onClick={() => { const [a, b] = MOC[k](); datLoc({ tu: a, den: b }); }}>{n}</button>
          ))}
          <select value={saleId} onChange={(e) => datLoc({ sale_id: e.target.value })} aria-label="Sale">
            <option value="">Mọi Sale</option>{dsSale.map((s) => <option key={s.id} value={s.id}>{s.ho_ten}</option>)}
          </select>
          <select value={hinhThuc} onChange={(e) => datLoc({ hinh_thuc: e.target.value })} aria-label="Hình thức">
            <option value="">Mọi hình thức</option>{Object.entries(HINH_THUC).map(([v, h]) => <option key={v} value={v}>{h.nhan}</option>)}
          </select>
          <span className="grow" />
          <button className="btn sec" onClick={() => taiFile('/bao-cao/lai-lo/excel', loc).catch((e) => setLoi(loiCua(e)))}><Icon n="file" /> Xuất Excel</button>
        </div>
        <ThamSo onDoi={() => setLanTai((n) => n + 1)} />
      </div>

      {t && (
        <div className="kpi-row">
          <div className="kpi"><span className="kpi-nhan">Doanh thu ({t.so_don} đơn)</span><span className="kpi-so">{tr(t.doanh_thu)}</span></div>
          <div className="kpi"><span className="kpi-nhan">Tổng chi phí</span><span className="kpi-so">{tr(chiPhi)}</span>
            <span className="muted small">NCC {tr(t.chi_ncc + t.chi_ncc_uoc_tinh)} · cửa tự SX {tr(t.gia_von_tu_sx)} · thợ {tr(t.cong_tho)}</span></div>
          <div className="kpi"><span className="kpi-nhan">Lãi gộp</span><span className={`kpi-so ${t.lai_gop < 0 ? 'error-text' : ''}`}>{tr(t.lai_gop)}</span></div>
          <div className="kpi"><span className="kpi-nhan">Biên lãi gộp</span><span className="kpi-so">{t.bien_pct ?? '—'}%</span></div>
          <div className="kpi"><span className="kpi-nhan">Đơn lỗ</span><span className={`kpi-so ${t.so_don_lo ? 'error-text' : ''}`}>{t.so_don_lo}</span>
            {t.so_don_lo > 0 && <button className="link small" onClick={() => datLoc({ chi_lo: '1' })}>Xem đơn lỗ</button>}</div>
        </div>
      )}

      {kq && (
        <div className="grid2">
          <div className="card">
            <h3>Theo Sale</h3>
            <div className="table-wrap"><table>
              <thead><tr><th>Sale</th><th className="num">Đơn</th><th className="num">Doanh thu</th><th className="num">Lãi gộp</th><th className="num">Biên</th></tr></thead>
              <tbody>{kq.theo_sale.map((s) => (
                <tr key={s.sale}><td>{s.sale}</td><td className="num">{s.so_don}</td><td className="num">{tr(s.doanh_thu)}</td>
                  <td className={`num ${s.lai_gop < 0 ? 'error-text' : ''}`}>{tr(s.lai_gop)}</td><td className="num">{s.bien_pct ?? '—'}%</td></tr>
              ))}</tbody>
            </table></div>
          </div>
          <div className="card">
            <h3>Theo hình thức</h3>
            <div className="table-wrap"><table>
              <thead><tr><th>Hình thức</th><th className="num">Đơn</th><th className="num">Doanh thu</th><th className="num">Lãi gộp</th><th className="num">Biên</th></tr></thead>
              <tbody>{kq.theo_hinh_thuc.map((s) => (
                <tr key={s.hinh_thuc}><td>{HINH_THUC[s.hinh_thuc]?.nhan}</td><td className="num">{s.so_don}</td><td className="num">{tr(s.doanh_thu)}</td>
                  <td className="num">{tr(s.lai_gop)}</td><td className="num">{s.bien_pct ?? '—'}%</td></tr>
              ))}</tbody>
            </table></div>
            <p className="muted small mt">Đơn chưa quyết toán là số <b>tạm tính</b>: dòng chưa chọn NCC tính theo giá NCC rẻ nhất hiện tại, công thợ theo khối lượng dự kiến.</p>
          </div>
        </div>
      )}

      {kq && (
        <div className="card">
          <div className="toolbar">
            <h3 style={{ margin: 0 }}>Chi tiết đơn ({kq.tong_loc})</h3>
            <span className="grow" />
            <label className="small"><input type="checkbox" checked={chiLo} onChange={(e) => datLoc({ chi_lo: e.target.checked ? '1' : '' })} /> Chỉ đơn lỗ</label>
            <select value={sapXep} onChange={(e) => datLoc({ sap_xep: e.target.value })} aria-label="Sắp xếp">
              <option value="">Mới chốt trước</option><option value="lai_tang">Lãi gộp thấp trước</option><option value="bien_tang">Biên thấp trước</option>
            </select>
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Đơn</th><th>Khách / Sale</th><th>Tiến độ</th><th className="num">Doanh thu</th><th className="num">Chi NCC</th><th className="num">Cửa tự SX</th><th className="num">Công thợ</th><th className="num">Lãi gộp</th><th className="num">Biên</th></tr></thead>
            <tbody>{kq.items.map((x) => (
              <tr key={x.id}>
                <td className="nowrap"><Link to={`/don-hang/${x.id}`}>{x.ma_don}</Link><div className="muted small">{ngay(x.ngay_chot)}</div></td>
                <td>{x.khach}<div className="muted small">{x.sale}</div></td>
                <td>{GIAI_DOAN[x.giai_doan]?.nhan}{x.tam_tinh && <div className="muted small">tạm tính</div>}</td>
                <td className="num">{tien(x.doanh_thu)}</td>
                <td className="num">{tien(x.chi_ncc + x.chi_ncc_uoc_tinh)}{x.chi_ncc_uoc_tinh > 0 && <div className="muted small">≈ {tien(x.chi_ncc_uoc_tinh)} ước tính</div>}</td>
                <td className="num">{x.gia_von_tu_sx ? tien(x.gia_von_tu_sx) : '—'}</td>
                <td className="num">{x.cong_tho ? tien(x.cong_tho) : '—'}</td>
                <td className={`num ${x.lai_gop < 0 ? 'error-text' : ''}`}><b>{tien(x.lai_gop)}</b></td>
                <td className="num">{x.bien_pct ?? '—'}%</td>
              </tr>
            ))}</tbody>
          </table></div>
          {kq.soTrang > 1 && (
            <div className="pager">
              <button className="btn sec" disabled={page <= 1} onClick={() => { const p = new URLSearchParams(params); p.set('page', String(page - 1)); setParams(p); }}>← Trước</button>
              <span className="small">Trang {page}/{kq.soTrang}</span>
              <button className="btn sec" disabled={page >= kq.soTrang} onClick={() => { const p = new URLSearchParams(params); p.set('page', String(page + 1)); setParams(p); }}>Sau →</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
