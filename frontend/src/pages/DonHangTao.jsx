import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';

const dongTrong = () => ({ vat_tu_id: '', so_luong_can: '', mo_ta_goc: '' });

export default function DonHangTao() {
  const navigate = useNavigate();
  const [khachHang, setKhachHang] = useState([]);
  const [vatTu, setVatTu] = useState([]);
  const [khachHangId, setKhachHangId] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [dong, setDong] = useState([dongTrong()]);
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [tinNhan, setTinNhan] = useState('');
  const [dangTrichXuat, setDangTrichXuat] = useState(false);
  const [ketQuaAI, setKetQuaAI] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/danh-muc/khach-hang'), api.get('/danh-muc/vat-tu')])
      .then(([kh, vt]) => { setKhachHang(kh.data); setVatTu(vt.data); })
      .catch((e) => setLoi(loiCua(e)));
  }, []);

  const chonKhach = (id) => {
    setKhachHangId(id);
    const kh = khachHang.find((k) => String(k.id) === id);
    if (kh && !diaChi) setDiaChi(kh.dia_chi || '');
  };

  const trichXuat = async () => {
    setLoi('');
    setDangTrichXuat(true);
    try {
      const { data } = await api.post('/tro-ly/trich-xuat-don', { noi_dung: tinNhan });
      if (data.khach_hang_id) setKhachHangId(String(data.khach_hang_id));
      if (data.dia_chi_cong_trinh) setDiaChi(data.dia_chi_cong_trinh);
      if (data.vat_tu.length) {
        setDong(data.vat_tu.map((v) => ({
          vat_tu_id: v.vat_tu_id ? String(v.vat_tu_id) : '',
          so_luong_can: v.so_luong_can ?? '',
          mo_ta_goc: v.mo_ta_goc,
        })));
      }
      setKetQuaAI(data);
    } catch (err) {
      setLoi(loiCua(err));
    } finally {
      setDangTrichXuat(false);
    }
  };

  const suaDong = (i, field, value) => setDong(dong.map((d, j) => (j === i ? { ...d, [field]: value } : d)));

  const submit = async (e) => {
    e.preventDefault();
    setLoi('');
    setDangGui(true);
    try {
      const { data } = await api.post('/don-hang', {
        khach_hang_id: Number(khachHangId),
        dia_chi_cong_trinh: diaChi,
        vat_tu: dong.filter((d) => d.vat_tu_id).map((d) => ({ vat_tu_id: Number(d.vat_tu_id), so_luong_can: Number(d.so_luong_can) })),
      });
      navigate(`/don-hang/${data.id}`);
    } catch (err) {
      setLoi(loiCua(err));
      setDangGui(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h1>Tạo đơn hàng</h1>
      <div className="card ai-card">
        <h3>✨ Trợ lý AI nhập đơn</h3>
        <p className="muted small">Dán tin nhắn của khách, trợ lý sẽ điền sẵn khách hàng, địa chỉ và vật tư. Bạn kiểm tra lại trước khi lưu.</p>
        <textarea id="tn" rows="3" placeholder="VD: Chị Mai 0901000002, lấy 30m2 sàn SPC vân đá với 3 bộ cửa gỗ, giao Cầu Giấy..."
          value={tinNhan} onChange={(e) => setTinNhan(e.target.value)} />
        <div className="actions">
          <button type="button" className="btn" disabled={dangTrichXuat || !tinNhan.trim()} onClick={trichXuat}>
            {dangTrichXuat ? 'Đang đọc tin nhắn...' : 'Trích xuất'}
          </button>
        </div>
        {ketQuaAI && (
          <div className="ai-result">
            {ketQuaAI.canh_bao.length === 0
              ? <div className="success">Đã điền form từ tin nhắn. Vui lòng kiểm tra lại trước khi lưu.</div>
              : <ul className="ai-warn">{ketQuaAI.canh_bao.map((c, i) => <li key={i}>⚠ {c}</li>)}</ul>}
            {ketQuaAI.ghi_chu && <p className="small"><b>Ghi chú của khách:</b> {ketQuaAI.ghi_chu}</p>}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Thông tin đơn hàng</h3>
        <div className="grid2">
          <div className="field">
            <label htmlFor="kh">Khách hàng</label>
            <select id="kh" value={khachHangId} onChange={(e) => chonKhach(e.target.value)}>
              <option value="">— Chọn khách hàng —</option>
              {khachHang.map((k) => <option key={k.id} value={k.id}>{k.ten} — {k.sdt}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Mã đơn</label>
            <input value="Tự sinh khi lưu" disabled />
          </div>
          <div className="field span2">
            <label htmlFor="dc">Địa chỉ công trình</label>
            <input id="dc" value={diaChi} onChange={(e) => setDiaChi(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Vật tư dự kiến</h3>
        <div className="table-wrap">
        <table>
          <thead><tr><th>Vật tư</th><th>Loại</th><th className="num">Số lượng</th><th>ĐVT</th><th /></tr></thead>
          <tbody>
            {dong.map((d, i) => {
              const vt = vatTu.find((v) => String(v.id) === String(d.vat_tu_id));
              return (
                <tr key={i}>
                  <td>
                    <select value={d.vat_tu_id} onChange={(e) => suaDong(i, 'vat_tu_id', e.target.value)}>
                      <option value="">— Chọn vật tư —</option>
                      {vatTu.map((v) => <option key={v.id} value={v.id}>{v.ten}</option>)}
                    </select>
                    {d.mo_ta_goc && <div className="muted small">Khách viết: “{d.mo_ta_goc}”</div>}
                  </td>
                  <td>{vt ? `${vt.loai} (${vt.nguon_goc === 'mua_ngoai' ? 'mua ngoài' : 'tự sản xuất'})` : '—'}</td>
                  <td className="num"><input type="number" min="0" step="0.01" value={d.so_luong_can} onChange={(e) => suaDong(i, 'so_luong_can', e.target.value)} /></td>
                  <td>{vt?.don_vi_tinh || '—'}</td>
                  <td><button type="button" className="link danger" onClick={() => setDong(dong.filter((_, j) => j !== i))}>Xoá</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <button type="button" className="btn sec mt" onClick={() => setDong([...dong, dongTrong()])}>+ Thêm vật tư</button>
      </div>

      {loi && <div className="error">{loi}</div>}
      <div className="actions">
        <button type="button" className="btn sec" onClick={() => navigate('/don-hang')}>Huỷ</button>
        <button className="btn" disabled={dangGui}>{dangGui ? 'Đang lưu...' : 'Lưu đơn hàng'}</button>
      </div>
    </form>
  );
}
