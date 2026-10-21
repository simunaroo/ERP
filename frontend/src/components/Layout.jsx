import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { VAI_TRO } from '../utils.js';
import ThongBao from './ThongBao.jsx';
import { api } from '../api/client.js';
import Icon from './Icon.jsx';

// Chi liet ke module da lam; them dong khi hoan thanh module moi.
const NAV_ITEMS = [
  { path: '/', label: 'Tổng quan', icon: 'home', vaiTro: ['sale', 'van_hanh', 'ke_toan', 'admin'] },
  { path: '/khach-hang', label: 'Khách hàng', icon: 'contact', quyen: ['khach_hang.xem'], vaiTro: ['sale', 'admin'] },
  { path: '/nhap-so', label: 'Nhập số', icon: 'phone', quyen: ['nhap_so.nhap', 'nhap_so.quan_ly'], vaiTro: ['sale', 'admin'] },
  { path: '/don-hang/tao', label: 'Nhập đơn', icon: 'plus', quyen: ['don_hang.lap'], vaiTro: ['sale'] },
  { path: '/don-hang', label: 'Đơn hàng', icon: 'clipboard', vaiTro: ['sale', 'van_hanh', 'ke_toan', 'admin'] },
  { path: '/mua-hang', label: 'Mua hàng', icon: 'cart', quyen: ['mua_hang.xem'], vaiTro: ['van_hanh', 'ke_toan', 'admin'] },
  { path: '/thi-cong', label: 'Thi công', icon: 'wrench', quyen: ['thi_cong.xem'], vaiTro: ['van_hanh', 'ke_toan', 'admin'] },
  { path: '/cong-no', label: 'Chi & công nợ', icon: 'wallet', quyen: ['chi.xem', 'thu.xac_nhan'], vaiTro: ['ke_toan', 'admin'] },
  { path: '/bao-cao', label: 'Báo cáo lãi/lỗ', icon: 'chart', quyen: ['bao_cao.xem'], vaiTro: ['ke_toan', 'admin'] },
  { path: '/vat-tu', label: 'Danh mục vật tư', icon: 'package', quyen: ['mua_hang.xem', 'vat_tu.sua'], vaiTro: ['van_hanh', 'ke_toan', 'admin'] },
  { path: '/nha-cung-cap', label: 'Nhà cung cấp', icon: 'factory', quyen: ['ncc.xem'], vaiTro: ['ke_toan', 'van_hanh', 'admin'] },
  { path: '/nguoi-dung', label: 'Người dùng', icon: 'user', quyen: ['he_thong.quan_tri'], vaiTro: ['admin'] },
  { path: '/phan-quyen', label: 'Phân quyền', icon: 'lock', quyen: ['he_thong.quan_tri'], vaiTro: ['admin'] },
  { path: '/nhat-ky', label: 'Nhật ký thay đổi', icon: 'clipboard', quyen: ['he_thong.quan_tri'], vaiTro: ['admin'] },
];

function docTheme() {
  try { return localStorage.getItem('erp_theme') === 'dark'; } catch { return false; }
}

export default function Layout() {
  const { user, logout, capNhatUser } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [dark, setDark] = useState(docTheme);

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    try { localStorage.setItem('erp_theme', dark ? 'dark' : 'light'); } catch { /* bo qua khi trinh duyet chan storage */ }
  }, [dark]);

  useEffect(() => { document.body.classList.remove('sidebar-open'); }, [pathname]);

  // Lay lai thong tin + quyen moi nhat moi lan mo ung dung (Admin co the vua doi quyen).
  useEffect(() => { api.get('/auth/me').then((r) => capNhatUser(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    const dongKhiBamNgoai = (e) => {
      if (document.body.classList.contains('sidebar-open') && !e.target.closest('.erp-sidebar, .erp-hamburger')) {
        document.body.classList.remove('sidebar-open');
      }
    };
    document.addEventListener('click', dongKhiBamNgoai);
    return () => document.removeEventListener('click', dongKhiBamNgoai);
  }, []);

  // Menu theo quyen chuc nang (RBAC); phien dang nhap cu chua co danh sach quyen thi theo vai tro.
  const menu = NAV_ITEMS.filter((n) => (user.quyen && n.quyen ? n.quyen.some((q) => user.quyen.includes(q)) : n.vaiTro.includes(user.vai_tro)));
  // Muc dang mo = duong dan khop dai nhat (de "Nhập đơn" /don-hang/tao khong sang chung voi "Đơn hàng").
  const mucMo = menu.filter((n) => (n.path === '/' ? pathname === '/' : pathname === n.path || pathname.startsWith(`${n.path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];
  const trangHienTai = pathname === '/doi-mat-khau' ? 'Đổi mật khẩu' : mucMo?.label ?? '';

  const thoat = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="shell">
      <aside className="erp-sidebar">
        <div className="brand">ERP NST</div>
        <div className="user-card">
          <b>{user.ho_ten}</b>
          <span>{VAI_TRO[user.vai_tro]} · <NavLink to="/doi-mat-khau" className="doi-mk">Đổi mật khẩu</NavLink></span>
        </div>
        <nav>
          {menu.map((n) => (
            <NavLink key={n.path} to={n.path} className={() => (n === mucMo ? 'active' : '')}>
              <Icon n={n.icon} size={18} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={thoat}>Đăng xuất</button>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="icon-btn erp-hamburger" aria-label="Mở menu"
            onClick={() => document.body.classList.toggle('sidebar-open')}><Icon n="menu" size={20} /></button>
          <span className="crumb">ERP NST &nbsp;/&nbsp; <b>{trangHienTai}</b></span>
          <span className="ml-auto" />
          <ThongBao />
          <button className="icon-btn" onClick={() => setDark((d) => !d)}
            aria-label={dark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            title={dark ? 'Chế độ sáng' : 'Chế độ tối'}>
            <Icon n={dark ? 'sun' : 'moon'} size={18} />
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
