import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useSearchParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import Icon from '../components/Icon.jsx';
import { TRANG_THAI_CHAM_SOC, ngayGio, tien } from '../utils.js';
import { NGUON_SO } from './NhapSo.jsx';

// Tab dung chung cho trang Khach hang: Danh sach | Bao cao cham soc (chi nguoi quan ly chia so).
export function TabKhachHang() {
  const quyen = useAuthStore((s) => s.user.quyen) || [];
  if (!quyen.includes('nhap_so.quan_ly')) return null;
  return (
    <div className="tabs" role="tablist">
      <NavLink end to="/khach-hang" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}><Icon n="contact" /> Danh sách khách</NavLink>
      <NavLink to="/khach-hang/bao-cao" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}><Icon n="chart" /> Báo cáo chăm sóc</NavLink>
    </div>
  );
}

const hom = (lui = 0) => new Date(Date.now() - lui * 86400e3).toLocaleDateString('sv-SE');
const MOC = { '7 ngày': () => [hom(6), hom()], '30 ngày': () => [hom(29), hom()], 'Tháng này': () => [`${hom().slice(0, 8)}01`, hom()] };
const LOAI = {
  qua_1_ngay: 'Số đã chia quá 1 ngày chưa gọi',
  quan_tam_3_ngay: 'Khách quan tâm quá 3 ngày chưa gọi lại',
  hen_qua_gio: 'Hẹn gọi lại đã quá giờ',
};
const DANH_GIA = { tot: ['Tốt', 'p-done'], kha: ['Khá', 'p-new'], can_cai_thien: ['Cần cải thiện', 'p-lost'] };
const pct = (v) => (v === null || v === undefined ? '—' : `${v}%`);

// Danh sach ton dong: tick nhieu khach -> chuyen sang Sale khac.
function TonDong({ loai, saleId, dsSale, onDoi }) {
  const [ds, setDs] = useState(null);
  const [chon, setChon] = useState(new Set());
  const [den, setDen] = useState('');
  const [lyDo, setLyDo] = useState('');
  const [tb, setTb] = useState('');
  const [loi, setLoi] = useState('');
  const tai = useCallback(() => {
    api.get('/cham-soc/ton-dong', { params: { loai, sale_id: saleId || undefined } }).then((r) => { setDs(r.data); setChon(new Set()); }).catch((e) => setLoi(loiCua(e)));
  }, [loai, saleId]);
  useEffect(tai, [tai]);
  const doiChon = (id) => setChon((c) => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const chuyen = async () => {
    setLoi(''); setTb('');
    try {
      const { data } = await api.post('/cham-soc/chuyen-nhieu', { khach_ids: [...chon], sale_id: Number(den), ly_do: lyDo });
      setTb(`Đã chuyển ${data.thanh_cong} khách${data.loi.length ? `, ${data.loi.length} lỗi` : ''}.`); setLyDo(''); tai(); onDoi();
    } catch (e) { setLoi(loiCua(e)); }
  };
  if (!ds) return <p className="muted">Đang tải...</p>;
  return (
    <>
      {tb && <div className="success small">{tb}</div>}
      {loi && <div className="error small">{loi}</div>}
      {ds.length === 0 ? <p className="muted">Không có khách nào — tốt!</p> : (
        <>
          <div className="toolbar">
            <span className="small">Đã chọn <b>{chon.size}</b>/{ds.length}</span>
            <select value={den} onChange={(e) => setDen(e.target.value)} aria-label="Chuyển cho Sale">
              <option value="">— Chuyển cho Sale —</option>
              {dsSale.map((s) => <option key={s.sale_id} value={s.sale_id}>{s.ho_ten}</option>)}
            </select>
            <input className="grow" value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Lý do chuyển *" />
            <button className="btn" disabled={!chon.size || !den || !lyDo.trim()} onClick={chuyen}><Icon n="refresh" /> Chuyển {chon.size || ''} khách</button>
          </div>
          <div className="table-wrap"><table>
            <thead><tr>
              <th><input type="checkbox" aria-label="Chọn tất cả" checked={chon.size === ds.length} onChange={(e) => setChon(e.target.checked ? new Set(ds.map((k) => k.id)) : new Set())} /></th>
              <th>Khách</th><th>SĐT</th><th>Sale</th><th>Trạng thái</th><th>Nhận số</th><th>Liên hệ cuối</th><th className="num">Số lần</th>
            </tr></thead>
            <tbody>{ds.map((k) => (
              <tr key={k.id} className={chon.has(k.id) ? 'dong-dang-sua' : ''}>
                <td><input type="checkbox" checked={chon.has(k.id)} onChange={() => doiChon(k.id)} aria-label={`Chọn ${k.ten}`} /></td>
                <td><Link to={`/khach-hang/${k.id}`}>{k.ten}</Link>{k.nhu_cau && <div className="muted small">{k.nhu_cau}</div>}</td>
                <td className="nowrap">{k.sdt}</td>
                <td>{k.sale}</td>
                <td><span className={`pill ${TRANG_THAI_CHAM_SOC[k.trang_thai_cham_soc].lop}`}>{TRANG_THAI_CHAM_SOC[k.trang_thai_cham_soc].nhan}</span>
                  {k.hen_goi_lai_luc && <div className="small error-text">hẹn {ngayGio(k.hen_goi_lai_luc)}</div>}</td>
                <td className="nowrap small">{k.chia_luc ? ngayGio(k.chia_luc) : '—'}{k.nguon && <div className="muted">{NGUON_SO[k.nguon] || k.nguon}</div>}</td>
                <td className="nowrap small">{k.lan_cs_cuoi ? ngayGio(k.lan_cs_cuoi) : <span className="muted">Chưa gọi</span>}</td>
                <td className="num">{k.so_lan_cs}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </>
      )}
    </>
  );
}

const ngayVn = (d) => (d ? d.split('-').reverse().join('/') : '');

// Hien thi 1 ket qua AI (vua phan tich hoac ban luu trong nhat ky).
function KetQuaAi({ kq }) {
  return (
    <>
      <p>{kq.tom_tat}</p>
      {kq.sale.length > 0 && (
        <div className="table-wrap"><table>
          <thead><tr><th>Sale</th><th>Đánh giá</th><th>Nhận xét</th></tr></thead>
          <tbody>{kq.sale.map((x) => (
            <tr key={x.ten}><td className="nowrap">{x.ten}</td><td><span className={`pill ${DANH_GIA[x.danh_gia][1]}`}>{DANH_GIA[x.danh_gia][0]}</span></td><td>{x.nhan_xet}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      <div className="grid2 mt">
        {kq.canh_bao.length > 0 && <div><b>Cảnh báo</b><ul>{kq.canh_bao.map((c) => <li key={c}>{c}</li>)}</ul></div>}
        {kq.hanh_dong.length > 0 && <div><b>Nên làm</b><ul>{kq.hanh_dong.map((c) => <li key={c}>{c}</li>)}</ul></div>}
      </div>
      {(kq.kiem_chung.so_khong_co_trong_du_lieu.length > 0 || kq.kiem_chung.so_ten_sale_khong_co > 0) && (
        <div className="banner canh-bao-ai"><Icon n="alert" /> Hệ thống đã bỏ {kq.kiem_chung.so_ten_sale_khong_co} tên Sale không có trong dữ liệu
          {kq.kiem_chung.so_khong_co_trong_du_lieu.length > 0 && <>; các số sau không có trong số liệu gốc, hãy kiểm tra lại: <b>{kq.kiem_chung.so_khong_co_trong_du_lieu.join(', ')}</b></>}.</div>
      )}
    </>
  );
}

// Nhat ky cac lan AI phan tich: luu tren he thong, bam de xem lai nguyen ban.
function LichSuAi({ lanTai, dangXem, onXem }) {
  const [trang, setTrang] = useState(1);
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  useEffect(() => { api.get('/cham-soc/ai-lich-su', { params: { trang } }).then((r) => setKq(r.data)).catch((e) => setLoi(loiCua(e))); }, [trang, lanTai]);
  if (loi) return <div className="error">{loi}</div>;
  if (!kq || !kq.tong) return <p className="muted small mt">Chưa có lần phân tích nào được lưu.</p>;
  const soTrang = Math.ceil(kq.tong / kq.moi_trang);
  return (
    <div className="mt">
      <h3 style={{ margin: '0 0 8px' }}><Icon n="calendar" /> Lịch sử phân tích ({kq.tong})</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>Thời điểm</th><th>Kỳ số liệu</th><th>Người chạy</th><th>Đánh giá</th><th>Tóm tắt</th><th /></tr></thead>
        <tbody>{kq.ds.map((r) => (
          <tr key={r.id} className={dangXem === r.id ? 'dong-chon' : ''}>
            <td className="nowrap">{ngayGio(r.tao_luc)}</td>
            <td className="nowrap">{ngayVn(r.tu)} – {ngayVn(r.den)}</td>
            <td className="nowrap">{r.nguoi_tao || '—'}</td>
            <td className="nowrap small">
              {r.so_tot > 0 && <span className="pill p-done">{r.so_tot} tốt</span>} {r.so_kha > 0 && <span className="pill p-new">{r.so_kha} khá</span>} {r.so_can_cai_thien > 0 && <span className="pill p-lost">{r.so_can_cai_thien} cần cải thiện</span>}
            </td>
            <td className="small muted">{r.tom_tat}{r.tom_tat?.length >= 220 ? '…' : ''}</td>
            <td className="nowrap"><button className="btn sec" onClick={() => onXem(r.id)} disabled={dangXem === r.id}>{dangXem === r.id ? 'Đang xem' : 'Xem'}</button></td>
          </tr>
        ))}</tbody>
      </table></div>
      {soTrang > 1 && (
        <div className="toolbar mt">
          <button className="btn sec" disabled={trang <= 1} onClick={() => setTrang(trang - 1)}>Trước</button>
          <span className="small">Trang {trang}/{soTrang}</span>
          <button className="btn sec" disabled={trang >= soTrang} onClick={() => setTrang(trang + 1)}>Sau</button>
        </div>
      )}
    </div>
  );
}

function NhanXetAi({ tu, den }) {
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  const [dang, setDang] = useState(false);
  const [lanTai, setLanTai] = useState(0);
  const chay = async (lamMoi = false) => {
    setLoi(''); setDang(true);
    try { setKq((await api.post('/cham-soc/ai-nhan-xet', { tu, den, lam_moi: lamMoi })).data); setLanTai((x) => x + 1); } catch (e) { setLoi(loiCua(e)); } finally { setDang(false); }
  };
  const xem = async (id) => {
    setLoi('');
    try { setKq((await api.get(`/cham-soc/ai-lich-su/${id}`)).data); document.getElementById('ai-nhan-xet')?.scrollIntoView({ behavior: 'smooth' }); } catch (e) { setLoi(loiCua(e)); }
  };
  const daLuu = kq?.ban_luu;
  return (
    <div className="card" id="ai-nhan-xet">
      <div className="toolbar">
        <h3 style={{ margin: 0 }}><Icon n="sparkles" /> AI nhận xét cách chăm sóc khách</h3>
        <span className="grow" />
        {daLuu && <button className="btn sec" onClick={() => setKq(null)}>Đóng bản lưu</button>}
        <button className="btn" disabled={dang} onClick={() => chay(Boolean(kq) && !daLuu)}>{dang ? 'AI đang phân tích...' : kq && !daLuu ? 'Phân tích lại' : 'Phân tích bằng AI'}</button>
      </div>
      <p className="muted small">Số liệu do hệ thống tính; AI chỉ diễn giải và gợi ý. Chỉ gửi số liệu tổng hợp theo Sale (không gửi tên, số điện thoại khách). Mỗi lần phân tích được lưu lại trong lịch sử bên dưới.</p>
      {loi && <div className="error">{loi}</div>}
      {kq && (
        <>
          {daLuu && <div className="banner" style={{ justifyContent: 'flex-start' }}><Icon n="calendar" /> Bản lưu #{kq.id}: kỳ {ngayVn(kq.ky?.tu)} – {ngayVn(kq.ky?.den)}, phân tích lúc {ngayGio(kq.tao_luc)}{kq.nguoi_tao ? ` bởi ${kq.nguoi_tao}` : ''}. Số liệu hiện tại có thể đã khác.</div>}
          <KetQuaAi kq={kq} />
          {!daLuu && <p className="muted small">Phân tích lúc {ngayGio(kq.tao_luc)}{kq.tu_bo_nho_dem ? ' (kết quả vừa chạy gần đây, bấm Phân tích lại để chạy mới)' : ' — đã lưu vào lịch sử'}.</p>}
        </>
      )}
      <LichSuAi lanTai={lanTai} dangXem={daLuu ? kq.id : null} onXem={xem} />
    </div>
  );
}

export default function BaoCaoChamSoc() {
  const [params, setParams] = useSearchParams();
  const tu = params.get('tu') || hom(29);
  const den = params.get('den') || hom();
  const loai = params.get('loai') || 'qua_1_ngay';
  const saleLoc = params.get('sale_id') || '';
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  const [lanTai, setLanTai] = useState(0);
  const datLoc = (moi) => { const p = new URLSearchParams(params); Object.entries(moi).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k))); setParams(p); };
  useEffect(() => { api.get('/cham-soc/bao-cao', { params: { tu, den } }).then((r) => { setKq(r.data); setLoi(''); }).catch((e) => setLoi(loiCua(e))); }, [tu, den, lanTai]);
  const dsSale = (kq?.sale || []).map((s) => ({ sale_id: s.sale_id, ho_ten: s.sale }));
  const moDs = (l, sid = '') => { datLoc({ loai: l, sale_id: sid ? String(sid) : '' }); setTimeout(() => document.getElementById('ton-dong')?.scrollIntoView({ behavior: 'smooth' }), 50); };
  const t = kq?.tong;

  return (
    <>
      <h1>Khách hàng</h1>
      <TabKhachHang />
      {loi && <div className="error">{loi}</div>}
      <div className="card">
        <div className="toolbar">
          <span className="small">Số được chia từ</span>
          <input type="date" value={tu} max={den} onChange={(e) => datLoc({ tu: e.target.value })} aria-label="Từ ngày" />
          <span>→</span>
          <input type="date" value={den} min={tu} onChange={(e) => datLoc({ den: e.target.value })} aria-label="Đến ngày" />
          {Object.entries(MOC).map(([n, f]) => <button key={n} className="chip" onClick={() => { const [a, b] = f(); datLoc({ tu: a, den: b }); }}>{n}</button>)}
        </div>
        <p className="muted small">Chỉ số theo kỳ tính trên các số được giao trong kỳ (theo Sale đang giữ số). Tồn đọng là hiện tại, không phụ thuộc kỳ.</p>
      </div>

      {t && (
        <div className="kpi-row kpi-6">
          <div className="kpi"><span className="kpi-nhan">Số được chia</span><span className="kpi-so">{t.so_duoc_chia}</span></div>
          <div className="kpi"><span className="kpi-nhan">Đã gọi lần đầu</span><span className="kpi-so">{pct(t.ty_le_lien_he_pct)}</span><span className="muted small">{t.da_lien_he} số</span></div>
          <div className="kpi"><span className="kpi-nhan">Chốt đơn</span><span className="kpi-so">{pct(t.ty_le_chot_pct)}</span><span className="muted small">{t.chot} khách · {t.so_don} đơn</span></div>
          <button className="kpi kpi-link" onClick={() => moDs('qua_1_ngay')}><span className="kpi-nhan">Quá 1 ngày chưa gọi</span><span className={`kpi-so ${t.qua_1_ngay_chua_goi ? 'error-text' : ''}`}>{t.qua_1_ngay_chua_goi}</span></button>
          <button className="kpi kpi-link" onClick={() => moDs('quan_tam_3_ngay')}><span className="kpi-nhan">Quan tâm quá 3 ngày</span><span className={`kpi-so ${t.quan_tam_qua_3_ngay ? 'error-text' : ''}`}>{t.quan_tam_qua_3_ngay}</span></button>
          <button className="kpi kpi-link" onClick={() => moDs('hen_qua_gio')}><span className="kpi-nhan">Hẹn gọi lại quá giờ</span><span className={`kpi-so ${t.hen_qua_gio ? 'error-text' : ''}`}>{t.hen_qua_gio}</span></button>
        </div>
      )}

      {kq && (
        <div className="card">
          <h3>Theo Sale</h3>
          <div className="table-wrap"><table>
            <thead><tr>
              <th>Sale</th><th className="num">Được chia</th><th className="num">Đã gọi</th><th className="num">Gọi trong 2 giờ</th><th className="num">Phản hồi TB</th>
              <th className="num">Lần CS / khách</th><th className="num">Chưa liên lạc được</th><th className="num">Quan tâm</th><th className="num">Chốt</th>
              <th className="num">Không QT / Sai số</th><th className="num">Doanh thu</th><th className="num">Tồn: &gt;1 ngày</th><th className="num">QT &gt;3 ngày</th><th className="num">Lỡ hẹn</th>
            </tr></thead>
            <tbody>{kq.sale.map((s) => (
              <tr key={s.sale_id}>
                <td className="nowrap">{s.sale}</td>
                <td className="num">{s.so_duoc_chia}</td>
                <td className="num">{s.da_lien_he} <span className="muted small">({pct(s.ty_le_lien_he_pct)})</span></td>
                <td className="num">{pct(s.ty_le_lien_he_2_gio_pct)}</td>
                <td className="num">{s.phan_hoi_tb_gio === null ? '—' : `${s.phan_hoi_tb_gio} giờ`}</td>
                <td className="num">{s.so_lan_cs_tb ?? '—'}</td>
                <td className="num">{s.chua_lien_lac_duoc}</td>
                <td className="num">{s.dang_quan_tam}</td>
                <td className="num"><b>{s.chot}</b> <span className="muted small">({pct(s.ty_le_chot_pct)})</span></td>
                <td className="num">{s.khong_quan_tam} / {s.sai_so}</td>
                <td className="num nowrap">{s.doanh_thu ? tien(s.doanh_thu) : '—'}</td>
                {[['qua_1_ngay', s.qua_1_ngay_chua_goi], ['quan_tam_3_ngay', s.quan_tam_qua_3_ngay], ['hen_qua_gio', s.hen_qua_gio]].map(([l, v]) => (
                  <td key={l} className="num">{v ? <button className="link error-text" onClick={() => moDs(l, s.sale_id)}><b>{v}</b></button> : 0}</td>
                ))}
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      <div className="card" id="ton-dong">
        <h3>Khách cần xử lý</h3>
        <div className="chips">
          {Object.entries(LOAI).map(([l, n]) => <button key={l} className={loai === l ? 'chip on' : 'chip'} onClick={() => datLoc({ loai: l })}>{n}</button>)}
          <select value={saleLoc} onChange={(e) => datLoc({ sale_id: e.target.value })} aria-label="Lọc theo Sale">
            <option value="">Mọi Sale</option>{dsSale.map((s) => <option key={s.sale_id} value={s.sale_id}>{s.ho_ten}</option>)}
          </select>
        </div>
        <TonDong loai={loai} saleId={saleLoc} dsSale={dsSale} onDoi={() => setLanTai((n) => n + 1)} />
      </div>

      <NhanXetAi tu={tu} den={den} />
    </>
  );
}
