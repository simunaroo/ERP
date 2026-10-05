import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { TRANG_THAI_DON, ngay } from '../utils.js';

export default function DonHangChiTiet() {
  const { id } = useParams();
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [don, setDon] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [phuongAn, setPhuongAn] = useState({ phuong_an_van_chuyen: '', phuong_an_thi_cong: '' });
  const [noiDungSua, setNoiDungSua] = useState('');

  const tai = useCallback(() => {
    api.get(`/don-hang/${id}`)
      .then((r) => {
        setDon(r.data);
        setPhuongAn({
          phuong_an_van_chuyen: r.data.phuong_an_van_chuyen || '',
          phuong_an_thi_cong: r.data.phuong_an_thi_cong || '',
        });
      })
      .catch((e) => setLoi(loiCua(e)));
  }, [id]);

  useEffect(tai, [tai]);

  const luuPhuongAn = async () => {
    setLoi(''); setThongBao('');
    try {
      await api.patch(`/don-hang/${id}/phuong-an`, phuongAn);
      setThongBao('Đã lưu phương án');
      tai();
    } catch (e) { setLoi(loiCua(e)); }
  };

  const xuLyYeuCau = async (ycId) => {
    setLoi(''); setThongBao('');
    try {
      await api.patch(`/don-hang/${id}/yeu-cau-sua/${ycId}/xu-ly`);
      setThongBao('Đã đánh dấu yêu cầu là đã xử lý');
      tai();
    } catch (e) { setLoi(loiCua(e)); }
  };

  const guiYeuCau = async () => {
    setLoi(''); setThongBao('');
    try {
      await api.post(`/don-hang/${id}/yeu-cau-sua`, { noi_dung: noiDungSua });
      setNoiDungSua('');
      setThongBao('Đã gửi yêu cầu chỉnh sửa cho Vận hành');
      tai();
    } catch (e) { setLoi(loiCua(e)); }
  };

  if (!don) return loi ? <div className="error">{loi}</div> : <p className="muted">Đang tải...</p>;
  const tt = TRANG_THAI_DON[don.trang_thai];

  return (
    <>
      <p><Link to="/don-hang">← Danh sách đơn hàng</Link></p>
      <h1>Đơn hàng {don.ma_don} <span className={`pill ${tt.lop}`}>{tt.nhan}</span></h1>
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}

      <div className="grid2">
        <div className="card">
          <h3>Thông tin chung</h3>
          <dl className="kv">
            <dt>Khách hàng</dt><dd>{don.khach_hang} — {don.khach_hang_sdt}</dd>
            <dt>Công trình</dt><dd>{don.dia_chi_cong_trinh}</dd>
            <dt>Sale</dt><dd>{don.sale}</dd>
            <dt>Vận hành</dt><dd>{don.van_hanh || 'Chưa tiếp nhận'}</dd>
            <dt>Ngày tạo</dt><dd>{ngay(don.created_at)}</dd>
          </dl>
        </div>
        <div className="card">
          <h3>Vật tư</h3>
          <div className="table-wrap">
          <table>
            <thead><tr><th>Vật tư</th><th>Nguồn gốc</th><th className="num">SL</th></tr></thead>
            <tbody>
              {don.vat_tu.map((v) => (
                <tr key={v.id}>
                  <td>{v.ten}</td>
                  <td><span className={`pill ${v.nguon_goc === 'mua_ngoai' ? 'p-new' : 'p-gray'}`}>{v.nguon_goc === 'mua_ngoai' ? 'Mua ngoài' : 'Tự sản xuất'}</span></td>
                  <td className="num">{Number(v.so_luong_can)} {v.don_vi_tinh}</td>
                </tr>
              ))}
              {don.vat_tu.length === 0 && <tr><td colSpan="3" className="muted center">Chưa có vật tư</td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Phương án vận chuyển – thi công</h3>
        <div className="grid2">
          <div className="field">
            <label htmlFor="vc">Phương án vận chuyển</label>
            <textarea id="vc" rows="4" disabled={vaiTro !== 'van_hanh'} value={phuongAn.phuong_an_van_chuyen}
              onChange={(e) => setPhuongAn({ ...phuongAn, phuong_an_van_chuyen: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="tc">Phương án thi công</label>
            <textarea id="tc" rows="4" disabled={vaiTro !== 'van_hanh'} value={phuongAn.phuong_an_thi_cong}
              onChange={(e) => setPhuongAn({ ...phuongAn, phuong_an_thi_cong: e.target.value })} />
          </div>
        </div>
        {vaiTro === 'van_hanh' && <div className="actions"><button className="btn" onClick={luuPhuongAn}>Lưu phương án</button></div>}
      </div>

      <div className="card">
        <h3>Yêu cầu chỉnh sửa</h3>
        {don.yeu_cau_sua.length === 0 && <p className="muted">Chưa có yêu cầu nào</p>}
        <ul className="list">
          {don.yeu_cau_sua.map((y) => (
            <li key={y.id}>
              <span className={`pill ${y.trang_thai === 'da_xu_ly' ? 'p-done' : 'p-wip'}`}>{y.trang_thai === 'da_xu_ly' ? 'Đã xử lý' : 'Chờ xử lý'}</span>{' '}
              {y.noi_dung} <span className="muted small">— {y.nguoi_gui}, {ngay(y.created_at)}</span>
              {vaiTro === 'van_hanh' && y.trang_thai === 'cho_xu_ly' && (
                <button className="link" onClick={() => xuLyYeuCau(y.id)}>Đánh dấu đã xử lý</button>
              )}
            </li>
          ))}
        </ul>
        {vaiTro === 'sale' && (
          <div className="toolbar mt">
            <input className="grow" placeholder="Nhập nội dung cần Vận hành chỉnh sửa..." value={noiDungSua} onChange={(e) => setNoiDungSua(e.target.value)} />
            <button className="btn" onClick={guiYeuCau}>Gửi yêu cầu</button>
          </div>
        )}
      </div>
    </>
  );
}
