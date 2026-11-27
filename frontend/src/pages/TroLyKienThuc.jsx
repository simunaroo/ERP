import { useEffect, useRef, useState } from 'react';
import { api, loiCua } from '../api/client.js';
import { ngayGio, thuNhoAnh } from '../utils.js';

const KY_TU_TOI_DA = 60000;
const FILE_TOI_DA = 10 * 1024 * 1024;

const docBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = () => reject(new Error('Không đọc được file'));
  r.readAsDataURL(file);
});

// Admin soan "ho so kien thuc" cho tung tro ly san pham. Moi cau hoi cua Sale se gui kem ho so nay cho Gemini.
export default function TroLyKienThuc() {
  const [dsTroLy, setDsTroLy] = useState([]);
  const [chon, setChon] = useState(null);
  const [troLy, setTroLy] = useState(null);
  const [noiDung, setNoiDung] = useState('');
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [dangLuu, setDangLuu] = useState(false);
  const [dangDoc, setDangDoc] = useState(false);
  const inputFile = useRef(null);
  const daSua = troLy && noiDung !== troLy.kien_thuc;

  const taiDs = () => api.get('/tro-ly/san-pham').then((r) => {
    setDsTroLy(r.data);
    setChon((c) => c ?? r.data[0]?.id ?? null);
  }).catch((e) => setLoi(loiCua(e)));
  useEffect(() => { taiDs(); }, []);

  useEffect(() => {
    if (!chon) return;
    setLoi(''); setThongBao('');
    api.get(`/tro-ly/san-pham/${chon}/kien-thuc`)
      .then((r) => { setTroLy(r.data); setNoiDung(r.data.kien_thuc); })
      .catch((e) => setLoi(loiCua(e)));
  }, [chon]);

  const doiTroLy = (id) => {
    if (daSua && !window.confirm('Nội dung đang sửa chưa lưu sẽ mất. Vẫn chuyển?')) return;
    setChon(id);
  };

  const luu = async () => {
    setDangLuu(true); setLoi(''); setThongBao('');
    try {
      const { data } = await api.put(`/tro-ly/san-pham/${chon}/kien-thuc`, { kien_thuc: noiDung });
      setTroLy(data); setNoiDung(data.kien_thuc);
      setThongBao('Đã lưu. Từ câu hỏi tiếp theo, trợ lý dùng kiến thức mới.');
      taiDs();
    } catch (e) { setLoi(loiCua(e)); }
    finally { setDangLuu(false); }
  };

  // Doc catalog/bang gia: AI chuyen thanh van ban va NOI vao cuoi, Admin doc lai roi moi bam Luu.
  const napFile = async (file) => {
    if (!file) return;
    setLoi(''); setThongBao('');
    if (file.size > FILE_TOI_DA) return setLoi('File vượt quá 10 MB');
    setDangDoc(true);
    try {
      const tep = file.type === 'application/pdf'
        ? { mime: 'application/pdf', data: await docBase64(file) }
        : await thuNhoAnh(file, 2400, 0.9).then(({ mime, data }) => ({ mime, data }));
      const { data } = await api.post(`/tro-ly/san-pham/${chon}/doc-tai-lieu`, { tep });
      setNoiDung((cu) => [cu.trim(), `## Trích từ file "${file.name}"\n${data.van_ban}`].filter(Boolean).join('\n\n'));
      setThongBao('AI đã đọc xong file và thêm vào cuối nội dung — hãy kiểm tra lại số liệu rồi bấm Lưu.');
    } catch (e) { setLoi(loiCua(e)); }
    finally { setDangDoc(false); }
  };

  return (
    <>
      <h1>Kiến thức trợ lý AI</h1>
      <p className="muted">Mỗi sản phẩm là một trợ lý riêng. Trợ lý chỉ trả lời Sale dựa trên nội dung bạn soạn ở đây (cùng danh mục vật tư đang bán của sản phẩm đó). Thông tin không có trong tài liệu, trợ lý sẽ báo “chưa có” thay vì tự bịa.</p>
      <div className="chips" role="group" aria-label="Chọn trợ lý theo sản phẩm">
        {dsTroLy.map((t) => (
          <button key={t.id} type="button" aria-pressed={t.id === chon} className={t.id === chon ? 'chip on' : 'chip'} onClick={() => doiTroLy(t.id)}>
            Trợ lý {t.ten} {t.so_ky_tu === 0 ? '· trống' : `· ${t.so_ky_tu.toLocaleString('vi-VN')} ký tự`}
          </button>
        ))}
      </div>

      {troLy && (
        <div className="card">
          <div className="toolbar">
            <span className="muted small">
              {troLy.cap_nhat_luc ? <>Cập nhật {ngayGio(troLy.cap_nhat_luc)}{troLy.nguoi_cap_nhat && ` bởi ${troLy.nguoi_cap_nhat}`}</> : 'Chưa có kiến thức'}
            </span>
            <span className="grow" />
            <button type="button" className="btn sec" disabled={dangDoc} onClick={() => inputFile.current.click()}>
              {dangDoc ? 'AI đang đọc file...' : 'Nạp từ file (PDF / ảnh catalog, bảng giá)'}
            </button>
            <input ref={inputFile} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden
              onChange={(e) => { napFile(e.target.files[0]); e.target.value = ''; }} />
          </div>
          <textarea className="kien-thuc" rows={24} value={noiDung} onChange={(e) => setNoiDung(e.target.value)}
            placeholder={'Ví dụ:\n## Dòng sản phẩm\n- Mẫu A: kích thước..., chất liệu..., phù hợp...\n## Giá bán tham khảo\n- ...\n## Bảo hành & thi công\n- ...\n## Câu khách hay hỏi\n- ...'} />
          <div className="toolbar mt">
            <span className={`small ${noiDung.length > KY_TU_TOI_DA ? 'error-text' : 'muted'}`}>
              {noiDung.length.toLocaleString('vi-VN')} / {KY_TU_TOI_DA.toLocaleString('vi-VN')} ký tự
            </span>
            <span className="grow" />
            {daSua && <button type="button" className="btn sec" onClick={() => setNoiDung(troLy.kien_thuc)}>Huỷ thay đổi</button>}
            <button type="button" className="btn" disabled={!daSua || dangLuu || noiDung.length > KY_TU_TOI_DA} onClick={luu}>Lưu kiến thức</button>
          </div>
          {loi && <div className="error mt">{loi}</div>}
          {thongBao && <div className="success mt">{thongBao}</div>}
        </div>
      )}
      {!troLy && loi && <div className="error">{loi}</div>}
    </>
  );
}
