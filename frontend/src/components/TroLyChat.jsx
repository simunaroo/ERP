import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { ngayGio, thuNhoAnh } from '../utils.js';
import { useTroLyStore } from '../store/troLyStore.js';
import Icon from './Icon.jsx';

const ANH_TOI_DA = 3;

// In dam **...** / in nghieng *...* trong mot dong (khong dung dangerouslySetInnerHTML -> cau tra loi AI khong chen duoc HTML).
function DongChu({ text }) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((p, i) => {
    if (p.length > 4 && p.startsWith('**') && p.endsWith('**')) return <b key={i}>{p.slice(2, -2)}</b>;
    if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return <i key={i}>{p.slice(1, -1)}</i>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

// Cau tra loi dang "markdown don gian": tieu de ##, gach dau dong -, doan van.
function VanBanAI({ text }) {
  const khoi = [];
  for (const dong of text.split('\n')) {
    const t = dong.trim();
    if (!t) continue;
    if (/^[-*•]\s+/.test(t)) {
      const muc = t.replace(/^[-*•]\s+/, '');
      if (khoi.at(-1)?.loai === 'ul') khoi.at(-1).muc.push(muc); else khoi.push({ loai: 'ul', muc: [muc] });
    } else if (/^#{1,6}\s+/.test(t)) khoi.push({ loai: 'h', text: t.replace(/^#+\s+/, '') });
    else khoi.push({ loai: 'p', text: t });
  }
  return (
    <div className="ai-van-ban">
      {khoi.map((k, i) => (k.loai === 'ul'
        ? <ul key={i}>{k.muc.map((m, j) => <li key={j}><DongChu text={m} /></li>)}</ul>
        : k.loai === 'h' ? <h4 key={i}><DongChu text={k.text} /></h4> : <p key={i}><DongChu text={k.text} /></p>))}
    </div>
  );
}

function NutChep({ text }) {
  const [daChep, setDaChep] = useState('');
  // Uu tien chep rieng "Mau tin nhan gui khach" de Sale dan thang vao Zalo.
  const mau = text.split(/mẫu tin nhắn gửi khách:?\**/i)[1]?.trim();
  const chep = (nd, loai) => navigator.clipboard?.writeText(nd.replace(/\*\*/g, '')).then(() => { setDaChep(loai); setTimeout(() => setDaChep(''), 1500); }).catch(() => {});
  return (
    <span className="chat-nut">
      {mau && <button type="button" className="link small" onClick={() => chep(mau, 'mau')}>{daChep === 'mau' ? 'Đã chép' : 'Chép tin nhắn gửi khách'}</button>}
      <button type="button" className="link small" onClick={() => chep(text, 'het')}>{daChep === 'het' ? 'Đã chép' : 'Chép cả câu trả lời'}</button>
    </span>
  );
}

// Lich su cuoc tro chuyen voi tro ly dang chon.
function LichSu({ sanPhamId, tenSp, hoiThoaiId, onChon, onDong }) {
  const [ds, setDs] = useState(null);
  const [loi, setLoi] = useState('');
  const tai = () => api.get('/tro-ly/hoi-thoai', { params: { san_pham: sanPhamId } }).then((r) => setDs(r.data)).catch((e) => setLoi(loiCua(e)));
  useEffect(() => { tai(); }, [sanPhamId]);
  const xoa = async (id) => {
    if (!window.confirm('Xoá cuộc trò chuyện này?')) return;
    try { await api.delete(`/tro-ly/hoi-thoai/${id}`); if (id === hoiThoaiId) onChon(null); tai(); } catch (e) { setLoi(loiCua(e)); }
  };
  return (
    <div className="chat-tin">
      <button type="button" className="link small" onClick={onDong}>← Quay lại cuộc trò chuyện</button>
      {loi && <div className="error">{loi}</div>}
      {ds && ds.length === 0 && <p className="muted small">Chưa có cuộc trò chuyện nào với trợ lý {tenSp}.</p>}
      <ul className="chat-ds-list">
        {(ds || []).map((h) => (
          <li key={h.id} className={h.id === hoiThoaiId ? 'on' : ''}>
            <button type="button" className="chat-ds-mo" onClick={() => onChon(h.id)}>
              <span className="chat-ds-tieu-de">{h.tieu_de}</span>
              <span className="muted small">{h.khach_hang ? `${h.khach_hang} · ` : ''}{ngayGio(h.cap_nhat_luc)}</span>
            </button>
            <button type="button" className="link small danger" aria-label={`Xoá "${h.tieu_de}"`} onClick={() => xoa(h.id)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Khung chat tro ly san pham: nut tron goc phai duoi, mo duoc o moi man hinh (gan trong Layout).
// Moi san pham (Cửa / Sàn / Tấm ốp) la mot tro ly rieng, chon bang cac nut tren dau khung.
export default function TroLyChat() {
  const { mo, sanPhamId: spLuu, hoiThoaiId, khachHangId, moTroLy, dong, chonSanPham, chonHoiThoai, moi, boKhach } = useTroLyStore();
  const [dsTroLy, setDsTroLy] = useState([]);
  const [tinNhan, setTinNhan] = useState([]);
  const [khach, setKhach] = useState(null);
  const [cauHoi, setCauHoi] = useState('');
  const [anh, setAnh] = useState([]);
  const [dangHoi, setDangHoi] = useState(false);
  const [xemLichSu, setXemLichSu] = useState(false);
  const [keoTha, setKeoTha] = useState(false);
  const [loi, setLoi] = useState('');
  const cuoi = useRef(null);
  const oNhap = useRef(null);
  const inputFile = useRef(null);

  const sanPhamId = dsTroLy.some((t) => t.id === spLuu) ? spLuu : dsTroLy[0]?.id ?? null;
  const troLy = dsTroLy.find((t) => t.id === sanPhamId);
  const chuaCoKienThuc = troLy && troLy.so_ky_tu === 0;

  // Chi tai danh sach tro ly khi mo lan dau (khong goi API o moi trang khi khung chat dang dong).
  useEffect(() => {
    if (!mo || dsTroLy.length) return;
    api.get('/tro-ly/san-pham').then((r) => setDsTroLy(r.data)).catch((e) => setLoi(loiCua(e)));
  }, [mo]);

  useEffect(() => {
    if (!khachHangId) { setKhach(null); return; }
    api.get(`/khach-hang/${khachHangId}`).then((r) => setKhach(r.data)).catch(() => setKhach(null));
  }, [khachHangId]);

  // Doi cuoc tro chuyen (hoac tai lai trang): nap tin nhan tu server. Bo qua khi vua tao moi (da co tin nhan tren man hinh).
  const vuaTao = useRef(null);
  useEffect(() => {
    if (!hoiThoaiId) { setTinNhan([]); return; }
    if (vuaTao.current === hoiThoaiId) { vuaTao.current = null; return; }
    api.get(`/tro-ly/hoi-thoai/${hoiThoaiId}`)
      .then((r) => setTinNhan(r.data.tin_nhan))
      .catch(() => { chonHoiThoai(null); setTinNhan([]); });
  }, [hoiThoaiId]);

  useEffect(() => { if (mo && !xemLichSu) cuoi.current?.scrollIntoView({ block: 'end' }); }, [tinNhan, dangHoi, mo, xemLichSu]);
  useEffect(() => { if (mo) setTimeout(() => oNhap.current?.focus(), 50); }, [mo, sanPhamId, hoiThoaiId]);

  // Esc dong khung chat.
  useEffect(() => {
    if (!mo) return;
    const esc = (e) => e.key === 'Escape' && !e.defaultPrevented && dong();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [mo]);

  const themAnh = async (files) => {
    const hinh = [...files].filter((f) => f.type.startsWith('image/'));
    if (!hinh.length) return;
    const conCho = ANH_TOI_DA - anh.length;
    if (conCho <= 0) return setLoi(`Tối đa ${ANH_TOI_DA} ảnh mỗi câu hỏi`);
    try {
      const them = await Promise.all(hinh.slice(0, conCho).map((f) => thuNhoAnh(f)));
      setAnh((cu) => [...cu, ...them]);
    } catch (e) { setLoi(e.message); }
  };

  const gui = async () => {
    const nd = cauHoi.trim();
    if ((!nd && !anh.length) || dangHoi || !sanPhamId) return;
    setLoi(''); setDangHoi(true);
    const anhGui = anh;
    setTinNhan((ds) => [...ds, { id: `tam-${Date.now()}`, vai_tro: 'user', noi_dung: nd, so_anh: anhGui.length, xemTruoc: anhGui.map((a) => a.xemTruoc) }]);
    setCauHoi(''); setAnh([]);
    try {
      const { data } = await api.post('/tro-ly/hoi', {
        san_pham_id: sanPhamId, hoi_thoai_id: hoiThoaiId || undefined, khach_hang_id: hoiThoaiId ? undefined : khachHangId || undefined,
        noi_dung: nd, anh: anhGui.map(({ mime, data: d }) => ({ mime, data: d })),
      });
      setTinNhan((ds) => [...ds, { id: `tl-${Date.now()}`, vai_tro: 'model', noi_dung: data.tra_loi }]);
      if (!hoiThoaiId) { vuaTao.current = data.hoi_thoai_id; chonHoiThoai(data.hoi_thoai_id); }
    } catch (e) {
      setLoi(loiCua(e));
      // Tra lai cau hoi + anh de gui lai, bo tin nhan tam.
      setTinNhan((ds) => ds.filter((m) => !String(m.id).startsWith('tam-')));
      setCauHoi(nd); setAnh(anhGui);
    } finally { setDangHoi(false); }
  };

  if (!mo) {
    return (
      <button type="button" className="chat-noi-nut" onClick={() => moTroLy()} aria-label="Mở trợ lý sản phẩm" title="Trợ lý sản phẩm (AI)">
        <Icon n="sparkles" size={22} /><span>Trợ lý</span>
      </button>
    );
  }

  return (
    <section className="chat-noi" role="dialog" aria-label="Trợ lý sản phẩm"
      onPaste={(e) => {
        const files = [...(e.clipboardData?.files || [])];
        if (files.some((f) => f.type.startsWith('image/'))) { e.preventDefault(); themAnh(files); }
      }}
      onDragOver={(e) => { e.preventDefault(); setKeoTha(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setKeoTha(false); }}
      onDrop={(e) => { e.preventDefault(); setKeoTha(false); themAnh(e.dataTransfer.files); }}>
      <header className="chat-noi-dau">
        <b><Icon n="sparkles" /> Trợ lý {troLy?.ten || 'sản phẩm'}</b>
        <span className="grow" />
        <button type="button" className="icon-btn" title="Cuộc trò chuyện trước" aria-label="Cuộc trò chuyện trước" onClick={() => setXemLichSu((x) => !x)}><Icon n="clipboard" size={16} /></button>
        <button type="button" className="icon-btn" title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới" onClick={() => { moi(); setXemLichSu(false); setLoi(''); }}><Icon n="plus" size={16} /></button>
        <button type="button" className="icon-btn" title="Thu nhỏ (Esc)" aria-label="Thu nhỏ trợ lý" onClick={dong}>×</button>
      </header>
      <div className="chat-noi-sp" role="tablist" aria-label="Chọn trợ lý theo sản phẩm">
        {dsTroLy.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === sanPhamId} className={t.id === sanPhamId ? 'chip on' : 'chip'}
            onClick={() => { if (t.id !== sanPhamId) { chonSanPham(t.id); setXemLichSu(false); setLoi(''); } }}>{t.ten}</button>
        ))}
      </div>

      {khach && !hoiThoaiId && (
        <div className="chat-noi-khach small">
          Đang tư vấn: <Link to={`/khach-hang/${khach.id}`}><b>{khach.ten}</b></Link>{khach.nhu_cau && <span className="muted"> — “{khach.nhu_cau}”</span>}
          <button type="button" className="link small" onClick={boKhach}>Bỏ gắn</button>
        </div>
      )}

      {xemLichSu ? (
        <LichSu sanPhamId={sanPhamId} tenSp={troLy?.ten} hoiThoaiId={hoiThoaiId}
          onChon={(id) => { chonHoiThoai(id); setXemLichSu(false); }} onDong={() => setXemLichSu(false)} />
      ) : (
        <div className={`chat-tin ${keoTha ? 'keo-tha' : ''}`}>
          {chuaCoKienThuc && <div className="banner">Trợ lý {troLy.ten} chưa được nạp kiến thức — nhờ Admin cập nhật ở mục “Kiến thức trợ lý AI”.</div>}
          {tinNhan.length === 0 && !dangHoi && troLy && !chuaCoKienThuc && (
            <div className="muted small chat-goi-y">
              <p>Hỏi về <b>{troLy.ten}</b>: mẫu nào hợp, giá tham khảo, cách tính khối lượng, bảo hành... hoặc gửi ảnh hiện trạng / mẫu khách thích (📷, Ctrl+V, kéo thả).</p>
              <p>Ví dụ: “Phòng 4x5m lát sàn chống nước hết khoảng bao nhiêu?”</p>
            </div>
          )}
          {tinNhan.map((m) => (
            <div key={m.id} className={`chat-tn ${m.vai_tro === 'user' ? 'toi' : 'ai'}`}>
              {m.vai_tro === 'user' ? (
                <>
                  {m.xemTruoc?.length > 0 && <div className="chat-anh">{m.xemTruoc.map((src, i) => <img key={i} src={src} alt={`Ảnh ${i + 1}`} />)}</div>}
                  {!m.xemTruoc && m.so_anh > 0 && <div className="muted small">[{m.so_anh} ảnh]</div>}
                  {m.noi_dung && !/^\[Gửi \d+ ảnh\]$/.test(m.noi_dung) && <div className="chat-chu">{m.noi_dung}</div>}
                </>
              ) : (
                <><VanBanAI text={m.noi_dung} /><NutChep text={m.noi_dung} /></>
              )}
            </div>
          ))}
          {dangHoi && <div className="chat-tn ai muted">Đang trả lời...</div>}
          <div ref={cuoi} />
        </div>
      )}

      {loi && <div className="error chat-noi-loi">{loi}</div>}
      {anh.length > 0 && (
        <div className="chat-noi-anh">
          {anh.map((a, i) => (
            <div key={i} className="thumb">
              <img src={a.xemTruoc} alt={`Ảnh ${i + 1}`} />
              <button type="button" aria-label={`Bỏ ảnh ${i + 1}`} onClick={() => setAnh(anh.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
        </div>
      )}
      <div className="chat-nhap">
        <button type="button" className="btn sec" title="Gửi ảnh (hoặc Ctrl+V / kéo thả)" aria-label="Gửi ảnh"
          disabled={anh.length >= ANH_TOI_DA || dangHoi || chuaCoKienThuc} onClick={() => inputFile.current.click()}>📷</button>
        <input ref={inputFile} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
          onChange={(e) => { themAnh(e.target.files); e.target.value = ''; }} />
        <textarea ref={oNhap} rows={2} value={cauHoi} disabled={chuaCoKienThuc || xemLichSu}
          placeholder={`Hỏi trợ lý ${troLy?.ten || ''}...`} aria-label="Câu hỏi"
          onChange={(e) => setCauHoi(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gui(); } }} />
        <button type="button" className="btn" disabled={dangHoi || chuaCoKienThuc || xemLichSu || (!cauHoi.trim() && !anh.length)} onClick={gui}>Gửi</button>
      </div>
      <p className="muted chat-noi-chu-thich">Enter gửi · Shift+Enter xuống dòng. AI có thể sai — kiểm tra giá, thông số trước khi báo khách.</p>
    </section>
  );
}
