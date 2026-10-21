import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { ngayGio } from '../utils.js';

export const TEN_BANG = {
  don_hang: 'Đơn hàng', don_hang_vat_tu: 'Vật tư của đơn', khach_hang: 'Khách hàng', mua_hang_dong: 'Dòng mua hàng',
  de_xuat_chi: 'Đề xuất chi', thanh_toan_khach: 'Phiếu thu khách', thi_cong: 'Thi công', phat_sinh_thi_cong: 'Phát sinh thi công',
  ncc_bang_gia: 'Bảng giá NCC', vat_tu: 'Danh mục vật tư', nha_cung_cap: 'Nhà cung cấp', users: 'Người dùng', cau_hinh: 'Cấu hình', ty_le_chia_so: 'Tỷ lệ chia số', vai_tro_quyen: 'Phân quyền', giao_dich_ngan_hang: 'Giao dịch ngân hàng',
};
const HANH_DONG = { INSERT: ['Thêm', 'p-done'], UPDATE: ['Sửa', 'p-new'], DELETE: ['Xoá', 'p-lost'] };
const BO_QUA = new Set(['id', 'created_at']);
const KENH = { web: 'Web', telegram: 'Telegram', api: 'API', ngan_hang: 'Ngân hàng' };

const hien = (v) => {
  if (v === null || v === undefined || v === '') return <span className="muted">trống</span>;
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
};

// Hien phan thay doi: UPDATE = tung cot cu -> moi; INSERT/DELETE = cac cot chinh cua dong.
function ThayDoi({ x }) {
  if (x.hanh_dong === 'UPDATE') {
    return (
      <ul className="thay-doi">
        {Object.keys(x.du_lieu_moi || {}).map((k) => (
          <li key={k}><code>{k}</code>: <span className="cu">{hien(x.du_lieu_cu?.[k])}</span> → <b>{hien(x.du_lieu_moi[k])}</b></li>
        ))}
      </ul>
    );
  }
  const d = x.du_lieu_moi || x.du_lieu_cu || {};
  const cot = Object.entries(d).filter(([k, v]) => !BO_QUA.has(k) && v !== null && v !== '').slice(0, 6);
  return <span className="small muted">{cot.map(([k, v]) => `${k}: ${hien(v)}`).join(' · ')}</span>;
}

export default function NhatKy() {
  const [params, setParams] = useSearchParams();
  const [kq, setKq] = useState(null);
  const [dsNguoi, setDsNguoi] = useState([]);
  const [loi, setLoi] = useState('');
  const loc = Object.fromEntries(['bang', 'hanh_dong', 'nguoi_id', 'tu', 'den', 'ban_ghi', 'don_hang_id', 'page'].map((k) => [k, params.get(k) || '']));
  const datLoc = (moi) => {
    const p = new URLSearchParams(params);
    Object.entries({ ...moi, page: moi.page ?? '' }).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p);
  };
  useEffect(() => { api.get('/nguoi-dung').then((r) => setDsNguoi(r.data.items || r.data)).catch(() => {}); }, []);
  useEffect(() => {
    const q = Object.fromEntries(Object.entries(loc).filter(([, v]) => v));
    api.get('/nhat-ky', { params: q }).then((r) => { setKq(r.data); setLoi(''); }).catch((e) => setLoi(loiCua(e)));
  }, [params]);
  const page = Number(loc.page) || 1;

  return (
    <>
      <h1>Nhật ký thay đổi</h1>
      <p className="muted small">Mọi thêm / sửa / xoá trên dữ liệu quan trọng do trigger CSDL ghi lại: ai sửa, sửa gì (giá trị cũ → mới), lúc nào, qua kênh nào. Thao tác lỗi bị huỷ thì không có nhật ký.</p>
      {loi && <div className="error">{loi}</div>}
      <div className="card">
        <div className="toolbar">
          <select value={loc.bang} onChange={(e) => datLoc({ bang: e.target.value })} aria-label="Bảng">
            <option value="">Mọi dữ liệu</option>{Object.entries(TEN_BANG).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
          <select value={loc.hanh_dong} onChange={(e) => datLoc({ hanh_dong: e.target.value })} aria-label="Hành động">
            <option value="">Mọi thao tác</option>{Object.entries(HANH_DONG).map(([v, [n]]) => <option key={v} value={v}>{n}</option>)}
          </select>
          <select value={loc.nguoi_id} onChange={(e) => datLoc({ nguoi_id: e.target.value })} aria-label="Người thao tác">
            <option value="">Mọi người</option>{dsNguoi.map((u) => <option key={u.id} value={u.id}>{u.ho_ten}</option>)}
          </select>
          <input type="date" value={loc.tu} onChange={(e) => datLoc({ tu: e.target.value })} aria-label="Từ ngày" />
          <input type="date" value={loc.den} onChange={(e) => datLoc({ den: e.target.value })} aria-label="Đến ngày" />
          {(loc.don_hang_id || loc.ban_ghi) && <button className="chip on" onClick={() => datLoc({ don_hang_id: '', ban_ghi: '' })}>
            {loc.don_hang_id ? `Đơn #${loc.don_hang_id}` : `Bản ghi #${loc.ban_ghi}`} ✕</button>}
        </div>
        {!kq ? <p className="muted">Đang tải...</p> : kq.items.length === 0 ? <p className="muted">Không có thay đổi nào.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Thời gian</th><th>Người</th><th>Dữ liệu</th><th>Thao tác</th><th>Thay đổi</th></tr></thead>
            <tbody>{kq.items.map((x) => {
              const [nhan, lop] = HANH_DONG[x.hanh_dong];
              const donId = x.bang === 'don_hang' ? x.ban_ghi : (x.du_lieu_moi || x.du_lieu_cu)?.don_hang_id;
              return (
                <tr key={x.id}>
                  <td className="nowrap">{ngayGio(x.thoi_gian)}</td>
                  <td>{x.nguoi || <span className="muted">Hệ thống</span>}{x.kenh && <div className="muted small">{KENH[x.kenh] || x.kenh}</div>}</td>
                  <td>{TEN_BANG[x.bang] || x.bang} <span className="muted small">#{x.ban_ghi}</span>
                    {donId && <div className="small"><Link to={`/don-hang/${donId}`}>xem đơn</Link></div>}</td>
                  <td><span className={`pill ${lop}`}>{nhan}</span></td>
                  <td><ThayDoi x={x} /></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
        {kq && kq.soTrang > 1 && (
          <div className="pager">
            <button className="btn sec" disabled={page <= 1} onClick={() => datLoc({ page: String(page - 1) })}>← Trước</button>
            <span className="small">Trang {page}/{kq.soTrang} · {kq.tong} thay đổi</span>
            <button className="btn sec" disabled={page >= kq.soTrang} onClick={() => datLoc({ page: String(page + 1) })}>Sau →</button>
          </div>
        )}
      </div>
    </>
  );
}
