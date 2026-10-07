import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import DonHangList from './pages/DonHangList.jsx';
import DonHangForm from './pages/DonHangForm.jsx';
import DonHangChiTiet from './pages/DonHangChiTiet.jsx';
import KhachHangList from './pages/KhachHangList.jsx';
import KhachHangChiTiet from './pages/KhachHangChiTiet.jsx';
import BaoGia from './pages/BaoGia.jsx';
import NhaCungCapList from './pages/NhaCungCapList.jsx';
import NhaCungCapChiTiet from './pages/NhaCungCapChiTiet.jsx';
import SoSanhGia from './pages/SoSanhGia.jsx';
import PhanTichNcc from './pages/PhanTichNcc.jsx';
import { MuaBoSungDs, MuaHangDanhSach, MuaHangDon } from './pages/MuaHang.jsx';
import { DoiTho, LichThiCong, NghiemThu, QuyetToan } from './pages/ThiCong.jsx';
import { CongNoNcc, CongNoTho, DeXuatChi } from './pages/CongNo.jsx';
import TongQuan from './pages/TongQuan.jsx';
import { DoiMatKhau, NguoiDung } from './pages/NguoiDung.jsx';
import DanhMucVatTu from './pages/DanhMucVatTu.jsx';

function CanDangNhap({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Cong khai: khach mo link bao gia khong can dang nhap */}
      <Route path="/bao-gia/:token" element={<BaoGia />} />
      <Route element={<CanDangNhap><Layout /></CanDangNhap>}>
        <Route path="/" element={<TongQuan />} />
        <Route path="/nguoi-dung" element={<NguoiDung />} />
        <Route path="/doi-mat-khau" element={<DoiMatKhau />} />
        <Route path="/vat-tu" element={<DanhMucVatTu />} />
        <Route path="/don-hang" element={<DonHangList />} />
        <Route path="/don-hang/tao" element={<DonHangForm />} />
        <Route path="/don-hang/:id/sua" element={<DonHangForm />} />
        <Route path="/don-hang/:id" element={<DonHangChiTiet />} />
        <Route path="/khach-hang" element={<KhachHangList />} />
        <Route path="/khach-hang/:id" element={<KhachHangChiTiet />} />
        <Route path="/nha-cung-cap" element={<NhaCungCapList />} />
        <Route path="/nha-cung-cap/so-sanh-gia" element={<SoSanhGia />} />
        <Route path="/nha-cung-cap/phan-tich" element={<PhanTichNcc />} />
        <Route path="/nha-cung-cap/:id" element={<NhaCungCapChiTiet />} />
        <Route path="/mua-hang" element={<MuaHangDanhSach />} />
        <Route path="/mua-hang/don/:id" element={<MuaHangDon />} />
        <Route path="/mua-hang/bo-sung" element={<MuaBoSungDs />} />
        <Route path="/thi-cong" element={<LichThiCong />} />
        <Route path="/thi-cong/nghiem-thu" element={<NghiemThu />} />
        <Route path="/thi-cong/nghiem-thu/:id" element={<NghiemThu />} />
        <Route path="/thi-cong/quyet-toan" element={<QuyetToan />} />
        <Route path="/thi-cong/quyet-toan/:id" element={<QuyetToan />} />
        <Route path="/thi-cong/doi-tho" element={<DoiTho />} />
        <Route path="/cong-no" element={<DeXuatChi />} />
        <Route path="/cong-no/ncc" element={<CongNoNcc />} />
        <Route path="/cong-no/tho" element={<CongNoTho />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
