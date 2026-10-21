import { useEffect, useState } from 'react';
import { api, loiCua } from '../api/client.js';
import { VAI_TRO } from '../utils.js';

const COT = ['sale', 'van_hanh', 'ke_toan', 'admin'];

// Ma tran vai tro x quyen. Moi cot luu rieng; quyen quan tri he thong luon thuoc Admin (khoa).
export default function PhanQuyen() {
  const [mt, setMt] = useState(null);
  const [gan, setGan] = useState({});
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');

  const nap = (d) => { setMt(d); setGan(Object.fromEntries(COT.map((v) => [v, new Set(d.gan[v])]))); };
  useEffect(() => { api.get('/phan-quyen').then((r) => nap(r.data)).catch((e) => setLoi(loiCua(e))); }, []);
  if (!mt) return loi ? <div className="error">{loi}</div> : <p className="muted">Đang tải...</p>;

  const doi = (v, ma) => setGan((g) => { const s = new Set(g[v]); s.has(ma) ? s.delete(ma) : s.add(ma); return { ...g, [v]: s }; });
  const khacGoc = (v) => gan[v].size !== mt.gan[v].length || mt.gan[v].some((m) => !gan[v].has(m));
  const luu = async (v) => {
    setLoi(''); setThongBao('');
    try {
      const { data } = await api.put(`/phan-quyen/${v}`, { quyen: [...gan[v]] });
      nap(data); setThongBao(`Đã lưu quyền của ${VAI_TRO[v]} — có hiệu lực ngay, người dùng tải lại trang để cập nhật menu.`);
    } catch (e) { setLoi(loiCua(e)); }
  };
  const nhom = mt.quyen.reduce((m, q) => { (m[q.nhom] ||= []).push(q); return m; }, {});

  return (
    <>
      <h1>Phân quyền</h1>
      <p className="muted small">Tick chức năng mỗi vai trò được làm. Phạm vi dữ liệu không đổi: Sale vẫn chỉ thấy khách/đơn của mình, Vận hành chỉ thấy đơn mình phụ trách. Quyền quản trị hệ thống luôn thuộc Admin.</p>
      {loi && <div className="error">{loi}</div>}
      {thongBao && <div className="success">{thongBao}</div>}
      <div className="card">
        <div className="table-wrap"><table className="ma-tran">
          <thead><tr><th>Chức năng</th>{COT.map((v) => <th key={v} className="giua">{VAI_TRO[v]}</th>)}</tr></thead>
          <tbody>
            {Object.entries(nhom).map(([ten, ds]) => [
              <tr key={ten} className="nhom"><td colSpan={COT.length + 1}><b>{ten}</b></td></tr>,
              ...ds.map((q) => (
                <tr key={q.ma}>
                  <td>{q.ten} <span className="muted small">{q.ma}</span></td>
                  {COT.map((v) => {
                    const khoa = q.chi_admin;
                    return (
                      <td key={v} className="giua">
                        <input type="checkbox" aria-label={`${VAI_TRO[v]} — ${q.ten}`} disabled={khoa}
                          checked={khoa ? v === 'admin' : gan[v].has(q.ma)} onChange={() => doi(v, q.ma)} />
                      </td>
                    );
                  })}
                </tr>
              )),
            ])}
            <tr>
              <td />
              {COT.map((v) => (
                <td key={v} className="giua">
                  <button className="btn" disabled={!khacGoc(v)} onClick={() => luu(v)}>Lưu</button>
                </td>
              ))}
            </tr>
          </tbody>
        </table></div>
      </div>
    </>
  );
}
