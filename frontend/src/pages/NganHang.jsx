import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { TabTc } from './CongNo.jsx';
import { ngayGio, tien } from '../utils.js';

const TRANG_THAI = { chua_khop: ['Chưa khớp', 'p-wip'], da_khop: ['Đã khớp', 'p-done'], bo_qua: ['Bỏ qua', 'p-gray'] };
const CACH = { xac_nhan_phieu: 'Tự xác nhận phiếu thu', tao_phieu: 'Tự tạo phiếu thu', da_chi: 'Tự ghi "đã chi"', thu_cong: 'Kế toán khớp tay' };

// Gia lap giao dich: gui dung payload webhook ngan hang (SePay) toi he thong, de demo khi chua noi tai khoan that.
function GiaLap({ onXong }) {
  const quyen = useAuthStore((s) => s.user.quyen) || [];
  const [f, setF] = useState({ loai: 'vao', so_tien: '', noi_dung: '' });
  const [goiY, setGoiY] = useState({ thu: [], chi: [] });
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  useEffect(() => {
    if (quyen.includes('thu.xac_nhan')) api.get('/thu-tien/cho-xac-nhan').then((r) => setGoiY((g) => ({ ...g, thu: r.data.filter((p) => p.hinh_thuc === 'chuyen_khoan').slice(0, 5) }))).catch(() => {});
    if (quyen.includes('chi.xem')) api.get('/cong-no/de-xuat-chi', { params: { trang_thai: 'da_duyet' } }).then((r) => setGoiY((g) => ({ ...g, chi: r.data.items.slice(0, 5) }))).catch(() => {});
  }, [kq]);
  const gui = async (e) => {
    e.preventDefault(); setLoi(''); setKq(null);
    try { const { data } = await api.post('/ngan-hang/gia-lap', { ...f, so_tien: Number(f.so_tien) }); setKq(data); onXong(); } catch (er) { setLoi(loiCua(er)); }
  };
  return (
    <form className="card" onSubmit={gui}>
      <h3>Giả lập giao dịch ngân hàng</h3>
      <p className="muted small">
        Khi chạy thật, dịch vụ báo giao dịch (SePay) gọi <code>POST /api/ngan-hang/webhook</code> mỗi khi tài khoản công ty có tiền vào/ra.
        Form này gửi đúng dữ liệu đó để thử luồng đối soát: tiền vào có mã đơn → tự xác nhận / tạo phiếu thu; tiền ra đúng nội dung CK của đề xuất chi đã duyệt → tự ghi "đã chi".
      </p>
      <div className="toolbar">
        <select value={f.loai} onChange={(e) => setF({ ...f, loai: e.target.value })} aria-label="Loại giao dịch">
          <option value="vao">Tiền vào (khách trả)</option><option value="ra">Tiền ra (công ty chi)</option>
        </select>
        <input type="number" min="1" placeholder="Số tiền" value={f.so_tien} onChange={(e) => setF({ ...f, so_tien: e.target.value })} required style={{ width: 150 }} />
        <input className="grow" placeholder="Nội dung chuyển khoản, VD: DH-2610-125 THANH TOAN" value={f.noi_dung} onChange={(e) => setF({ ...f, noi_dung: e.target.value })} required />
        <button className="btn">Gửi giao dịch</button>
      </div>
      {(goiY.thu.length > 0 || goiY.chi.length > 0) && (
        <div className="chips">
          <span className="muted small">Điền nhanh:</span>
          {goiY.thu.map((p) => <button type="button" key={`t${p.id}`} className="chip" onClick={() => setF({ loai: 'vao', so_tien: String(p.so_tien), noi_dung: `${p.ma_don} THANH TOAN` })}>Thu {p.ma_don} · {tien(p.so_tien)}</button>)}
          {goiY.chi.map((c) => <button type="button" key={`c${c.id}`} className="chip" onClick={() => setF({ loai: 'ra', so_tien: String(c.so_tien), noi_dung: c.noi_dung_ck })}>Chi DXC-{c.id} · {tien(c.so_tien)}</button>)}
        </div>
      )}
      {loi && <div className="error">{loi}</div>}
      {kq && <div className={kq.trang_thai === 'da_khop' ? 'success' : 'banner'}>
        {kq.trang_thai === 'da_khop' ? `Đã khớp: ${CACH[kq.cach]}.` : `Chưa khớp: ${kq.ghiChu || 'không tìm thấy đơn / đề xuất chi phù hợp'} — xử lý ở bảng dưới.`}
      </div>}
    </form>
  );
}

function XuLy({ g, onXong }) {
  const [mo, setMo] = useState(null);
  const [v, setV] = useState('');
  const [loi, setLoi] = useState('');
  const lam = async () => {
    setLoi('');
    try {
      if (mo === 'khop') await api.post(`/ngan-hang/giao-dich/${g.id}/khop`, { ma_don: v });
      else await api.post(`/ngan-hang/giao-dich/${g.id}/bo-qua`, { ly_do: v });
      setMo(null); setV(''); onXong();
    } catch (e) { setLoi(loiCua(e)); }
  };
  if (!mo) return (
    <span className="nowrap">
      {g.loai === 'vao' && <button className="link small" onClick={() => setMo('khop')}>Khớp vào đơn</button>}{' '}
      <button className="link small" onClick={() => setMo('bo_qua')}>Bỏ qua</button>
    </span>
  );
  return (
    <div className="chuyen-sale">
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={mo === 'khop' ? 'Mã đơn, VD DH-2610-125' : 'Lý do bỏ qua *'} />
      <button className="btn" disabled={!v.trim()} onClick={lam}>{mo === 'khop' ? 'Khớp' : 'Bỏ qua'}</button>
      <button className="link small" onClick={() => setMo(null)}>Huỷ</button>
      {loi && <span className="small error-text">{loi}</span>}
    </div>
  );
}

export default function NganHang() {
  const [params, setParams] = useSearchParams();
  const tt = params.get('trang_thai') || '';
  const page = Number(params.get('page')) || 1;
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  const tai = useCallback(() => {
    api.get('/ngan-hang/giao-dich', { params: { trang_thai: tt || undefined, page } }).then((r) => setKq(r.data)).catch((e) => setLoi(loiCua(e)));
  }, [tt, page]);
  useEffect(tai, [tai]);
  const datLoc = (v) => setParams(v ? { trang_thai: v } : {});

  return (
    <>
      <h1>Chi & công nợ</h1>
      <TabTc />
      {loi && <div className="error">{loi}</div>}
      <GiaLap onXong={tai} />
      <div className="card">
        <h3>Giao dịch ngân hàng</h3>
        <div className="chips">
          <button className={!tt ? 'chip on' : 'chip'} onClick={() => datLoc('')}>Tất cả</button>
          {Object.entries(TRANG_THAI).map(([v, [n]]) => (
            <button key={v} className={tt === v ? 'chip on' : 'chip'} onClick={() => datLoc(v)}>{n}{kq?.dem?.[v] ? ` (${kq.dem[v]})` : ''}</button>
          ))}
        </div>
        {!kq ? <p className="muted">Đang tải...</p> : kq.items.length === 0 ? <p className="muted">Chưa có giao dịch nào.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Thời gian</th><th className="num">Số tiền</th><th>Nội dung CK</th><th>Trạng thái</th><th>Kết quả</th><th /></tr></thead>
            <tbody>{kq.items.map((g) => {
              const [nhan, lop] = TRANG_THAI[g.trang_thai];
              return (
                <tr key={g.id}>
                  <td className="nowrap">{ngayGio(g.thoi_gian_gd)}<div className="muted small">{g.ngan_hang}{g.nguon === 'gia_lap' && ' · giả lập'}</div></td>
                  <td className={`num nowrap ${g.loai === 'vao' ? 'tien-vao' : 'tien-ra'}`}><b>{g.loai === 'vao' ? '+' : '−'}{tien(g.so_tien)}</b></td>
                  <td className="small">{g.noi_dung}</td>
                  <td><span className={`pill ${lop}`}>{nhan}</span></td>
                  <td className="small">
                    {g.cach_khop && <div>{CACH[g.cach_khop]}{g.nguoi_xu_ly && ` (${g.nguoi_xu_ly})`}</div>}
                    {g.ma_don && <Link to={`/don-hang/${g.don_hang_id}`}>{g.ma_don}</Link>}
                    {g.de_xuat_chi_id && <Link to={`/cong-no?mo=${g.de_xuat_chi_id}`}>DXC-{g.de_xuat_chi_id}</Link>}
                    {g.ghi_chu && <div className="muted">{g.ghi_chu}</div>}
                  </td>
                  <td>{g.trang_thai === 'chua_khop' && <XuLy g={g} onXong={tai} />}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
        {kq && kq.soTrang > 1 && (
          <div className="pager">
            <button className="btn sec" disabled={page <= 1} onClick={() => setParams({ ...(tt ? { trang_thai: tt } : {}), page: String(page - 1) })}>← Trước</button>
            <span className="small">Trang {page}/{kq.soTrang}</span>
            <button className="btn sec" disabled={page >= kq.soTrang} onClick={() => setParams({ ...(tt ? { trang_thai: tt } : {}), page: String(page + 1) })}>Sau →</button>
          </div>
        )}
      </div>
    </>
  );
}
