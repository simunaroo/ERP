import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { GIAI_DOAN, LOAI_CHI, LOAI_MBS, NGUON_TRACH_NHIEM, TRANG_THAI_CHI, TRANG_THAI_DONG_MUA, ngay, tien } from '../utils.js';

const so = (n) => Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const TT_MBS = { cho_xu_ly: { nhan: 'Chờ mua', lop: 'p-wip' }, da_mua: { nhan: 'Đã mua', lop: 'p-done' }, huy: { nhan: 'Huỷ', lop: 'p-lost' } };

function TabMua() {
  return (
    <div className="tabs" role="tablist">
      <NavLink end to="/mua-hang" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>🔍 Chọn NCC</NavLink>
      <NavLink to="/mua-hang/bo-sung" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>➕ Mua bổ sung</NavLink>
    </div>
  );
}

// ================= Danh sach don can mua =================
export function MuaHangDanhSach() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const loc = params.get('loc') || '';
  const q = params.get('q') || '';
  const [ds, setDs] = useState(null);
  const [loi, setLoi] = useState('');
  useEffect(() => {
    api.get('/mua-hang/don', { params: { loc: loc || undefined, q: q || undefined } }).then((r) => setDs(r.data)).catch((e) => setLoi(loiCua(e)));
  }, [loc, q]);
  const datLoc = (k, v) => { const m = new URLSearchParams(params); v ? m.set(k, v) : m.delete(k); setParams(m, { replace: true }); };

  return (
    <>
      <h1>Mua hàng</h1>
      <TabMua />
      <div className="card">
        <div className="chips">
          {[['', 'Tất cả'], ['san_sang', '🚚 Sẵn sàng giao hàng'], ['dang_chuan_bi', 'Đang chuẩn bị'], ['chua_xu_ly', 'Chưa xử lý']].map(([v, n]) => (
            <button key={v} className={loc === v ? 'chip on' : 'chip'} onClick={() => datLoc('loc', v)}>{n}</button>
          ))}
        </div>
        <div className="toolbar"><input className="search" placeholder="Tìm mã đơn, khách hàng... (Enter)" defaultValue={q} onKeyDown={(e) => e.key === 'Enter' && datLoc('q', e.target.value.trim())} /></div>
        {loi && <div className="error">{loi}</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tỉnh/Thành</th><th>Sale</th><th>Tiến độ</th><th>VT sẵn sàng</th><th>YC lắp đặt</th></tr></thead>
            <tbody>
              {(ds || []).map((d) => {
                const du = d.dong_san_sang === d.tong_dong;
                return (
                  <tr key={d.id} className="dong-bam" onClick={() => navigate(`/mua-hang/don/${d.id}`)}>
                    <td className="nowrap"><Link to={`/mua-hang/don/${d.id}`}>{d.ma_don}</Link></td>
                    <td>{d.khach_hang}</td><td>{d.tinh_thanh || '—'}</td><td>{d.sale}</td>
                    <td><span className="pill p-wip">{GIAI_DOAN[d.giai_doan].nhan}</span></td>
                    <td className="nowrap">
                      <div className="tien-do-nho"><span className={`pill ${du ? 'p-done' : 'p-gray'}`}>{du ? '🚚 ' : ''}{d.dong_san_sang}/{d.tong_dong}</span>
                        <span className="thanh"><span style={{ width: `${(d.dong_san_sang / d.tong_dong) * 100}%` }} /></span></div>
                    </td>
                    <td className="nowrap">{d.ngay_yc_lap_dat ? ngay(d.ngay_yc_lap_dat) : '—'}</td>
                  </tr>
                );
              })}
              {ds && ds.length === 0 && <tr><td colSpan="7" className="muted center">Không có đơn nào</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ================= Chon NCC cho 1 don =================
function DongMua({ d, onLuu, duocSua }) {
  const khoa = d.khoa || !duocSua;
  const tt = TRANG_THAI_DONG_MUA[d.trang_thai];
  // Doi NCC khi da dat/san hang = bo don voi NCC cu -> hoi lai cho chac.
  const doiNcc = (nccId) => {
    if (String(nccId) === String(d.ncc_id)) return;
    if (['da_dat_hang', 'san_hang'].includes(d.trang_thai) && !window.confirm(`Dòng này đã ${tt.nhan.slice(2).toLowerCase()} với ${d.ncc}. Đổi NCC sẽ đặt lại từ đầu với NCC mới?`)) return;
    onLuu({ ncc_id: nccId });
  };
  return (
    <tr className={d.trang_thai === 'huy' ? 'dong-mo' : ''}>
      <td>{d.vat_tu}{d.quy_cach && <div className="muted small">{d.quy_cach}{d.dai_mm && ` · ${d.dai_mm}×${d.rong_mm}`}</div>}</td>
      <td className="num nowrap">{so(d.so_luong_can)} {d.don_vi_tinh}</td>
      <td>
        <div className="top-ncc">
          {d.top_ncc.map((g, i) => (
            <button key={g.ncc_id} type="button" disabled={khoa || d.trang_thai === 'huy'} className={String(g.ncc_id) === String(d.ncc_id) ? 'chip on' : 'chip'}
              title={`Chọn ${g.ncc}`} onClick={() => doiNcc(g.ncc_id)}>{i === 0 ? '★ ' : ''}{g.ncc.replace(' (giả lập)', '')}: {tien(g.don_gia)}</button>
          ))}
          {d.top_ncc.length === 0 && <span className="error-text small">Chưa NCC nào báo giá</span>}
        </div>
      </td>
      <td>
        <select aria-label={`NCC ${d.vat_tu}`} value={d.ncc_id || ''} disabled={khoa || d.trang_thai === 'huy'} onChange={(e) => doiNcc(e.target.value || null)}>
          <option value="">—</option>
          {d.gia_ncc.map((g) => <option key={g.ncc_id} value={g.ncc_id}>{g.ncc} — {tien(g.don_gia)}</option>)}
          {d.ncc_id && !d.gia_ncc.some((g) => g.ncc_id === d.ncc_id) && <option value={d.ncc_id}>{d.ncc}</option>}
        </select>
      </td>
      <td className="num nowrap">{d.gia_chot === null ? '—' : tien(d.gia_chot)}</td>
      <td>
        <select aria-label={`VAT ${d.vat_tu}`} value={String(d.vat_pct)} disabled={khoa} onChange={(e) => onLuu({ vat_pct: Number(e.target.value) })}>
          {[0, 5, 8, 10].map((v) => <option key={v} value={v}>{v}%</option>)}
        </select>
      </td>
      <td className="num nowrap"><b>{d.thanh_tien === null ? '—' : tien(d.thanh_tien)}</b></td>
      <td>
        <span className={`pill ${tt.lop}`}>{tt.nhan}</span>
        {duocSua && !khoa && d.trang_thai !== 'huy' && <button className="link danger small" onClick={() => window.confirm(`Huỷ dòng ${d.vat_tu}? (không mua vật tư này)`) && onLuu({ huy: true })}>Huỷ dòng</button>}
        {duocSua && d.trang_thai === 'huy' && <button className="link small" onClick={() => onLuu({ huy: false })}>Khôi phục</button>}
        {d.khoa && d.dxc_quyet_toan_id && <div className="muted small">🔒 trong DXC-{d.dxc_quyet_toan_id}</div>}
      </td>
    </tr>
  );
}

function FormMuaBoSung({ don, dong, onXong }) {
  const [f, setF] = useState({ loai_phat_sinh: 'hang_hong', ly_do: '', vat_tu_id: dong[0]?.vat_tu_id || '', so_luong: '', nguon: [] });
  const [loi, setLoi] = useState('');
  const doiNguon = (n) => setF({ ...f, nguon: f.nguon.includes(n) ? f.nguon.filter((x) => x !== n) : [...f.nguon, n] });
  const gui = async (e) => {
    e.preventDefault(); setLoi('');
    try {
      await api.post('/mua-hang/bo-sung', { don_hang_id: don.id, loai_phat_sinh: f.loai_phat_sinh, ly_do: f.ly_do, nguon: f.nguon, dong: [{ vat_tu_id: f.vat_tu_id, so_luong: f.so_luong }] });
      onXong('Đã tạo phiếu mua bổ sung');
    } catch (err) { setLoi(loiCua(err)); }
  };
  return (
    <form className="mbs-form" onSubmit={gui}>
      <div className="toolbar">
        <select aria-label="Loại phát sinh" value={f.loai_phat_sinh} onChange={(e) => setF({ ...f, loai_phat_sinh: e.target.value })}>
          {Object.entries(LOAI_MBS).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select>
        <select aria-label="Vật tư bổ sung" value={f.vat_tu_id} onChange={(e) => setF({ ...f, vat_tu_id: e.target.value })}>
          {dong.map((d) => <option key={d.id} value={d.vat_tu_id}>{d.vat_tu}</option>)}
        </select>
        <input aria-label="Số lượng bổ sung" type="number" min="0" step="0.01" placeholder="Số lượng" value={f.so_luong} onChange={(e) => setF({ ...f, so_luong: e.target.value })} required />
        <input className="grow" aria-label="Lý do" placeholder="Lý do *" value={f.ly_do} onChange={(e) => setF({ ...f, ly_do: e.target.value })} required />
      </div>
      <div className="chips mt" role="group" aria-label="Nguồn trách nhiệm">
        <span className="small muted">Nguồn phát sinh *:</span>
        {Object.entries(NGUON_TRACH_NHIEM).map(([v, n]) => <button type="button" key={v} className={f.nguon.includes(v) ? 'chip on' : 'chip'} onClick={() => doiNguon(v)}>{n}</button>)}
      </div>
      {loi && <div className="error">{loi}</div>}
      <div className="actions"><button className="btn sec">+ Tạo phiếu mua bổ sung</button></div>
    </form>
  );
}

export function MuaHangDon() {
  const { id } = useParams();
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const laKeToan = vaiTro === 'ke_toan';
  const laVanHanh = ['van_hanh', 'admin'].includes(vaiTro);
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const tai = useCallback(() => { api.get(`/mua-hang/don/${id}`).then((r) => setKq(r.data)).catch((e) => setLoi(loiCua(e))); }, [id]);
  useEffect(tai, [tai]);
  const lam = async (fn, tb) => {
    setLoi(''); setThongBao('');
    try { const r = await fn(); setThongBao(typeof tb === 'function' ? tb(r) : tb); tai(); } catch (e) { setLoi(loiCua(e)); }
  };
  const thaoTacNcc = (n, hanhDong, tb) => {
    if (hanhDong === 'lui' && n.de_xuat.some((c) => c.loai_chi === 'quyet_toan' && ['cho_duyet', 'tu_choi'].includes(c.trang_thai))
      && !window.confirm(`Lùi trạng thái sẽ xoá đề xuất quyết toán chưa duyệt của ${n.ncc}. Tiếp tục?`)) return;
    lam(() => api.post(`/mua-hang/don/${id}/ncc`, { ncc_id: n.ncc_id, hanh_dong: hanhDong }), (r) => [
      `${tb} ${n.ncc} (${r.data.so_dong} dòng)`,
      r.data.de_xuat && `— đã tự lập đề xuất quyết toán DXC-${r.data.de_xuat.id}: ${tien(r.data.de_xuat.so_tien)}, chờ Admin duyệt${r.data.de_xuat.canh_bao ? ` (${r.data.de_xuat.canh_bao})` : ''}`,
      r.data.da_xoa_de_xuat?.length && `— đã xoá đề xuất quyết toán chưa duyệt ${r.data.da_xoa_de_xuat.map((x) => `DXC-${x}`).join(', ')}`,
    ].filter(Boolean).join(' '));
  };
  const luuDong = (d) => (thayDoi) => lam(() => api.put(`/mua-hang/dong/${d.id}`, thayDoi), `Đã cập nhật ${d.vat_tu}`);
  const deXuat = (body, ten) => lam(() => api.post('/cong-no/de-xuat-chi', body), (r) => `Đã lập đề xuất ${ten} DXC-${r.data.id}: ${tien(r.data.so_tien)}${r.data.canh_bao ? ` — ${r.data.canh_bao}` : ''}`);
  const coc = (n) => { const v = window.prompt(`Số tiền cọc cho ${n.ncc} (tiền hàng ${tien(n.tien_hang)}):`); if (v) deXuat({ loai_chi: 'coc', don_hang_id: Number(id), ncc_id: n.ncc_id, so_tien: Number(v.replace(/\D/g, '')) }, 'cọc'); };

  if (!kq) return loi ? <div className="error">{loi}</div> : <p className="muted">Đang tải...</p>;
  const { don } = kq;
  const du = kq.tong_dong > 0 && kq.dong_san_sang === kq.tong_dong;
  const duocSua = laKeToan || laVanHanh;

  return (
    <>
      <p><Link to="/mua-hang">← Danh sách mua hàng</Link></p>
      <h1>Mua hàng {don.ma_don} <span className="pill p-wip">{GIAI_DOAN[don.giai_doan].nhan}</span></h1>
      <p className="muted">{don.khach_hang} · {don.dia_chi_cong_trinh}, {don.tinh_thanh} {don.ngay_yc_lap_dat && `· cần hàng trước ${ngay(don.ngay_yc_lap_dat)}`} · <Link to={`/don-hang/${don.id}`}>Xem đơn hàng</Link></p>
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      {du && don.giai_doan === 'mua_hang' && (
        <div className="banner">
          <span>🚚 <b>Sẵn sàng giao hàng</b> — 100% vật tư đã sẵn hàng. Vận hành soát tạm ứng rồi đăng ký giao hàng.</span>
          {laVanHanh && <button className="btn" onClick={() => lam(() => api.post(`/don-hang/${don.id}/giai-doan`, { huong: 'tiep' }), 'Đã đăng ký giao hàng — đơn sang bước Giao hàng')}>Đăng ký giao hàng</button>}
        </div>
      )}

      <div className="card">
        <div className="tien-do-dau"><h3>Vật tư cần mua</h3><span className="small">Sẵn sàng <b>{kq.dong_san_sang}/{kq.tong_dong}</b></span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Vật tư</th><th className="num">SL</th><th>NCC đề xuất (rẻ nhất hôm nay)</th><th>NCC chọn</th><th className="num">Giá chốt</th><th>VAT</th><th className="num">Thành tiền</th><th>Trạng thái</th></tr></thead>
            <tbody>{kq.dong.map((d) => <DongMua key={d.id} d={d} duocSua={duocSua} onLuu={luuDong(d)} />)}</tbody>
          </table>
        </div>
        <p className="muted small mt">Trạng thái tự cập nhật: chọn NCC → <b>Đã chọn NCC</b>; bấm <b>📦 Đã đặt hàng</b> / <b>✅ NCC báo sẵn hàng</b> ở bảng NCC bên dưới (một lần cho cả NCC); lấy hàng, giao hàng do hệ thống ghi. Giá chốt = giá NCC hôm nay, chụp lại vào đơn (NCC đổi giá sau không ảnh hưởng). Dòng đã nằm trong đề xuất quyết toán bị khoá NCC/giá/VAT — muốn sửa phải từ chối đề xuất đó.</p>
      </div>

      <div className="card">
        <h3>Tổng theo nhà cung cấp</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nhà cung cấp</th><th className="num">Số VT</th><th className="num">Tiền hàng (gồm VAT)</th><th className="num">Cọc đã duyệt</th><th>Đề xuất chi</th><th /></tr></thead>
            <tbody>
              {kq.ncc.map((n) => (
                <tr key={n.ncc_id}>
                  <td><Link to={`/nha-cung-cap/${n.ncc_id}`}>{n.ncc}</Link></td>
                  <td className="num">{n.dong_san_sang}/{n.so_dong} sẵn</td>
                  <td className="num nowrap"><b>{tien(n.tien_hang)}</b></td>
                  <td className="num nowrap">{n.coc ? tien(n.coc) : '—'}</td>
                  <td className="small">{n.de_xuat.map((c) => (
                    <Link key={c.id} to={`/cong-no?q=${don.ma_don}`} className={`pill ${TRANG_THAI_CHI[c.trang_thai].lop}`} title={c.ly_do_tu_choi || ''}>
                      {LOAI_CHI[c.loai_chi]} {tien(c.so_tien)} · {TRANG_THAI_CHI[c.trang_thai].nhan}
                    </Link>
                  ))}{n.de_xuat.length === 0 && <span className="muted">—</span>}</td>
                  <td className="nowrap hanh-dong">
                    {duocSua && n.dong_cho_dat > 0 && <button className="btn sec" onClick={() => thaoTacNcc(n, 'dat_hang', 'Đã đặt hàng')}>📦 Đã đặt hàng</button>}
                    {duocSua && n.dong_cho_san > 0 && <button className="btn sec" onClick={() => thaoTacNcc(n, 'san_hang', 'Đã sẵn hàng')}>✅ NCC báo sẵn hàng</button>}
                    {duocSua && n.dong_da_dat > 0 && !['giao_hang', 'thi_cong', 'nghiem_thu', 'quyet_toan'].includes(don.giai_doan) && (
                      <button className="link small" title="Bấm nhầm: lùi 1 nấc (sẵn hàng → đã đặt → đã chọn NCC)" onClick={() => thaoTacNcc(n, 'lui', 'Đã lùi trạng thái')}>↩ Lùi</button>
                    )}
                    {laKeToan && n.duoc_coc && <button className="btn sec" onClick={() => coc(n)}>💸 Đề xuất cọc</button>}
                    {laKeToan && n.duoc_quyet_toan && <button className="btn" onClick={() => deXuat({ loai_chi: 'quyet_toan', don_hang_id: Number(id), ncc_id: n.ncc_id }, 'quyết toán')}>💸 Đề xuất quyết toán</button>}
                    {laVanHanh && don.giai_doan === 'giao_hang' && n.dong_san_sang > 0 && <button className="btn sec" onClick={() => lam(() => api.post(`/mua-hang/don/${id}/lay-hang`, { ncc_id: n.ncc_id }), `Đã xác nhận lấy hàng ${n.ncc}`)}>🚚 Đã lấy hàng</button>}
                  </td>
                </tr>
              ))}
              {kq.ncc.length === 0 && <tr><td colSpan="6" className="muted center">Chưa chọn nhà cung cấp</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted small mt">Cọc (nếu NCC yêu cầu): Kế toán lập khi đã đặt hàng, tổng cọc phải nhỏ hơn tiền hàng. Quyết toán: <b>tự lập khi bấm "NCC báo sẵn hàng"</b> — số tiền = tiền hàng + VAT − cọc đã duyệt, gửi Admin duyệt (Telegram/web), Kế toán chi và đính kèm bill. Nút "Đề xuất quyết toán" chỉ còn dùng khi lập lại sau khi xoá.</p>
      </div>

      <div className="card">
        <h3>Mua bổ sung</h3>
        {kq.mua_bo_sung.length > 0 && <BangMuaBoSung ds={kq.mua_bo_sung} />}
        {laVanHanh && ['giao_hang', 'thi_cong', 'nghiem_thu', 'quyet_toan'].includes(don.giai_doan)
          ? <FormMuaBoSung don={don} dong={kq.dong} onXong={(m) => { setThongBao(m); tai(); }} />
          : kq.mua_bo_sung.length === 0 && <p className="muted small">Mua bổ sung khi đơn đã giao hàng/thi công mà phát sinh thiếu, hỏng.</p>}
      </div>
    </>
  );
}

// ================= Mua bo sung =================
function BangMuaBoSung({ ds, onDaMua, onHuy, onDeXuat }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Phiếu</th><th>Đơn</th><th>Loại / lý do</th><th>Vật tư</th><th>Trách nhiệm</th><th className="num">Tiền</th><th>Trạng thái</th>{onDaMua && <th />}</tr></thead>
        <tbody>
          {ds.map((b) => (
            <tr key={b.id}>
              <td className="nowrap">MBS-{b.id}<div className="muted small">{ngay(b.created_at)}</div></td>
              <td className="nowrap"><Link to={`/mua-hang/don/${b.don_hang_id}`}>{b.ma_don}</Link></td>
              <td><b>{LOAI_MBS[b.loai_phat_sinh]}</b><div className="small">{b.ly_do}</div></td>
              <td className="small">{(b.dong || []).map((d) => <div key={d.id}>{d.vat_tu}: {so(d.so_luong)} {d.don_vi_tinh}{d.don_gia !== null && ` × ${tien(d.don_gia)}`}</div>)}</td>
              <td className="small">{(b.trach_nhiem || []).map((t) => <div key={t.nguon}>{NGUON_TRACH_NHIEM[t.nguon]}{Number(t.so_tien) > 0 && `: ${tien(t.so_tien)}`}</div>)}</td>
              <td className="num nowrap">{Number(b.tong_tien) ? tien(b.tong_tien) : '—'}{b.ncc && <div className="muted small">{b.ncc}</div>}</td>
              <td><span className={`pill ${TT_MBS[b.trang_thai].lop}`}>{TT_MBS[b.trang_thai].nhan}</span>{b.trang_thai_chi && <div className="small muted">Chi: {TRANG_THAI_CHI[b.trang_thai_chi].nhan}</div>}</td>
              {onDaMua && (
                <td className="nowrap hanh-dong">
                  {b.trang_thai === 'cho_xu_ly' && <><button className="btn sec" onClick={() => onDaMua(b)}>Đã mua</button><button className="link danger" onClick={() => onHuy(b)}>Huỷ</button></>}
                  {b.trang_thai === 'da_mua' && !b.trang_thai_chi && onDeXuat && <button className="btn sec" onClick={() => onDeXuat(b)}>💸 Đề xuất chi</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Chot "da mua": chon NCC + chia tien trach nhiem cho cac nguon (tong = tien hang).
function FormDaMua({ b, onXong, onHuy }) {
  const [nccDs, setNccDs] = useState([]);
  const [nccId, setNccId] = useState('');
  const [gia, setGia] = useState(Object.fromEntries((b.dong || []).map((d) => [d.id, ''])));
  const [tn, setTn] = useState(Object.fromEntries((b.trach_nhiem || []).map((t) => [t.nguon, ''])));
  const [loi, setLoi] = useState('');
  useEffect(() => { api.get('/nha-cung-cap').then((r) => setNccDs(r.data)).catch(() => {}); }, []);
  const tong = (b.dong || []).reduce((s, d) => s + Number(d.so_luong) * (Number(gia[d.id]) || 0), 0);
  const gui = async (e) => {
    e.preventDefault(); setLoi('');
    try {
      await api.post(`/mua-hang/bo-sung/${b.id}/da-mua`, {
        ncc_id: nccId, dong: Object.entries(gia).map(([id, g]) => ({ id, don_gia: g })),
        trach_nhiem: Object.entries(tn).map(([nguon, t]) => ({ nguon, so_tien: Number(t) || 0 })),
      });
      onXong(`MBS-${b.id} đã mua`);
    } catch (err) { setLoi(loiCua(err)); }
  };
  return (
    <form className="card" onSubmit={gui}>
      <h3>Đã mua MBS-{b.id} — {b.ma_don}</h3>
      <div className="toolbar">
        <select aria-label="NCC mua bổ sung" value={nccId} onChange={(e) => setNccId(e.target.value)} required>
          <option value="">— Nhà cung cấp —</option>
          {nccDs.map((n) => <option key={n.id} value={n.id}>{n.ten}</option>)}
        </select>
        {(b.dong || []).map((d) => (
          <input key={d.id} aria-label={`Đơn giá ${d.vat_tu}`} type="number" min="0" placeholder={`Giá ${d.vat_tu} (trống = bảng giá)`} value={gia[d.id]} onChange={(e) => setGia({ ...gia, [d.id]: e.target.value })} />
        ))}
      </div>
      <div className="toolbar mt">
        <span className="small">Chia trách nhiệm{tong > 0 && ` (tổng phải = ${tien(tong)})`}:</span>
        {Object.keys(tn).map((n) => (
          <input key={n} aria-label={`Tiền ${NGUON_TRACH_NHIEM[n]}`} type="number" min="0" placeholder={NGUON_TRACH_NHIEM[n]} value={tn[n]} onChange={(e) => setTn({ ...tn, [n]: e.target.value })} />
        ))}
      </div>
      {loi && <div className="error mt">{loi}</div>}
      <div className="actions"><button type="button" className="link" onClick={onHuy}>Đóng</button><button className="btn">Xác nhận đã mua</button></div>
    </form>
  );
}

export function MuaBoSungDs() {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [tt, setTt] = useState('cho_xu_ly');
  const [ds, setDs] = useState(null);
  const [mo, setMo] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const tai = useCallback(() => { api.get('/mua-hang/bo-sung', { params: { trang_thai: tt || undefined } }).then((r) => setDs(r.data)).catch((e) => setLoi(loiCua(e))); }, [tt]);
  useEffect(tai, [tai]);
  const lam = async (fn, tb) => { setLoi(''); try { const r = await fn(); setThongBao(typeof tb === 'function' ? tb(r) : tb); tai(); } catch (e) { setLoi(loiCua(e)); } };
  return (
    <>
      <h1>Mua hàng</h1>
      <TabMua />
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      {mo && <FormDaMua b={mo} onHuy={() => setMo(null)} onXong={(m) => { setMo(null); setThongBao(m); tai(); }} />}
      <div className="card">
        <div className="chips">
          {[['cho_xu_ly', 'Chờ mua'], ['da_mua', 'Đã mua'], ['huy', 'Huỷ'], ['', 'Tất cả']].map(([v, n]) => <button key={v} className={tt === v ? 'chip on' : 'chip'} onClick={() => setTt(v)}>{n}</button>)}
        </div>
        {ds && (ds.length === 0 ? <p className="muted">Không có phiếu nào</p> : (
          <BangMuaBoSung ds={ds}
            onDaMua={vaiTro !== 'van_hanh' ? (b) => setMo(b) : null}
            onHuy={(b) => lam(() => api.post(`/mua-hang/bo-sung/${b.id}/huy`), `Đã huỷ MBS-${b.id}`)}
            onDeXuat={vaiTro === 'ke_toan' ? (b) => lam(() => api.post('/cong-no/de-xuat-chi', { loai_chi: 'chi_bo_sung', mua_bo_sung_id: b.id }), (r) => `Đã lập đề xuất chi bổ sung DXC-${r.data.id}`) : null} />
        ))}
        <p className="muted small mt">Phiếu mua bổ sung được lập từ màn Chọn NCC của từng đơn (Vận hành). Kế toán chốt NCC, giá và chia tiền trách nhiệm cho các bên.</p>
      </div>
    </>
  );
}

