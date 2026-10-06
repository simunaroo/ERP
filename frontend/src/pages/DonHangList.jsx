import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import BoLoc, { khoaCua } from '../components/BoLoc.jsx';
import { GIAI_DOAN, tinhTienDo, HINH_THUC, NGHIEM_THU, NHOM_KHACH, TINH_THANH, TRANG_THAI_DON, ngay, tien } from '../utils.js';

const SAP_XEP = {
  moi_nhat: 'Mới tạo nhất', cu_nhat: 'Cũ nhất', tong_giam: 'Tổng đơn lớn nhất',
  con_thu_giam: 'Còn phải thu nhiều nhất', lap_dat_gan: 'Ngày lắp đặt gần nhất',
};

// Cac dieu kien trong nut "Loc". Khoa = ten tham so tren URL va tren API.
function truongLoc(vaiTro, dsSale) {
  return [
    { k: 'giai_doan', nhan: 'Tiến độ', kieu: 'chon', lua_chon: Object.entries(GIAI_DOAN).filter(([v]) => v !== 'chot').map(([v, g]) => [v, g.nhan]) },
    { k: 'hinh_thuc', nhan: 'Hình thức', kieu: 'chon', lua_chon: Object.entries(HINH_THUC).map(([v, h]) => [v, h.nhan]) },
    { k: 'nhom_khach', nhan: 'Nhóm khách hàng', kieu: 'chon', lua_chon: Object.entries(NHOM_KHACH) },
    ...(vaiTro === 'sale' ? [] : [{ k: 'sale_id', nhan: 'Sale', kieu: 'chon', lua_chon: dsSale.map((x) => [String(x.id), x.ho_ten]) }]),
    { k: 'tinh_thanh', nhan: 'Tỉnh/Thành', kieu: 'chon', lua_chon: TINH_THANH.map((t) => [t, t]) },
    { k: 'nghiem_thu', nhan: 'Điều khoản nghiệm thu', kieu: 'chon', lua_chon: Object.entries(NGHIEM_THU) },
    { k: 'con_no', nhan: 'Công nợ khách', kieu: 'chon', lua_chon: [['con', 'Còn phải thu'], ['het', 'Đã thu đủ']] },
    { k: 'chot', nhan: 'Ngày chốt', kieu: 'ngay' },
    { k: 'lap_dat', nhan: 'Ngày YC lắp đặt / giao', kieu: 'ngay' },
    { k: 'tong', nhan: 'Tổng đơn (đ)', kieu: 'so' },
  ];
}

// Chip mo ta 1 dieu kien dang loc, vd "Ngày chốt: 01/09/2026 – 30/09/2026"
function moTa(t, gt) {
  if (t.kieu === 'chon') return t.lua_chon.find(([v]) => v === gt[t.k])?.[1] || gt[t.k];
  const f = (v) => (t.kieu === 'ngay' ? ngay(v) : tien(v));
  const tu = gt[`${t.k}_tu`], den = gt[`${t.k}_den`];
  return tu && den ? `${f(tu)} – ${f(den)}` : tu ? `từ ${f(tu)}` : `đến ${f(den)}`;
}

// O "Tien do" trong danh sach: nhan buoc hien tai + thanh % nho (kieu ERP).
function TienDoNho({ don }) {
  if (don.trang_thai === 'nhap') return <span className="pill p-gray">Nháp</span>;
  const td = tinhTienDo(don);
  const lop = td.huy ? 'p-lost' : don.giai_doan === 'hoan_tat' ? 'p-done' : don.trang_thai === 'moi' ? 'p-new' : 'p-wip';
  return (
    <div className="tien-do-nho" title={`${td.soXong}/${td.tong} bước`}>
      <span className={`pill ${lop}`}>{td.nhan}</span>
      {!td.huy && <span className="thanh"><span style={{ width: `${td.pct}%` }} /></span>}
    </div>
  );
}

export default function DonHangList() {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const trangThai = params.get('trang_thai') || '';
  const q = params.get('q') || '';
  const sapXep = params.get('sap_xep') || 'moi_nhat';
  const [dsSale, setDsSale] = useState([]);
  const truong = truongLoc(vaiTro, dsSale);
  const cacKhoa = truong.flatMap(khoaCua);
  const giaTriLoc = Object.fromEntries(cacKhoa.map((k) => [k, params.get(k) || '']));
  const chuoiLoc = cacKhoa.map((k) => `${k}=${giaTriLoc[k]}`).join('&'); // de useEffect so sanh

  const [oTim, setOTim] = useState(q);
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  const [dangTai, setDangTai] = useState(false);

  const capNhat = (thayDoi) => {
    const moi = new URLSearchParams(params);
    for (const [k, v] of Object.entries(thayDoi)) (v ? moi.set(k, v) : moi.delete(k));
    if (!('page' in thayDoi)) moi.delete('page');
    setParams(moi, { replace: 'q' in thayDoi });
  };

  useEffect(() => {
    if (vaiTro !== 'sale') api.get('/danh-muc/sale').then((r) => setDsSale(r.data)).catch(() => {});
  }, [vaiTro]);

  useEffect(() => setOTim(q), [q]); // dong bo o tim khi bam Back/Forward

  // Chi goi API sau khi ngung go 350ms, tranh moi phim bam la mot request.
  useEffect(() => {
    if (oTim === q) return;
    const t = setTimeout(() => capNhat({ q: oTim.trim() }), 350);
    return () => clearTimeout(t);
  }, [oTim]);

  useEffect(() => {
    const ctrl = new AbortController();
    setDangTai(true);
    const loc = Object.fromEntries(Object.entries(giaTriLoc).filter(([, v]) => v));
    api.get('/don-hang', { params: { page, trang_thai: trangThai || undefined, q: q || undefined, sap_xep: sapXep, ...loc }, signal: ctrl.signal })
      .then((r) => { setKq(r.data); setLoi(''); })
      .catch((e) => { if (!ctrl.signal.aborted) setLoi(loiCua(e)); })
      .finally(() => { if (!ctrl.signal.aborted) setDangTai(false); });
    return () => ctrl.abort();
  }, [page, trangThai, q, sapXep, chuoiLoc]);

  const items = kq?.items || [];

  return (
    <>
      <h1>Đơn hàng</h1>
      <div className="card">
        <div className="toolbar">
          <input className="search" placeholder="Tìm theo mã đơn, khách hàng..." value={oTim} onChange={(e) => setOTim(e.target.value)} />
          <select value={trangThai} onChange={(e) => capNhat({ trang_thai: e.target.value })}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(TRANG_THAI_DON).filter(([v]) => v !== 'nhap' || vaiTro === 'sale').map(([v, t]) => <option key={v} value={v}>{t.nhan}</option>)}
          </select>
          <select aria-label="Sắp xếp" value={sapXep} onChange={(e) => capNhat({ sap_xep: e.target.value === 'moi_nhat' ? '' : e.target.value })}>
            {Object.entries(SAP_XEP).map(([v, n]) => <option key={v} value={v}>↕ {n}</option>)}
          </select>
          <BoLoc truong={truong} giaTri={giaTriLoc} onApDung={capNhat} />
          <span className="grow" />
          {vaiTro === 'sale' && <Link className="btn" to="/don-hang/tao">+ Tạo đơn hàng</Link>}
        </div>
        {truong.some((t) => khoaCua(t).some((k) => giaTriLoc[k])) && (
          <div className="chips loc-dang-ap">
            {truong.filter((t) => khoaCua(t).some((k) => giaTriLoc[k])).map((t) => (
              <span key={t.k} className="chip on">
                {t.nhan}: {moTa(t, giaTriLoc)}
                <button type="button" aria-label={`Bỏ lọc ${t.nhan}`} onClick={() => capNhat(Object.fromEntries(khoaCua(t).map((k) => [k, ''])))}>×</button>
              </span>
            ))}
            <button type="button" className="link danger" onClick={() => capNhat(Object.fromEntries(cacKhoa.map((k) => [k, ''])))}>Xoá tất cả</button>
          </div>
        )}
        {loi && <div className="error">{loi}</div>}
        <div className={`table-wrap ${dangTai ? 'loading' : ''}`}>
          <table>
            <thead>
              <tr><th>Mã đơn</th><th>Khách hàng</th><th>Tỉnh/Thành</th><th>Hình thức</th><th className="num">Tổng đơn</th><th className="num">Còn phải thu</th><th>Sale</th><th>Vận hành</th><th>Tiến độ</th><th>Ngày tạo</th></tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td className="nowrap"><Link to={`/don-hang/${d.id}`}>{d.ma_don}</Link></td>
                  <td>{d.khach_hang}</td>
                  <td>{d.tinh_thanh || '—'}</td>
                  <td>{HINH_THUC[d.hinh_thuc].nhan}</td>
                  <td className="num nowrap">{tien(d.tong_don)}</td>
                  <td className="num nowrap">{Number(d.con_phai_thu) > 0 ? tien(d.con_phai_thu) : <span className="muted">Đã đủ</span>}</td>
                  <td>{d.sale}</td>
                  <td>{d.van_hanh || '—'}</td>
                  <td className="nowrap"><TienDoNho don={d} /></td>
                  <td className="nowrap">{ngay(d.created_at)}</td>
                </tr>
              ))}
              {kq && items.length === 0 && <tr><td colSpan="10" className="muted center">Không có đơn hàng nào</td></tr>}
            </tbody>
          </table>
        </div>
        {kq && kq.tong > 0 && (
          <div className="pager">
            <span className="muted">
              {(kq.page - 1) * kq.limit + 1}–{Math.min(kq.page * kq.limit, kq.tong)} / {kq.tong.toLocaleString('vi-VN')} đơn
            </span>
            <span className="grow" />
            <button className="btn sec" disabled={page <= 1} onClick={() => capNhat({ page: String(page - 1) })}>← Trước</button>
            <span>Trang {kq.page}/{kq.soTrang}</span>
            <button className="btn sec" disabled={page >= kq.soTrang} onClick={() => capNhat({ page: String(page + 1) })}>Sau →</button>
          </div>
        )}
      </div>
    </>
  );
}
