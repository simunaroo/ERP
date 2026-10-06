import { useEffect, useRef } from 'react';
import { BUOC_DON, GIAI_DOAN, tinhTienDo } from '../utils.js';

// Thanh tien do kieu stepper: buoc xong (✓ xanh), buoc dang lam (so, xanh duong), buoc sau (xam), huy (✕ do).
export default function TienDo({ don }) {
  const td = tinhTienDo(don);
  const buoc = ['chot', ...BUOC_DON[don.hinh_thuc]];
  const khung = useRef(null);

  // Man hinh hep: thanh tien do cuon ngang -> tu cuon de buoc dang lam nam giua khung nhin.
  useEffect(() => {
    const el = khung.current;
    const hienTai = el?.children[Math.min(td.soXong, buoc.length - 1)];
    if (el && hienTai) el.scrollLeft = hienTai.offsetLeft - (el.clientWidth - hienTai.offsetWidth) / 2;
  }, [td.soXong, buoc.length]);

  return (
    <ol className="stepper" ref={khung} aria-label="Tiến độ đơn hàng">
      {buoc.map((b, i) => {
        const trangThai = i < td.soXong ? 'xong' : i === td.soXong && td.huy ? 'huy' : i === td.soXong ? 'dang' : 'cho';
        return (
          <li key={b} className={`step ${trangThai}`} aria-current={trangThai === 'dang' ? 'step' : undefined}>
            <span className="step-dot">{trangThai === 'xong' ? '✓' : trangThai === 'huy' ? '✕' : i + 1}</span>
            <span className="step-nhan">{trangThai === 'huy' ? `Huỷ (${GIAI_DOAN[b].nhan})` : GIAI_DOAN[b].nhan}</span>
          </li>
        );
      })}
    </ol>
  );
}
