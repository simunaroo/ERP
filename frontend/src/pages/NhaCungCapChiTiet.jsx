import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { ngay, tien } from '../utils.js';
import { TRANG_THAI_NCC } from './NhaCungCapList.jsx';

const homNay = () => new Date().toLocaleDateString('sv-SE');
const TRANG_THAI_GIA = {
  dang_ap_dung: { nhan: 'Đang áp dụng', lop: 'p-done' },
  sap_ap_dung: { nhan: 'Sắp áp dụng', lop: 'p-new' },
  het_hieu_luc: { nhan: 'Hết hiệu lực', lop: 'p-gray' },
};

// Gom lich su gia theo vat tu: dong dau = muc gia moi nhat, cac dong sau = lich su (mo rong khi bam).
function nhomTheoVatTu(bangGia) {
  const m = new Map();
  for (const g of bangGia) {
    if (!m.has(g.vat_tu_id)) m.set(g.vat_tu_id, []);
    m.get(g.vat_tu_id).push(g);
  }
  return [...m.values()];
}

export default function NhaCungCapChiTiet() {
  const { id } = useParams();
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const duocSua = ['ke_toan', 'admin'].includes(vaiTro);
  const [ncc, setNcc] = useState(null);
  const [vatTu, setVatTu] = useState([]);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [suaTt, setSuaTt] = useState(null);
  const [stk, setStk] = useState({ so_tk: '', ten_ngan_hang: '', chu_tk: '' });
  const [gia, setGia] = useState({ vat_tu_id: '', don_gia: '', ngay_hieu_luc: homNay() });
  const [moRong, setMoRong] = useState({});

  const tai = useCallback(() => {
    api.get(`/nha-cung-cap/${id}`).then((r) => setNcc(r.data)).catch((e) => setLoi(loiCua(e)));
  }, [id]);
  useEffect(tai, [tai]);
  useEffect(() => {
    api.get('/danh-muc/vat-tu').then((r) => setVatTu(r.data.filter((v) => v.nguon_goc === 'mua_ngoai'))).catch(() => {});
  }, []);

  const chay = (fn, thanhCong) => async (e) => {
    e?.preventDefault();
    setLoi(''); setThongBao('');
    try { await fn(); setThongBao(thanhCong); tai(); } catch (err) { setLoi(loiCua(err)); }
  };
  const luuThongTin = chay(async () => { await api.put(`/nha-cung-cap/${id}`, suaTt); setSuaTt(null); }, 'Đã lưu thông tin');
  const doiTrangThai = chay(() => api.patch(`/nha-cung-cap/${id}/trang-thai`, {
    trang_thai: ncc.trang_thai === 'active' ? 'ngung_hoat_dong' : 'active',
  }), 'Đã cập nhật trạng thái hợp tác');
  const themStk = chay(async () => { await api.post(`/nha-cung-cap/${id}/stk`, stk); setStk({ so_tk: '', ten_ngan_hang: '', chu_tk: '' }); }, 'Đã thêm tài khoản');
  const xoaStk = (stkId) => chay(() => api.delete(`/nha-cung-cap/${id}/stk/${stkId}`), 'Đã xoá tài khoản')();
  const capNhatGia = chay(async () => {
    await api.post(`/nha-cung-cap/${id}/bang-gia`, gia);
    setGia({ vat_tu_id: '', don_gia: '', ngay_hieu_luc: homNay() });
  }, 'Đã cập nhật giá — giá cũ được giữ lại trong lịch sử');
  const ngung = (vt) => {
    if (!window.confirm(`Nhà cung cấp ngừng cung cấp "${vt.vat_tu}" từ hôm nay?`)) return;
    chay(() => api.post(`/nha-cung-cap/${id}/bang-gia/${vt.vat_tu_id}/ngung`, { ngay: homNay() }), 'Đã ngừng cung cấp mặt hàng')();
  };

  if (!ncc) return loi ? <div className="error">{loi}</div> : <p className="muted">Đang tải...</p>;
  const tt = TRANG_THAI_NCC[ncc.trang_thai];
  const nhom = nhomTheoVatTu(ncc.bang_gia);
  const dangHopTac = ncc.trang_thai === 'active';

  return (
    <>
      <p><Link to="/nha-cung-cap">← Danh sách nhà cung cấp</Link></p>
      <h1>{ncc.ten} <span className={`pill ${tt.lop}`}>{tt.nhan}</span></h1>
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}

      <div className="grid2">
        <div className="card">
          <h3>Thông tin</h3>
          {suaTt ? (
            <form onSubmit={luuThongTin}>
              <div className="field"><label htmlFor="t-ten">Tên *</label><input id="t-ten" value={suaTt.ten} onChange={(e) => setSuaTt({ ...suaTt, ten: e.target.value })} /></div>
              <div className="field"><label htmlFor="t-mst">Mã số thuế</label><input id="t-mst" value={suaTt.ma_so_thue} onChange={(e) => setSuaTt({ ...suaTt, ma_so_thue: e.target.value })} /></div>
              <div className="field"><label htmlFor="t-dc">Địa chỉ</label><input id="t-dc" value={suaTt.dia_chi} onChange={(e) => setSuaTt({ ...suaTt, dia_chi: e.target.value })} /></div>
              <div className="actions"><button type="button" className="btn sec" onClick={() => setSuaTt(null)}>Huỷ</button><button className="btn">Lưu</button></div>
            </form>
          ) : (
            <>
              <dl className="kv">
                <dt>Mã số thuế</dt><dd>{ncc.ma_so_thue || '—'}</dd>
                <dt>Địa chỉ</dt><dd>{ncc.dia_chi || '—'}</dd>
                <dt>Ngày thêm</dt><dd>{ngay(ncc.created_at)}</dd>
              </dl>
              {duocSua && (
                <div className="actions">
                  <button className="link danger" onClick={doiTrangThai}>{dangHopTac ? 'Ngừng hợp tác' : 'Hợp tác lại'}</button>
                  <button className="btn sec" onClick={() => setSuaTt({ ten: ncc.ten, ma_so_thue: ncc.ma_so_thue || '', dia_chi: ncc.dia_chi || '' })}>Sửa thông tin</button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h3>Tài khoản ngân hàng</h3>
          {ncc.stk.length === 0 && <p className="muted">Chưa có tài khoản</p>}
          <ul className="list">
            {ncc.stk.map((s) => (
              <li key={s.id}>
                <b>{s.so_tk}</b> — {s.ten_ngan_hang} <span className="muted small">({s.chu_tk})</span>
                {duocSua && <button className="link danger" onClick={() => xoaStk(s.id)}>Xoá</button>}
              </li>
            ))}
          </ul>
          {!duocSua && ncc.stk.length > 0 && <p className="muted small">Số tài khoản được che — chỉ Kế toán xem đầy đủ.</p>}
          {duocSua && (
            <form className="toolbar mt" onSubmit={themStk}>
              <input aria-label="Số tài khoản" placeholder="Số tài khoản" value={stk.so_tk} onChange={(e) => setStk({ ...stk, so_tk: e.target.value })} inputMode="numeric" />
              <input aria-label="Ngân hàng" placeholder="Ngân hàng" value={stk.ten_ngan_hang} onChange={(e) => setStk({ ...stk, ten_ngan_hang: e.target.value })} />
              <input aria-label="Chủ tài khoản" placeholder="Chủ tài khoản" value={stk.chu_tk} onChange={(e) => setStk({ ...stk, chu_tk: e.target.value })} />
              <button className="btn sec">+ Thêm</button>
            </form>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Bảng giá</h3>
        <p className="muted small">Giá lưu theo thời gian: cập nhật giá mới thì giá cũ tự kết thúc vào ngày hôm trước và vẫn giữ trong lịch sử, để tra được giá tại thời điểm mua.</p>
        {duocSua && dangHopTac && (
          <form className="toolbar mt" onSubmit={capNhatGia}>
            <select aria-label="Vật tư" value={gia.vat_tu_id} onChange={(e) => setGia({ ...gia, vat_tu_id: e.target.value })}>
              <option value="">— Chọn vật tư —</option>
              {vatTu.map((v) => <option key={v.id} value={v.id}>{v.ten} ({v.don_vi_tinh})</option>)}
            </select>
            <input aria-label="Đơn giá" type="number" min="0" step="1000" placeholder="Đơn giá (đ)" value={gia.don_gia} onChange={(e) => setGia({ ...gia, don_gia: e.target.value })} />
            <label className="small muted" htmlFor="g-ngay">Áp dụng từ</label>
            <input id="g-ngay" type="date" value={gia.ngay_hieu_luc} onChange={(e) => setGia({ ...gia, ngay_hieu_luc: e.target.value })} />
            <button className="btn">Cập nhật giá</button>
          </form>
        )}
        <div className="table-wrap mt">
          <table>
            <thead><tr><th>Vật tư</th><th className="num">Đơn giá</th><th>Áp dụng</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {nhom.map((ds) => {
                const [moiNhat, ...cu] = ds;
                const mo = moRong[moiNhat.vat_tu_id];
                return (
                  <Fragment key={moiNhat.vat_tu_id}>
                    <tr>
                      <td>{moiNhat.vat_tu} <span className="muted small">/{moiNhat.don_vi_tinh}</span></td>
                      <td className="num nowrap"><b>{tien(moiNhat.don_gia)}</b></td>
                      <td className="nowrap">{ngay(moiNhat.ngay_hieu_luc)} → {moiNhat.ngay_het_hieu_luc ? ngay(moiNhat.ngay_het_hieu_luc) : 'nay'}</td>
                      <td><span className={`pill ${TRANG_THAI_GIA[moiNhat.trang_thai_gia].lop}`}>{TRANG_THAI_GIA[moiNhat.trang_thai_gia].nhan}</span></td>
                      <td className="nowrap hanh-dong">
                        {cu.length > 0 && <button className="link" onClick={() => setMoRong({ ...moRong, [moiNhat.vat_tu_id]: !mo })}>{mo ? 'Ẩn' : `Lịch sử (${cu.length})`}</button>}
                        {duocSua && !moiNhat.ngay_het_hieu_luc && <button className="link danger" onClick={() => ngung(moiNhat)}>Ngừng cung cấp</button>}
                      </td>
                    </tr>
                    {mo && cu.map((g) => (
                      <tr key={g.id} className="dong-lich-su">
                        <td className="muted small">↳ giá cũ</td>
                        <td className="num nowrap muted">{tien(g.don_gia)}</td>
                        <td className="nowrap muted">{ngay(g.ngay_hieu_luc)} → {g.ngay_het_hieu_luc ? ngay(g.ngay_het_hieu_luc) : 'nay'}</td>
                        <td><span className={`pill ${TRANG_THAI_GIA[g.trang_thai_gia].lop}`}>{TRANG_THAI_GIA[g.trang_thai_gia].nhan}</span></td>
                        <td />
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
              {nhom.length === 0 && <tr><td colSpan="5" className="muted center">Chưa có báo giá</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
