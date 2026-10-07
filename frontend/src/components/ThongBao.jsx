import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

const CHU_KY = 30000; // hoi so chua doc moi 30 giay (polling) — don gian, du cho vai chuc nguoi dung

function luc(t) {
  const giay = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
  if (giay < 60) return 'vừa xong';
  if (giay < 3600) return `${Math.floor(giay / 60)} phút trước`;
  if (giay < 86400) return `${Math.floor(giay / 3600)} giờ trước`;
  return new Date(t).toLocaleDateString('vi-VN');
}

// Nut chuong o thanh tren cung: so chua doc + danh sach 30 thong bao moi nhat; bam 1 dong -> danh dau da doc va mo trang xu ly.
export default function ThongBao() {
  const navigate = useNavigate();
  const [chuaDoc, setChuaDoc] = useState(0);
  const [mo, setMo] = useState(false);
  const [ds, setDs] = useState(null);
  const [chiChuaDoc, setChiChuaDoc] = useState(false);
  const hop = useRef(null);

  const dem = useCallback(() => {
    if (document.visibilityState !== 'visible') return; // tab an: khong hoi, do ton server
    api.get('/thong-bao/dem').then((r) => setChuaDoc(r.data.chua_doc)).catch(() => {});
  }, []);
  const taiDs = useCallback(() => {
    api.get('/thong-bao', { params: { chua_doc: chiChuaDoc ? '1' : undefined } })
      .then((r) => { setDs(r.data.items); setChuaDoc(r.data.chua_doc); }).catch(() => setDs([]));
  }, [chiChuaDoc]);

  useEffect(() => {
    dem();
    const t = setInterval(dem, CHU_KY);
    document.addEventListener('visibilitychange', dem); // quay lai tab -> cap nhat ngay
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', dem); };
  }, [dem]);
  useEffect(() => { if (mo) taiDs(); }, [mo, taiDs]);

  // Dong khi bam ra ngoai hoac nhan Esc.
  useEffect(() => {
    if (!mo) return undefined;
    const ngoai = (e) => { if (hop.current && !hop.current.contains(e.target)) setMo(false); };
    const esc = (e) => { if (e.key === 'Escape') setMo(false); };
    document.addEventListener('mousedown', ngoai);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', ngoai); document.removeEventListener('keydown', esc); };
  }, [mo]);

  const bam = async (tb) => {
    if (!tb.da_doc_luc) {
      api.post(`/thong-bao/${tb.id}/doc`).catch(() => {});
      setChuaDoc((n) => Math.max(0, n - 1));
    }
    setMo(false);
    if (tb.link) navigate(tb.link);
  };
  const docHet = async () => {
    await api.post('/thong-bao/doc-het').catch(() => {});
    taiDs();
  };

  return (
    <div className="thong-bao" ref={hop}>
      <button className="icon-btn chuong" onClick={() => setMo((m) => !m)} aria-expanded={mo} aria-haspopup="true"
        aria-label={chuaDoc ? `Thông báo, ${chuaDoc} chưa đọc` : 'Thông báo'} title="Thông báo">
        🔔{chuaDoc > 0 && <span className="so-chua-doc" aria-hidden="true">{chuaDoc > 99 ? '99+' : chuaDoc}</span>}
      </button>
      {mo && (
        <div className="hop-thong-bao" role="dialog" aria-label="Thông báo">
          <div className="hop-dau">
            <b>Thông báo</b>
            <label className="small"><input type="checkbox" checked={chiChuaDoc} onChange={(e) => setChiChuaDoc(e.target.checked)} /> Chỉ chưa đọc</label>
            {chuaDoc > 0 && <button className="link small" onClick={docHet}>Đánh dấu đã đọc hết</button>}
          </div>
          <ul>
            {ds === null && <li className="muted small trong">Đang tải...</li>}
            {ds?.length === 0 && <li className="muted small trong">{chiChuaDoc ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}</li>}
            {ds?.map((tb) => (
              <li key={tb.id}>
                <button className={tb.da_doc_luc ? 'tb-dong' : 'tb-dong chua-doc'} onClick={() => bam(tb)}>
                  <span className="tb-tieu-de">{tb.tieu_de}</span>
                  {tb.noi_dung && <span className="tb-noi-dung">{tb.noi_dung}</span>}
                  <span className="tb-luc">{tb.nguoi_gay ? `${tb.nguoi_gay} · ` : ''}{luc(tb.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
