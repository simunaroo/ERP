import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { HINH_THUC, LOAI_THI_CONG, NGHIEM_THU, kichThuoc, ngay, tien } from '../utils.js';

// Trang CONG KHAI cho khach: khong dung Layout, khong can dang nhap.
// Goi fetch truc tiep (khong qua api client) de khong gui kem token noi bo neu may dang dang nhap.
export default function BaoGia() {
  const { token } = useParams();
  const [bg, setBg] = useState(null);
  const [loi, setLoi] = useState('');

  useEffect(() => {
    fetch(`/api/bao-gia/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.message || 'Không tải được báo giá');
        setBg(data);
        document.title = `Báo giá ${data.ma_don} — NST`;
      })
      .catch((e) => setLoi(e.message));
  }, [token]);

  if (loi) return <div className="bao-gia"><div className="error">{loi}</div></div>;
  if (!bg) return <div className="bao-gia"><p className="muted">Đang tải báo giá...</p></div>;

  const diaChi = [bg.dia_chi_cong_trinh, bg.phuong_xa, bg.tinh_thanh].filter(Boolean).join(', ');

  return (
    <div className="bao-gia">
      <header className="bg-head">
        <div>
          <div className="bg-logo">NST</div>
          <div className="muted small">Vật liệu hoàn thiện · Cửa · Sàn · Tấm ốp</div>
        </div>
        <div className="bg-title">
          <h1>BÁO GIÁ</h1>
          <div>Số: <b>{bg.ma_don}</b></div>
          <div className="muted small">Ngày lập: {ngay(bg.bao_gia_tao_luc)}</div>
        </div>
      </header>

      <dl className="kv bg-info">
        <dt>Kính gửi</dt><dd><b>{bg.khach_hang}</b></dd>
        <dt>Công trình</dt><dd>{diaChi || '—'}</dd>
        <dt>Hình thức</dt><dd>{HINH_THUC[bg.hinh_thuc]?.nhan}</dd>
        {bg.ngay_yc_lap_dat && <><dt>{bg.hinh_thuc === 'hoan_thien' ? 'Dự kiến lắp đặt' : 'Dự kiến giao hàng'}</dt><dd>{ngay(bg.ngay_yc_lap_dat)}</dd></>}
        <dt>Nhân viên phụ trách</dt><dd>{bg.sale}</dd>
      </dl>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Hạng mục</th><th className="num an-mobile">SL</th><th className="num an-mobile">Đơn giá</th><th className="num">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {bg.vat_tu.map((v, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>
                  {v.ten}
                  {/* Thi cong + kich thuoc la dong phu thay vi cot rieng: bang vua man hinh dien thoai */}
                  <div className="muted small">
                    {[v.quy_cach, LOAI_THI_CONG[v.loai_thi_cong], kichThuoc(v.dai_mm, v.rong_mm), v.ghi_chu].filter(Boolean).join(' · ')}
                  </div>
                  <div className="small chi-mobile">{Number(v.so_luong_can)} {v.don_vi_tinh} × {tien(v.don_gia)}</div>
                </td>
                <td className="num nowrap an-mobile">{Number(v.so_luong_can)} {v.don_vi_tinh}</td>
                <td className="num nowrap an-mobile">{tien(v.don_gia)}</td>
                <td className="num nowrap">{tien(v.thanh_tien)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="money bg-money">
        <dt>Tổng vật tư</dt><dd>{tien(bg.tong_vat_tu)}</dd>
        {Number(bg.tien_chiet_khau) > 0 && <><dt>Chiết khấu {Number(bg.chiet_khau_pct)}%</dt><dd>−{tien(bg.tien_chiet_khau)}</dd></>}
        {Number(bg.phi_van_chuyen) > 0 && <><dt>Phí vận chuyển</dt><dd>{tien(bg.phi_van_chuyen)}</dd></>}
        {Number(bg.phu_thu) > 0 && <><dt>Phụ thu</dt><dd>{tien(bg.phu_thu)}</dd></>}
        <dt className="total">Tổng cộng</dt><dd className="total">{tien(bg.tong_don)}</dd>
        {Number(bg.tien_coc) > 0 && <><dt>Đã đặt cọc</dt><dd>−{tien(bg.tien_coc)}</dd><dt>Còn lại</dt><dd>{tien(bg.con_phai_thu)}</dd></>}
      </dl>

      <section className="bg-terms">
        <p><b>Điều khoản thanh toán:</b> {bg.dieu_khoan_thanh_toan}</p>
        {bg.dieu_khoan_nghiem_thu && <p><b>Nghiệm thu:</b> {NGHIEM_THU[bg.dieu_khoan_nghiem_thu]}</p>}
        <p className="muted small">Báo giá phản ánh thông tin đơn hàng tại thời điểm xem. Mọi thay đổi vui lòng liên hệ nhân viên phụ trách.</p>
      </section>

      <div className="actions no-print">
        <button className="btn" onClick={() => window.print()}>🖨 In / Lưu PDF</button>
      </div>
    </div>
  );
}
