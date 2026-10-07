import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';

const NGUON = { tu_san_xuat: 'Tự sản xuất', mua_ngoai: 'Mua ngoài' };
const TRONG = { ten: '', loai_vat_tu_id: '', don_vi_tinh: '', quy_cach: '' };

function FormVatTu({ loai, macDinh = TRONG, nhan, onLuu, onHuy }) {
  const [f, setF] = useState({ ...macDinh, loai_vat_tu_id: String(macDinh.loai_vat_tu_id || loai[0]?.id || ''), quy_cach: macDinh.quy_cach || '' });
  const dat = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="toolbar" onSubmit={(e) => { e.preventDefault(); onLuu({ ...f, loai_vat_tu_id: Number(f.loai_vat_tu_id) }); }}>
      <input aria-label="Tên vật tư" className="grow" placeholder="Tên vật tư *" value={f.ten} onChange={dat('ten')} required />
      <select aria-label="Loại vật tư" value={f.loai_vat_tu_id} onChange={dat('loai_vat_tu_id')}>
        {loai.map((l) => <option key={l.id} value={l.id}>{l.ten} ({NGUON[l.nguon_goc]})</option>)}
      </select>
      <input aria-label="Đơn vị tính" list="ds-dvt" placeholder="ĐVT *" value={f.don_vi_tinh} onChange={dat('don_vi_tinh')} required style={{ width: 80 }} />
      <datalist id="ds-dvt"><option value="m2" /><option value="md" /><option value="bộ" /><option value="thanh" /><option value="cái" /></datalist>
      <input aria-label="Quy cách" placeholder="Quy cách (vd: 1220x180)" value={f.quy_cach} onChange={dat('quy_cach')} />
      <button className="btn">{nhan}</button>
      {onHuy && <button type="button" className="link" onClick={onHuy}>Huỷ</button>}
    </form>
  );
}

export default function DanhMucVatTu() {
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const duocSua = ['ke_toan', 'admin'].includes(vaiTro);
  const [ds, setDs] = useState(null);
  const [loai, setLoai] = useState([]);
  const [loc, setLoc] = useState({ tt: 'active', loai: '', q: '' });
  const [sua, setSua] = useState(null);
  const [loaiMoi, setLoaiMoi] = useState({ ten: '', nguon_goc: 'mua_ngoai' });
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const tai = useCallback(() => {
    Promise.all([api.get('/danh-muc/vat-tu', { params: { tat_ca: '1' } }), api.get('/danh-muc/loai-vat-tu')])
      .then(([v, l]) => { setDs(v.data); setLoai(l.data); }).catch((e) => setLoi(loiCua(e)));
  }, []);
  useEffect(tai, [tai]);
  const lam = async (fn, tb) => { setLoi(''); setThongBao(''); try { await fn(); setThongBao(tb); setSua(null); tai(); return true; } catch (e) { setLoi(loiCua(e)); return false; } };
  const hien = (ds || []).filter((v) => (!loc.tt || v.trang_thai === loc.tt) && (!loc.loai || String(v.loai_vat_tu_id) === loc.loai)
    && (!loc.q || v.ten.toLowerCase().includes(loc.q.toLowerCase())));

  return (
    <>
      <h1>Danh mục vật tư</h1>
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      {duocSua && (
        <div className="card">
          <h3>Thêm vật tư</h3>
          {loai.length > 0 && <FormVatTu key={ds?.length} loai={loai} nhan="+ Thêm" onLuu={(b) => lam(() => api.post('/danh-muc/vat-tu', b), `Đã thêm ${b.ten}`)} />}
          <p className="muted small mt">Vật tư <b>mua ngoài</b> cần nhà cung cấp báo giá (mục Nhà cung cấp) trước khi mua. Vật tư <b>tự sản xuất</b> (cửa) không qua mua hàng.</p>
        </div>
      )}
      <div className="card">
        <div className="chips">
          {[['active', 'Đang kinh doanh'], ['ngung_hoat_dong', 'Ngừng kinh doanh'], ['', 'Tất cả']].map(([v, n]) => <button key={v} className={loc.tt === v ? 'chip on' : 'chip'} onClick={() => setLoc({ ...loc, tt: v })}>{n}</button>)}
        </div>
        <div className="toolbar">
          <input className="search" placeholder="Tìm tên vật tư..." value={loc.q} onChange={(e) => setLoc({ ...loc, q: e.target.value })} />
          <select aria-label="Lọc loại" value={loc.loai} onChange={(e) => setLoc({ ...loc, loai: e.target.value })}>
            <option value="">Mọi loại</option>
            {loai.map((l) => <option key={l.id} value={l.id}>{l.ten}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Vật tư</th><th>Loại</th><th>ĐVT</th><th>Quy cách</th><th className="num">Đơn dùng</th><th className="num">NCC đang báo giá</th><th>Trạng thái</th>{duocSua && <th />}</tr></thead>
            <tbody>
              {hien.map((v) => (sua === v.id ? (
                <tr key={v.id}><td colSpan={duocSua ? 8 : 7}>
                  <FormVatTu loai={loai} macDinh={v} nhan="Lưu" onHuy={() => setSua(null)} onLuu={(b) => lam(() => api.put(`/danh-muc/vat-tu/${v.id}`, b), `Đã lưu ${b.ten}`)} />
                  {v.so_don > 0 && <p className="muted small">Vật tư đã dùng trong {v.so_don} đơn nên không đổi được loại.</p>}
                </td></tr>
              ) : (
                <tr key={v.id} className={v.trang_thai !== 'active' ? 'dong-mo' : ''}>
                  <td>{v.ten}</td>
                  <td>{v.loai} <span className="muted small">· {NGUON[v.nguon_goc]}</span></td>
                  <td>{v.don_vi_tinh}</td><td>{v.quy_cach || '—'}</td>
                  <td className="num">{v.so_don}</td>
                  <td className="num">{v.nguon_goc === 'mua_ngoai' ? (v.so_ncc_bao_gia || <Link className="error-text" to="/nha-cung-cap/so-sanh-gia">0 — cần báo giá</Link>) : '—'}</td>
                  <td><span className={`pill ${v.trang_thai === 'active' ? 'p-done' : 'p-gray'}`}>{v.trang_thai === 'active' ? 'Đang kinh doanh' : 'Ngừng'}</span></td>
                  {duocSua && (
                    <td className="nowrap hanh-dong">
                      <button className="link" onClick={() => setSua(v.id)}>Sửa</button>
                      <button className="link danger" onClick={() => lam(() => api.put(`/danh-muc/vat-tu/${v.id}`, { trang_thai: v.trang_thai === 'active' ? 'ngung_hoat_dong' : 'active' }), v.trang_thai === 'active' ? `Đã ngừng kinh doanh ${v.ten}` : `Đã kinh doanh lại ${v.ten}`)}>
                        {v.trang_thai === 'active' ? 'Ngừng KD' : 'Kinh doanh lại'}
                      </button>
                    </td>
                  )}
                </tr>
              )))}
              {ds && hien.length === 0 && <tr><td colSpan="8" className="muted center">Không có vật tư</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted small mt">Ngừng kinh doanh: ẩn khỏi form tạo đơn và bảng giá mới; đơn cũ vẫn giữ nguyên (không xoá vì đơn hàng tham chiếu).</p>
      </div>
      <div className="card">
        <h3>Loại vật tư</h3>
        <ul className="small">{loai.map((l) => <li key={l.id}>{l.ten} — {NGUON[l.nguon_goc]} · {l.so_vat_tu} vật tư</li>)}</ul>
        {duocSua && (
          <form className="toolbar mt" onSubmit={(e) => { e.preventDefault(); lam(() => api.post('/danh-muc/loai-vat-tu', loaiMoi), `Đã thêm loại ${loaiMoi.ten}`).then((ok) => ok && setLoaiMoi({ ten: '', nguon_goc: 'mua_ngoai' })); }}>
            <input aria-label="Tên loại" placeholder="Tên loại mới (vd: Phụ kiện)" value={loaiMoi.ten} onChange={(e) => setLoaiMoi({ ...loaiMoi, ten: e.target.value })} required />
            <select aria-label="Nguồn gốc" value={loaiMoi.nguon_goc} onChange={(e) => setLoaiMoi({ ...loaiMoi, nguon_goc: e.target.value })}>
              {Object.entries(NGUON).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
            </select>
            <button className="btn sec">+ Thêm loại</button>
          </form>
        )}
      </div>
    </>
  );
}
