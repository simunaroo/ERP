import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { VAI_TRO } from '../utils.js';

// Chi liet ke module da lam; them dong khi hoan thanh module moi.
const NAV_ITEMS = [
  { path: '/don-hang', label: 'Đơn hàng', icon: '📋', vaiTro: ['sale', 'van_hanh', 'ke_toan', 'admin'] },
];

function docTheme() {
  try { return localStorage.getItem('erp_theme') === 'dark'; } catch { return false; }
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [dark, setDark] = useState(docTheme);

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    try { localStorage.setItem('erp_theme', dark ? 'dark' : 'light'); } catch { /* bo qua khi trinh duyet chan storage */ }
  }, [dark]);

  useEffect(() => { document.body.classList.remove('sidebar-open'); }, [pathname]);

  useEffect(() => {
    const dongKhiBamNgoai = (e) => {
      if (document.body.classList.contains('sidebar-open') && !e.target.closest('.erp-sidebar, .erp-hamburger')) {
        document.body.classList.remove('sidebar-open');
      }
    };
    document.addEventListener('click', dongKhiBamNgoai);
    return () => document.removeEventListener('click', dongKhiBamNgoai);
  }, []);

  const menu = NAV_ITEMS.filter((n) => n.vaiTro.includes(user.vai_tro));
  const trangHienTai = menu.find((n) => pathname.startsWith(n.path))?.label ?? '';

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
          <span>{VAI_TRO[user.vai_tro]}</span>
        </div>
        <nav>
          {menu.map((n) => (
            <NavLink key={n.path} to={n.path}>
              <span aria-hidden="true">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={thoat}>Đăng xuất</button>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="icon-btn erp-hamburger" aria-label="Mở menu"
            onClick={() => document.body.classList.toggle('sidebar-open')}>☰</button>
          <span className="crumb">ERP NST &nbsp;/&nbsp; <b>{trangHienTai}</b></span>
          <button className="icon-btn ml-auto" onClick={() => setDark((d) => !d)}
            aria-label={dark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            title={dark ? 'Chế độ sáng' : 'Chế độ tối'}>
            {dark ? '☀️' : '🌙'}
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
