import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { LOAI_CHI, TRANG_THAI_CHI, ngay, ngayGio, thuNhoAnh, tien } from '../utils.js';

const tienGon = (n) => (Math.abs(n) >= 1e9 ? `${(n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ` : Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu` : tien(n));
const TT_CONG_NO = {
  con_phai_tra: { nhan: 'Còn phải trả', lop: 'p-wip' },
  chi_thua: { nhan: 'Chi thừa', lop: 'p-new' },
  da_thanh_toan_du: { nhan: 'Đã thanh toán đủ', lop: 'p-done' },
};

function TabTc() {
  return (
    <div className="tabs" role="tablist">
      <NavLink end to="/cong-no" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>💸 Đề xuất chi</NavLink>
      <NavLink to="/cong-no/ncc" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>🏭 Công nợ NCC</NavLink>
      <NavLink to="/cong-no/tho" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>👷 Công nợ thợ</NavLink>
    </div>
  );
}

// Anh bill tai qua API co token (the <img> khong gui Authorization) -> doc blob roi tao URL tam.
function AnhBill({ id }) {
  const [url, setUrl] = useState(null);
  const [loi, setLoi] = useState(false);
  useEffect(() => {
    let u;
    api.get(`/cong-no/de-xuat-chi/${id}/bill`, { responseType: 'blob' })
      .then((r) => { u = URL.createObjectURL(r.data); setUrl(u); }).catch(() => setLoi(true));
    return () => u && URL.revokeObjectURL(u);
  }, [id]);
  if (loi) return <span className="muted small">(dữ liệu mẫu — không có ảnh bill)</span>;
  return url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Bill chuyển khoản DXC-${id}`} className="anh-bill" /></a> : <span className="muted small">Đang tải ảnh...</span>;
}

function ChiTietDxc({ dxc, vaiTro, onLam }) {
  const file = useRef(null);
  const daChi = async (f) => {
    if (!f) return;
    const anh = await thuNhoAnh(f);
    onLam(() => api.post(`/cong-no/de-xuat-chi/${dxc.id}/da-chi`, { bill: { data: anh.data } }), `Đã xác nhận chi DXC-${dxc.id}`);
  };
  return (
    <div className="dxc-chi-tiet">
      <div>
        <dl className="kv">
          <dt>Đơn</dt><dd><Link to={`/don-hang/${dxc.don_hang_id}`}>{dxc.ma_don}</Link></dd>
          <dt>Nhận tiền</dt><dd>{dxc.ncc || dxc.doi_tho}{dxc.nguoi_nhan && <span className="muted small"> · {dxc.nguoi_nhan.ten_ngan_hang} {dxc.nguoi_nhan.so_tk} ({dxc.nguoi_nhan.chu_tk})</span>}</dd>
          <dt>Nội dung CK</dt><dd><code>{dxc.noi_dung_ck}</code></dd>
          {dxc.loai_chi === 'quyet_toan' && <><dt>Cách tính</dt><dd>Tiền hàng gồm VAT {tien(dxc.gia_tri_hang)} − cọc đã duyệt {tien(dxc.coc_da_tru)} = <b>{tien(dxc.so_tien)}</b></dd></>}
          {dxc.ghi_chu && <><dt>Ghi chú</dt><dd>{dxc.ghi_chu}</dd></>}
        </dl>
        {dxc.dong.length > 0 && (
          <ul className="small">{dxc.dong.map((d) => <li key={d.mua_hang_dong_id}>{d.vat_tu}: {Number(d.so_luong)} {d.don_vi_tinh} × {tien(d.don_gia)} {Number(d.vat_pct) > 0 && `+ VAT ${Number(d.vat_pct)}%`} = {tien(d.thanh_tien)}</li>)}</ul>
        )}
        {dxc.lich_su_duyet.map((l, i) => <p key={i} className="small">{l.hanh_dong === 'duyet' ? '✅ Duyệt' : '❌'} {l.telegram_user} · {ngayGio(l.thoi_gian)}{l.ghi_chu && ` — “${l.ghi_chu}”`}</p>)}
        {vaiTro === 'ke_toan' && dxc.trang_thai === 'da_duyet' && (
          <div className="mt">
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => daChi(e.target.files[0])} />
            <button className="btn" onClick={() => file.current.click()}>📎 Đã chi — tải ảnh bill</button>
            <span className="muted small"> Bắt buộc ảnh bill/UNC chuyển khoản.</span>
          </div>
        )}
      </div>
      {(dxc.qr || dxc.phieu) && (
        <div className="phieu">
          {dxc.phieu ? <><b>Đã chi {ngay(dxc.phieu.ngay_thanh_toan)}</b><AnhBill id={dxc.id} /></> : <b>Quét để chuyển khoản</b>}
          {dxc.qr && !dxc.phieu && <img src={dxc.qr} alt={`Mã VietQR ${tien(dxc.so_tien)}`} width="200" loading="lazy" />}
        </div>
      )}
    </div>
  );
}

export function DeXuatChi() {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [params, setParams] = useSearchParams();
  const tt = params.get('trang_thai') || '';
  const loai = params.get('loai_chi') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;
  const [kq, setKq] = useState(null);
  const [mo, setMo] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');

  const tai = useCallback(() => {
    api.get('/cong-no/de-xuat-chi', { params: { trang_thai: tt || undefined, loai_chi: loai || undefined, q: q || undefined, page } })
      .then((r) => setKq(r.data)).catch((e) => setLoi(loiCua(e)));
  }, [tt, loai, q, page]);
  useEffect(tai, [tai]);
  const datLoc = (k, v) => { const m = new URLSearchParams(params); v ? m.set(k, v) : m.delete(k); if (k !== 'page') m.delete('page'); setParams(m, { replace: true }); };
  const xem = async (id) => { if (mo?.id === id) return setMo(null); try { setMo((await api.get(`/cong-no/de-xuat-chi/${id}`)).data); } catch (e) { setLoi(loiCua(e)); } };
  const lam = async (fn, tb) => {
    setLoi(''); setThongBao('');
    try { const r = await fn(); if (r?.data?.id) setMo(r.data); else setMo(null); setThongBao(tb); tai(); } catch (e) { setLoi(loiCua(e)); }
  };
  const hoi = (cau, fn, tb) => { const v = window.prompt(cau); if (v?.trim()) lam(() => fn(v.trim()), tb); };

  return (
    <>
      <h1>Chi & công nợ</h1>
      <TabTc />
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      <div className="card">
        <div className="chips">
          <button className={!tt ? 'chip on' : 'chip'} onClick={() => datLoc('trang_thai', '')}>Tất cả</button>
          {Object.entries(TRANG_THAI_CHI).map(([v, t]) => (
            <button key={v} className={tt === v ? 'chip on' : 'chip'} onClick={() => datLoc('trang_thai', v)}>{t.nhan}{kq?.dem_trang_thai[v] ? ` (${kq.dem_trang_thai[v]})` : ''}</button>
          ))}
        </div>
        <div className="toolbar">
          <input className="search" placeholder="Mã đơn, NCC, đội thợ... (Enter)" defaultValue={q} onKeyDown={(e) => e.key === 'Enter' && datLoc('q', e.target.value.trim())} />
          <select aria-label="Loại chi" value={loai} onChange={(e) => datLoc('loai_chi', e.target.value)}>
            <option value="">Mọi loại chi</option>
            {Object.entries(LOAI_CHI).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Mã</th><th>Đơn</th><th>Nhận tiền</th><th>Loại</th><th className="num">Số tiền</th><th>Trạng thái</th><th>Người tạo / duyệt</th><th /></tr></thead>
            <tbody>
              {(kq?.items || []).map((x) => (
                <Fragment key={x.id}>
                  <tr>
                    <td className="nowrap"><button className="link" onClick={() => xem(x.id)}>DXC-{x.id}</button></td>
                    <td className="nowrap"><Link to={`/mua-hang/don/${x.don_hang_id}`}>{x.ma_don}</Link></td>
                    <td>{x.ncc || <>👷 {x.doi_tho}</>}</td>
                    <td className="nowrap">{LOAI_CHI[x.loai_chi]}</td>
                    <td className="num nowrap"><b>{tien(x.so_tien)}</b></td>
                    <td><span className={`pill ${TRANG_THAI_CHI[x.trang_thai].lop}`}>{TRANG_THAI_CHI[x.trang_thai].nhan}</span>
                      {x.ly_do_tu_choi && <div className="error-text small">{x.ly_do_tu_choi}</div>}</td>
                    <td className="small">{x.nguoi_tao} · {ngayGio(x.created_at)}{x.nguoi_duyet && <div className="muted">{x.nguoi_duyet}</div>}</td>
                    <td className="nowrap hanh-dong">
                      {vaiTro === 'admin' && x.trang_thai === 'cho_duyet' && <>
                        <button className="btn" onClick={() => lam(() => api.post(`/cong-no/de-xuat-chi/${x.id}/duyet`, { hanh_dong: 'duyet' }), `Đã duyệt DXC-${x.id}`)}>✅ Duyệt</button>
                        <button className="link danger" onClick={() => hoi('Lý do từ chối:', (v) => api.post(`/cong-no/de-xuat-chi/${x.id}/duyet`, { hanh_dong: 'tu_choi', ghi_chu: v }), `Đã từ chối DXC-${x.id}`)}>Từ chối</button>
                      </>}
                      {vaiTro === 'admin' && x.trang_thai === 'da_duyet' && <button className="link danger" onClick={() => hoi('Lý do thu hồi (chưa chi):', (v) => api.post(`/cong-no/de-xuat-chi/${x.id}/thu-hoi`, { ly_do: v }), `Đã thu hồi DXC-${x.id}`)}>Thu hồi</button>}
                      {vaiTro === 'ke_toan' && x.trang_thai === 'tu_choi' && <button className="btn sec" onClick={() => {
                        if (x.loai_chi === 'coc' || x.loai_chi === 'ung_cong') hoi(`Số tiền mới (đang ${tien(x.so_tien)}):`, (v) => api.post(`/cong-no/de-xuat-chi/${x.id}/gui-lai`, { so_tien: Number(v.replace(/\D/g, '')) }), `Đã gửi lại DXC-${x.id}`);
                        else lam(() => api.post(`/cong-no/de-xuat-chi/${x.id}/gui-lai`, {}), `Đã tính lại và gửi lại DXC-${x.id}`);
                      }}>↻ Sửa & gửi lại</button>}
                      {vaiTro === 'ke_toan' && ['cho_duyet', 'tu_choi'].includes(x.trang_thai) && <button className="link danger" onClick={() => lam(() => api.delete(`/cong-no/de-xuat-chi/${x.id}`), `Đã xoá DXC-${x.id}`)}>Xoá</button>}
                      <button className="link" onClick={() => xem(x.id)}>{mo?.id === x.id ? 'Ẩn' : 'Chi tiết'}</button>
                    </td>
                  </tr>
                  {mo?.id === x.id && <tr className="dong-lich-su"><td colSpan="8"><ChiTietDxc dxc={mo} vaiTro={vaiTro} onLam={lam} /></td></tr>}
                </Fragment>
              ))}
              {kq && kq.items.length === 0 && <tr><td colSpan="8" className="muted center">Không có đề xuất chi</td></tr>}
            </tbody>
          </table>
        </div>
        {kq && kq.soTrang > 1 && (
          <div className="pager">
            <span className="muted">{kq.tong.toLocaleString('vi-VN')} đề xuất</span><span className="grow" />
            <button className="btn sec" disabled={page <= 1} onClick={() => datLoc('page', String(page - 1))}>← Trước</button>
            <span>Trang {kq.page}/{kq.soTrang}</span>
            <button className="btn sec" disabled={page >= kq.soTrang} onClick={() => datLoc('page', String(page + 1))}>Sau →</button>
          </div>
        )}
        <p className="muted small mt">Đề xuất cọc/quyết toán lập từ màn Mua hàng của từng đơn; trả công/ứng công lập từ Công nợ thợ. Duyệt qua Telegram hoặc trên web (Admin). Từ chối → Kế toán sửa và gửi lại; đã duyệt mà chưa chi có thể thu hồi.</p>
      </div>
    </>
  );
}

export function CongNoNcc() {
  const [kq, setKq] = useState(null);
  const [mo, setMo] = useState({});
  const [loi, setLoi] = useState('');
  useEffect(() => { api.get('/cong-no/ncc').then((r) => setKq(r.data)).catch((e) => setLoi(loiCua(e))); }, []);
  const moRong = async (nccId) => {
    if (mo[nccId]) return setMo({ ...mo, [nccId]: null });
    try { setMo({ ...mo, [nccId]: (await api.get(`/cong-no/ncc/${nccId}`)).data }); } catch (e) { setLoi(loiCua(e)); }
  };
  return (
    <>
      <h1>Chi & công nợ</h1>
      <TabTc />
      {loi && <div className="error">{loi}</div>}
      {kq && !kq.telegram.da_cau_hinh && <div className="banner">Chưa cấu hình Telegram: đề xuất chi được Admin duyệt trên web.</div>}
      {kq && (
        <>
          <div className="kpi-row">
            <div className="kpi"><span className="kpi-nhan">Tiền hàng đã ghi nhận</span><span className="kpi-so">{tienGon(kq.tong.tien_hang)}</span><span className="muted small">quyết toán/chi bổ sung đã duyệt</span></div>
            <div className="kpi"><span className="kpi-nhan">Đã chi</span><span className="kpi-so">{tienGon(kq.tong.da_chi)}</span></div>
            <div className="kpi"><span className="kpi-nhan">Còn phải trả</span><span className="kpi-so">{tienGon(kq.tong.con_phai_tra)}</span><span className="muted small">chờ chi {tienGon(kq.tong.cho_chi)}</span></div>
            <div className="kpi"><span className="kpi-nhan">Chi thừa còn lại</span><span className="kpi-so">{tienGon(kq.tong.chi_thua)}</span><span className="muted small">cọc trước khi có hàng</span></div>
          </div>
          <div className="card">
            <p className="muted small">Giống ERP: công nợ NCC phát sinh khi đề xuất <b>quyết toán / chi bổ sung được duyệt</b>. Còn phải trả = Tiền hàng − Đã chi; âm là chi thừa (đã cọc nhưng chưa quyết toán).</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nhà cung cấp</th><th className="num">Tiền hàng</th><th className="num">Đã chi</th><th className="num">Còn phải trả</th><th className="num">Chi thừa</th><th className="num">Chờ duyệt / chờ chi</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {kq.ncc.map((n) => (
                    <Fragment key={n.ncc_id}>
                      <tr className="dong-bam" onClick={() => moRong(n.ncc_id)}>
                        <td>{mo[n.ncc_id] ? '▾' : '▸'} {n.ncc} <span className="muted small">({n.so_don} đơn)</span></td>
                        <td className="num nowrap">{tien(n.tien_hang)}</td>
                        <td className="num nowrap">{tien(n.da_chi)}</td>
                        <td className="num nowrap"><b>{n.con_phai_tra ? tien(n.con_phai_tra) : '—'}</b></td>
                        <td className="num nowrap">{n.chi_thua ? tien(n.chi_thua) : '—'}</td>
                        <td className="num nowrap small">{tien(n.cho_duyet)} / {tien(n.cho_chi)}</td>
                        <td><span className={`pill ${TT_CONG_NO[n.trang_thai].lop}`}>{TT_CONG_NO[n.trang_thai].nhan}</span></td>
                      </tr>
                      {mo[n.ncc_id] && (
                        <tr className="dong-lich-su"><td colSpan="7">
                          <table>
                            <thead><tr><th>Đơn</th><th className="num">Tiền hàng</th><th className="num">Đã chi</th><th className="num">Còn</th></tr></thead>
                            <tbody>{mo[n.ncc_id].map((d) => (
                              <tr key={d.don_hang_id}><td><Link to={`/mua-hang/don/${d.don_hang_id}`}>{d.ma_don}</Link></td><td className="num">{tien(d.tien_hang)}</td><td className="num">{tien(d.da_chi)}</td>
                                <td className="num">{d.con > 1 ? <b>{tien(d.con)}</b> : d.con < -1 ? <span className="muted">chi thừa {tien(-d.con)}</span> : '✓'}</td></tr>
                            ))}</tbody>
                          </table>
                        </td></tr>
                      )}
                    </Fragment>
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

const LOAI_GD = { phai_tra: 'Phải trả', da_tra: 'Đã trả', tam_ung: 'Tạm ứng', thu_ho: 'Thợ thu hộ' };

export function CongNoTho() {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [ds, setDs] = useState(null);
  const [mo, setMo] = useState({});
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const tai = useCallback(() => { api.get('/cong-no/tho').then((r) => setDs(r.data)).catch((e) => setLoi(loiCua(e))); }, []);
  useEffect(tai, [tai]);
  const moRong = async (thoId, epTai = false) => {
    if (mo[thoId] && !epTai) return setMo({ ...mo, [thoId]: null });
    try { const so = (await api.get(`/cong-no/tho/${thoId}`)).data; setMo((m) => ({ ...m, [thoId]: so })); } catch (e) { setLoi(loiCua(e)); }
  };
  const traCong = async (thoId, donHangId) => {
    setLoi(''); setThongBao('');
    try {
      const r = await api.post('/cong-no/de-xuat-chi', { loai_chi: 'tra_cong', doi_tho_id: thoId, don_hang_id: donHangId });
      setThongBao(`Đã lập đề xuất trả công DXC-${r.data.id}: ${tien(r.data.so_tien)}`); tai(); moRong(thoId, true);
    } catch (e) { setLoi(loiCua(e)); }
  };
  // Gom so tho theo don: con phai tra = phai tra - da tra - tam ung - thu ho.
  const theoDon = (so) => {
    const m = new Map();
    for (const g of so) {
      if (!g.don_hang_id) continue;
      if (!m.has(g.don_hang_id)) m.set(g.don_hang_id, { don_hang_id: g.don_hang_id, ma_don: g.ma_don, con: 0, coPhaiTra: false });
      const x = m.get(g.don_hang_id);
      x.con += g.loai === 'phai_tra' ? g.so_tien : -g.so_tien;
      if (g.loai === 'phai_tra') x.coPhaiTra = true;
    }
    return [...m.values()];
  };
  return (
    <>
      <h1>Chi & công nợ</h1>
      <TabTc />
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao} — <Link to="/cong-no?trang_thai=cho_duyet">xem đề xuất</Link></div>}
      <div className="card">
        <p className="muted small">Công thợ = giá công × khối lượng thực tế, ghi "phải trả" khi chốt quyết toán. Còn phải trả = phải trả − đã trả − tạm ứng − tiền thợ thu hộ khách. Âm = thợ đang giữ tiền / đã ứng trước.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Đội thợ</th><th className="num">Phải trả</th><th className="num">Đã trả</th><th className="num">Tạm ứng</th><th className="num">Thu hộ</th><th className="num">Còn phải trả</th></tr></thead>
            <tbody>
              {(ds || []).filter((t) => t.so_don > 0).map((t) => (
                <Fragment key={t.doi_tho_id}>
                  <tr className="dong-bam" onClick={() => moRong(t.doi_tho_id)}>
                    <td>{mo[t.doi_tho_id] ? '▾' : '▸'} {t.doi_tho} <span className="muted small">{t.sdt} · {t.so_don} đơn</span></td>
                    <td className="num nowrap">{tien(t.phai_tra)}</td><td className="num nowrap">{tien(t.da_tra)}</td>
                    <td className="num nowrap">{tien(t.tam_ung)}</td><td className="num nowrap">{tien(t.thu_ho)}</td>
                    <td className="num nowrap"><b>{tien(t.con_phai_tra)}</b></td>
                  </tr>
                  {mo[t.doi_tho_id] && (
                    <tr className="dong-lich-su"><td colSpan="6">
                      <div className="dxc-chi-tiet">
                        <div>
                          <b>Theo đơn</b>
                          <ul className="small">{theoDon(mo[t.doi_tho_id]).map((d) => (
                            <li key={d.don_hang_id}><Link to={`/don-hang/${d.don_hang_id}`}>{d.ma_don}</Link>: còn {tien(d.con)}
                              {vaiTro === 'ke_toan' && d.coPhaiTra && d.con > 0 && <button className="link" onClick={() => traCong(t.doi_tho_id, d.don_hang_id)}>💸 Đề xuất trả công</button>}</li>
                          ))}</ul>
                        </div>
                        <div>
                          <b>Sổ giao dịch</b>
                          <ul className="small">{mo[t.doi_tho_id].slice(0, 30).map((g) => (
                            <li key={g.id}>{ngay(g.created_at)} · {LOAI_GD[g.loai]} {tien(g.so_tien)} · {g.ma_don}{g.ghi_chu && <span className="muted"> — {g.ghi_chu}</span>}</li>
                          ))}</ul>
                        </div>
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
