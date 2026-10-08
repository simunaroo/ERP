import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { VAI_TRO, ngay } from '../utils.js';

// Mat khau tam hien 1 lan (server khong luu ban ro) -> Admin chep gui cho nguoi dung.
function HopMatKhau({ tk, onDong }) {
  const [daChep, setDaChep] = useState(false);
  return (
    <div className="banner mat-khau-tam">
      <span>Mật khẩu tạm của <b>{tk.username}</b>: <code>{tk.mat_khau_tam}</code> — chỉ hiện một lần, gửi cho người dùng và yêu cầu đổi sau khi đăng nhập.</span>
      <span className="hanh-dong">
        <button className="btn sec" onClick={async () => { try { await navigator.clipboard.writeText(tk.mat_khau_tam); setDaChep(true); } catch { /* trinh duyet chan */ } }}>{daChep ? 'Đã chép' : 'Chép'}</button>
        <button className="link" onClick={onDong}>Đóng</button>
      </span>
    </div>
  );
}

export function NguoiDung() {
  const toi = useAuthStore((s) => s.user);
  const [ds, setDs] = useState(null);
  const [f, setF] = useState({ ho_ten: '', username: '', vai_tro: 'sale' });
  const [mk, setMk] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const tai = useCallback(() => { api.get('/nguoi-dung').then((r) => setDs(r.data)).catch((e) => setLoi(loiCua(e))); }, []);
  useEffect(tai, [tai]);
  const lam = async (fn, tb) => {
    setLoi(''); setThongBao('');
    try { const r = await fn(); if (r.data.mat_khau_tam) setMk(r.data); setThongBao(tb); tai(); } catch (e) { setLoi(loiCua(e)); }
  };
  const them = (e) => { e.preventDefault(); lam(() => api.post('/nguoi-dung', f), `Đã tạo tài khoản ${f.username}`).then(() => setF({ ho_ten: '', username: '', vai_tro: 'sale' })); };

  return (
    <>
      <h1>Người dùng</h1>
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      {mk && <HopMatKhau tk={mk} onDong={() => setMk(null)} />}
      <form className="card toolbar" onSubmit={them}>
        <input aria-label="Họ tên" placeholder="Họ tên *" value={f.ho_ten} onChange={(e) => setF({ ...f, ho_ten: e.target.value })} required />
        <input aria-label="Tên đăng nhập" placeholder="Tên đăng nhập (vd: doanhc)" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} required pattern="[a-z0-9_.]{3,30}" title="3–30 ký tự: chữ thường không dấu, số, _ hoặc ." />
        <select aria-label="Vai trò" value={f.vai_tro} onChange={(e) => setF({ ...f, vai_tro: e.target.value })}>
          {Object.entries(VAI_TRO).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select>
        <button className="btn">+ Tạo tài khoản</button>
        <span className="muted small">Mật khẩu tạm do hệ thống sinh ngẫu nhiên.</span>
      </form>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Họ tên</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Trạng thái</th><th>Telegram</th><th>Đổi mật khẩu</th><th className="num">Khách / đơn</th><th /></tr></thead>
            <tbody>
              {(ds || []).map((u) => (
                <tr key={u.id} className={u.trang_thai !== 'active' ? 'dong-mo' : ''}>
                  <td>{u.ho_ten}{u.id === toi.id && <span className="muted small"> (bạn)</span>}</td>
                  <td><code>{u.username}</code></td>
                  <td>
                    <select aria-label={`Vai trò ${u.username}`} value={u.vai_tro} disabled={u.id === toi.id}
                      onChange={(e) => window.confirm(`Đổi vai trò ${u.ho_ten} thành ${VAI_TRO[e.target.value]}? Người này sẽ bị đăng xuất.`) && lam(() => api.put(`/nguoi-dung/${u.id}`, { vai_tro: e.target.value }), `Đã đổi vai trò ${u.username}`)}>
                      {Object.entries(VAI_TRO).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                    </select>
                  </td>
                  <td><span className={`pill ${u.trang_thai === 'active' ? 'p-done' : 'p-lost'}`}>{u.trang_thai === 'active' ? 'Hoạt động' : 'Đã khoá'}</span></td>
                  <td className="small nowrap">
                    {u.telegram_username ? <code>@{u.telegram_username}</code> : <span className="muted">chưa gắn</span>}{' '}
                    <button className="link small" onClick={() => {
                      const v = window.prompt(`Username Telegram của ${u.ho_ten} (để trống = bỏ gắn).\nKế toán gắn Telegram mới bấm "Đã chi" trong nhóm duyệt chi được.`, u.telegram_username || '');
                      if (v !== null) lam(() => api.put(`/nguoi-dung/${u.id}`, { telegram_username: v }), v.trim() ? `Đã gắn Telegram cho ${u.username}` : `Đã bỏ gắn Telegram của ${u.username}`);
                    }}>{u.telegram_username ? 'Sửa' : 'Gắn'}</button>
                  </td>
                  <td className="small">{u.doi_mat_khau_luc ? ngay(u.doi_mat_khau_luc) : <span className="muted">chưa đổi</span>}</td>
                  <td className="num small">{u.so_khach} / {u.so_don_sale}</td>
                  <td className="nowrap hanh-dong">
                    {u.id !== toi.id && (u.trang_thai === 'active'
                      ? <button className="link danger" onClick={() => window.confirm(`Khoá ${u.ho_ten}? Phiên đăng nhập hiện tại bị đăng xuất ngay.`) && lam(() => api.put(`/nguoi-dung/${u.id}`, { trang_thai: 'ngung_hoat_dong' }), `Đã khoá ${u.username}`)}>Khoá</button>
                      : <button className="link" onClick={() => lam(() => api.put(`/nguoi-dung/${u.id}`, { trang_thai: 'active' }), `Đã mở khoá ${u.username}`)}>Mở khoá</button>)}
                    <button className="link" onClick={() => window.confirm(`Đặt lại mật khẩu cho ${u.ho_ten}?`) && lam(() => api.put(`/nguoi-dung/${u.id}`, { dat_lai_mat_khau: true }), `Đã đặt lại mật khẩu ${u.username}`)}>Đặt lại mật khẩu</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small mt">Không xoá người dùng vì đơn hàng, duyệt chi... còn tham chiếu — chỉ khoá. Khoá, đổi vai trò hoặc đặt lại mật khẩu sẽ đăng xuất người đó ngay lập tức.</p>
      </div>
    </>
  );
}

export function DoiMatKhau() {
  const navigate = useNavigate();
  const dangNhapLai = useAuthStore((s) => s.login);
  const [f, setF] = useState({ mat_khau_cu: '', mat_khau_moi: '', nhap_lai: '' });
  const [loi, setLoi] = useState('');
  const [xong, setXong] = useState(false);
  const gui = async (e) => {
    e.preventDefault(); setLoi('');
    if (f.mat_khau_moi !== f.nhap_lai) return setLoi('Nhập lại mật khẩu mới chưa khớp');
    try {
      const { data } = await api.post('/auth/doi-mat-khau', { mat_khau_cu: f.mat_khau_cu, mat_khau_moi: f.mat_khau_moi });
      dangNhapLai(data.token, data.user); // token cu het hieu luc -> luu token moi
      setXong(true);
    } catch (err) { setLoi(loiCua(err)); }
  };
  return (
    <>
      <h1>Đổi mật khẩu</h1>
      <form className="card form-hep" onSubmit={gui}>
        {xong ? <div className="success">Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất. <button type="button" className="link" onClick={() => navigate('/')}>Về trang chủ</button></div> : (
          <>
            <div className="field"><label htmlFor="mk-cu">Mật khẩu hiện tại</label><input id="mk-cu" type="password" autoComplete="current-password" value={f.mat_khau_cu} onChange={(e) => setF({ ...f, mat_khau_cu: e.target.value })} required /></div>
            <div className="field"><label htmlFor="mk-moi">Mật khẩu mới</label><input id="mk-moi" type="password" autoComplete="new-password" minLength="8" value={f.mat_khau_moi} onChange={(e) => setF({ ...f, mat_khau_moi: e.target.value })} required />
              <span className="muted small">Tối thiểu 8 ký tự, có cả chữ và số.</span></div>
            <div className="field"><label htmlFor="mk-lai">Nhập lại mật khẩu mới</label><input id="mk-lai" type="password" autoComplete="new-password" value={f.nhap_lai} onChange={(e) => setF({ ...f, nhap_lai: e.target.value })} required /></div>
            {loi && <div className="error">{loi}</div>}
            <div className="actions"><button className="btn">Đổi mật khẩu</button></div>
          </>
        )}
      </form>
    </>
  );
}
