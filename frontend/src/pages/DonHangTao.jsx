import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { thuNhoAnh } from '../utils.js';

const SO_ANH_TOI_DA = 3;
const dongTrong = () => ({ vat_tu_id: '', so_luong_can: '', mo_ta_goc: '' });

function KhungAI({ khachHangId, onKetQua, onLoi }) {
  const [anh, setAnh] = useState([]);
  const [ghiChu, setGhiChu] = useState('');
  const [dangDoc, setDangDoc] = useState(false);
  const [keoTha, setKeoTha] = useState(false);
  const inputFile = useRef(null);

  const themAnh = async (files) => {
    const hinh = [...files].filter((f) => f.type.startsWith('image/'));
    if (!hinh.length) return;
    const conCho = SO_ANH_TOI_DA - anh.length;
    if (conCho <= 0) return onLoi(`Tối đa ${SO_ANH_TOI_DA} ảnh mỗi lần`);
    try {
      const moi = await Promise.all(hinh.slice(0, conCho).map((f) => thuNhoAnh(f)));
      setAnh((cu) => [...cu, ...moi]);
      if (hinh.length > conCho) onLoi(`Chỉ nhận ${SO_ANH_TOI_DA} ảnh, đã bỏ bớt ${hinh.length - conCho} ảnh`);
    } catch (e) { onLoi(e.message); }
  };

  // Cho phep dan anh chup man hinh bang Ctrl+V o bat ky dau tren trang.
  useEffect(() => {
    const dan = (e) => {
      const files = [...(e.clipboardData?.files || [])];
      if (files.some((f) => f.type.startsWith('image/'))) { e.preventDefault(); themAnh(files); }
    };
    document.addEventListener('paste', dan);
    return () => document.removeEventListener('paste', dan);
  });

  const phanTich = async () => {
    onLoi('');
    setDangDoc(true);
    try {
      const { data } = await api.post('/tro-ly/trich-xuat-don', {
        khach_hang_id: khachHangId ? Number(khachHangId) : undefined,
        noi_dung: ghiChu,
        anh: anh.map(({ mime, data: d }) => ({ mime, data: d })),
      });
      onKetQua(data);
    } catch (err) { onLoi(loiCua(err)); }
    finally { setDangDoc(false); }
  };

  return (
    <div className="card">
      <p className="muted small">Tải ảnh chụp tin nhắn với khách, phiếu ghi tay hoặc bảng khối lượng (tối đa {SO_ANH_TOI_DA} ảnh). AI sẽ điền sẵn đơn hàng bên dưới để bạn kiểm tra trước khi lưu. Ảnh được gửi tới dịch vụ AI của Google — tránh ảnh chứa thông tin không liên quan.</p>
      <div
        className={`dropzone ${keoTha ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setKeoTha(true); }}
        onDragLeave={() => setKeoTha(false)}
        onDrop={(e) => { e.preventDefault(); setKeoTha(false); themAnh(e.dataTransfer.files); }}
      >
        {anh.map((a, i) => (
          <div key={i} className="thumb">
            <img src={a.xemTruoc} alt={`Ảnh ${i + 1}`} />
            <button type="button" aria-label={`Bỏ ảnh ${i + 1}`} onClick={() => setAnh(anh.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        {anh.length < SO_ANH_TOI_DA && (
          <button type="button" className="add-photo" onClick={() => inputFile.current.click()}>
            <span>+ Thêm ảnh</span>
            <small>Chọn file, kéo thả hoặc Ctrl+V</small>
          </button>
        )}
        <input ref={inputFile} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
          onChange={(e) => { themAnh(e.target.files); e.target.value = ''; }} />
      </div>
      <textarea rows="2" placeholder="Ghi chú thêm cho AI (không bắt buộc), VD: khách lấy thêm len chân tường cho phòng khách"
        value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
      <div className="actions">
        <button type="button" className="btn" disabled={dangDoc || (!anh.length && !ghiChu.trim())} onClick={phanTich}>
          {dangDoc ? 'AI đang đọc...' : '✨ Phân tích & điền đơn'}
        </button>
      </div>
    </div>
  );
}

export default function DonHangTao() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const khachTuHoSo = params.get('khach_hang_id') || '';
  const [cheDo, setCheDo] = useState(params.get('che_do') === 'tay' ? 'tay' : 'ai');

  const [khachHang, setKhachHang] = useState([]);
  const [vatTu, setVatTu] = useState([]);
  const [khachHangId, setKhachHangId] = useState(khachTuHoSo);
  const [diaChi, setDiaChi] = useState('');
  const [dong, setDong] = useState([dongTrong()]);
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [ketQuaAI, setKetQuaAI] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/danh-muc/khach-hang'), api.get('/danh-muc/vat-tu')])
      .then(([kh, vt]) => {
        setKhachHang(kh.data);
        setVatTu(vt.data);
        const k = kh.data.find((x) => String(x.id) === khachTuHoSo);
        if (k) setDiaChi((cu) => cu || k.dia_chi || '');
      })
      .catch((e) => setLoi(loiCua(e)));
  }, [khachTuHoSo]);

  const chonKhach = (id) => {
    setKhachHangId(id);
    const kh = khachHang.find((k) => String(k.id) === id);
    if (kh && !diaChi) setDiaChi(kh.dia_chi || '');
  };

  const nhanKetQuaAI = (data) => {
    if (data.khach_hang_id) setKhachHangId(String(data.khach_hang_id));
    if (data.dia_chi_cong_trinh) setDiaChi(data.dia_chi_cong_trinh);
    if (data.vat_tu.length) {
      setDong(data.vat_tu.map((v) => ({
        vat_tu_id: v.vat_tu_id ? String(v.vat_tu_id) : '', so_luong_can: v.so_luong_can ?? '', mo_ta_goc: v.mo_ta_goc,
      })));
    }
    setKetQuaAI(data);
  };

  const suaDong = (i, field, value) => setDong(dong.map((d, j) => (j === i ? { ...d, [field]: value } : d)));

  const submit = async (e) => {
    e.preventDefault();
    setLoi('');
    const thieu = dong.filter((d) => !d.vat_tu_id && d.mo_ta_goc);
    if (thieu.length) return setLoi(`Còn ${thieu.length} dòng vật tư AI chưa khớp được danh mục — chọn vật tư hoặc xoá dòng đó.`);
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
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={cheDo === 'ai'} className={cheDo === 'ai' ? 'tab on' : 'tab'} onClick={() => setCheDo('ai')}>✨ Lên đơn nhanh bằng AI</button>
        <button type="button" role="tab" aria-selected={cheDo === 'tay'} className={cheDo === 'tay' ? 'tab on' : 'tab'} onClick={() => setCheDo('tay')}>Nhập thủ công</button>
      </div>

      {cheDo === 'ai' && <KhungAI khachHangId={khachTuHoSo} onKetQua={nhanKetQuaAI} onLoi={setLoi} />}

      {ketQuaAI && (
        ketQuaAI.canh_bao.length === 0
          ? <div className="success">AI đã điền đơn hàng. Vui lòng kiểm tra lại trước khi lưu.</div>
          : <ul className="ai-warn">{ketQuaAI.canh_bao.map((c, i) => <li key={i}>⚠ {c}</li>)}</ul>
      )}
      {ketQuaAI?.ghi_chu && <div className="card small"><b>Ghi chú của khách:</b> {ketQuaAI.ghi_chu}</div>}

      <div className="card">
        <h3>Thông tin đơn hàng</h3>
        <div className="grid2">
          <div className="field">
            <label htmlFor="kh">Khách hàng</label>
            <select id="kh" value={khachHangId} onChange={(e) => chonKhach(e.target.value)} disabled={Boolean(khachTuHoSo)}>
              <option value="">— Chọn khách hàng —</option>
              {khachHang.map((k) => <option key={k.id} value={k.id}>{k.ten}{k.sdt ? ` — ${k.sdt}` : ''}</option>)}
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
        <h3>Vật tư</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Vật tư</th><th>Loại</th><th className="num">Số lượng</th><th>ĐVT</th><th /></tr></thead>
            <tbody>
              {dong.map((d, i) => {
                const vt = vatTu.find((v) => String(v.id) === String(d.vat_tu_id));
                return (
                  <tr key={i} className={d.mo_ta_goc && !d.vat_tu_id ? 'row-warn' : ''}>
                    <td>
                      <select aria-label={`Vật tư dòng ${i + 1}`} value={d.vat_tu_id} onChange={(e) => suaDong(i, 'vat_tu_id', e.target.value)}>
                        <option value="">— Chọn vật tư —</option>
                        {vatTu.map((v) => <option key={v.id} value={v.id}>{v.ten}</option>)}
                      </select>
                      {d.mo_ta_goc && <div className="muted small">AI đọc được: “{d.mo_ta_goc}”</div>}
                    </td>
                    <td>{vt ? `${vt.loai} (${vt.nguon_goc === 'mua_ngoai' ? 'mua ngoài' : 'tự sản xuất'})` : '—'}</td>
                    <td className="num"><input aria-label={`Số lượng dòng ${i + 1}`} type="number" min="0" step="0.01" value={d.so_luong_can} onChange={(e) => suaDong(i, 'so_luong_can', e.target.value)} /></td>
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
        <button type="button" className="btn sec" onClick={() => navigate(-1)}>Huỷ</button>
        <button className="btn" disabled={dangGui}>{dangGui ? 'Đang lưu...' : 'Lưu đơn hàng'}</button>
      </div>
    </form>
  );
}
