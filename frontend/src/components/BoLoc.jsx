import { useEffect, useRef, useState } from 'react';

/**
 * Nut "⛃ Loc (n)" mo bang loc nhieu dieu kien (giong ERP).
 * - truong: [{ k, nhan, kieu: 'chon' | 'ngay' | 'so', lua_chon?: [[gia_tri, nhan]] }]
 *   kieu 'ngay'/'so' la khoang: dung 2 khoa `${k}_tu` va `${k}_den`.
 * - giaTri: object { khoa: chuoi } dang ap dung; onApDung(objectMoi) khi bam "Ap dung".
 * Sua trong bang chi la ban nhap: chua goi API cho toi khi bam "Ap dung".
 */
export const khoaCua = (truong) => (truong.kieu === 'chon' ? [truong.k] : [`${truong.k}_tu`, `${truong.k}_den`]);

export function demBoLoc(truong, giaTri) {
  return truong.filter((t) => khoaCua(t).some((k) => giaTri[k])).length;
}

export default function BoLoc({ truong, giaTri, onApDung }) {
  const [mo, setMo] = useState(false);
  const [nhap, setNhap] = useState(giaTri);
  const hop = useRef(null);
  const soDangLoc = demBoLoc(truong, giaTri);

  useEffect(() => { if (mo) setNhap(giaTri); }, [mo]); // mo lai: lay gia tri dang ap dung

  useEffect(() => {
    if (!mo) return;
    const dong = (e) => { if (hop.current && !hop.current.contains(e.target)) setMo(false); };
    const esc = (e) => { if (e.key === 'Escape') setMo(false); };
    document.addEventListener('mousedown', dong);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', dong); document.removeEventListener('keydown', esc); };
  }, [mo]);

  const dat = (k) => (e) => setNhap((n) => ({ ...n, [k]: e.target.value }));
  const apDung = (moi) => { onApDung(moi); setMo(false); };
  const xoaHet = () => apDung(Object.fromEntries(truong.flatMap(khoaCua).map((k) => [k, ''])));

  return (
    <div className="bo-loc" ref={hop}>
      <button type="button" className={soDangLoc ? 'btn' : 'btn sec'} aria-expanded={mo} onClick={() => setMo(!mo)}>
        ⛃ Lọc{soDangLoc ? ` (${soDangLoc})` : ''}
      </button>
      {mo && (
        <form className="bo-loc-hop" onSubmit={(e) => { e.preventDefault(); apDung(nhap); }}>
          <div className="bo-loc-dau">
            <b>Bộ lọc</b>
            <button type="button" className="link" aria-label="Đóng" onClick={() => setMo(false)}>×</button>
          </div>
          {truong.map((t) => (
            <div key={t.k} className="field">
              <label htmlFor={`loc-${t.k}`}>{t.nhan}</label>
              {t.kieu === 'chon' ? (
                <select id={`loc-${t.k}`} value={nhap[t.k] || ''} onChange={dat(t.k)}>
                  <option value="">Tất cả</option>
                  {t.lua_chon.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                </select>
              ) : (
                <div className="khoang">
                  <input id={`loc-${t.k}`} aria-label={`${t.nhan} từ`} type={t.kieu === 'ngay' ? 'date' : 'number'} min="0"
                    placeholder="Từ" value={nhap[`${t.k}_tu`] || ''} onChange={dat(`${t.k}_tu`)} />
                  <span>–</span>
                  <input aria-label={`${t.nhan} đến`} type={t.kieu === 'ngay' ? 'date' : 'number'} min="0"
                    placeholder="Đến" value={nhap[`${t.k}_den`] || ''} onChange={dat(`${t.k}_den`)} />
                </div>
              )}
            </div>
          ))}
          <div className="bo-loc-chan">
            <button type="button" className="link danger" onClick={xoaHet}>Xoá lọc</button>
            <button className="btn">Áp dụng</button>
          </div>
        </form>
      )}
    </div>
  );
}
