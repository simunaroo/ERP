import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { NHOM_KHACH, TRANG_THAI_CHAM_SOC, TRANG_THAI_DON, ngay, ngayGio } from '../utils.js';
import { ChuyenSale, KIEU_GIAO, NGUON_SO, useDsSale } from './NhapSo.jsx';
import Icon from '../components/Icon.jsx';
import CapNhatChamSoc from '../components/CapNhatChamSoc.jsx';

export default function KhachHangChiTiet() {
  const { id } = useParams();
  const vaiTro = useAuthStore((s) => s.user.vai_tro);
  const [kh, setKh] = useState(null);
  const [loi, setLoi] = useState('');
  const [daChep, setDaChep] = useState(false);
  const dsSale = useDsSale(vaiTro === 'admin');

  const tai = useCallback(() => {
    api.get(`/khach-hang/${id}`)
      .then((r) => setKh(r.data))
      .catch((e) => setLoi(loiCua(e)));
  }, [id]);
  useEffect(tai, [tai]);

  if (!kh) return loi ? <div className="error">{loi}</div> : <p className="muted">Đang tải...</p>;
  const tt = TRANG_THAI_CHAM_SOC[kh.trang_thai_cham_soc];

  return (
    <>
      <p><Link to="/khach-hang">← Danh sách khách hàng</Link></p>
      <h1>{kh.ten} <span className={`pill ${tt.lop}`}>{tt.nhan}</span></h1>
      {kh.sdt && (
        <div className="sdt-noi-bat">
          <a className="sdt-so" href={`tel:${kh.sdt}`} title="Bấm để gọi"><Icon n="phone" size={22} /> {kh.sdt.replace(/(\d{4})(\d{3})(\d+)/, '$1 $2 $3')}</a>
          <a className="btn sec" href={`tel:${kh.sdt}`}><Icon n="phone" /> Gọi</a>
          <a className="btn sec" href={`https://zalo.me/${kh.sdt}`} target="_blank" rel="noreferrer">Zalo</a>
          <button type="button" className="btn sec" onClick={() => navigator.clipboard?.writeText(kh.sdt).then(() => { setDaChep(true); setTimeout(() => setDaChep(false), 1500); }).catch(() => {})}>
            <Icon n={daChep ? 'check' : 'copy'} /> {daChep ? 'Đã chép' : 'Chép số'}
          </button>
        </div>
      )}
      {loi && <div className="error">{loi}</div>}

      <div className="grid2">
        <div className="card">
          <h3>Thông tin</h3>
          <dl className="kv">
            <dt>Nhóm khách</dt><dd>{NHOM_KHACH[kh.nhom_khach_hang]}</dd>
            <dt>Địa chỉ</dt><dd>{kh.dia_chi || '—'}</dd>
            <dt>Sale phụ trách</dt><dd>{kh.sale}{vaiTro === 'admin' && <div className="mt"><ChuyenSale khachId={kh.id} saleHienTai={kh.sale} dsSale={dsSale} onXong={tai} /></div>}</dd>
            {kh.nguon && <><dt>Nguồn số</dt><dd>{NGUON_SO[kh.nguon] || kh.nguon}{kh.chia_luc && <span className="muted small"> · nhận {ngayGio(kh.chia_luc)}</span>}</dd></>}
            {kh.nhu_cau && <><dt>Nhu cầu</dt><dd>{kh.nhu_cau}</dd></>}
          </dl>
          {vaiTro === 'sale' && kh.trang_thai_cham_soc === 'chot' && (
            <div className="actions">
              <Link className="btn sec" to={`/don-hang/tao?khach_hang_id=${kh.id}&che_do=tay`}>Nhập đơn thủ công</Link>
              <Link className="btn" to={`/don-hang/tao?khach_hang_id=${kh.id}&che_do=ai`}><Icon n="sparkles" /> Lên đơn nhanh bằng AI</Link>
            </div>
          )}
        </div>
        <div className="card">
          <h3>Đơn hàng ({kh.don_hang.length})</h3>
          {kh.don_hang.length === 0 ? <p className="muted">Chưa có đơn hàng</p> : (
            <ul className="list">
              {kh.don_hang.map((d) => (
                <li key={d.id}>
                  <Link to={`/don-hang/${d.id}`}>{d.ma_don}</Link>
                  <span className={`pill ${TRANG_THAI_DON[d.trang_thai].lop}`}>{TRANG_THAI_DON[d.trang_thai].nhan}</span>
                  <span className="muted small">{ngay(d.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {vaiTro === 'sale' && <div className="card"><CapNhatChamSoc key={`${kh.id}-${kh.lich_su.length}`} kh={kh} onXong={tai} /></div>}

      <div className="card">
        <h3>Lịch sử chăm sóc</h3>
        {kh.lich_su.length === 0 ? <p className="muted">Chưa có lần chăm sóc nào</p> : (
          <ol className="timeline">
            {kh.lich_su.map((ls) => (
              <li key={ls.id}>
                <span className={`pill ${TRANG_THAI_CHAM_SOC[ls.trang_thai].lop}`}>{TRANG_THAI_CHAM_SOC[ls.trang_thai].nhan}</span>
                <span>{ls.noi_dung || <span className="muted">(không ghi chú)</span>}{ls.hen_goi_lai_luc && <span className="muted small"> · hẹn {ngayGio(ls.hen_goi_lai_luc)}</span>}</span>
                <span className="muted small">{ls.nguoi_cham_soc} · {ngayGio(ls.created_at)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {kh.giao_so?.length > 0 && (
        <div className="card">
          <h3>Lịch sử giao số</h3>
          <ol className="timeline">
            {kh.giao_so.map((g) => (
              <li key={g.id}>
                <span className="pill p-gray">{KIEU_GIAO[g.kieu]}</span>
                <span>{g.kieu === 'chuyen' ? <>{g.tu_sale} → <b>{g.sale}</b> — {g.ly_do}</> : <>Giao cho <b>{g.sale}</b>{g.kenh === 'api' && ' (API tự động)'}</>}</span>
                <span className="muted small">{g.nguoi || 'Hệ thống'} · {ngayGio(g.created_at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

    </>
  );
}
