import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, loiCua, taiFile } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { GIAI_DOAN, ngay, thuNhoAnh, tien } from '../utils.js';
import { AnhBill, TabTc } from './CongNo.jsx';
import Icon from '../components/Icon.jsx';

export const LOAI_THU = { tam_ung: 'Tạm ứng', quyet_toan: 'Quyết toán', khac: 'Khác' };
const TT_THU = {
  cho_xac_nhan: { nhan: 'Chờ Kế toán xác nhận', lop: 'p-wip' },
  da_xac_nhan: { nhan: 'Đã nhận tiền', lop: 'p-done' },
  tu_choi: { nhan: 'Chưa thấy tiền về', lop: 'p-lost' },
};
const homNay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

// Chep van ban (noi dung CK...) vao clipboard.
function NutChepNho({ text, nhan = 'Chép' }) {
  const [xong, setXong] = useState(false);
  return (
    <button type="button" className="link small" onClick={async () => { try { await navigator.clipboard.writeText(text); setXong(true); setTimeout(() => setXong(false), 1500); } catch { /* trinh duyet chan */ } }}>
      {xong ? <><Icon n="check" /> Đã chép</> : nhan}
    </button>
  );
}

// Form ghi nhan khach thanh toan: so tien goi y = phan tam ung con thieu (truoc giao hang) hoac toan bo con lai.
function FormThu({ donId, goiY, keToan, onXong }) {
  const [f, setF] = useState({ loai: goiY.loai, so_tien: goiY.so_tien || '', hinh_thuc: 'chuyen_khoan', ngay_thu: homNay(), ghi_chu: '' });
  const [anh, setAnh] = useState(null);
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const dat = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const gui = async (e) => {
    e.preventDefault(); setLoi('');
    if (f.hinh_thuc === 'chuyen_khoan' && !anh) return setLoi('Chuyển khoản phải kèm ảnh bill');
    setDangGui(true);
    try {
      const r = await api.post('/thu-tien', { ...f, don_hang_id: donId, so_tien: Number(String(f.so_tien).replace(/\D/g, '')), bill: anh ? { data: anh.data } : undefined });
      onXong(r.data.trang_thai === 'da_xac_nhan' ? 'Đã ghi nhận khoản thu' : 'Đã gửi Kế toán xác nhận tiền về');
    } catch (err) { setLoi(loiCua(err)); } finally { setDangGui(false); }
  };
  return (
    <form className="form-thu" onSubmit={gui}>
      <div className="toolbar">
        <select aria-label="Loại thanh toán" value={f.loai} onChange={dat('loai')}>{Object.entries(LOAI_THU).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
        <input aria-label="Số tiền" inputMode="numeric" placeholder="Số tiền" value={f.so_tien} onChange={dat('so_tien')} required style={{ width: 140 }} />
        <select aria-label="Hình thức" value={f.hinh_thuc} onChange={dat('hinh_thuc')}><option value="chuyen_khoan">Chuyển khoản</option><option value="tien_mat">Tiền mặt</option></select>
        <input aria-label="Ngày thu" type="date" max={homNay()} value={f.ngay_thu} onChange={dat('ngay_thu')} />
      </div>
      <div className="toolbar">
        <label className="btn sec"><Icon n="paperclip" /> {anh ? 'Đổi ảnh bill' : 'Ảnh bill'}
          <input type="file" accept="image/*" hidden onChange={async (e) => { const x = e.target.files[0]; if (x) { try { setAnh(await thuNhoAnh(x)); } catch { setLoi('Không đọc được ảnh'); } } }} />
        </label>
        {anh && <img src={anh.xemTruoc} alt="Ảnh bill vừa chọn" className="anh-bill-nho" />}
        <input className="grow" aria-label="Ghi chú" placeholder="Ghi chú (vd: khách chuyển từ TK công ty)" value={f.ghi_chu} onChange={dat('ghi_chu')} />
        <button className="btn" disabled={dangGui}>{keToan ? 'Ghi nhận đã thu' : 'Gửi Kế toán xác nhận'}</button>
      </div>
      {loi && <div className="error">{loi}</div>}
    </form>
  );
}

// Khung "Thu tien khach" trong chi tiet don: tong hop, QR thu tien, cac phieu, ghi nhan moi.
export function ThuTienCuaDon({ donId, onDoi }) {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const keToan = ['ke_toan', 'admin'].includes(vaiTro);
  const [kq, setKq] = useState(null);
  const [mo, setMo] = useState(false);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const tai = useCallback(() => { api.get(`/thu-tien/don/${donId}`).then((r) => setKq(r.data)).catch((e) => setLoi(loiCua(e))); }, [donId]);
  useEffect(tai, [tai]);
  const lam = async (fn, tb) => { setLoi(''); setThongBao(''); try { await fn(); setThongBao(tb); tai(); onDoi?.(); } catch (e) { setLoi(loiCua(e)); } };
  if (!kq) return loi ? <div className="card"><div className="error">{loi}</div></div> : null;
  const t = kq.tom_tat;
  const pct = t.tong_don > 0 ? Math.min(100, Math.round((t.da_thu / t.tong_don) * 100)) : 0;

  return (
    <div className="card">
      <div className="tien-do-dau">
        <h3>Thu tiền khách</h3>
        <span className="small">Đã thu <b>{tien(t.da_thu)}</b> / {tien(t.tong_don)} ({pct}%)</span>
      </div>
      <div className="thanh-thu" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
      <ul className="small ds-thu-tom-tat">
        <li>Cọc lúc chốt: <b>{tien(t.tien_coc)}</b>{t.tho_thu_ho > 0 && <> · Thợ thu hộ: <b>{tien(t.tho_thu_ho)}</b></>}</li>
        <li>Tạm ứng trước giao hàng ({t.ty_le_tam_ung}%): <b>{tien(t.can_tam_ung)}</b> — {t.du_tam_ung ? <span className="ok-text">đã đủ</span> : <span className="error-text">còn thiếu {tien(t.can_tam_ung - t.da_thu)}</span>}</li>
        {t.cho_xac_nhan > 0 && <li>Chờ Kế toán xác nhận: <b>{tien(t.cho_xac_nhan)}</b></li>}
        <li>Còn phải thu: <b>{tien(t.con_phai_thu)}</b></li>
      </ul>
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}

      {kq.phieu.length > 0 && (
        <div className="table-wrap mt">
          <table>
            <thead><tr><th>Ngày</th><th>Loại</th><th className="num">Số tiền</th><th>Hình thức</th><th>Trạng thái</th><th>Người ghi / xác nhận</th>{keToan && <th />}</tr></thead>
            <tbody>
              {kq.phieu.map((p) => (
                <tr key={p.id}>
                  <td className="nowrap">{ngay(p.ngay_thu)}</td>
                  <td>{LOAI_THU[p.loai]}</td>
                  <td className="num nowrap"><b>{tien(p.so_tien)}</b></td>
                  <td>{p.hinh_thuc === 'chuyen_khoan' ? 'Chuyển khoản' : 'Tiền mặt'}{p.co_bill && <details className="small"><summary>Bill</summary><AnhBill src={`/thu-tien/${p.id}/bill`} ten={`Bill phiếu thu ${p.id}`} /></details>}</td>
                  <td><span className={`pill ${TT_THU[p.trang_thai].lop}`}>{TT_THU[p.trang_thai].nhan}</span>{p.ly_do_tu_choi && <div className="small error-text">{p.ly_do_tu_choi}</div>}</td>
                  <td className="small">{p.nguoi_tao}{p.nguoi_xac_nhan && <> / {p.nguoi_xac_nhan}</>}</td>
                  {keToan && (
                    <td className="nowrap hanh-dong">
                      {p.trang_thai === 'cho_xac_nhan' && <>
                        <button className="btn sec" onClick={() => lam(() => api.post(`/thu-tien/${p.id}/xac-nhan`), 'Đã xác nhận tiền về')}>Đã nhận tiền</button>
                        <button className="link danger" onClick={() => { const l = window.prompt('Lý do (vd: chưa thấy tiền về tài khoản):'); if (l) lam(() => api.post(`/thu-tien/${p.id}/tu-choi`, { ly_do: l }), 'Đã báo chưa thấy tiền về'); }}>Chưa thấy tiền</button>
                      </>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {t.con_phai_thu > 0 && t.giai_doan !== 'huy' && (
        <div className="thu-qr mt">
          {kq.qr ? (
            <>
              <img src={kq.qr} alt={`QR thu ${tien(t.goi_y.so_tien)}`} width="160" loading="lazy" />
              <div className="small">
                <b>QR thu tiền gửi khách</b> — {LOAI_THU[t.goi_y.loai].toLowerCase()} <b>{tien(t.goi_y.so_tien)}</b><br />
                {kq.ngan_hang.ten_ngan_hang} · <b>{kq.ngan_hang.so_tk}</b> · {kq.ngan_hang.chu_tk}<br />
                Nội dung CK: <code>{kq.noi_dung_ck}</code> <NutChepNho text={kq.noi_dung_ck} />
              </div>
            </>
          ) : <span className="muted small">{kq.ly_do || `Nội dung chuyển khoản: ${kq.noi_dung_ck}`}</span>}
        </div>
      )}

      {t.con_phai_thu > 0 && t.giai_doan !== 'huy' && (
        mo ? <FormThu donId={donId} goiY={t.goi_y} keToan={keToan} onXong={(m) => { setMo(false); setThongBao(m); tai(); onDoi?.(); }} />
          : <div className="actions"><button className="btn sec" onClick={() => setMo(true)}>+ Ghi nhận khách thanh toán</button></div>
      )}
    </div>
  );
}

// Ke toan: phieu cho xac nhan + danh sach don con no.
export function CongNoKhach() {
  const [params, setParams] = useSearchParams();
  const loc = params.get('loc') || '';
  const q = params.get('q') || '';
  const [cho, setCho] = useState(null);
  const [no, setNo] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const tai = useCallback(() => {
    api.get('/thu-tien/cho-xac-nhan').then((r) => setCho(r.data)).catch((e) => setLoi(loiCua(e)));
    api.get('/thu-tien/cong-no', { params: { loc: loc || undefined, q: q || undefined } }).then((r) => setNo(r.data)).catch((e) => setLoi(loiCua(e)));
  }, [loc, q]);
  useEffect(tai, [tai]);
  const lam = async (fn, tb) => { setLoi(''); setThongBao(''); try { await fn(); setThongBao(tb); tai(); } catch (e) { setLoi(loiCua(e)); } };
  const datLoc = (k, v) => { const m = new URLSearchParams(params); v ? m.set(k, v) : m.delete(k); setParams(m, { replace: true }); };

  return (
    <>
      <h1>Chi & công nợ</h1>
      <TabTc />
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      <div className="card">
        <h3>Phiếu thu chờ xác nhận tiền về {cho?.length > 0 && <span className="pill p-wip">{cho.length}</span>}</h3>
        <p className="muted small">Đối chiếu sao kê ngân hàng (theo nội dung chuyển khoản có mã đơn) rồi xác nhận. Chỉ phiếu đã xác nhận mới được tính là đã thu.</p>
        {cho?.length === 0 ? <p className="muted">Không có phiếu chờ xác nhận.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Đơn</th><th>Khách</th><th>Loại</th><th className="num">Số tiền</th><th>Hình thức / bill</th><th>Ngày</th><th>Người ghi</th><th /></tr></thead>
              <tbody>
                {(cho || []).map((p) => (
                  <tr key={p.id}>
                    <td className="nowrap"><Link to={`/don-hang/${p.don_hang_id}`}>{p.ma_don}</Link></td>
                    <td>{p.khach_hang}<div className="muted small">Sale: {p.sale}</div></td>
                    <td>{LOAI_THU[p.loai]}</td>
                    <td className="num nowrap"><b>{tien(p.so_tien)}</b></td>
                    <td>{p.hinh_thuc === 'chuyen_khoan' ? 'Chuyển khoản' : 'Tiền mặt'}{p.co_bill && <details className="small"><summary>Xem bill</summary><AnhBill src={`/thu-tien/${p.id}/bill`} ten={`Bill phiếu thu ${p.id}`} /></details>}</td>
                    <td className="nowrap">{ngay(p.ngay_thu)}</td>
                    <td className="small">{p.nguoi_tao}</td>
                    <td className="nowrap hanh-dong">
                      <button className="btn sec" onClick={() => lam(() => api.post(`/thu-tien/${p.id}/xac-nhan`), `Đã xác nhận ${tien(p.so_tien)} — ${p.ma_don}`)}>Đã nhận tiền</button>
                      <button className="link danger" onClick={() => { const l = window.prompt('Lý do (vd: chưa thấy tiền về tài khoản):'); if (l) lam(() => api.post(`/thu-tien/${p.id}/tu-choi`, { ly_do: l }), `Đã báo người ghi: ${p.ma_don}`); }}>Chưa thấy tiền</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="tien-do-dau">
          <h3>Đơn còn phải thu</h3>
          {no && <span className="small">Đến hạn: <b className="error-text">{tien(no.tong.den_han)}</b> · Tổng còn phải thu: <b>{tien(no.tong.tat_ca)}</b></span>}
        </div>
        <div className="chips">
          {[['', 'Tất cả đơn còn nợ'], ['den_han', 'Đến hạn (đã quyết toán / hoàn tất)']].map(([v, n]) => <button key={v} className={loc === v ? 'chip on' : 'chip'} onClick={() => datLoc('loc', v)}>{n}</button>)}
        </div>
        <div className="toolbar"><input className="search" placeholder="Tìm mã đơn, khách hàng... (Enter)" defaultValue={q} onKeyDown={(e) => e.key === 'Enter' && datLoc('q', e.target.value.trim())} />
          <span className="grow" />
          <button className="btn sec" onClick={() => taiFile('/thu-tien/cong-no/excel', { loc: loc || undefined, q: q || undefined }).catch((e) => setLoi(loiCua(e)))}><Icon n="file" /> Excel</button></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Đơn</th><th>Khách hàng</th><th>Sale</th><th>Tiến độ</th><th className="num">Tổng đơn</th><th className="num">Đã thu</th><th className="num">Còn phải thu</th></tr></thead>
            <tbody>
              {(no?.items || []).map((d) => (
                <tr key={d.id} className={d.den_han ? 'dong-den-han' : ''}>
                  <td className="nowrap"><Link to={`/don-hang/${d.id}`}>{d.ma_don}</Link></td>
                  <td>{d.khach_hang}<div className="muted small">{d.khach_hang_sdt}</div></td>
                  <td>{d.sale}</td>
                  <td><span className={`pill ${d.den_han ? 'p-lost' : 'p-wip'}`}>{GIAI_DOAN[d.giai_doan].nhan}</span></td>
                  <td className="num nowrap">{tien(d.tong_don)}</td>
                  <td className="num nowrap">{tien(d.da_thu)}{d.cho_xac_nhan > 0 && <div className="muted small">+{tien(d.cho_xac_nhan)} chờ XN</div>}</td>
                  <td className="num nowrap"><b>{tien(d.con_phai_thu)}</b></td>
                </tr>
              ))}
              {no && no.items.length === 0 && <tr><td colSpan="7" className="muted center">Không có đơn còn nợ</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted small mt">Đã thu = cọc lúc chốt + phiếu thu đã xác nhận + tiền thợ thu hộ. "Đến hạn": đơn đã quyết toán/hoàn tất mà khách chưa trả đủ. {no && <>Đang hiện {no.items.length}/{no.tong.so_don} đơn (đến hạn trước, nợ nhiều trước) — dùng ô tìm để xem đơn khác.</>}</p>
      </div>
    </>
  );
}
