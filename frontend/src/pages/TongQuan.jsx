import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { GIAI_DOAN, BUOC_DON, tien } from '../utils.js';

const tienGon = (n) => (Math.abs(n) >= 1e9 ? `${(n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ` : Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr` : tien(n));
const pct = (moi, cu) => (cu > 0 ? Math.round(((moi - cu) / cu) * 100) : null);

// Bieu do cot 1 chuoi (do lon): 1 mau, cot bo tron dau, nhan gia tri o dinh, tooltip khi re chuot (<title>).
function BieuDoDoanhThu({ ds }) {
  const max = Math.max(1, ...ds.map((d) => d.doanh_thu));
  const W = 560;
  const H = 200;
  const cot = W / ds.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 40}`} className="bieu-do" role="img" aria-label="Doanh thu 6 tháng gần nhất">
      <line x1="0" y1={H} x2={W} y2={H} className="truc" />
      {ds.map((d, i) => {
        const h = Math.max(2, (d.doanh_thu / max) * (H - 24));
        const x = i * cot + cot * 0.22;
        const w = cot * 0.56;
        return (
          <g key={d.thang}>
            <title>{`Tháng ${d.thang.slice(5)}/${d.thang.slice(0, 4)}: ${tien(d.doanh_thu)} · ${d.so_don} đơn`}</title>
            <rect x={x} y={H - h} width={w} height={h} rx="4" className={i === ds.length - 1 ? 'cot cot-nay' : 'cot'} />
            <text x={x + w / 2} y={H - h - 6} textAnchor="middle" className="nhan-gia-tri">{tienGon(d.doanh_thu)}</text>
            <text x={x + w / 2} y={H + 18} textAnchor="middle" className="nhan-truc">T{Number(d.thang.slice(5))}</text>
            <text x={x + w / 2} y={H + 34} textAnchor="middle" className="nhan-phu">{d.so_don} đơn</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function TongQuan() {
  const user = useAuthStore((s) => s.user);
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  useEffect(() => { api.get('/tong-quan').then((r) => setKq(r.data)).catch((e) => setLoi(loiCua(e))); }, []);
  if (!kq) return loi ? <div className="error">{loi}</div> : <p className="muted">Đang tải...</p>;
  const { kpi } = kq;
  const tang = pct(kpi.doanh_thu_thang, kpi.doanh_thu_cung_ky_thang_truoc);
  // Viec gap len truoc, roi theo so luong giam dan.
  const viec = kq.viec.filter((v) => v.so > 0).sort((a, b) => (a.muc === 'gap' ? 0 : 1) - (b.muc === 'gap' ? 0 : 1) || b.so - a.so);
  const tongViec = viec.reduce((t, v) => t + v.so, 0);
  const soGap = viec.filter((v) => v.muc === 'gap').reduce((t, v) => t + v.so, 0);
  const buoc = BUOC_DON.hoan_thien;
  const maxGd = Math.max(1, ...Object.values(kq.theo_giai_doan));

  return (
    <>
      <h1>Xin chào, {user.ho_ten}</h1>
      <p className="muted">{kq.pham_vi === 'cua_toi' ? 'Số liệu các đơn bạn phụ trách.' : 'Số liệu toàn công ty.'}</p>

      <section className={`viec-can-lam${viec.length ? '' : ' xong'}`} aria-labelledby="tieu-de-viec">
        <div className="viec-dau">
          <h2 id="tieu-de-viec">Việc cần làm</h2>
          {viec.length > 0 && <span className="viec-tong">{tongViec} việc{soGap > 0 && <> · <b className="chu-gap">{soGap} gấp</b></>}</span>}
        </div>
        {viec.length === 0 ? <p className="muted">🎉 Không có việc tồn đọng — bạn đã xử lý hết.</p> : (
          <ul className="o-viec">
            {viec.map((v) => (
              <li key={v.nhan}>
                <Link to={v.link} className={v.muc === 'gap' ? 'o gap' : 'o'}>
                  <span className="o-so">{v.so}</span>
                  <span className="o-nhan">{v.muc === 'gap' && <span className="nhan-gap">Gấp</span>}{v.nhan}</span>
                  <span className="o-xu-ly">Xử lý →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="kpi-row">
        <div className="kpi"><span className="kpi-nhan">Doanh thu tháng này</span><span className="kpi-so">{tienGon(kpi.doanh_thu_thang)}</span>
          {tang === null ? <span className="muted small">tháng trước cùng kỳ chưa có số</span> : <span className={`bd ${tang >= 0 ? 'bd-tang' : 'bd-giam'}`}>{tang >= 0 ? '↑' : '↓'} {Math.abs(tang)}% so với cùng kỳ tháng trước</span>}</div>
        <div className="kpi"><span className="kpi-nhan">Đơn chốt tháng này</span><span className="kpi-so">{kpi.so_don_thang}</span></div>
        <div className="kpi"><span className="kpi-nhan">Đơn đang xử lý</span><span className="kpi-so">{kpi.dang_xu_ly}</span></div>
        {kpi.cong_no_ncc !== null && <div className="kpi"><span className="kpi-nhan">Còn phải trả NCC</span><span className="kpi-so">{tienGon(kpi.cong_no_ncc)}</span>
          <span className="muted small">{kpi.cho_duyet.so} đề xuất chờ duyệt · {tienGon(kpi.cho_duyet.tien)}</span></div>}
      </div>

      <div className="card">
        <h3>Đơn đang chạy theo tiến độ</h3>
        <ul className="gd-ngang">
          {buoc.filter((b) => kq.theo_giai_doan[b]).map((b) => (
            <li key={b}>
              <Link to={`/don-hang?giai_doan=${b}`} className="gd-nhan">{GIAI_DOAN[b].nhan}</Link>
              <span className="o-thanh rong"><span className="thanh-ngang" style={{ width: `${(kq.theo_giai_doan[b] / maxGd) * 100}%` }} /></span>
              <b className="gd-so">{kq.theo_giai_doan[b]}</b>
            </li>
          ))}
          {Object.keys(kq.theo_giai_doan).length === 0 && <li className="muted">Không có đơn đang chạy.</li>}
        </ul>
      </div>

      <div className="card">
        <h3>Doanh thu 6 tháng gần nhất <span className="muted small">(theo ngày chốt đơn)</span></h3>
        <BieuDoDoanhThu ds={kq.doanh_thu_6_thang} />
        <details className="mt"><summary className="small">Xem dạng bảng</summary>
          <table className="mt"><thead><tr><th>Tháng</th><th className="num">Doanh thu</th><th className="num">Số đơn</th></tr></thead>
            <tbody>{kq.doanh_thu_6_thang.map((d) => <tr key={d.thang}><td>{d.thang}</td><td className="num">{tien(d.doanh_thu)}</td><td className="num">{d.so_don}</td></tr>)}</tbody></table>
        </details>
      </div>
    </>
  );
}
