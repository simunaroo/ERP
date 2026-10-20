import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import Icon from '../components/Icon.jsx';
import { TRANG_THAI_CHAM_SOC, ngayGio } from '../utils.js';

export const NGUON_SO = {
  facebook: 'Facebook', zalo: 'Zalo', google: 'Google', website: 'Website', tiktok: 'TikTok',
  gioi_thieu: 'Giới thiệu', sale_tu_tim: 'Sale tự tìm', khac: 'Khác',
};
export const KIEU_GIAO = { tu_dong: 'chia theo tỷ lệ', sale_tu_nhap: 'tự nhập', admin_chon: 'Admin chọn', chuyen: 'chuyển' };
const TRONG = { sdt: '', ten: '', dia_chi: '', nhu_cau: '', nguon: 'facebook' };

function TabNhapSo() {
  const laAdmin = useAuthStore((s) => s.user.vai_tro) === 'admin';
  return (
    <div className="tabs" role="tablist">
      <NavLink end to="/nhap-so" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}><Icon n="phone" /> Nhập số</NavLink>
      {laAdmin && <NavLink to="/nhap-so/chia" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}><Icon n="chart" /> Quản lý chia số</NavLink>}
    </div>
  );
}

// Tach dong dan tu Excel/Google Sheet: "SĐT | Tên | Địa chỉ | Nhu cầu" (cach nhau bang Tab, | hoac ;).
function tachDong(text, nguon) {
  return text.split(/\r?\n/).map((d) => d.trim()).filter(Boolean).map((d) => {
    const [sdt, ten, dia_chi, nhu_cau] = d.split(/\t|\||;/).map((x) => x.trim());
    return { sdt, ten, dia_chi, nhu_cau, nguon };
  });
}

// Danh sach Sale dang hoat dong (Admin) — lay tu bang ty le chia so.
export function useDsSale(bat) {
  const [ds, setDs] = useState([]);
  useEffect(() => { if (bat) api.get('/nhap-so/ty-le').then((r) => setDs(r.data.sale)).catch(() => {}); }, [bat]);
  return ds;
}

function ChonSale({ value, onChange, dsSale }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Sale nhận">
      <option value="">Tự chia theo tỷ lệ</option>
      {dsSale.map((s) => <option key={s.sale_id} value={s.sale_id}>Giao cho {s.ho_ten}</option>)}
    </select>
  );
}

// Admin chuyen khach/so sang Sale khac (bat buoc ghi ly do).
export function ChuyenSale({ khachId, saleHienTai, dsSale, onXong, nho = false }) {
  const [mo, setMo] = useState(false);
  const [den, setDen] = useState('');
  const [lyDo, setLyDo] = useState('');
  const [loi, setLoi] = useState('');
  if (!mo) return <button type="button" className={nho ? 'link small' : 'btn sec'} onClick={() => setMo(true)}><Icon n="refresh" /> Chuyển Sale</button>;
  const luu = async () => {
    setLoi('');
    try {
      const { data } = await api.put(`/nhap-so/khach/${khachId}/chuyen-sale`, { sale_id: Number(den), ly_do: lyDo });
      setMo(false); setDen(''); setLyDo(''); onXong?.(data);
    } catch (e) { setLoi(loiCua(e)); }
  };
  return (
    <div className="chuyen-sale">
      <select value={den} onChange={(e) => setDen(e.target.value)} aria-label="Chuyển cho Sale">
        <option value="">— Chọn Sale nhận —</option>
        {dsSale.filter((s) => s.ho_ten !== saleHienTai).map((s) => <option key={s.sale_id} value={s.sale_id}>{s.ho_ten}</option>)}
      </select>
      <input value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Lý do chuyển *" />
      <button type="button" className="btn" disabled={!den || !lyDo.trim()} onClick={luu}>Chuyển</button>
      <button type="button" className="link small" onClick={() => setMo(false)}>Huỷ</button>
      {loi && <span className="small error-text">{loi}</span>}
    </div>
  );
}

function KetQua({ kq }) {
  if (!kq) return null;
  return (
    <div className="mt">
      <p className="small"><b>{kq.tao}</b> số mới · <b>{kq.trung}</b> trùng · <b>{kq.loi}</b> lỗi</p>
      <ul className="list small">
        {kq.ket_qua.map((k) => (
          <li key={k.dong}>
            <span className="muted">#{k.dong}</span> {k.sdt}{' '}
            {k.khach_hang_id && <>→ chia cho <b>{k.sale}</b> · <Link to={`/khach-hang/${k.khach_hang_id}`}>{k.ten}</Link></>}
            {k.trung && <span className="error-text">trùng — {k.trung.ten}, đang thuộc {k.trung.sale} ({TRANG_THAI_CHAM_SOC[k.trung.trang_thai]?.nhan})</span>}
            {k.loi && <span className="error-text">{k.loi}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NhapSo() {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [mot, setMot] = useState({ ...TRONG, nguon: vaiTro === 'sale' ? 'sale_tu_tim' : 'facebook' });
  const [dan, setDan] = useState('');
  const [nguonDan, setNguonDan] = useState(vaiTro === 'sale' ? 'sale_tu_tim' : 'facebook');
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const [ds, setDs] = useState(null);
  const laAdmin = vaiTro === 'admin';
  const dsSale = useDsSale(laAdmin);
  const [saleMot, setSaleMot] = useState('');
  const [saleDan, setSaleDan] = useState('');

  const tai = useCallback(() => api.get('/nhap-so/gan-day', { params: { page } }).then((r) => setDs(r.data)).catch((e) => setLoi(loiCua(e))), [page]);
  useEffect(() => { tai(); }, [tai]);

  const gui = async (body, xong) => {
    setLoi(''); setKq(null); setDangGui(true);
    try {
      const { data } = await api.post('/nhap-so', body);
      setKq(data); xong?.(); tai();
    } catch (e) { setLoi(loiCua(e)); } finally { setDangGui(false); }
  };
  const dsDan = tachDong(dan, nguonDan);
  const doi = (k) => (e) => setMot({ ...mot, [k]: e.target.value });

  return (
    <>
      <h1>Nhập số</h1>
      <TabNhapSo />
      <p className="muted small">
        {vaiTro === 'sale'
          ? 'Số bạn tự tìm được sẽ thuộc về bạn. Số trùng với khách đã có sẽ không được tạo lại.'
          : 'Chọn Sale nhận, hoặc để "Tự chia theo tỷ lệ" ở tab "Quản lý chia số"; Sale nhận thông báo ngay. Có thể chuyển số sang Sale khác ở bảng bên dưới. Số trùng với khách đã có sẽ không được tạo lại.'}
      </p>
      {loi && <div className="error">{loi}</div>}

      <div className="grid2">
        <form className="card" onSubmit={(e) => { e.preventDefault(); gui({ ...mot, sale_id: saleMot || undefined }, () => setMot({ ...TRONG, nguon: mot.nguon })); }}>
          <h3>Nhập một số</h3>
          <div className="grid2">
            <div className="field"><label>Số điện thoại *</label><input value={mot.sdt} onChange={doi('sdt')} placeholder="0912 345 678" required /></div>
            <div className="field"><label>Tên khách</label><input value={mot.ten} onChange={doi('ten')} placeholder="Để trống nếu chưa rõ" /></div>
            <div className="field"><label>Địa chỉ / khu vực</label><input value={mot.dia_chi} onChange={doi('dia_chi')} /></div>
            <div className="field"><label>Nguồn</label>
              <select value={mot.nguon} onChange={doi('nguon')}>{Object.entries(NGUON_SO).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
            </div>
          </div>
          <div className="field"><label>Nhu cầu</label><textarea rows={2} value={mot.nhu_cau} onChange={doi('nhu_cau')} placeholder="VD: lát sàn gỗ phòng khách 40m2, cần báo giá trong tuần" /></div>
          <div className="actions">
            {laAdmin && <ChonSale value={saleMot} onChange={setSaleMot} dsSale={dsSale} />}
            <button className="btn" disabled={dangGui}><Icon n="plus" /> Lưu số</button>
          </div>
        </form>

        <div className="card">
          <h3>Dán nhiều số</h3>
          <p className="muted small">Chép từ Excel/Google Sheet, mỗi dòng một số theo thứ tự cột: <b>SĐT | Tên | Địa chỉ | Nhu cầu</b> (chỉ SĐT là bắt buộc).</p>
          <div className="field"><textarea rows={6} value={dan} onChange={(e) => setDan(e.target.value)} placeholder={'0912345678\tAnh Nam\tCầu Giấy\tSàn gỗ 50m2\n0987654321\tChị Lan'} /></div>
          <div className="actions">
            <select value={nguonDan} onChange={(e) => setNguonDan(e.target.value)} aria-label="Nguồn chung">
              {Object.entries(NGUON_SO).map(([v, n]) => <option key={v} value={v}>Nguồn: {n}</option>)}
            </select>
            {laAdmin && <ChonSale value={saleDan} onChange={setSaleDan} dsSale={dsSale} />}
            <button className="btn" disabled={dangGui || !dsDan.length} onClick={() => gui({ ds: dsDan, sale_id: saleDan || undefined }, () => setDan(''))}>Nhập {dsDan.length || ''} số</button>
          </div>
        </div>
      </div>
      {kq && <div className="card"><h3>Kết quả lần nhập vừa rồi</h3><KetQua kq={kq} /></div>}

      <div className="card">
        <h3>{vaiTro === 'sale' ? 'Số bạn đã nhập' : 'Số đã nhập gần đây'}</h3>
        {!ds ? <p className="muted">Đang tải...</p> : ds.items.length === 0 ? <p className="muted">Chưa có số nào.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Thời gian</th><th>SĐT</th><th>Khách</th><th>Nguồn</th><th>Kênh</th><th>Sale nhận</th><th>Chăm sóc</th>{laAdmin && <th />}</tr></thead>
              <tbody>
                {ds.items.map((x) => {
                  const tt = TRANG_THAI_CHAM_SOC[x.trang_thai_cham_soc];
                  return (
                    <tr key={x.id}>
                      <td className="nowrap">{ngayGio(x.created_at)}</td>
                      <td className="nowrap">{x.sdt}</td>
                      <td><Link to={`/khach-hang/${x.khach_hang_id}`}>{x.ten}</Link>{x.nhu_cau && <div className="muted small">{x.nhu_cau}</div>}</td>
                      <td>{NGUON_SO[x.nguon] || '—'}</td>
                      <td>{x.kenh === 'api' ? 'API tự động' : x.nguoi_nhap}</td>
                      <td>{x.sale}{x.kieu !== 'tu_dong' && <span className="muted small"> ({KIEU_GIAO[x.kieu]})</span>}</td>
                      <td><span className={`pill ${tt.lop}`}>{tt.nhan}</span></td>
                      {laAdmin && <td><ChuyenSale nho khachId={x.khach_hang_id} saleHienTai={x.sale} dsSale={dsSale} onXong={tai} /></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {ds && ds.soTrang > 1 && (
          <div className="pager">
            <button className="btn sec" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>← Trước</button>
            <span className="small">Trang {page}/{ds.soTrang}</span>
            <button className="btn sec" disabled={page >= ds.soTrang} onClick={() => setParams({ page: String(page + 1) })}>Sau →</button>
          </div>
        )}
      </div>
    </>
  );
}

export function QuanLyChiaSo() {
  const [kq, setKq] = useState(null);
  const [tyLe, setTyLe] = useState({});
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');

  const nap = (d) => {
    setKq(d);
    const deu = Math.floor(100 / Math.max(1, d.sale.length));
    setTyLe(Object.fromEntries(d.sale.map((s, i) => [s.sale_id, s.ty_le ?? (i === 0 ? 100 - deu * (d.sale.length - 1) : deu)])));
  };
  useEffect(() => { api.get('/nhap-so/ty-le').then((r) => nap(r.data)).catch((e) => setLoi(loiCua(e))); }, []);

  const tong = Object.values(tyLe).reduce((a, b) => a + (Number(b) || 0), 0);
  const tongThang = kq ? kq.sale.reduce((a, s) => a + s.thang_nay, 0) : 0;
  const luu = async () => {
    setLoi(''); setThongBao('');
    try {
      const { data } = await api.put('/nhap-so/ty-le', { ds: Object.entries(tyLe).map(([sale_id, ty_le]) => ({ sale_id: Number(sale_id), ty_le: Number(ty_le) || 0 })) });
      nap(data); setThongBao('Đã lưu tỷ lệ chia số — áp dụng cho số nhập từ bây giờ.');
    } catch (e) { setLoi(loiCua(e)); }
  };

  return (
    <>
      <h1>Nhập số</h1>
      <TabNhapSo />
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      {!kq ? <p className="muted">Đang tải...</p> : (
        <>
          <div className="card">
            <h3>Tỷ lệ chia số cho Sale</h3>
            <p className="muted small">
              {kq.che_do === 'chia_deu'
                ? 'Chưa đặt tỷ lệ: hệ thống đang chia đều cho mọi Sale đang hoạt động.'
                : 'Đang chia theo tỷ lệ bên dưới.'}{' '}
              Mỗi số mới được giao cho Sale đang thiếu nhiều nhất so với tỷ lệ của mình trong tháng, nên số thực tế luôn bám sát tỷ lệ.
              Đặt 0% để tạm ngưng chia cho Sale đó (nghỉ phép, quá tải).
            </p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Sale</th><th className="num">Tỷ lệ (%)</th><th className="num">Đã chia tháng này</th><th className="num">Thực tế</th><th className="num">Hôm nay</th><th className="num">Chưa liên hệ</th><th className="num">Đã chốt</th></tr></thead>
                <tbody>
                  {kq.sale.map((s) => (
                    <tr key={s.sale_id}>
                      <td>{s.ho_ten}</td>
                      <td className="num"><input type="number" min="0" max="100" step="1" style={{ width: 72 }} value={tyLe[s.sale_id] ?? 0}
                        onChange={(e) => setTyLe({ ...tyLe, [s.sale_id]: e.target.value })} aria-label={`Tỷ lệ của ${s.ho_ten}`} /></td>
                      <td className="num">{s.thang_nay}</td>
                      <td className="num">{tongThang ? `${Math.round((s.thang_nay / tongThang) * 100)}%` : '—'}</td>
                      <td className="num">{s.hom_nay}</td>
                      <td className="num">{s.chua_lien_he ? <span className="error-text">{s.chua_lien_he}</span> : 0}</td>
                      <td className="num">{s.da_chot}{s.thang_nay ? <span className="muted small"> ({Math.round((s.da_chot / s.thang_nay) * 100)}%)</span> : ''}</td>
                    </tr>
                  ))}
                  <tr><td><b>Tổng</b></td><td className="num"><b className={tong === 100 ? '' : 'error-text'}>{tong}%</b></td><td className="num"><b>{tongThang}</b></td><td colSpan={4} /></tr>
                </tbody>
              </table>
            </div>
            <div className="actions mt">
              <button className="btn" disabled={tong !== 100} onClick={luu}>Lưu tỷ lệ</button>
              {tong !== 100 && <span className="small error-text">Tổng phải bằng 100%</span>}
            </div>
          </div>

          <div className="card">
            <h3>Đẩy số tự động qua API</h3>
            <p className="small">Form website, Facebook Lead Ads (qua Make/Zapier), Google Sheet… gọi API này để số tự vào hệ thống và được chia như khi nhập tay.
              Trạng thái: {kq.api_da_cau_hinh ? <b>đã bật</b> : <span className="error-text">chưa bật — đặt NHAP_SO_API_KEY trong backend/.env</span>}.</p>
            <pre className="small">{`POST /api/nhap-so/tu-dong
X-Api-Key: <NHAP_SO_API_KEY>
Content-Type: application/json

{ "sdt": "0912345678", "ten": "Anh Nam", "dia_chi": "Cầu Giấy",
  "nhu_cau": "Sàn gỗ 50m2", "nguon": "facebook" }
// hoặc nhiều số: { "ds": [ {...}, {...} ] }`}</pre>
          </div>
        </>
      )}
    </>
  );
}
