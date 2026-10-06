import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import DonHangList from './pages/DonHangList.jsx';
import DonHangTao from './pages/DonHangTao.jsx';
import DonHangChiTiet from './pages/DonHangChiTiet.jsx';
import KhachHangList from './pages/KhachHangList.jsx';
import KhachHangChiTiet from './pages/KhachHangChiTiet.jsx';

function CanDangNhap({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<CanDangNhap><Layout /></CanDangNhap>}>
        <Route path="/" element={<Navigate to="/don-hang" replace />} />
        <Route path="/don-hang" element={<DonHangList />} />
        <Route path="/don-hang/tao" element={<DonHangTao />} />
        <Route path="/don-hang/:id" element={<DonHangChiTiet />} />
        <Route path="/khach-hang" element={<KhachHangList />} />
        <Route path="/khach-hang/:id" element={<KhachHangChiTiet />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
