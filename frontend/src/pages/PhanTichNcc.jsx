import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { ngay, ngayGio, tien } from '../utils.js';
import { TabNcc } from './NhaCungCapList.jsx';

const ymd = (d) => d.toLocaleDateString('sv-SE');
function kyNhanh(loai) {
  const h = new Date();
  if (loai === 'thang_nay') return { tu: ymd(new Date(h.getFullYear(), h.getMonth(), 1)), den: ymd(h) };
  if (loai === 'thang_truoc') return { tu: ymd(new Date(h.getFullYear(), h.getMonth() - 1, 1)), den: ymd(new Date(h.getFullYear(), h.getMonth(), 0)) };
  return { tu: ymd(new Date(h.getTime() - 29 * 86400000)), den: ymd(h) }; // 30 ngay qua
}
const so = (n, d = 1) => Number(n).toLocaleString('vi-VN', { maximumFractionDigits: d });
const tienGon = (n) => (n >= 1e9 ? `${so(n / 1e9, 2)} tỷ` : n >= 1e6 ? `${so(n / 1e6)} triệu` : tien(n));

// Tang/giam luon kem mui ten + chu, khong chi dua vao mau (nguoi mu mau van doc duoc).
function BienDong({ pct }) {
  if (pct === null || pct === undefined) return <span className="muted small">mới trong kỳ</span>;
  if (pct === 0) return <span className="bd bd-ngang">→ 0%</span>;
  return <span className={`bd ${pct > 0 ? 'bd-tang' : 'bd-giam'}`}>{pct > 0 ? '↑' : '↓'} {so(Math.abs(pct))}%</span>;
}

function ChiSoGia({ v }) {
  if (v < 97) return <span className="pill p-done" title="Thấp hơn giá trung vị thị trường">▼ Rẻ hơn {100 - v}%</span>;
  if (v > 103) return <span className="pill p-wip" title="Cao hơn giá trung vị thị trường">▲ Đắt hơn {v - 100}%</span>;
  return <span className="pill p-gray">≈ Ngang thị trường</span>;
}

function KhungAi({ tu, den }) {
  const [kq, setKq] = useState(null);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState('');
  useEffect(() => { setKq(null); setLoi(''); }, [tu, den]);

  const goi = async (lamMoi) => {
    setDang(true); setLoi('');
    try { setKq((await api.post('/phan-tich/nhan-xet-ai', { tu, den, lam_moi: lamMoi })).data); }
    catch (e) { setLoi(loiCua(e)); }
    finally { setDang(false); }
  };

  return (
    <div className="card ai-card">
      <div className="tien-do-dau">
        <h3>✨ Trợ lý AI nhận xét</h3>
        {!kq && <button className="btn" disabled={dang} onClick={() => goi(false)}>{dang ? 'AI đang phân tích...' : 'Phân tích bằng AI'}</button>}
        {kq && <button className="btn sec" disabled={dang} onClick={() => goi(true)}>{dang ? 'Đang phân tích lại...' : 'Phân tích lại'}</button>}
      </div>
      <p className="muted small">AI chỉ đọc bảng số liệu tổng hợp bên dưới (không có thông tin khách hàng) và viết nhận xét. Số liệu do hệ thống tính; mọi tên và con số AI nhắc tới đều được đối chiếu lại.</p>
      {loi && <div className="error mt">{loi}</div>}
      {kq && (
        <div className="ai-kq">
          {kq.kiem_chung.so_khong_co_trong_du_lieu.length > 0 && (
            <div className="banner canh-bao-ai">⚠ Các số sau không có trong dữ liệu gốc (AI tự đặt ngưỡng hoặc tự tính), hãy kiểm tra lại: <b>{kq.kiem_chung.so_khong_co_trong_du_lieu.join(', ')}</b></div>
          )}
          {kq.kiem_chung.so_dong_ten_khong_co > 0 && (
            <p className="muted small">Đã bỏ {kq.kiem_chung.so_dong_ten_khong_co} dòng AI nhắc tới vật tư/nhà cung cấp không có trong dữ liệu.</p>
          )}
          <p className="ai-tom-tat">{kq.tom_tat}</p>
          {kq.diem_noi_bat.length > 0 && <><h4>Điểm nổi bật</h4><ul>{kq.diem_noi_bat.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
          {kq.ncc_de_xuat.length > 0 && (
            <>
              <h4>Đề xuất nhà cung cấp</h4>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Vật tư</th><th>Nên ưu tiên</th><th>Lý do</th></tr></thead>
                  <tbody>{kq.ncc_de_xuat.map((d, i) => <tr key={i}><td>{d.vat_tu}</td><td><b>{d.ncc}</b></td><td>{d.ly_do}</td></tr>)}</tbody>
                </table>
              </div>
            </>
          )}
          {kq.canh_bao.length > 0 && <><h4>Cần lưu ý</h4><ul>{kq.canh_bao.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
          {kq.hanh_dong.length > 0 && <><h4>Việc nên làm</h4><ul>{kq.hanh_dong.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
          <p className="muted small mt">Tạo lúc {ngayGio(kq.tao_luc)}{kq.tu_bo_nho_dem ? ' · lấy từ bộ nhớ đệm (không tốn thêm lượt gọi AI)' : ''}. Đây là gợi ý tham khảo, quyết định mua hàng vẫn do Kế toán.</p>
        </div>
      )}
    </div>
  );
}

export default function PhanTichNcc() {
  const [params, setParams] = useSearchParams();
  const macDinh = kyNhanh('30_ngay');
  const tu = params.get('tu') || macDinh.tu;
  const den = params.get('den') || macDinh.den;
  const [th, setTh] = useState(null);
  const [loi, setLoi] = useState('');
  const [xemHet, setXemHet] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    api.get('/phan-tich/tong-hop', { params: { tu, den }, signal: ctrl.signal })
      .then((r) => { setTh(r.data); setLoi(''); })
      .catch((e) => { if (!ctrl.signal.aborted) setLoi(loiCua(e)); });
    return () => ctrl.abort();
  }, [tu, den]);

  const datKy = (k) => setParams(k, { replace: true });
  const dangChon = ['30_ngay', 'thang_nay', 'thang_truoc'].find((l) => { const k = kyNhanh(l); return k.tu === tu && k.den === den; });
  const vatTu = th ? (xemHet ? th.vat_tu : th.vat_tu.slice(0, 10)) : [];
  const maxDt = th?.vat_tu[0]?.doanh_thu || 1;

  return (
    <>
      <h1>Nhà cung cấp</h1>
      <TabNcc />
      <div className="card">
        <div className="toolbar">
          <div className="chips" style={{ marginBottom: 0 }}>
            {[['30_ngay', '30 ngày qua'], ['thang_nay', 'Tháng này'], ['thang_truoc', 'Tháng trước']].map(([l, n]) => (
              <button key={l} className={dangChon === l ? 'chip on' : 'chip'} onClick={() => datKy(kyNhanh(l))}>{n}</button>
            ))}
          </div>
          <input type="date" aria-label="Từ ngày" value={tu} max={den} onChange={(e) => e.target.value && datKy({ tu: e.target.value, den })} />
          <span>–</span>
          <input type="date" aria-label="Đến ngày" value={den} min={tu} onChange={(e) => e.target.value && datKy({ tu, den: e.target.value })} />
        </div>
        {th && <p className="muted small">So với kỳ trước cùng độ dài: {ngay(th.ky.tu_truoc)} – {ngay(th.ky.den_truoc)} ({th.ky.so_ngay} ngày). Tính theo ngày chốt đơn, không gồm đơn nháp/huỷ.</p>}
      </div>
      {loi && <div className="error">{loi}</div>}

      {th && (
        <>
          <div className="kpi-row">
            <div className="kpi"><span className="kpi-nhan">Doanh thu vật tư</span><span className="kpi-so">{tienGon(th.tong.doanh_thu)}</span><BienDong pct={th.tong.doanh_thu_tang_pct} /></div>
            <div className="kpi"><span className="kpi-nhan">Số đơn chốt</span><span className="kpi-so">{th.tong.so_don}</span><BienDong pct={th.tong.so_don_tang_pct} /></div>
            <div className="kpi"><span className="kpi-nhan">Tiền mua nhà cung cấp</span><span className="kpi-so">{tienGon(th.tong.tien_mua_ncc)}</span><span className="muted small">quyết toán NCC đã duyệt trong kỳ</span></div>
          </div>

          <KhungAi tu={tu} den={den} />

          <div className="card">
            <h3>Vật tư bán chạy</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Vật tư</th><th className="num">Số lượng</th><th>Doanh thu</th><th>So kỳ trước</th><th className="num">Lãi gộp ước tính</th><th>NCC rẻ nhất</th></tr></thead>
                <tbody>
                  {vatTu.map((v, i) => (
                    <tr key={v.vat_tu_id}>
                      <td className="muted">{i + 1}</td>
                      <td>{v.ten}<div className="muted small">{v.loai} · {v.nguon_goc === 'mua_ngoai' ? 'mua ngoài' : 'tự sản xuất'}</div></td>
                      <td className="num nowrap">{so(v.so_luong)} {v.don_vi_tinh}</td>
                      <td className="nowrap" title={`${tien(v.doanh_thu)} · ${v.so_don} đơn`}>
                        <div className="o-thanh"><span className="thanh-ngang" style={{ width: `${Math.max(2, (v.doanh_thu / maxDt) * 100)}%` }} /></div>
                        <span className="small">{tienGon(v.doanh_thu)}</span>
                      </td>
                      <td className="nowrap"><BienDong pct={v.tang_truong_pct} /></td>
                      <td className="num nowrap">{v.lai_gop_uoc_tinh_pct === null ? <span className="muted">—</span> : `${so(v.lai_gop_uoc_tinh_pct)}%`}</td>
                      <td>{v.ncc_re_nhat ? <>{v.ncc_re_nhat}<div className="muted small">{tien(v.gia_mua_re_nhat)}</div></> : <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                  {th.vat_tu.length === 0 && <tr><td colSpan="7" className="muted center">Không có đơn hàng trong kỳ</td></tr>}
                </tbody>
              </table>
            </div>
            {th.vat_tu.length > 10 && <button className="link mt" onClick={() => setXemHet(!xemHet)}>{xemHet ? 'Thu gọn' : `Xem tất cả ${th.vat_tu.length} vật tư`}</button>}
            <p className="muted small mt">Lãi gộp ước tính = (giá bán trung bình − giá mua rẻ nhất hiện tại) / giá bán; chỉ áp dụng hàng mua ngoài.</p>
          </div>

          <div className="card">
            <h3>Nhà cung cấp — giá có hợp lý?</h3>
            <p className="muted small">Chỉ số giá: so giá từng mặt hàng của NCC với <b>giá trung vị</b> của mọi NCC cùng bán mặt hàng đó (100 = ngang trung vị), rồi lấy trung bình.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nhà cung cấp</th><th>Mức giá</th><th className="num">Chỉ số</th><th className="num">Mặt hàng rẻ nhất</th><th>Đổi giá trong kỳ</th><th className="num">Đã mua trong kỳ</th></tr></thead>
                <tbody>
                  {th.ncc.map((n) => (
                    <tr key={n.ncc_id}>
                      <td><Link to={`/nha-cung-cap/${n.ncc_id}`}>{n.ncc}</Link></td>
                      <td className="nowrap"><ChiSoGia v={n.chi_so_gia} /></td>
                      <td className="num">{n.chi_so_gia}</td>
                      <td className="num">{n.so_mat_hang_re_nhat}/{n.so_mat_hang}</td>
                      <td className="nowrap">{n.so_lan_doi_gia ? <>{n.so_lan_doi_gia} lần, TB <BienDong pct={n.doi_gia_tb_pct} /></> : <span className="muted">Không đổi</span>}</td>
                      <td className="num nowrap">{n.tien_mua ? <>{tienGon(n.tien_mua)}<div className="muted small">{n.so_lan_mua} lần</div></> : <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
