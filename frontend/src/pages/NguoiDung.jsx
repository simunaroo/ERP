import { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import { VAI_TRO, ngay, ngayGio } from '../utils.js';
import Icon from '../components/Icon.jsx';

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

function TabNguoiDung() {
  return (
    <div className="tabs" role="tablist">
      <NavLink end to="/nguoi-dung" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}><Icon n="user" /> Tài khoản</NavLink>
      <NavLink to="/nguoi-dung/xac-thuc" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}><Icon n="lock" /> Xác thực 2 lớp</NavLink>
    </div>
  );
}

const MO_TA_VAI_TRO = {
  admin: 'Quản trị toàn hệ thống, duyệt chi — nên luôn bật',
  ke_toan: 'Xác nhận thu tiền, chi tiền — nên bật',
  van_hanh: 'Điều phối đơn, mua hàng, thi công',
  sale: 'Chăm sóc khách, lên đơn',
};

// Admin bat/tat xac thuc 2 lop (ma 6 so tu ung dung Authenticator) cho tung vai tro.
export function XacThucHaiLop() {
  const toi = useAuthStore((s) => s.user);
  const [kq, setKq] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [dangLuu, setDangLuu] = useState('');

  useEffect(() => { api.get('/nguoi-dung/xac-thuc').then((r) => setKq(r.data)).catch((e) => setLoi(loiCua(e))); }, []);

  const doi = async (v) => {
    const bat = !v.bat_2fa;
    const ten = VAI_TRO[v.vai_tro];
    let dangXuatNgay = false;
    if (bat) {
      const chuaCai = v.so_tai_khoan - v.so_da_cai;
      if (!window.confirm(`Bật xác thực 2 lớp cho ${ten}? Từ lần đăng nhập tới, mọi tài khoản ${ten} phải nhập mã 6 số từ ứng dụng Authenticator${chuaCai ? ` (${chuaCai} tài khoản chưa cài sẽ được yêu cầu quét QR)` : ''}.`)) return;
      if (chuaCai > 0) dangXuatNgay = window.confirm(`Đăng xuất NGAY các tài khoản ${ten} chưa cài để họ phải cài khi đăng nhập lại?
(Bấm Huỷ = để họ dùng tiếp đến khi phiên hiện tại hết hạn.)`);
    } else {
      const canhBao = ['admin', 'ke_toan'].includes(v.vai_tro)
        ? `\n\nCẢNH BÁO: ${ten} có quyền ${v.vai_tro === 'admin' ? 'quản trị toàn hệ thống' : 'xác nhận thu/chi tiền'} — lộ mật khẩu là mất kiểm soát.` : '';
      if (!window.confirm(`Tắt xác thực 2 lớp cho ${ten}? Tài khoản ${ten} sẽ đăng nhập chỉ bằng mật khẩu. Khoá đã cài vẫn được giữ, bật lại không phải quét QR lại.${canhBao}`)) return;
    }
    setLoi(''); setThongBao(''); setDangLuu(v.vai_tro);
    try {
      const { data } = await api.put(`/nguoi-dung/xac-thuc/${v.vai_tro}`, { bat_2fa: bat, dang_xuat_ngay: dangXuatNgay });
      setKq(data);
      setThongBao(`Đã ${bat ? 'bật' : 'tắt'} xác thực 2 lớp cho ${ten}${data.so_dang_xuat ? ` — đã đăng xuất ${data.so_dang_xuat} tài khoản chưa cài` : ''}.`);
    } catch (e) { setLoi(loiCua(e)); }
    finally { setDangLuu(''); }
  };

  return (
    <>
      <h1>Người dùng</h1>
      <TabNguoiDung />
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      {kq?.tat_toan_he_thong && <div className="banner">Đang tắt xác thực 2 lớp toàn hệ thống bằng <code>BAT_BUOC_2FA=false</code> trong file <code>.env</code> — các công tắc dưới đây chưa có hiệu lực.</div>}
      <div className="card">
        <p className="muted">Bật cho vai trò nào thì mọi tài khoản vai trò đó phải nhập thêm <b>mã 6 số</b> từ ứng dụng Google Authenticator / Microsoft Authenticator khi đăng nhập; người chưa cài sẽ được yêu cầu quét mã QR ở lần đăng nhập tới. Tắt thì đăng nhập chỉ cần mật khẩu.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Vai trò</th><th>Xác thực 2 lớp</th><th className="num">Đã cài / tài khoản</th><th>Cập nhật</th></tr></thead>
            <tbody>
              {(kq?.vai_tro || []).map((v) => (
                <tr key={v.vai_tro}>
                  <td><b>{VAI_TRO[v.vai_tro]}</b>{v.vai_tro === toi.vai_tro && <span className="muted small"> (vai trò của bạn)</span>}<div className="muted small">{MO_TA_VAI_TRO[v.vai_tro]}</div></td>
                  <td>
                    <label className="cong-tac">
                      <input type="checkbox" role="switch" checked={v.bat_2fa} disabled={dangLuu === v.vai_tro} onChange={() => doi(v)}
                        aria-label={`Xác thực 2 lớp cho ${VAI_TRO[v.vai_tro]}`} />
                      <span>{v.bat_2fa ? 'Đang bật' : 'Đang tắt'}</span>
                    </label>
                    {v.bat_2fa && v.so_da_cai < v.so_tai_khoan && <div className="small muted">{v.so_tai_khoan - v.so_da_cai} tài khoản sẽ cài ở lần đăng nhập tới</div>}
                  </td>
                  <td className="num">{v.so_da_cai} / {v.so_tai_khoan}</td>
                  <td className="small muted">{v.cap_nhat_luc ? <>{ngayGio(v.cap_nhat_luc)}{v.nguoi_cap_nhat && <> · {v.nguoi_cap_nhat}</>}</> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small mt">Nhân viên mất điện thoại: vào tab “Tài khoản”, bấm “Đặt lại” ở cột Xác thực 2 lớp. Mọi lần bật/tắt được ghi vào Nhật ký thay đổi.</p>
      </div>
    </>
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
      <TabNguoiDung />
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      {mk && <HopMatKhau tk={mk} onDong={() => setMk(null)} />}
      <form className="card toolbar" onSubmit={them}>
        <input aria-label="Họ tên" placeholder="Họ tên *" value={f.ho_ten} onChange={(e) => setF({ ...f, ho_ten: e.target.value })} required />
        <input aria-label="Tên đăng nhập" placeholder="Tên đăng nhập (vd: minhtuan)" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} required pattern="[a-z0-9_.]{3,30}" title="3–30 ký tự: chữ thường không dấu, số, _ hoặc ." />
        <select aria-label="Vai trò" value={f.vai_tro} onChange={(e) => setF({ ...f, vai_tro: e.target.value })}>
          {Object.entries(VAI_TRO).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select>
        <button className="btn">+ Tạo tài khoản</button>
        <span className="muted small">Mật khẩu tạm do hệ thống sinh ngẫu nhiên.</span>
      </form>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Họ tên</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Trạng thái</th><th>Telegram</th><th>Xác thực 2 lớp</th><th>Đổi mật khẩu</th><th className="num">Khách / đơn</th><th /></tr></thead>
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
                  <td className="small">
                    {u.totp_bat_luc ? <><span className="pill p-done">Đã bật</span>{' '}
                      <button className="link small" onClick={() => {
                        if (window.confirm(`Đặt lại xác thực 2 lớp của ${u.ho_ten}? (dùng khi nhân viên mất điện thoại — lần đăng nhập sau phải quét QR cài lại)`)) lam(() => api.post(`/nguoi-dung/${u.id}/dat-lai-2fa`), `Đã đặt lại 2FA của ${u.username}`);
                      }}>Đặt lại</button></>
                      : u.vai_tro_bat_2fa ? <span className="muted">bắt buộc — cài ở lần đăng nhập tới</span> : <span className="muted">vai trò đang tắt</span>}
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
