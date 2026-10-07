import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { GIAI_DOAN, LOAI_PHAT_SINH, ngay, tien } from '../utils.js';

const ymd = (d) => d.toLocaleDateString('sv-SE');
const congNgay = (s, n) => ymd(new Date(new Date(`${s}T00:00:00`).getTime() + n * 86400000));
const THU = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const so = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 2 }));

export function trangThaiTc(tc) {
  if (tc.trang_thai === 'lap_lich') return { nhan: 'Đã phân thợ', lop: 'p-new' };
  if (tc.trang_thai === 'da_nghiem_thu') return { nhan: 'Đã nghiệm thu', lop: 'p-done' };
  return tc.ngay_hoan_thanh ? { nhan: 'Thi công xong', lop: 'p-wip' } : { nhan: 'Đang thi công', lop: 'p-wip' };
}
const laVh = (v) => ['van_hanh', 'admin'].includes(v);

function TabTc() {
  return (
    <div className="tabs" role="tablist">
      <NavLink end to="/thi-cong" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>🏗️ Lịch thi công</NavLink>
      <NavLink to="/thi-cong/nghiem-thu" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>✅ Nghiệm thu</NavLink>
      <NavLink to="/thi-cong/quyet-toan" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>📊 Quyết toán</NavLink>
      <NavLink to="/thi-cong/doi-tho" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>👷 Đội thợ</NavLink>
    </div>
  );
}

// Server canh bao trung lich (409) -> hoi lai roi gui kem xac_nhan_trung_lich.
async function xepLich(goi, body) {
  try { return await goi(body); } catch (e) {
    if (e.response?.status === 409 && /đã có lịch/.test(e.response.data?.message || '') && window.confirm(e.response.data.message)) {
      return goi({ ...body, xac_nhan_trung_lich: true });
    }
    throw e;
  }
}

function FormGiaiDoan({ doiTho, macDinh = {}, onLuu, nhanNut = 'Phân thợ' }) {
  const [f, setF] = useState({
    ten_giai_doan: macDinh.ten_giai_doan || 'Lát sàn', doi_tho_id: macDinh.doi_tho_id ? String(macDinh.doi_tho_id) : '',
    don_vi_cong: macDinh.don_vi_cong || 'm²', gia_cong: macDinh.gia_cong ?? '', kl_du_kien: macDinh.kl_du_kien ?? '',
    ngay_du_kien: macDinh.ngay_du_kien && macDinh.ngay_du_kien >= ymd(new Date()) ? macDinh.ngay_du_kien : congNgay(ymd(new Date()), 1),
  });
  const dat = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="toolbar" onSubmit={(e) => { e.preventDefault(); onLuu({ ...f, doi_tho_id: Number(f.doi_tho_id) }); }}>
      <input aria-label="Tên giai đoạn" list="ds-giai-doan" value={f.ten_giai_doan} onChange={dat('ten_giai_doan')} required style={{ width: 130 }} />
      <datalist id="ds-giai-doan"><option value="Lát sàn" /><option value="Ốp tường, trần" /><option value="Lắp cửa" /><option value="Hoàn thiện" /></datalist>
      <select aria-label="Đội thợ" value={f.doi_tho_id} onChange={dat('doi_tho_id')} required>
        <option value="">— Đội thợ —</option>
        {doiTho.map((d) => <option key={d.id} value={d.id}>{d.ten} ({d.viec_dang_mo} việc){d.nang_luc ? ` · ${d.nang_luc}` : ''}</option>)}
      </select>
      <input aria-label="Giá công" type="number" min="0" step="1000" placeholder="Giá công" value={f.gia_cong} onChange={dat('gia_cong')} required style={{ width: 110 }} />
      <select aria-label="Đơn vị công" value={f.don_vi_cong} onChange={dat('don_vi_cong')}><option>m²</option><option>bộ</option><option>md</option><option>gói</option></select>
      <input aria-label="KL dự kiến" type="number" min="0" step="0.1" placeholder="KL dự kiến" value={f.kl_du_kien} onChange={dat('kl_du_kien')} required style={{ width: 100 }} />
      <input aria-label="Ngày thi công" type="date" min={ymd(new Date())} value={f.ngay_du_kien} onChange={dat('ngay_du_kien')} required />
      <button className="btn sec">{nhanNut}</button>
    </form>
  );
}

function TheGiaiDoan({ tc, doiTho, vaiTro, onDoi }) {
  const [mo, setMo] = useState(false);
  const tt = trangThaiTc(tc);
  const diaChi = [tc.dia_chi_cong_trinh, tc.phuong_xa, tc.tinh_thanh].filter(Boolean).join(', ');
  const ungCong = () => {
    const v = window.prompt(`Số tiền ứng công cho ${tc.doi_tho} (tối đa 50% công dự kiến ${tien(tc.gia_cong * tc.kl_du_kien)}):`);
    if (v) onDoi(() => api.post('/cong-no/de-xuat-chi', { loai_chi: 'ung_cong', doi_tho_id: tc.doi_tho_id, don_hang_id: tc.don_hang_id, so_tien: Number(v.replace(/\D/g, '')) }));
  };
  return (
    <li className="viec">
      <div className="viec-dau">
        <span><Link to={`/don-hang/${tc.don_hang_id}`}><b>{tc.ma_don}</b></Link> · <b>{tc.ten_giai_doan}</b> — {tc.khach_hang} {tc.khach_hang_sdt && <span className="muted small">({tc.khach_hang_sdt})</span>}</span>
        <span className={`pill ${tt.lop}`}>{tt.nhan}</span>
      </div>
      <div className="small">📍 {diaChi || '—'}</div>
      <div className="small">👷 {tc.doi_tho}{tc.doi_tho_sdt && ` · ${tc.doi_tho_sdt}`} · công {tien(tc.gia_cong)}/{tc.don_vi_cong} × {so(tc.kl_du_kien)} = <b>{tien(tc.gia_cong * tc.kl_du_kien)}</b>
        {tc.ngay_thuc_hien && <span className="muted"> · bắt đầu {ngay(tc.ngay_thuc_hien)}</span>}</div>
      <div className="hanh-dong mt">
        {laVh(vaiTro) && tc.trang_thai === 'lap_lich' && <>
          <button className="btn" onClick={() => onDoi(() => api.post(`/thi-cong/${tc.id}/bat-dau`))}>▶ Bắt đầu thi công</button>
          <button className="link" onClick={() => setMo(!mo)}>Đổi thợ / lịch</button>
        </>}
        {laVh(vaiTro) && tc.trang_thai === 'dang_thi_cong' && !tc.ngay_hoan_thanh && <button className="btn" onClick={() => onDoi(() => api.post(`/thi-cong/${tc.id}/bao-xong`))}>✓ Xác nhận thi công xong</button>}
        {tc.trang_thai === 'dang_thi_cong' && tc.ngay_hoan_thanh && <Link className="btn sec" to={`/thi-cong/nghiem-thu/${tc.don_hang_id}`}>Nhập nghiệm thu →</Link>}
        {vaiTro === 'ke_toan' && tc.trang_thai !== 'da_nghiem_thu' && <button className="btn sec" onClick={ungCong}>💸 Đề xuất ứng công</button>}
      </div>
      {mo && <FormGiaiDoan doiTho={doiTho} macDinh={tc} nhanNut="Lưu" onLuu={(b) => onDoi(() => xepLich((x) => api.put(`/thi-cong/${tc.id}`, x), b)).then((ok) => ok && setMo(false))} />}
    </li>
  );
}

export function LichThiCong() {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [params, setParams] = useSearchParams();
  const tu = params.get('tu') || ymd(new Date());
  const den = params.get('den') || congNgay(tu, 13);
  const [kq, setKq] = useState(null);
  const [doiTho, setDoiTho] = useState([]);
  const [themCho, setThemCho] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const tai = useCallback(() => {
    api.get('/thi-cong/lich', { params: { tu, den } }).then((r) => setKq(r.data)).catch((e) => setLoi(loiCua(e)));
    api.get('/thi-cong/doi-tho', { params: { hoat_dong: '1' } }).then((r) => setDoiTho(r.data)).catch(() => {});
  }, [tu, den]);
  useEffect(tai, [tai]);
  const onDoi = async (fn) => {
    setLoi(''); setThongBao('');
    try { const r = await fn(); setThongBao(r?.data?.don_tu_chuyen_buoc ? 'Đã cập nhật — tiến độ đơn tự chuyển bước' : r?.data?.loai_chi ? `Đã lập đề xuất ${r.data.loai_chi === 'ung_cong' ? 'ứng công' : 'chi'} DXC-${r.data.id}` : 'Đã cập nhật'); tai(); return true; }
    catch (e) { setLoi(loiCua(e)); return false; }
  };
  const dangLam = (kq?.viec || []).filter((v) => v.trang_thai === 'dang_thi_cong');
  const theoNgay = new Map();
  for (const v of (kq?.viec || []).filter((x) => x.trang_thai === 'lap_lich')) {
    if (!theoNgay.has(v.ngay_du_kien)) theoNgay.set(v.ngay_du_kien, []);
    theoNgay.get(v.ngay_du_kien).push(v);
  }
  const donDangCo = [...new Map((kq?.viec || []).map((v) => [v.don_hang_id, v])).values()];

  return (
    <>
      <h1>Thi công</h1>
      <TabTc />
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      {laVh(vaiTro) && kq?.can_lap_lich.length > 0 && (
        <div className="card">
          <h3>Chưa phân công thợ ({kq.can_lap_lich.length})</h3>
          <ul className="ds-viec">
            {kq.can_lap_lich.map((d) => (
              <li key={d.don_hang_id} className="viec">
                <div className="viec-dau">
                  <span><Link to={`/don-hang/${d.don_hang_id}`}><b>{d.ma_don}</b></Link> — {d.khach_hang}, {d.tinh_thanh || '—'}</span>
                  <span className="small">{GIAI_DOAN[d.giai_doan].nhan} · YC {d.ngay_yc_lap_dat ? ngay(d.ngay_yc_lap_dat) : '—'}</span>
                </div>
                <FormGiaiDoan doiTho={doiTho} macDinh={{ ngay_du_kien: d.ngay_yc_lap_dat }} onLuu={(b) => onDoi(() => xepLich((x) => api.post('/thi-cong', x), { ...b, don_hang_id: d.don_hang_id }))} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {laVh(vaiTro) && donDangCo.length > 0 && (
        <div className="card">
          <div className="toolbar" style={{ margin: 0 }}>
            <span className="small">Thêm giai đoạn cho đơn:</span>
            <select aria-label="Đơn thêm giai đoạn" value={themCho || ''} onChange={(e) => setThemCho(e.target.value)}>
              <option value="">— Chọn đơn —</option>
              {donDangCo.map((v) => <option key={v.don_hang_id} value={v.don_hang_id}>{v.ma_don} — {v.khach_hang}</option>)}
            </select>
          </div>
          {themCho && <FormGiaiDoan doiTho={doiTho} onLuu={(b) => onDoi(() => xepLich((x) => api.post('/thi-cong', x), { ...b, don_hang_id: Number(themCho) })).then((ok) => ok && setThemCho(null))} />}
        </div>
      )}
      <div className="card">
        <h3>Đang thi công ({dangLam.length})</h3>
        {dangLam.length === 0 && <p className="muted">Không có giai đoạn nào đang thi công.</p>}
        <ul className="ds-viec">{dangLam.map((v) => <TheGiaiDoan key={v.id} tc={v} doiTho={doiTho} vaiTro={vaiTro} onDoi={onDoi} />)}</ul>
      </div>
      <div className="card">
        <div className="tien-do-dau">
          <h3>Lịch đã phân thợ</h3>
          <div className="toolbar" style={{ margin: 0 }}>
            <input type="date" aria-label="Từ ngày" value={tu} onChange={(e) => e.target.value && setParams({ tu: e.target.value, den: e.target.value > den ? e.target.value : den }, { replace: true })} />
            <span>–</span>
            <input type="date" aria-label="Đến ngày" value={den} min={tu} onChange={(e) => e.target.value && setParams({ tu, den: e.target.value }, { replace: true })} />
          </div>
        </div>
        {theoNgay.size === 0 && <p className="muted">Chưa có lịch trong khoảng này.</p>}
        {[...theoNgay.entries()].map(([d, ds]) => (
          <section key={d} className="nhom-ngay">
            <h4>{THU[new Date(`${d}T00:00:00`).getDay()]}, {ngay(d)} <span className="muted small">({ds.length} việc)</span></h4>
            <ul className="ds-viec">{ds.map((v) => <TheGiaiDoan key={v.id} tc={v} doiTho={doiTho} vaiTro={vaiTro} onDoi={onDoi} />)}</ul>
          </section>
        ))}
      </div>
    </>
  );
}

// ================= Nghiem thu =================
function DsDonTheoBuoc({ giaiDoan, duongDan, trong }) {
  const navigate = useNavigate();
  const [ds, setDs] = useState(null);
  useEffect(() => { api.get('/don-hang', { params: { giai_doan: giaiDoan, limit: 100 } }).then((r) => setDs(r.data.items)).catch(() => setDs([])); }, [giaiDoan]);
  if (!ds) return <p className="muted">Đang tải...</p>;
  if (!ds.length) return <p className="muted">{trong}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tỉnh/Thành</th><th>Hình thức</th><th className="num">Tổng đơn</th></tr></thead>
        <tbody>{ds.map((d) => (
          <tr key={d.id} className="dong-bam" onClick={() => navigate(`${duongDan}/${d.id}`)}>
            <td><Link to={`${duongDan}/${d.id}`}>{d.ma_don}</Link></td><td>{d.khach_hang}</td><td>{d.tinh_thanh || '—'}</td>
            <td>{d.hinh_thuc === 'vat_tu' ? 'Vật tư' : 'Hoàn thiện'}</td><td className="num">{tien(d.tong_don)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function PhatSinh({ donId, giaiDoan, ds, duocSua, onDoi }) {
  const [f, setF] = useState({ loai: 'phu_thu', so_tien: '', ly_do: '', thi_cong_id: '' });
  return (
    <div className="card">
      <h3>Phát sinh thi công</h3>
      {ds.length === 0 && <p className="muted small">Chưa có phát sinh.</p>}
      <ul className="small">{ds.map((p) => (
        <li key={p.id}><b>{LOAI_PHAT_SINH[p.loai]}</b> {tien(p.so_tien)} — {p.ly_do}{p.doi_tho && <span className="muted"> · {p.doi_tho}</span>}
          {duocSua && <button className="link danger" onClick={() => onDoi(() => api.delete(`/thi-cong/phat-sinh/${p.id}`))}>Xoá</button>}</li>
      ))}</ul>
      {duocSua && (
        <form className="toolbar mt" onSubmit={(e) => { e.preventDefault(); onDoi(() => api.post('/thi-cong/phat-sinh', { ...f, don_hang_id: donId, thi_cong_id: f.thi_cong_id || null })); setF({ ...f, so_tien: '', ly_do: '' }); }}>
          <select aria-label="Loại phát sinh" value={f.loai} onChange={(e) => setF({ ...f, loai: e.target.value })}>
            {Object.entries(LOAI_PHAT_SINH).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
          <select aria-label="Giai đoạn / đội thợ" value={f.thi_cong_id} onChange={(e) => setF({ ...f, thi_cong_id: e.target.value })}>
            <option value="">{f.loai === 'thu_ho' ? '— Thợ nào thu? —' : 'Không gắn giai đoạn'}</option>
            {giaiDoan.map((g) => <option key={g.id} value={g.id}>{g.ten_giai_doan} · {g.doi_tho}</option>)}
          </select>
          <input aria-label="Số tiền phát sinh" type="number" min="0" step="1000" placeholder="Số tiền" value={f.so_tien} onChange={(e) => setF({ ...f, so_tien: e.target.value })} required />
          <input className="grow" aria-label="Lý do phát sinh" placeholder="Lý do *" value={f.ly_do} onChange={(e) => setF({ ...f, ly_do: e.target.value })} required />
          <button className="btn sec">+ Ghi phát sinh</button>
        </form>
      )}
    </div>
  );
}

export function NghiemThu() {
  const { id } = useParams();
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [kq, setKq] = useState(null);
  const [sl, setSl] = useState({});
  const [kl, setKl] = useState({});
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const tai = useCallback(() => {
    if (!id) return;
    api.get(`/thi-cong/nghiem-thu/${id}`).then((r) => {
      setKq(r.data);
      setSl(Object.fromEntries(r.data.dong.map((d) => [d.id, d.so_luong_thuc_te ?? ''])));
      setKl(Object.fromEntries(r.data.giai_doan.map((g) => [g.id, g.kl_thuc_te ?? ''])));
    }).catch((e) => setLoi(loiCua(e)));
  }, [id]);
  useEffect(tai, [tai]);
  const onDoi = async (fn, tb = 'Đã cập nhật') => { setLoi(''); setThongBao(''); try { const r = await fn(); setThongBao(typeof tb === 'function' ? tb(r) : tb); tai(); return r; } catch (e) { setLoi(loiCua(e)); return null; } };
  const luu = () => onDoi(() => api.put(`/thi-cong/nghiem-thu/${id}`, {
    dong: Object.entries(sl).map(([k, v]) => ({ id: k, so_luong_thuc_te: v })), giai_doan: Object.entries(kl).map(([k, v]) => ({ id: k, kl_thuc_te: v })),
  }), 'Đã lưu số liệu nghiệm thu');
  const xacNhan = async () => {
    const r = await luu();
    if (r) onDoi(() => api.post(`/thi-cong/nghiem-thu/${id}/xac-nhan`), (x) => `Đã xác nhận nghiệm thu — đơn sang Quyết toán${x.data.canh_bao_hao_hut.length ? `. ⚠ ${x.data.canh_bao_hao_hut.join('; ')}` : ''}`);
  };

  if (!id) {
    return (<><h1>Thi công</h1><TabTc /><div className="card"><h3>Đơn chờ nghiệm thu</h3><DsDonTheoBuoc giaiDoan="nghiem_thu" duongDan="/thi-cong/nghiem-thu" trong="Không có đơn nào chờ nghiệm thu." /></div></>);
  }
  if (!kq) return loi ? <div className="error">{loi}</div> : <p className="muted">Đang tải...</p>;
  const sua = laVh(vaiTro) && ['thi_cong', 'nghiem_thu'].includes(kq.don.giai_doan) && !kq.don.nghiem_thu_luc;
  return (
    <>
      <h1>Thi công</h1>
      <TabTc />
      <p><Link to="/thi-cong/nghiem-thu">← Đơn chờ nghiệm thu</Link></p>
      <h2>Nghiệm thu {kq.don.ma_don} <span className="pill p-wip">{GIAI_DOAN[kq.don.giai_doan].nhan}</span></h2>
      <p className="muted">{kq.don.khach_hang} · <Link to={`/don-hang/${kq.don.id}`}>Xem đơn hàng</Link></p>
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      <div className="card">
        <h3>Số lượng vật tư thực tế</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Vật tư</th><th className="num">SL dự kiến (đã mua)</th><th className="num">SL thực tế</th><th className="num">Đơn giá bán</th><th className="num">Thành tiền thực tế</th><th className="num">Hao hụt</th></tr></thead>
            <tbody>{kq.dong.map((d) => (
              <tr key={d.id}>
                <td>{d.vat_tu} <span className="muted small">/{d.don_vi_tinh}</span></td>
                <td className="num">{so(d.so_luong_can)}</td>
                <td className="num">{sua ? <input aria-label={`SL thực tế ${d.vat_tu}`} type="number" min="0" step="0.1" value={sl[d.id]} onChange={(e) => setSl({ ...sl, [d.id]: e.target.value })} /> : so(d.so_luong_thuc_te)}</td>
                <td className="num nowrap">{tien(d.don_gia)}</td>
                <td className="num nowrap">{sl[d.id] === '' ? '—' : tien(Number(sl[d.id]) * Number(d.don_gia))}</td>
                <td className="num nowrap">{d.hao_hut_pct === null ? '—' : d.canh_bao_hao_hut ? <span className="bd bd-giam">⚠ {so(d.hao_hut_pct)}%</span> : `${so(d.hao_hut_pct)}%`}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="muted small mt">Nhập 0 nếu không dùng. Hao hụt = (SL đã mua − SL thực tế) / SL thực tế; vượt 10% sẽ cảnh báo.</p>
      </div>
      <div className="card">
        <h3>Khối lượng thi công thực tế (tính công thợ)</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Giai đoạn</th><th>Đội thợ</th><th>Trạng thái</th><th className="num">KL dự kiến</th><th className="num">KL thực tế</th><th className="num">Công thợ</th></tr></thead>
            <tbody>{kq.giai_doan.map((g) => (
              <tr key={g.id}>
                <td>{g.ten_giai_doan}</td><td>{g.doi_tho}</td><td><span className={`pill ${trangThaiTc(g).lop}`}>{trangThaiTc(g).nhan}</span></td>
                <td className="num">{so(g.kl_du_kien)} {g.don_vi_cong}</td>
                <td className="num">{sua ? <input aria-label={`KL thực tế ${g.ten_giai_doan}`} type="number" min="0" step="0.1" value={kl[g.id]} onChange={(e) => setKl({ ...kl, [g.id]: e.target.value })} /> : so(g.kl_thuc_te)}</td>
                <td className="num nowrap">{kl[g.id] === '' ? '—' : tien(Number(kl[g.id]) * Number(g.gia_cong))}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <PhatSinh donId={kq.don.id} giaiDoan={kq.giai_doan} ds={kq.phat_sinh} duocSua={laVh(vaiTro) && !kq.don.quyet_toan_luc && ['thi_cong', 'nghiem_thu', 'quyet_toan'].includes(kq.don.giai_doan)} onDoi={onDoi} />
      {sua && (
        <div className="actions">
          <button className="btn sec" onClick={luu}>Lưu nháp</button>
          {kq.don.giai_doan === 'nghiem_thu' && <button className="btn" onClick={xacNhan}>✅ Xác nhận nghiệm thu</button>}
        </div>
      )}
    </>
  );
}

// ================= Quyet toan =================
export function QuyetToan() {
  const { id } = useParams();
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const tai = useCallback(() => { if (id) api.get(`/thi-cong/quyet-toan/${id}`).then((r) => setKq(r.data)).catch((e) => setLoi(loiCua(e))); }, [id]);
  useEffect(tai, [tai]);
  const chot = async () => {
    if (!window.confirm('Chốt quyết toán? Giá trị đơn sẽ được khoá và đơn chuyển sang Hoàn tất.')) return;
    setLoi('');
    try { await api.post(`/thi-cong/quyet-toan/${id}/chot`); setThongBao('Đã chốt quyết toán — đơn hoàn tất, công thợ đã ghi "phải trả"'); tai(); } catch (e) { setLoi(loiCua(e)); }
  };

  if (!id) {
    return (<><h1>Thi công</h1><TabTc /><div className="card"><h3>Đơn chờ quyết toán</h3><DsDonTheoBuoc giaiDoan="quyet_toan" duongDan="/thi-cong/quyet-toan" trong="Không có đơn nào chờ quyết toán." /></div></>);
  }
  if (!kq) return loi ? <div className="error">{loi}</div> : <p className="muted">Đang tải...</p>;
  const { don } = kq;
  const vatTu = Number(don.tong_vat_tu);
  const congTho = kq.giai_doan.reduce((s, g) => s + Number(g.gia_cong) * Number(g.kl_thuc_te || 0), 0);
  return (
    <>
      <h1>Thi công</h1>
      <TabTc />
      <p><Link to="/thi-cong/quyet-toan">← Đơn chờ quyết toán</Link></p>
      <h2>Quyết toán {don.ma_don} <span className={`pill ${don.quyet_toan_luc ? 'p-done' : 'p-wip'}`}>{don.quyet_toan_luc ? 'Hoàn thành' : don.hinh_thuc === 'vat_tu' || don.nghiem_thu_luc ? 'Đủ điều kiện chốt' : 'Chờ nghiệm thu'}</span></h2>
      <p className="muted">{don.khach_hang} · <Link to={`/don-hang/${don.id}`}>Xem đơn hàng</Link></p>
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      <div className="grid2">
        <div className="card">
          <h3>Phải thu khách</h3>
          <dl className="money">
            <dt>Vật tư theo SL thực tế</dt><dd>{tien(vatTu)}</dd>
            {Number(don.tien_chiet_khau) > 0 && <><dt>Chiết khấu {Number(don.chiet_khau_pct)}%</dt><dd>−{tien(don.tien_chiet_khau)}</dd></>}
            {Number(don.phi_van_chuyen) > 0 && <><dt>Phí vận chuyển</dt><dd>{tien(don.phi_van_chuyen)}</dd></>}
            {Number(don.phu_thu) > 0 && <><dt>Phụ thu Sale</dt><dd>{tien(don.phu_thu)}</dd></>}
            {Number(don.phat_sinh_rong) !== 0 && <><dt>Phát sinh ròng</dt><dd>{tien(don.phat_sinh_rong)}</dd></>}
            <dt className="total">Tổng quyết toán</dt><dd className="total">{tien(don.tong_don)}</dd>
            {Number(don.tien_coc) > 0 && <><dt>Khách đã cọc</dt><dd>−{tien(don.tien_coc)}</dd></>}
            {Number(don.tho_thu_ho) > 0 && <><dt>Thợ đã thu hộ</dt><dd>−{tien(don.tho_thu_ho)}</dd></>}
            <dt>Còn phải thu</dt><dd>{tien(don.con_phai_thu)}</dd>
          </dl>
          <p className="muted small mt">Quyết toán không xét tiền khách đã trả (thuộc công nợ khách), giống ERP.</p>
        </div>
        <div className="card">
          <h3>Công thợ</h3>
          {kq.giai_doan.length === 0 ? <p className="muted">Đơn không có thi công.</p> : (
            <ul className="small">{kq.giai_doan.map((g) => <li key={g.id}>{g.ten_giai_doan} · {g.doi_tho}: {so(g.kl_thuc_te)} {g.don_vi_cong} × {tien(g.gia_cong)} = <b>{tien(Number(g.gia_cong) * Number(g.kl_thuc_te || 0))}</b></li>)}</ul>
          )}
          {congTho > 0 && <p className="small">Tổng công thợ: <b>{tien(congTho)}</b> — ghi "phải trả" khi chốt.</p>}
          {kq.phat_sinh.length > 0 && <><h4>Phát sinh</h4><ul className="small">{kq.phat_sinh.map((p) => <li key={p.id}>{LOAI_PHAT_SINH[p.loai]} {tien(p.so_tien)} — {p.ly_do}</li>)}</ul></>}
        </div>
      </div>
      {laVh(vaiTro) && don.giai_doan === 'quyet_toan' && <div className="actions"><button className="btn" onClick={chot}>📊 Chốt quyết toán</button></div>}
    </>
  );
}

// ================= Doi tho =================
export function DoiTho() {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [ds, setDs] = useState(null);
  const [f, setF] = useState({ ten: '', sdt: '', nang_luc: '', so_tk: '', ten_ngan_hang: '', chu_tk: '' });
  const [loi, setLoi] = useState('');
  const tai = () => api.get('/thi-cong/doi-tho').then((r) => setDs(r.data)).catch((e) => setLoi(loiCua(e)));
  useEffect(() => { tai(); }, []);
  const chay = (fn) => async (e) => { e?.preventDefault(); setLoi(''); try { await fn(); tai(); } catch (err) { setLoi(loiCua(err)); } };
  const dat = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <h1>Thi công</h1>
      <TabTc />
      {loi && <div className="error">{loi}</div>}
      <div className="card">
        {laVh(vaiTro) && (
          <form onSubmit={chay(async () => { await api.post('/thi-cong/doi-tho', f); setF({ ten: '', sdt: '', nang_luc: '', so_tk: '', ten_ngan_hang: '', chu_tk: '' }); })}>
            <div className="toolbar">
              <input aria-label="Tên đội thợ" placeholder="Tên đội thợ *" value={f.ten} onChange={dat('ten')} required />
              <input aria-label="Số điện thoại" placeholder="Số điện thoại" value={f.sdt} onChange={dat('sdt')} />
              <input aria-label="Năng lực" className="grow" placeholder="Năng lực (VD: sàn SPC, tấm ốp)" value={f.nang_luc} onChange={dat('nang_luc')} />
            </div>
            <div className="toolbar">
              <input aria-label="Số tài khoản" placeholder="Số tài khoản (trả công)" value={f.so_tk} onChange={dat('so_tk')} inputMode="numeric" />
              <input aria-label="Ngân hàng" placeholder="Ngân hàng" value={f.ten_ngan_hang} onChange={dat('ten_ngan_hang')} />
              <input aria-label="Chủ tài khoản" placeholder="Chủ tài khoản" value={f.chu_tk} onChange={dat('chu_tk')} />
              <button className="btn">+ Thêm đội thợ</button>
            </div>
          </form>
        )}
        <div className="table-wrap mt">
          <table>
            <thead><tr><th>Đội thợ</th><th>Liên hệ</th><th>Năng lực</th><th>Tài khoản</th><th className="num">Việc đang mở</th><th className="num">Đã xong</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>{(ds || []).map((d) => (
              <tr key={d.id}>
                <td>{d.ten}</td><td className="nowrap">{d.sdt || '—'}</td><td>{d.nang_luc || '—'}</td>
                <td className="small">{d.so_tk ? `${d.ten_ngan_hang} ${d.so_tk}` : <span className="muted">Chưa có</span>}</td>
                <td className="num">{d.viec_dang_mo}</td><td className="num">{d.viec_da_xong}</td>
                <td><span className={`pill ${d.trang_thai === 'active' ? 'p-done' : 'p-gray'}`}>{d.trang_thai === 'active' ? 'Hoạt động' : 'Ngừng'}</span></td>
                <td>{laVh(vaiTro) && <button className="link" onClick={chay(() => api.put(`/thi-cong/doi-tho/${d.id}`, { trang_thai: d.trang_thai === 'active' ? 'ngung_hoat_dong' : 'active' }))}>{d.trang_thai === 'active' ? 'Ngừng' : 'Kích hoạt'}</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// The thi cong tren trang chi tiet don (moi vai tro xem; Sale chi thay don cua minh - server kiem tra).
export function ThiCongCuaDon({ donHangId }) {
  const [kq, setKq] = useState(null);
  useEffect(() => { api.get(`/thi-cong/don/${donHangId}`).then((r) => setKq(r.data)).catch(() => setKq({ giai_doan: [], phat_sinh: [] })); }, [donHangId]);
  if (!kq) return null;
  return (
    <div className="card">
      <div className="tien-do-dau"><h3>Thi công</h3><Link className="small" to={`/thi-cong/nghiem-thu/${donHangId}`}>Nghiệm thu →</Link></div>
      {kq.giai_doan.length === 0 && <p className="muted">Chưa phân công thợ.</p>}
      <ul className="small">{kq.giai_doan.map((g) => {
        const tt = trangThaiTc(g);
        return <li key={g.id}><b>{g.ten_giai_doan}</b> <span className={`pill ${tt.lop}`}>{tt.nhan}</span> — {g.doi_tho}, {ngay(g.ngay_du_kien)} · {tien(g.gia_cong)}/{g.don_vi_cong} × {so(g.kl_thuc_te ?? g.kl_du_kien)}{g.kl_thuc_te === null ? ' (dự kiến)' : ''}</li>;
      })}</ul>
      {kq.phat_sinh.length > 0 && <p className="small">Phát sinh: {kq.phat_sinh.map((p) => `${LOAI_PHAT_SINH[p.loai]} ${tien(p.so_tien)}`).join(' · ')}</p>}
    </div>
  );
}
