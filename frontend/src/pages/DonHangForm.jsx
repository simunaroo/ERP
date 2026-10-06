import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { HINH_THUC, LOAI_THI_CONG, NGHIEM_THU, NHOM_KHACH, TINH_THANH, dieuKhoanThanhToan, thuNhoAnh, tien, tinhTien } from '../utils.js';

const SO_ANH_TOI_DA = 3;
const dongTrong = () => ({ vat_tu_id: '', so_luong_can: '', don_gia: '', ghi_chu: '', loai_thi_cong: '', dai_mm: '', rong_mm: '', mo_ta_goc: '' });
// Goi y mac dinh: don vat tu nghiem thu theo vat tu tieu hao, don hoan thien theo so m2 thi cong.
const NGHIEM_THU_MAC_DINH = { vat_tu: 'vat_tu_tieu_hao', hoan_thien: 'so_m2_thi_cong' };
const DON_TRONG = {
  khach_hang_id: '', hinh_thuc: 'hoan_thien', ma_hop_dong: '', ngay_yc_lap_dat: '',
  tinh_thanh: '', phuong_xa: '', dia_chi_cong_trinh: '',
  phi_van_chuyen: '', phu_thu: '', chiet_khau_pct: '', tien_coc: '', ngay_coc: '',
  ty_le_tam_ung: 80, dieu_khoan_nghiem_thu: NGHIEM_THU_MAC_DINH.hoan_thien, ghi_chu_van_chuyen: '',
};

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
      <p className="muted small">Tải ảnh chụp tin nhắn với khách, phiếu ghi tay hoặc báo giá (tối đa {SO_ANH_TOI_DA} ảnh). AI điền sẵn vật tư, số lượng, đơn giá, địa chỉ bên dưới để bạn kiểm tra trước khi lưu. Ảnh được gửi tới dịch vụ AI của Google — tránh ảnh chứa thông tin không liên quan.</p>
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

function O({ id, label, children, className = '' }) {
  return <div className={`field ${className}`}><label htmlFor={id}>{label}</label>{children}</div>;
}

export default function DonHangForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // co id = sua don nhap
  const [params] = useSearchParams();
  const khachTuHoSo = params.get('khach_hang_id') || '';
  const [cheDo, setCheDo] = useState(params.get('che_do') === 'tay' || id ? 'tay' : 'ai');

  const [khachHang, setKhachHang] = useState([]);
  const [vatTu, setVatTu] = useState([]);
  const [don, setDon] = useState({ ...DON_TRONG, khach_hang_id: khachTuHoSo });
  const [maDon, setMaDon] = useState('');
  const [dong, setDong] = useState([dongTrong()]);
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [ketQuaAI, setKetQuaAI] = useState(null);
  const [daTai, setDaTai] = useState(!id);

  const sua = (field) => (e) => setDon((d) => ({ ...d, [field]: e.target.value }));

  useEffect(() => {
    Promise.all([api.get('/danh-muc/khach-hang'), api.get('/danh-muc/vat-tu')])
      .then(([kh, vt]) => {
        setKhachHang(kh.data);
        setVatTu(vt.data);
        const k = kh.data.find((x) => String(x.id) === khachTuHoSo);
        if (k && !id) setDon((d) => ({ ...d, dia_chi_cong_trinh: d.dia_chi_cong_trinh || k.dia_chi || '' }));
      })
      .catch((e) => setLoi(loiCua(e)));
  }, [khachTuHoSo, id]);

  useEffect(() => {
    if (!id) return;
    api.get(`/don-hang/${id}`)
      .then(({ data }) => {
        if (data.trang_thai !== 'nhap') { setLoi('Đơn đã chốt, không sửa trực tiếp được. Hãy gửi yêu cầu chỉnh sửa cho Vận hành.'); return; }
        const d = {};
        for (const k of Object.keys(DON_TRONG)) d[k] = data[k] ?? '';
        d.khach_hang_id = String(data.khach_hang_id);
        setDon(d);
        setMaDon(data.ma_don);
        setDong(data.vat_tu.length ? data.vat_tu.map((v) => ({
          vat_tu_id: String(v.vat_tu_id), so_luong_can: Number(v.so_luong_can), don_gia: Number(v.don_gia), ghi_chu: v.ghi_chu || '',
          loai_thi_cong: v.loai_thi_cong || '', dai_mm: v.dai_mm ?? '', rong_mm: v.rong_mm ?? '', mo_ta_goc: '',
        })) : [dongTrong()]);
        setDaTai(true);
      })
      .catch((e) => setLoi(loiCua(e)));
  }, [id]);

  const chonKhach = (e) => {
    const kh = khachHang.find((k) => String(k.id) === e.target.value);
    setDon((d) => ({ ...d, khach_hang_id: e.target.value, dia_chi_cong_trinh: d.dia_chi_cong_trinh || kh?.dia_chi || '' }));
  };

  const nhanKetQuaAI = (data) => {
    setDon((d) => ({
      ...d,
      khach_hang_id: data.khach_hang_id ? String(data.khach_hang_id) : d.khach_hang_id,
      dia_chi_cong_trinh: data.dia_chi_cong_trinh || d.dia_chi_cong_trinh,
      ghi_chu_van_chuyen: data.ghi_chu ? [d.ghi_chu_van_chuyen, data.ghi_chu].filter(Boolean).join('\n') : d.ghi_chu_van_chuyen,
    }));
    if (data.vat_tu.length) {
      setDong(data.vat_tu.map((v) => ({
        vat_tu_id: v.vat_tu_id ? String(v.vat_tu_id) : '', so_luong_can: v.so_luong_can ?? '', don_gia: v.don_gia ?? '', ghi_chu: '',
        loai_thi_cong: v.loai_thi_cong || '', dai_mm: v.dai_mm ?? '', rong_mm: v.rong_mm ?? '', mo_ta_goc: v.mo_ta_goc,
      })));
    }
    setKetQuaAI(data);
  };

  // Doi hinh thuc: neu sale chua tu chon nghiem thu khac goi y cu thi doi theo goi y moi.
  const doiHinhThuc = (e) => {
    const moi = e.target.value;
    setDon((d) => ({
      ...d, hinh_thuc: moi,
      dieu_khoan_nghiem_thu: !d.dieu_khoan_nghiem_thu || d.dieu_khoan_nghiem_thu === NGHIEM_THU_MAC_DINH[d.hinh_thuc]
        ? NGHIEM_THU_MAC_DINH[moi] : d.dieu_khoan_nghiem_thu,
    }));
  };

  const suaDong = (i, field, value) => setDong(dong.map((d, j) => (j === i ? { ...d, [field]: value } : d)));
  const khachKhoa = Boolean(khachTuHoSo || id);
  const khachChon = khachHang.find((k) => String(k.id) === String(don.khach_hang_id));
  const so = tinhTien(dong, don);

  const gui = async (chot) => {
    setLoi('');
    const thieu = dong.filter((d) => !d.vat_tu_id && d.mo_ta_goc);
    if (thieu.length) return setLoi(`Còn ${thieu.length} dòng vật tư AI chưa khớp được danh mục — chọn vật tư hoặc xoá dòng đó.`);
    setDangGui(true);
    const body = {
      ...don,
      khach_hang_id: Number(don.khach_hang_id),
      chot,
      vat_tu: dong.filter((d) => d.vat_tu_id).map((d) => ({
        vat_tu_id: Number(d.vat_tu_id), so_luong_can: Number(d.so_luong_can), don_gia: Number(d.don_gia) || 0, ghi_chu: d.ghi_chu,
        loai_thi_cong: d.loai_thi_cong || null, dai_mm: d.dai_mm === '' ? null : Number(d.dai_mm), rong_mm: d.rong_mm === '' ? null : Number(d.rong_mm),
      })),
    };
    try {
      const { data } = id ? await api.put(`/don-hang/${id}`, body) : await api.post('/don-hang', body);
      navigate(`/don-hang/${data.id}`, { replace: true });
    } catch (err) {
      setLoi(loiCua(err));
      setDangGui(false);
    }
  };

  const xoaNhap = async () => {
    try {
      await api.delete(`/don-hang/${id}`);
      navigate('/don-hang', { replace: true });
    } catch (err) { setLoi(loiCua(err)); }
  };

  if (!daTai) return loi ? <div className="error">{loi}</div> : <p className="muted">Đang tải...</p>;

  return (
    <form onSubmit={(e) => { e.preventDefault(); gui(false); }}>
      <h1>{id ? `Sửa đơn nháp ${maDon}` : 'Tạo đơn hàng'}</h1>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={cheDo === 'ai'} className={cheDo === 'ai' ? 'tab on' : 'tab'} onClick={() => setCheDo('ai')}>✨ Lên đơn nhanh bằng AI</button>
        <button type="button" role="tab" aria-selected={cheDo === 'tay'} className={cheDo === 'tay' ? 'tab on' : 'tab'} onClick={() => setCheDo('tay')}>Nhập thủ công</button>
      </div>

      {cheDo === 'ai' && <KhungAI khachHangId={don.khach_hang_id} onKetQua={nhanKetQuaAI} onLoi={setLoi} />}

      {ketQuaAI && (
        ketQuaAI.canh_bao.length === 0
          ? <div className="success">AI đã điền đơn hàng. Vui lòng kiểm tra lại trước khi lưu.</div>
          : <ul className="ai-warn">{ketQuaAI.canh_bao.map((c, i) => <li key={i}>⚠ {c}</li>)}</ul>
      )}

      <div className="form-layout">
        <div className="form-main">
          <div className="card">
            <h3>Khách hàng & hình thức</h3>
            <div className="grid2">
              <O id="kh" label="Khách hàng *">
                <select id="kh" value={don.khach_hang_id} onChange={chonKhach} disabled={khachKhoa}>
                  <option value="">— Chọn khách hàng —</option>
                  {khachHang.map((k) => <option key={k.id} value={k.id}>{k.ten}{k.sdt ? ` — ${k.sdt}` : ''}</option>)}
                </select>
                {khachChon && <span className="muted small">Nhóm khách: {NHOM_KHACH[khachChon.nhom_khach_hang]}</span>}
              </O>
              <O id="hd" label="Mã hợp đồng">
                <input id="hd" value={don.ma_hop_dong} onChange={sua('ma_hop_dong')} placeholder="Nếu có" />
              </O>
              <div className="field span2">
                <label>Hình thức đơn *</label>
                <div className="radio-cards" role="radiogroup">
                  {Object.entries(HINH_THUC).map(([v, h]) => (
                    <label key={v} className={don.hinh_thuc === v ? 'radio-card on' : 'radio-card'}>
                      <input type="radio" name="hinh_thuc" value={v} checked={don.hinh_thuc === v} onChange={doiHinhThuc} />
                      <b>{h.nhan}</b><span className="muted small">{h.moTa}</span>
                    </label>
                  ))}
                </div>
              </div>
              <O id="lapdat" label={`Ngày yêu cầu ${don.hinh_thuc === 'hoan_thien' ? 'lắp đặt *' : 'giao hàng'}`}>
                <input id="lapdat" type="date" value={don.ngay_yc_lap_dat} onChange={sua('ngay_yc_lap_dat')} />
              </O>
            </div>
          </div>

          <div className="card">
            <h3>Địa chỉ công trình</h3>
            <div className="grid2">
              <O id="tinh" label="Tỉnh/Thành *">
                <select id="tinh" value={don.tinh_thanh} onChange={sua('tinh_thanh')}>
                  <option value="">— Chọn tỉnh/thành —</option>
                  {TINH_THANH.map((t) => <option key={t}>{t}</option>)}
                </select>
              </O>
              <O id="xa" label="Phường/Xã">
                <input id="xa" value={don.phuong_xa} onChange={sua('phuong_xa')} placeholder="VD: Phường Cầu Giấy" />
              </O>
              <O id="dc" label="Địa chỉ cụ thể *" className="span2">
                <input id="dc" value={don.dia_chi_cong_trinh} onChange={sua('dia_chi_cong_trinh')} placeholder="Số nhà, đường, toà, căn hộ..." />
              </O>
            </div>
          </div>

          <div className="card">
            <h3>Vật tư</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Vật tư</th><th className="num">Số lượng</th><th>ĐVT</th><th className="num">Đơn giá</th><th className="num">Thành tiền</th><th>Thi công · Kích thước (mm)</th><th>Ghi chú</th><th /></tr></thead>
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
                          {vt && <div className="muted small">{vt.loai} · {vt.nguon_goc === 'mua_ngoai' ? 'mua ngoài' : 'tự sản xuất'}</div>}
                          {d.mo_ta_goc && <div className="muted small">AI đọc được: “{d.mo_ta_goc}”</div>}
                        </td>
                        <td className="num"><input aria-label={`Số lượng dòng ${i + 1}`} type="number" min="0" step="0.01" value={d.so_luong_can} onChange={(e) => suaDong(i, 'so_luong_can', e.target.value)} /></td>
                        <td>{vt?.don_vi_tinh || '—'}</td>
                        <td className="num"><input aria-label={`Đơn giá dòng ${i + 1}`} type="number" min="0" step="1000" value={d.don_gia} onChange={(e) => suaDong(i, 'don_gia', e.target.value)} /></td>
                        <td className="num nowrap">{tien((Number(d.so_luong_can) || 0) * (Number(d.don_gia) || 0))}</td>
                        <td className="thi-cong">
                          <select aria-label={`Loại thi công dòng ${i + 1}`} value={d.loai_thi_cong} onChange={(e) => suaDong(i, 'loai_thi_cong', e.target.value)}>
                            <option value="">—</option>
                            {Object.entries(LOAI_THI_CONG).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                          </select>
                          <div className="kich-thuoc">
                          <input aria-label={`Chiều dài dòng ${i + 1}`} type="number" min="1" step="1" placeholder="Dài" value={d.dai_mm} onChange={(e) => suaDong(i, 'dai_mm', e.target.value)} />
                          <span>×</span>
                          <input aria-label={`Chiều rộng dòng ${i + 1}`} type="number" min="1" step="1" placeholder="Rộng" value={d.rong_mm} onChange={(e) => suaDong(i, 'rong_mm', e.target.value)} />
                          </div>
                        </td>
                        <td><input aria-label={`Ghi chú dòng ${i + 1}`} className="w-full" value={d.ghi_chu} onChange={(e) => suaDong(i, 'ghi_chu', e.target.value)} placeholder="Vị trí, màu..." /></td>
                        <td><button type="button" className="link danger" onClick={() => setDong(dong.filter((_, j) => j !== i))}>Xoá</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn sec mt" onClick={() => setDong([...dong, dongTrong()])}>+ Thêm vật tư</button>
          </div>

          <div className="card">
            <h3>Thanh toán & vận chuyển</h3>
            <div className="grid2">
              <O id="phivc" label="Phí vận chuyển (đ)"><input id="phivc" type="number" min="0" step="1000" value={don.phi_van_chuyen} onChange={sua('phi_van_chuyen')} /></O>
              <O id="phuthu" label="Phụ thu (đ)"><input id="phuthu" type="number" min="0" step="1000" value={don.phu_thu} onChange={sua('phu_thu')} /></O>
              <O id="ck" label="Chiết khấu (%)"><input id="ck" type="number" min="0" max="100" step="0.5" value={don.chiet_khau_pct} onChange={sua('chiet_khau_pct')} /></O>
              <O id="tamung" label="Tạm ứng khi nhận hàng (%)"><input id="tamung" type="number" min="0" max="100" step="5" value={don.ty_le_tam_ung} onChange={sua('ty_le_tam_ung')} /></O>
              <O id="coc" label="Tiền cọc (đ)"><input id="coc" type="number" min="0" step="1000" value={don.tien_coc} onChange={sua('tien_coc')} /></O>
              <O id="ngaycoc" label="Ngày cọc"><input id="ngaycoc" type="date" value={don.ngay_coc} onChange={sua('ngay_coc')} /></O>
              <div className="field span2">
                <label>Điều khoản thanh toán (tự sinh)</label>
                <div className="readonly-box">{dieuKhoanThanhToan(don.ty_le_tam_ung, don.hinh_thuc)}</div>
              </div>
              <O id="nt" label="Điều khoản nghiệm thu *">
                <select id="nt" value={don.dieu_khoan_nghiem_thu} onChange={sua('dieu_khoan_nghiem_thu')}>
                  <option value="">— Chọn —</option>
                  {Object.entries(NGHIEM_THU).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </O>
              <O id="ghichuvc" label="Ghi chú vận chuyển" className="span2">
                <textarea id="ghichuvc" rows="2" value={don.ghi_chu_van_chuyen} onChange={sua('ghi_chu_van_chuyen')} placeholder="Giờ giao, lối vào, thang máy..." />
              </O>
            </div>
          </div>
        </div>

        <aside className="card form-summary">
          <h3>Tổng đơn</h3>
          <dl className="money">
            <dt>Tổng vật tư</dt><dd>{tien(so.tongVatTu)}</dd>
            {so.tienChietKhau > 0 && <><dt>Chiết khấu {don.chiet_khau_pct}%</dt><dd>−{tien(so.tienChietKhau)}</dd></>}
            {Number(don.phi_van_chuyen) > 0 && <><dt>Phí vận chuyển</dt><dd>{tien(don.phi_van_chuyen)}</dd></>}
            {Number(don.phu_thu) > 0 && <><dt>Phụ thu</dt><dd>{tien(don.phu_thu)}</dd></>}
            <dt className="total">Tổng đơn</dt><dd className="total">{tien(so.tongDon)}</dd>
            {Number(don.tien_coc) > 0 && <><dt>Đã cọc</dt><dd>−{tien(don.tien_coc)}</dd></>}
            <dt>Còn phải thu</dt><dd>{tien(so.conPhaiThu)}</dd>
          </dl>
          {loi && <div className="error">{loi}</div>}
          <div className="summary-actions">
            <button type="button" className="btn" disabled={dangGui} onClick={() => gui(true)}>Chốt đơn</button>
            <button className="btn sec" disabled={dangGui}>Lưu nháp</button>
            {id && <button type="button" className="link danger" onClick={xoaNhap}>Xoá đơn nháp</button>}
            <button type="button" className="link" onClick={() => navigate(-1)}>Huỷ</button>
          </div>
          <p className="muted small">Chốt đơn: chuyển sang Vận hành, không sửa trực tiếp được nữa. Lưu nháp: lưu tạm, chỉ bạn nhìn thấy.</p>
        </aside>
      </div>
    </form>
  );
}
