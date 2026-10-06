import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { ngay as fNgay, tien } from '../utils.js';
import { TabNcc } from './NhaCungCapList.jsx';

// Bang so sanh: moi vat tu mua ngoai, gia cua tung NCC tai mot ngay (mac dinh hom nay), re nhat dung dau.
export default function SoSanhGia() {
  const [params, setParams] = useSearchParams();
  const ngay = params.get('ngay') || new Date().toLocaleDateString('sv-SE');
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');

  useEffect(() => {
    api.get('/nha-cung-cap/so-sanh-gia', { params: { ngay } })
      .then((r) => { setKq(r.data); setLoi(''); })
      .catch((e) => setLoi(loiCua(e)));
  }, [ngay]);

  return (
    <>
      <h1>Nhà cung cấp</h1>
      <TabNcc />
      <div className="card">
        <div className="toolbar">
          <label htmlFor="ss-ngay">Giá tại ngày</label>
          <input id="ss-ngay" type="date" value={ngay} onChange={(e) => e.target.value && setParams({ ngay: e.target.value }, { replace: true })} />
          <span className="muted small">Đổi ngày để xem giá trong quá khứ (giá lưu theo thời gian).</span>
        </div>
        {loi && <div className="error">{loi}</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Vật tư</th><th>Loại</th><th>Rẻ nhất</th><th>Các nhà cung cấp khác</th><th className="num">Chênh lệch</th></tr></thead>
            <tbody>
              {(kq?.vat_tu || []).map((v) => {
                const [re, ...khac] = v.gia;
                return (
                  <tr key={v.vat_tu_id}>
                    <td>{v.vat_tu} <span className="muted small">/{v.don_vi_tinh}</span></td>
                    <td>{v.loai}</td>
                    <td>
                      {re ? (
                        <div className="gia-re"><b>{tien(re.don_gia)}</b><Link className="small" to={`/nha-cung-cap/${re.ncc_id}`}>{re.ncc}</Link></div>
                      ) : <span className="muted">Chưa có báo giá</span>}
                    </td>
                    <td>
                      <div className="gia-khac">
                        {khac.map((g) => (
                          <Link key={g.ncc_id} className="chip" to={`/nha-cung-cap/${g.ncc_id}`} title={`Áp dụng từ ${fNgay(g.ngay_hieu_luc)}`}>
                            {g.ncc}: {tien(g.don_gia)}
                          </Link>
                        ))}
                        {re && khac.length === 0 && <span className="muted small">Chỉ 1 nhà cung cấp</span>}
                      </div>
                    </td>
                    <td className="num nowrap">{v.chenh_lech_pct ? `${v.chenh_lech_pct}%` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small mt">Chênh lệch = (giá cao nhất − giá rẻ nhất) / giá rẻ nhất. Chỉ tính nhà cung cấp đang hợp tác.</p>
      </div>
    </>
  );
}
