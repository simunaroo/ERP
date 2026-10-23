import { useCallback, useEffect, useState } from 'react';
import { api, loiCua, taiFile } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import { ngayGio } from '../utils.js';

const dungLuong = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

export default function SaoLuu() {
  const [tt, setTt] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [dangChay, setDangChay] = useState(false);
  const tai = useCallback(() => api.get('/sao-luu').then((r) => setTt(r.data)).catch((e) => setLoi(loiCua(e))), []);
  useEffect(() => { tai(); }, [tai]);

  const saoLuuNgay = async () => {
    setLoi(''); setThongBao(''); setDangChay(true);
    try { const { data } = await api.post('/sao-luu/ngay'); setThongBao(`Đã sao lưu ${data.ten}${data.co_anh ? ' (kèm ảnh bill)' : ''}.`); tai(); } catch (e) { setLoi(loiCua(e)); } finally { setDangChay(false); }
  };

  return (
    <>
      <h1>Sao lưu dữ liệu</h1>
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      {tt && (
        <div className="card">
          <div className="toolbar">
            <div>
              <div><b>Lịch tự động:</b> {tt.tu_dong ? `hằng ngày sau ${tt.gio}:00` : 'đang tắt (SAO_LUU_TU_DONG=false)'} · giữ <b>{tt.giu}</b> bản gần nhất</div>
              <div className="muted small">Gồm toàn bộ cơ sở dữ liệu (pg_dump) và thư mục ảnh bill. Lưu tại: <code>{tt.thu_muc}</code></div>
              {tt.lan_cuoi && <div className={`small ${tt.lan_cuoi.thanh_cong ? '' : 'error-text'}`}>
                Lần gần nhất: {ngayGio(tt.lan_cuoi.luc)} — {tt.lan_cuoi.thanh_cong ? 'thành công' : `lỗi: ${tt.lan_cuoi.loi}`}</div>}
            </div>
            <span className="grow" />
            <button className="btn" disabled={dangChay || tt.dang_chay} onClick={saoLuuNgay}>{dangChay ? 'Đang sao lưu...' : 'Sao lưu ngay'}</button>
          </div>
        </div>
      )}
      {tt && (
        <div className="card">
          <h3>Các bản sao lưu ({tt.ban_sao_luu.length})</h3>
          {tt.ban_sao_luu.length === 0 ? <p className="muted">Chưa có bản sao lưu nào.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Thời điểm</th><th>Bản sao lưu</th><th>Tệp</th></tr></thead>
              <tbody>{tt.ban_sao_luu.map((b) => (
                <tr key={b.ten}>
                  <td className="nowrap">{ngayGio(b.luc)}</td>
                  <td className="small"><code>{b.ten}</code></td>
                  <td>{b.file.map((f) => (
                    <button key={f.ten} className="link small" onClick={() => taiFile(`/sao-luu/tai/${f.ten}`).catch((e) => setLoi(loiCua(e)))}>
                      <Icon n="file" /> {f.loai === 'csdl' ? 'CSDL' : 'Ảnh'} ({dungLuong(f.kich_thuoc)})
                    </button>
                  ))}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
          <p className="muted small mt">
            Khôi phục (không ghi đè dữ liệu đang chạy): <code>npm run db:khoi-phuc -- sao-luu/&lt;tên&gt;.dump</code> → hệ thống tạo database mới
            <code>…_khoi_phuc_…</code> để kiểm tra; đúng thì tắt backend và đổi tên database. Ảnh: giải nén file <code>_uploads.tar.gz</code> vào <code>backend/uploads</code>.
          </p>
        </div>
      )}
    </>
  );
}
