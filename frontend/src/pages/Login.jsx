import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, loiCua } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';

export default function Login() {
  const { token, login } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoi('');
    setDangGui(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setLoi(loiCua(err));
    } finally {
      setDangGui(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <h2>ERP NST</h2>
        <p className="sub">Đăng nhập để tiếp tục</p>
        <label htmlFor="u">Tài khoản</label>
        <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <label htmlFor="p">Mật khẩu</label>
        <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {loi && <div className="error">{loi}</div>}
        <button className="btn" disabled={dangGui}>{dangGui ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
        <p className="hint">Tài khoản demo: doanha / hanha / toana / ngocson — mật khẩu = tài khoản + 123456 (vd: doanha123456)</p>
      </form>
    </div>
  );
}
