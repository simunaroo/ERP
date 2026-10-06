import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import TienDo from '../components/TienDo.jsx';
import { BUOC_DON, GIAI_DOAN, HUY_DUOC, tinhTienDo, vaiTroPhuTrach, HINH_THUC, LOAI_THI_CONG, NGHIEM_THU, NHOM_KHACH, TRANG_THAI_DON, kichThuoc, ngay, ngayGio, tien } from '../utils.js';

const BUOC_DON_CUA = (don) => BUOC_DON[don.hinh_thuc];
// Mot dong lich su la "lui" neu buoc dich dung truoc buoc nguon trong quy trinh.
const laLui = (don, l) => {
  const ds = BUOC_DON_CUA(don);
  return ds.indexOf(l.den_giai_doan) > -1 && ds.indexOf(l.den_giai_doan) < ds.indexOf(l.tu_giai_doan);
};

export default function DonHangChiTiet() {
  const { id } = useParams();
  const { vai_tro: vaiTro, id: toiId } = useAuthStore((s) => s.user);
  const [don, setDon] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [phuongAn, setPhuongAn] = useState({ phuong_an_van_chuyen: '', phuong_an_thi_cong: '' });
  const [noiDungSua, setNoiDungSua] = useState('');
  const [ghiChuBuoc, setGhiChuBuoc] = useState('');

  const tai = useCallback(() => {
    api.get(`/don-hang/${id}`)
      .then((r) => {
        setDon(r.data);
        setPhuongAn({
          phuong_an_van_chuyen: r.data.phuong_an_van_chuyen || '',
          phuong_an_thi_cong: r.data.phuong_an_thi_cong || '',
        });
      })
      .catch((e) => setLoi(loiCua(e)));
  }, [id]);

  useEffect(tai, [tai]);

  const chay = (fn, thanhCong) => async () => {
    setLoi(''); setThongBao('');
    try { await fn(); setThongBao(thanhCong); tai(); } catch (e) { setLoi(loiCua(e)); }
  };
  const luuPhuongAn = chay(() => api.patch(`/don-hang/${id}/phuong-an`, phuongAn), 'Đã lưu phương án');
  const xuLyYeuCau = (ycId) => chay(() => api.patch(`/don-hang/${id}/yeu-cau-sua/${ycId}/xu-ly`), 'Đã đánh dấu yêu cầu là đã xử lý')();
  const guiYeuCau = chay(async () => { await api.post(`/don-hang/${id}/yeu-cau-sua`, { noi_dung: noiDungSua }); setNoiDungSua(''); }, 'Đã gửi yêu cầu chỉnh sửa cho Vận hành');

  // Link bao gia: lan dau tao ma; "Tao link moi" sinh ma khac -> link cu het hieu luc (thu hoi).
  const linkBaoGia = don?.bao_gia_token ? `${window.location.origin}/bao-gia/${don.bao_gia_token}` : '';
  const taoBaoGia = (taoMoi) => chay(() => api.post(`/don-hang/${id}/bao-gia`, { tao_moi: taoMoi }),
    taoMoi ? 'Đã tạo link mới — link cũ không còn mở được' : 'Đã tạo link báo giá')();
  const chepLink = async () => {
    try { await navigator.clipboard.writeText(linkBaoGia); setThongBao('Đã chép link báo giá'); }
    catch { setLoi('Trình duyệt không cho chép tự động — hãy bôi đen link để chép'); }
  };

  const chuyenBuoc = (huong) => chay(async () => {
    await api.post(`/don-hang/${id}/giai-doan`, { huong, ghi_chu: ghiChuBuoc });
    setGhiChuBuoc('');
  }, huong === 'tiep' ? 'Đã chuyển sang bước tiếp theo' : 'Đã lùi về bước trước')();
  const huyDon = () => {
    if (!window.confirm('Huỷ đơn này? Thao tác không hoàn tác được.')) return;
    chay(async () => { await api.post(`/don-hang/${id}/huy`, { ly_do: ghiChuBuoc }); setGhiChuBuoc(''); }, 'Đã huỷ đơn')();
  };

  if (!don) return loi ? <div className="error">{loi}</div> : <p className="muted">Đang tải...</p>;
  const tt = TRANG_THAI_DON[don.trang_thai];
  const laNhap = don.trang_thai === 'nhap';
  const hoanThien = don.hinh_thuc === 'hoan_thien';
  const diaChi = [don.dia_chi_cong_trinh, don.phuong_xa, don.tinh_thanh].filter(Boolean).join(', ');
  const td = tinhTienDo(don);
  const dongDon = ['hoan_tat', 'huy'].includes(don.giai_doan);
  const duocChuyen = !laNhap && !dongDon && (vaiTro === 'admin' || vaiTro === vaiTroPhuTrach(don.giai_doan));
  const duocHuy = duocChuyen && HUY_DUOC.includes(don.giai_doan) && vaiTro !== 'ke_toan';
  const buocTruoc = td.soXong > 1 ? ['chot', ...BUOC_DON_CUA(don)][td.soXong - 1] : null;

  return (
    <>
      <p><Link to="/don-hang">← Danh sách đơn hàng</Link></p>
      <h1>
        Đơn hàng {don.ma_don} <span className={`pill ${tt.lop}`}>{tt.nhan}</span>
        <span className="pill p-gray">{HINH_THUC[don.hinh_thuc].nhan}</span>
      </h1>
      {laNhap && vaiTro === 'sale' && (
        <div className="banner">
          <span>Đơn đang ở dạng <b>nháp</b> — chỉ bạn nhìn thấy, Vận hành chưa nhận.</span>
          <Link className="btn" to={`/don-hang/${don.id}/sua`}>Tiếp tục sửa & chốt đơn</Link>
        </div>
      )}
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}

      {!laNhap && (
        <div className="card">
          <div className="tien-do-dau">
            <h3>Tiến độ đơn hàng</h3>
            <span>
              <span className={`pill ${td.huy ? 'p-lost' : don.giai_doan === 'hoan_tat' ? 'p-done' : 'p-wip'}`}>{td.nhan}</span>{' '}
              <span className="muted small">{td.soXong}/{td.tong} bước ({td.pct}%)</span>
            </span>
          </div>
          <TienDo don={don} />

          {duocChuyen && (
            <div className="tien-do-thao-tac">
              <input className="grow" value={ghiChuBuoc} onChange={(e) => setGhiChuBuoc(e.target.value)}
                placeholder="Ghi chú (bắt buộc khi lùi bước hoặc huỷ đơn)" aria-label="Ghi chú chuyển bước" />
              <button className="btn" onClick={() => chuyenBuoc('tiep')}>
                ✓ Xong «{GIAI_DOAN[don.giai_doan].nhan}» → {GIAI_DOAN[td.buocTiep].nhan}
              </button>
              {buocTruoc && <button className="btn sec" onClick={() => chuyenBuoc('lui')}>← Lùi về «{GIAI_DOAN[buocTruoc].nhan}»</button>}
              {duocHuy && <button className="link danger" onClick={huyDon}>Huỷ đơn</button>}
            </div>
          )}
          {!duocChuyen && !dongDon && (
            <p className="muted small mt">Bước «{GIAI_DOAN[don.giai_doan].nhan}» do {vaiTroPhuTrach(don.giai_doan) === 'ke_toan' ? 'Kế toán' : 'Vận hành'} xử lý.</p>
          )}

          <details className="mt">
            <summary className="small">Lịch sử tiến độ ({don.lich_su_giai_doan.length})</summary>
            <ol className="timeline mt">
              {don.lich_su_giai_doan.map((l) => (
                <li key={l.id} className={l.den_giai_doan === 'huy' ? 'lui' : l.tu_giai_doan && laLui(don, l) ? 'lui' : ''}>
                  <span className="small">
                    {l.tu_giai_doan ? <>{GIAI_DOAN[l.tu_giai_doan].nhan} → </> : null}<b>{GIAI_DOAN[l.den_giai_doan].nhan}</b>
                  </span>
                  <span className="muted small">— {l.nguoi}, {ngayGio(l.created_at)}</span>
                  {l.ghi_chu && <span className="small">“{l.ghi_chu}”</span>}
                </li>
              ))}
            </ol>
          </details>
        </div>
      )}

      <div className="grid2">
        <div className="card">
          <h3>Thông tin chung</h3>
          <dl className="kv">
            <dt>Khách hàng</dt><dd><Link to={`/khach-hang/${don.khach_hang_id}`}>{don.khach_hang}</Link> — {don.khach_hang_sdt || '—'} <span className="muted small">({NHOM_KHACH[don.nhom_khach_hang]})</span></dd>
            <dt>Công trình</dt><dd>{diaChi || '—'}</dd>
            {don.ma_hop_dong && <><dt>Mã hợp đồng</dt><dd>{don.ma_hop_dong}</dd></>}
            <dt>Ngày chốt</dt><dd>{don.ngay_chot ? ngay(don.ngay_chot) : 'Chưa chốt'}</dd>
            <dt>{hoanThien ? 'YC lắp đặt' : 'YC giao hàng'}</dt><dd>{don.ngay_yc_lap_dat ? ngay(don.ngay_yc_lap_dat) : '—'}</dd>
            <dt>Sale</dt><dd>{don.sale}</dd>
            <dt>Vận hành</dt><dd>{don.van_hanh || 'Chưa tiếp nhận'}</dd>
          </dl>
        </div>
        <div className="card">
          <h3>Thanh toán</h3>
          <dl className="money">
            <dt>Tổng vật tư</dt><dd>{tien(don.tong_vat_tu)}</dd>
            {Number(don.tien_chiet_khau) > 0 && <><dt>Chiết khấu {Number(don.chiet_khau_pct)}%</dt><dd>−{tien(don.tien_chiet_khau)}</dd></>}
            {Number(don.phi_van_chuyen) > 0 && <><dt>Phí vận chuyển</dt><dd>{tien(don.phi_van_chuyen)}</dd></>}
            {Number(don.phu_thu) > 0 && <><dt>Phụ thu</dt><dd>{tien(don.phu_thu)}</dd></>}
            <dt className="total">Tổng đơn</dt><dd className="total">{tien(don.tong_don)}</dd>
            {Number(don.tien_coc) > 0 && <><dt>Đã cọc{don.ngay_coc ? ` (${ngay(don.ngay_coc)})` : ''}</dt><dd>−{tien(don.tien_coc)}</dd></>}
            <dt>Còn phải thu</dt><dd>{tien(don.con_phai_thu)}</dd>
          </dl>
          <p className="small mt"><b>Điều khoản thanh toán:</b> {don.dieu_khoan_thanh_toan}</p>
          <p className="small"><b>Nghiệm thu:</b> {NGHIEM_THU[don.dieu_khoan_nghiem_thu] || <span className="muted">Chưa chọn</span>}</p>
        </div>
      </div>

      <div className="card">
        <h3>Vật tư</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Vật tư</th><th>Nguồn gốc</th><th className="num">SL</th><th className="num">Đơn giá</th><th className="num">Thành tiền</th><th>Thi công</th><th>Kích thước</th><th>Ghi chú</th></tr></thead>
            <tbody>
              {don.vat_tu.map((v) => (
                <tr key={v.id}>
                  <td>{v.ten}</td>
                  <td><span className={`pill ${v.nguon_goc === 'mua_ngoai' ? 'p-new' : 'p-gray'}`}>{v.nguon_goc === 'mua_ngoai' ? 'Mua ngoài' : 'Tự sản xuất'}</span></td>
                  <td className="num nowrap">{Number(v.so_luong_can)} {v.don_vi_tinh}</td>
                  <td className="num nowrap">{tien(v.don_gia)}</td>
                  <td className="num nowrap">{tien(v.thanh_tien)}</td>
                  <td>{LOAI_THI_CONG[v.loai_thi_cong] || <span className="muted">—</span>}</td>
                  <td className="nowrap">{kichThuoc(v.dai_mm, v.rong_mm) || <span className="muted">—</span>}</td>
                  <td>{v.ghi_chu || <span className="muted">—</span>}</td>
                </tr>
              ))}
              {don.vat_tu.length === 0 && <tr><td colSpan="8" className="muted center">Chưa có vật tư</td></tr>}
            </tbody>
          </table>
        </div>
        {don.ghi_chu_van_chuyen && <p className="small mt"><b>Ghi chú vận chuyển:</b> {don.ghi_chu_van_chuyen}</p>}
      </div>

      {vaiTro === 'sale' && don.sale_id === toiId && (
        <div className="card">
          <h3>📄 Báo giá gửi khách</h3>
          {linkBaoGia ? (
            <>
              <div className="toolbar">
                <input className="grow" readOnly value={linkBaoGia} onFocus={(e) => e.target.select()} aria-label="Link báo giá" />
                <button className="btn" onClick={chepLink}>Chép link</button>
                <a className="btn sec" href={linkBaoGia} target="_blank" rel="noreferrer">Xem</a>
              </div>
              <p className="muted small mt">
                Tạo lúc {ngayGio(don.bao_gia_tao_luc)}. Ai có link đều xem được báo giá (không cần đăng nhập) và luôn thấy số liệu mới nhất của đơn.{' '}
                <button className="link danger" onClick={() => taoBaoGia(true)}>Tạo link mới (thu hồi link cũ)</button>
              </p>
            </>
          ) : (
            <div className="toolbar">
              <span className="muted grow">Tạo link để gửi khách qua Zalo/Messenger — khách mở bằng điện thoại, không cần tài khoản.</span>
              <button className="btn" onClick={() => taoBaoGia(false)}>Tạo link báo giá</button>
            </div>
          )}
        </div>
      )}

      {!laNhap && (
        <>
          <div className="card">
            <h3>Phương án {hoanThien ? 'vận chuyển – thi công' : 'vận chuyển'}</h3>
            <div className={hoanThien ? 'grid2' : ''}>
              <div className="field">
                <label htmlFor="vc">Phương án vận chuyển</label>
                <textarea id="vc" rows="4" disabled={vaiTro !== 'van_hanh' || dongDon} value={phuongAn.phuong_an_van_chuyen}
                  onChange={(e) => setPhuongAn({ ...phuongAn, phuong_an_van_chuyen: e.target.value })} />
              </div>
              {hoanThien && (
                <div className="field">
                  <label htmlFor="tc">Phương án thi công</label>
                  <textarea id="tc" rows="4" disabled={vaiTro !== 'van_hanh' || dongDon} value={phuongAn.phuong_an_thi_cong}
                    onChange={(e) => setPhuongAn({ ...phuongAn, phuong_an_thi_cong: e.target.value })} />
                </div>
              )}
            </div>
            {vaiTro === 'van_hanh' && !dongDon && <div className="actions"><button className="btn" onClick={luuPhuongAn}>Lưu phương án</button></div>}
          </div>

          <div className="card">
            <h3>Yêu cầu chỉnh sửa</h3>
            {don.yeu_cau_sua.length === 0 && <p className="muted">Chưa có yêu cầu nào</p>}
            <ul className="list">
              {don.yeu_cau_sua.map((y) => (
                <li key={y.id}>
                  <span className={`pill ${y.trang_thai === 'da_xu_ly' ? 'p-done' : 'p-wip'}`}>{y.trang_thai === 'da_xu_ly' ? 'Đã xử lý' : 'Chờ xử lý'}</span>{' '}
                  {y.noi_dung} <span className="muted small">— {y.nguoi_gui}, {ngay(y.created_at)}</span>
                  {vaiTro === 'van_hanh' && y.trang_thai === 'cho_xu_ly' && (
                    <button className="link" onClick={() => xuLyYeuCau(y.id)}>Đánh dấu đã xử lý</button>
                  )}
                </li>
              ))}
            </ul>
            {vaiTro === 'sale' && don.giai_doan !== 'huy' && (
              <div className="toolbar mt">
                <input className="grow" placeholder="Nhập nội dung cần Vận hành chỉnh sửa..." value={noiDungSua} onChange={(e) => setNoiDungSua(e.target.value)} />
                <button className="btn" onClick={guiYeuCau}>Gửi yêu cầu</button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
