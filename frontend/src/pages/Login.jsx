import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';

// Dang nhap 2 buoc: mat khau -> (Admin/Ke toan) xac thuc 2 lop: lan dau quet QR cai dat, cac lan sau nhap ma 6 so.
export default function Login() {
  const { token, login } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [buoc, setBuoc] = useState('mat_khau'); // mat_khau | cai_2fa | nhap_ma_2fa | ma_du_phong
  const [maTam, setMaTam] = useState('');
  const [caiDat, setCaiDat] = useState(null); // { qr, khoa, tai_khoan }
  const [ma, setMa] = useState('');
  const [maDuPhong, setMaDuPhong] = useState(null);
  const [phien, setPhien] = useState(null);
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);

  if (token && buoc !== 'ma_du_phong') return <Navigate to="/" replace />;

  const vao = (d) => { login(d.token, d.user); navigate('/'); };
  const chay = async (fn) => {
    setLoi(''); setDangGui(true);
    try { await fn(); } catch (err) { setLoi(loiCua(err)); } finally { setDangGui(false); }
  };

  const guiMatKhau = (e) => {
    e.preventDefault();
    chay(async () => {
      const { data } = await api.post('/auth/login', { username, password });
      if (data.token) return vao(data);
      setMa('');
      if (data.buoc === 'cai_2fa') {
        const k = await api.post('/auth/2fa/khoi-tao', { ma_tam: data.ma_tam });
        setCaiDat(k.data); setMaTam(k.data.ma_tam); setBuoc('cai_2fa');
      } else { setMaTam(data.ma_tam); setBuoc('nhap_ma_2fa'); }
    });
  };
  const guiMa = (e) => {
    e.preventDefault();
    chay(async () => {
      if (buoc === 'cai_2fa') {
        const { data } = await api.post('/auth/2fa/kich-hoat', { ma_tam: maTam, ma });
        setPhien(data); setMaDuPhong(data.ma_du_phong); setBuoc('ma_du_phong');
      } else {
        const { data } = await api.post('/auth/2fa/xac-minh', { ma_tam: maTam, ma });
        vao(data);
      }
    });
  };
  const veDau = () => { setBuoc('mat_khau'); setLoi(''); setMa(''); setPassword(''); };

  return (
    <div className="login-wrap">
      {buoc === 'mat_khau' && (
        <form className="login-box" onSubmit={guiMatKhau}>
          <h2>ERP NST</h2>
          <p className="sub">Đăng nhập để tiếp tục</p>
          <label htmlFor="u">Tài khoản</label>
          <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
          <label htmlFor="p">Mật khẩu</label>
          <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {loi && <div className="error">{loi}</div>}
          <button className="btn" disabled={dangGui}>{dangGui ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
          <p className="hint">Tài khoản demo: thilan / vannam / thihong / ngocson — mật khẩu = tài khoản + 123456 (vd: thilan123456)</p>
        </form>
      )}

      {(buoc === 'cai_2fa' || buoc === 'nhap_ma_2fa') && (
        <form className="login-box" onSubmit={guiMa}>
          <h2>Xác thực 2 lớp</h2>
          {buoc === 'cai_2fa' ? (
            <>
              <p className="sub">Tài khoản Admin / Kế toán bắt buộc bật xác thực 2 lớp. Cài một lần:</p>
              <ol className="buoc-2fa small">
                <li>Cài ứng dụng <b>Google Authenticator</b> hoặc <b>Microsoft Authenticator</b> trên điện thoại.</li>
                <li>Mở ứng dụng → thêm tài khoản → quét mã QR dưới đây.</li>
                <li>Nhập mã 6 số ứng dụng hiển thị.</li>
              </ol>
              <img className="qr-2fa" src={caiDat?.qr} alt="Mã QR cài đặt xác thực 2 lớp" />
              <p className="hint">Không quét được? Nhập khoá thủ công: <code className="khoa-2fa">{caiDat?.khoa}</code></p>
            </>
          ) : (
            <p className="sub">Mở ứng dụng Authenticator trên điện thoại, nhập mã 6 số của <b>ERP NST ({username})</b>. Mất điện thoại thì nhập một mã dự phòng.</p>
          )}
          <label htmlFor="ma">Mã xác thực</label>
          <input id="ma" value={ma} onChange={(e) => setMa(e.target.value)} autoFocus inputMode={buoc === 'cai_2fa' ? 'numeric' : 'text'}
            autoComplete="one-time-code" placeholder={buoc === 'cai_2fa' ? '6 số' : '6 số hoặc mã dự phòng'} maxLength={buoc === 'cai_2fa' ? 6 : 11} />
          {loi && <div className="error">{loi}</div>}
          <button className="btn" disabled={dangGui || ma.trim().length < 6}>{dangGui ? 'Đang kiểm tra...' : 'Xác nhận'}</button>
          <button type="button" className="link small" onClick={veDau}>← Đăng nhập tài khoản khác</button>
        </form>
      )}

      {buoc === 'ma_du_phong' && (
        <div className="login-box">
          <h2>Đã bật xác thực 2 lớp</h2>
          <p className="sub">Lưu 8 <b>mã dự phòng</b> dưới đây ở nơi an toàn (in ra / lưu vào trình quản lý mật khẩu). Mỗi mã dùng được <b>một lần</b> khi mất điện thoại. Mã chỉ hiện <b>một lần này</b>.</p>
          <div className="ma-du-phong">{maDuPhong.map((m) => <code key={m}>{m}</code>)}</div>
          <button type="button" className="btn sec" onClick={() => navigator.clipboard?.writeText(maDuPhong.join('\n')).catch(() => {})}>Chép tất cả</button>
          <button type="button" className="btn" onClick={() => vao(phien)}>Tôi đã lưu, vào hệ thống</button>
        </div>
      )}
    </div>
  );
}
