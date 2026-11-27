// Ve "Mo hinh co so du lieu" (muc 2.8.2.2): moi bang chi ghi khoa PK / UK / FK (kem "-> bang.id"), tieu de to mau theo
// phan he, duong noi thang (dung lai phan xep cho + di day cua ve_erd.cjs). Bang users khong ve hop: khoa ngoai toi users
// chi ghi trong dong FK de khong co ~10 duong cung do ve mot hop.
// Du lieu: erd_ve.json (cot, khoa ngoai) + khoa UNIQUE doc tu DB test. Chay: node ve_mo_hinh.cjs -> png/mo_hinh_csdl.png
const fs = require('fs');
const path = require('path');
const puppeteer = require('F:/DATN/_cong_cu_bao_cao/node_modules/puppeteer-core');

const OUT = path.join(__dirname, 'png');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'erd_ve.json'), 'utf8'));
const PHAN_HE = [
  { mau: '#DAE8FC', vien: '#6C8EBF', ds: ['khach_hang', 'khach_hang_cham_soc'] },
  { mau: '#FFE6CC', vien: '#D79B00', ds: ['don_hang', 'don_hang_vat_tu'] },
  { mau: '#D5E8D4', vien: '#82B366', ds: ['vat_tu', 'nha_cung_cap', 'ncc_bang_gia', 'mua_hang_dong', 'dat_hang_ncc'] },
  { mau: '#F8CECC', vien: '#B85450', ds: ['de_xuat_chi', 'thanh_toan_khach', 'giao_dich_ngan_hang'] },
  { mau: '#E1D5E7', vien: '#9673A6', ds: ['tro_ly_hoi_thoai', 'tro_ly_tin_nhan'] },
];

async function khoaDuyNhat() {
  const req = require('module').createRequire('F:/DATN/backend/package.json');
  req('dotenv').config({ path: 'F:/DATN/backend/.env', quiet: true });
  const pg = req('pg');
  const c = new pg.Client({ host: process.env.PG_HOST, port: +process.env.PG_PORT, user: process.env.PG_USER, password: process.env.PG_PASSWORD, database: 'datn_erp_test' });
  await c.connect();
  // UNIQUE 1 cot: rang buoc UNIQUE hoac chi muc duy nhat khong co dieu kien, khong phai bieu thuc
  const { rows } = await c.query(`
    SELECT t.relname AS bang, a.attname AS cot FROM pg_index i
      JOIN pg_class t ON t.oid = i.indrelid JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = 'public'
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = i.indkey[0]
     WHERE i.indisunique AND NOT i.indisprimary AND i.indnatts = 1 AND i.indkey[0] <> 0 AND i.indpred IS NULL`);
  await c.end();
  return new Set(rows.map((r) => `${r.bang}.${r.cot}`));
}

function chuanBi(uk) {
  const mauCua = {};
  PHAN_HE.forEach((p) => p.ds.forEach((b) => { mauCua[b] = p; }));
  const tap = new Set(Object.keys(mauCua));
  const fkCua = (b) => D.fk.filter((f) => f.bang === b);
  const hop = [...tap].map((k) => {
    const dong = [];
    for (const x of D.bang[k]) {
      const f = fkCua(k).find((q) => q.cot === x.c);
      if (x.pk) dong.push(['PK', x.c]);
      else if (f) dong.push(['FK', `${x.c} → ${f.den}.id`]);
      else if (uk.has(`${k}.${x.c}`)) dong.push(['UK', x.c]);
    }
    return { k, dong, mau: mauCua[k].mau, vien: mauCua[k].vien, thuoc: [] };
  });
  const cap = new Map();
  for (const f of D.fk) {
    if (!tap.has(f.bang) || !tap.has(f.den) || f.bang === f.den) continue;
    cap.set(`${f.den}>${f.bang}`, { a: f.den, b: f.bang, mauDay: mauCua[f.bang].vien });
  }
  return { hop, canh: [...cap.values()], soCot: 3 };
}

// Chay trong trinh duyet
function veSvg(s) {
  const VIEN = '#555', FONT = 'Arial', CO = 14, LH = 19, PX = 8, LAN = 9, TAG = 34;
  const ctx = document.createElement('canvas').getContext('2d');
  const rong = (t, dam) => { ctx.font = `${dam ? 'bold ' : ''}${CO}px ${FONT}`; return ctx.measureText(t).width; };
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const N = {};
  for (const h of s.hop) {
    const w = Math.max(150, rong(h.k, true) + 2 * PX, ...h.dong.map(([, t]) => TAG + rong(t) + 2 * PX));
    const hTen = LH + 10, hThuoc = h.dong.length * LH + 8;
    N[h.k] = { ...h, w, h: hTen + hThuoc, hTen, hThuoc };
  }
  const ks = Object.keys(N);
  const ke = Object.fromEntries(ks.map((k) => [k, []]));
  for (const e of s.canh) { ke[e.a].push(e.b); ke[e.b].push(e.a); }

  // ---------------- xep cho tren luoi ----------------
  const n = ks.length;
  const C = s.soCot || Math.min(5, Math.max(2, Math.ceil(Math.sqrt(n * 1.6))));
  const R = s.soHang || Math.ceil(n / C) + (n > 6 ? 1 : 0); // de thua o trong cho de xep va di day
  const o = {};
  const cho = new Map(); // "r,c" -> k
  const chi = (k1, k2, p1, p2) => {
    const dr = Math.abs(p1.r - p2.r), dc = Math.abs(p1.c - p2.c);
    if (dr === 0 && dc === 1) return 0.6;          // canh nhau cung hang: net ngang
    if (dc === 0 && dr === 1) return 0.8;          // tren duoi cung cot: net doc
    return 1.5 + dr * 2 + dc * 1.2 + (dr === 0 ? 2 : 0) + (dr > 1 ? 2 : 0);
  };
  const tong = () => s.canh.reduce((a, e) => a + chi(e.a, e.b, o[e.a], o[e.b]), 0)
    + ks.reduce((a, k) => a + (N[k].ngoai ? 0 : 0), 0);
  // tham lam: bac cao nhat vao giua; tiep theo: nut noi nhieu nhat voi phan da dat, vao o tot nhat
  const thuTu = [];
  const conLai = new Set(ks);
  const bac = (k) => ke[k].length;
  let dau = ks.reduce((m, k) => (bac(k) > bac(m) ? k : m), ks[0]);
  const oTrong = () => { const ds = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (!cho.has(`${r},${c}`)) ds.push({ r, c }); return ds; };
  const dat = (k, p) => { o[k] = p; cho.set(`${p.r},${p.c}`, k); conLai.delete(k); thuTu.push(k); };
  dat(dau, { r: Math.floor((R - 1) / 2), c: Math.floor((C - 1) / 2) });
  while (conLai.size) {
    const k = [...conLai].reduce((m, x) => {
      const dx = ke[x].filter((y) => o[y]).length, dm = ke[m].filter((y) => o[y]).length;
      return dx > dm || (dx === dm && bac(x) > bac(m)) ? x : m;
    }, [...conLai][0]);
    let tot = null, diemTot = Infinity;
    for (const p of oTrong()) {
      const lg = ke[k].filter((y) => o[y]);
      const d = lg.length ? lg.reduce((a, y) => a + chi(k, y, p, o[y]), 0) : Math.abs(p.r - (R - 1) / 2) + Math.abs(p.c - (C - 1) / 2);
      if (d < diemTot) { diemTot = d; tot = p; }
    }
    dat(k, tot);
  }
  // cai thien: doi cho / di chuyen vao o trong
  for (let vong = 0; vong < 6; vong++) {
    let doi = false;
    for (const k1 of ks) {
      for (const p of [...ks.map((k) => o[k]), ...oTrong()]) {
        const k2 = cho.get(`${p.r},${p.c}`);
        if (k2 === k1) continue;
        const p1 = o[k1];
        const truoc = tong();
        o[k1] = p; if (k2) o[k2] = p1;
        const sau = tong();
        if (sau < truoc - 1e-9) {
          cho.set(`${p.r},${p.c}`, k1);
          if (k2) cho.set(`${p1.r},${p1.c}`, k2); else cho.delete(`${p1.r},${p1.c}`);
          doi = true;
        } else { o[k1] = p1; if (k2) o[k2] = p; }
      }
    }
    if (!doi) break;
  }
  // bo hang / cot trong
  const hangDung = [...new Set(ks.map((k) => o[k].r))].sort((a, b) => a - b);
  const cotDung = [...new Set(ks.map((k) => o[k].c))].sort((a, b) => a - b);
  for (const k of ks) o[k] = { r: hangDung.indexOf(o[k].r), c: cotDung.indexOf(o[k].c) };
  const RR = hangDung.length, CC = cotDung.length;

  // ---------------- phan loai canh ----------------
  const daNgang = new Set();
  for (const e of s.canh) {
    const [P, Q] = o[e.a].r < o[e.b].r || (o[e.a].r === o[e.b].r && o[e.a].c < o[e.b].c) ? [e.a, e.b] : [e.b, e.a];
    Object.assign(e, { P, Q });
    const p = o[P], q = o[Q];
    // canh nhau cung hang: net ngang (quan he thu 2 giua cung cap bang thi di vong duoi de khong trung net)
    if (p.r === q.r && Math.abs(p.c - q.c) === 1 && !daNgang.has(`${P}|${Q}`)) { e.loai = 'ngang'; daNgang.add(`${P}|${Q}`); }
    else if (p.c === q.c && q.r === p.r + 1) e.loai = 'doc';
    else if (p.r === q.r) { e.loai = 'duoi'; e.kheH = [p.r + 1]; }               // cung hang: vong duoi
    else if (q.r === p.r + 1) { e.loai = 'ke'; e.kheH = [p.r + 1]; }             // hang ke: 1 kenh ngang
    else {                                                                       // xa: kenh ngang - kenh doc - kenh ngang
      e.loai = 'xa';
      e.kheH = [p.r + 1, q.r];
      e.kheV = q.c > p.c ? q.c : q.c < p.c ? q.c + 1 : (p.c + 1 <= CC - 1 ? p.c + 1 : p.c);
    }
  }

  // Hop rong ra theo so duong cam vao canh tren/duoi (moi duong >= KC_GAN px de du cho nhan boi so)
  const KC_GAN = 40;
  const soGan = Object.fromEntries(ks.map((k) => [k, { tren: 0, duoi: 0 }]));
  for (const e of s.canh) {
    if (e.loai === 'ngang') continue;
    soGan[e.P].duoi++;
    if (e.loai === 'duoi') soGan[e.Q].duoi++; else soGan[e.Q].tren++;
  }
  for (const k of ks) N[k].w = Math.max(N[k].w, (Math.max(soGan[k].tren, soGan[k].duoi) + 1) * KC_GAN);

  // ---------------- kich thuoc luoi (lan dem tho, roi tinh toa do) ----------------
  const colW = [...Array(CC)].map((_, c) => Math.max(...ks.filter((k) => o[k].c === c).map((k) => N[k].w)));
  const rowH = [...Array(RR)].map((_, r) => Math.max(...ks.filter((k) => o[k].r === r).map((k) => N[k].h)));
  const demH = Array(RR + 1).fill(0), demV = Array(CC + 1).fill(0);
  for (const e of s.canh) { for (const h of e.kheH || []) demH[h]++; if (e.kheV !== undefined) demV[e.kheV]++; }
  const caoKheH = (h) => (h === 0 || h === RR ? 16 : 40) + demH[h] * LAN;
  const rongKheV = (v) => (v === 0 || v === CC ? 16 : 70) + demV[v] * LAN;
  const colX = [], rowY = [];
  let x = 20 + rongKheV(0);
  for (let c = 0; c < CC; c++) { colX[c] = x; x += colW[c] + rongKheV(c + 1); }
  let y = 20 + caoKheH(0);
  for (let r = 0; r < RR; r++) { rowY[r] = y; y += rowH[r] + caoKheH(r + 1); }
  const W = x + 20, H = y + 20;
  for (const k of ks) { const b = N[k]; b.x = colX[o[k].c] + (colW[o[k].c] - b.w) / 2; b.y = rowY[o[k].r]; }
  const kheHy = (h) => (h === 0 ? rowY[0] - caoKheH(0) : rowY[h - 1] + rowH[h - 1]); // mep tren cua kenh ngang h
  const kheVx = (v) => (v === 0 ? colX[0] - rongKheV(0) : colX[v - 1] + colW[v - 1]);

  // ---------------- diem gan tren canh hop ----------------
  const gan = {}; // k -> {tren:[], duoi:[], trai:[], phai:[]}
  for (const k of ks) gan[k] = { tren: [], duoi: [], trai: [], phai: [] };
  const tam = (k) => ({ x: N[k].x + N[k].w / 2, y: N[k].y + N[k].h / 2 });
  for (const e of s.canh) {
    const P = N[e.P], Q = N[e.Q];
    if (e.loai === 'ngang') {
      e.gP = { canh: 'phai', toi: tam(e.Q) }; e.gQ = { canh: 'trai', toi: tam(e.P) };
      gan[e.P].phai.push(e.gP); gan[e.Q].trai.push(e.gQ);
    } else if (e.loai === 'duoi') {
      e.gP = { canh: 'duoi', toi: tam(e.Q) }; e.gQ = { canh: 'duoi', toi: tam(e.P) };
      gan[e.P].duoi.push(e.gP); gan[e.Q].duoi.push(e.gQ);
    } else {
      e.gP = { canh: 'duoi', toi: tam(e.Q) }; e.gQ = { canh: 'tren', toi: tam(e.P) };
      gan[e.P].duoi.push(e.gP); gan[e.Q].tren.push(e.gQ);
    }
  }
  for (const k of ks) {
    const b = N[k];
    for (const canh of ['tren', 'duoi']) {
      const ds = gan[k][canh].sort((p, q) => p.toi.x - q.toi.x);
      ds.forEach((g, i) => { g.x = b.x + (b.w * (i + 1)) / (ds.length + 1); g.y = canh === 'tren' ? b.y : b.y + b.h; });
    }
    for (const canh of ['trai', 'phai']) {
      const ds = gan[k][canh].sort((p, q) => p.toi.y - q.toi.y);
      const top = b.y + b.hTen, hh = Math.min(b.h - b.hTen, 160);
      ds.forEach((g, i) => { g.y = top + (hh * (i + 1)) / (ds.length + 1); g.x = canh === 'trai' ? b.x : b.x + b.w; });
    }
  }
  // Net doc: tren-duoi cung cot -> dung chung 1 x nam trong phan giao 2 hop
  for (const e of s.canh.filter((q) => q.loai === 'doc')) {
    const P = N[e.P], Q = N[e.Q];
    const lo = Math.max(P.x, Q.x) + 10, hi = Math.min(P.x + P.w, Q.x + Q.w) - 10;
    const xx = Math.min(hi, Math.max(lo, (e.gP.x + e.gQ.x) / 2));
    e.gP.x = xx; e.gQ.x = xx;
  }
  // Net ngang: canh nhau cung hang -> dung chung 1 y
  for (const e of s.canh.filter((q) => q.loai === 'ngang')) {
    const P = N[e.P], Q = N[e.Q];
    const lo = Math.max(P.y, Q.y) + Math.max(P.hTen, Q.hTen) + 6, hi = Math.min(P.y + P.h, Q.y + Q.h) - 6;
    const yy = Math.min(hi, Math.max(lo, (e.gP.y + e.gQ.y) / 2));
    e.gP.y = yy; e.gQ.y = yy;
  }

  // Dan cach: cac doan doc cung do vao 1 kenh ngang ma qua gan nhau (khac quan he) -> day ra xa, trong pham vi canh hop
  const KC = 18;
  for (let vong = 0; vong < 8; vong++) {
    let doi = false;
    for (let h = 0; h <= RR; h++) {
      const ds = [];
      for (const e of s.canh) {
        if (e.loai === 'ngang') continue;
        if (e.loai === 'doc') { if (o[e.P].r + 1 === h) ds.push({ g: e.gP, e, doc: true }); continue; }
        if (e.gP.canh === 'duoi' && o[e.P].r + 1 === h) ds.push({ g: e.gP, e });
        if (e.gQ.canh === 'duoi' && o[e.Q].r + 1 === h) ds.push({ g: e.gQ, e });
        if (e.gQ.canh === 'tren' && o[e.Q].r === h) ds.push({ g: e.gQ, e });
      }
      ds.sort((p, q) => p.g.x - q.g.x);
      for (let i = 1; i < ds.length; i++) {
        const a = ds[i - 1], b = ds[i];
        if (a.e === b.e || b.g.x - a.g.x >= KC) continue;
        const day = (d, dx) => {
          if (d.doc) return false;
          const k = d.g === d.e.gP ? d.e.P : d.e.Q, bx = N[k];
          const nx = d.g.x + dx;
          if (nx < bx.x + 8 || nx > bx.x + bx.w - 8) return false;
          d.g.x = nx; return true;
        };
        const can = KC - (b.g.x - a.g.x);
        if (day(b, can) || day(a, -can)) doi = true;
      }
    }
    if (!doi) break;
  }

  // ---------------- gan lan (to mau khoang) ----------------
  const lanH = {}, lanV = {};
  const toMau = (ds) => { // ds: {id, a, b}; tra ve chi so lan
    ds.sort((p, q) => (q.b - q.a) - (p.b - p.a));
    const lan = []; const kq = new Map();
    for (const d of ds) {
      let i = 0;
      while ((lan[i] || []).some((x) => !(d.b < x.a - 4 || d.a > x.b + 4))) i++;
      (lan[i] ||= []).push(d); kq.set(d.id, i);
    }
    return kq;
  };
  for (const e of s.canh) {
    if (e.loai === 'xa') e.xV = kheVx(e.kheV) + rongKheV(e.kheV) / 2; // tam tho, chinh lai sau
  }
  for (let h = 0; h <= RR; h++) {
    const ds = [];
    for (const e of s.canh) {
      (e.kheH || []).forEach((hh, j) => {
        if (hh !== h) return;
        let a, b;
        if (e.loai === 'xa') { const xg = j === 0 ? e.gP.x : e.gQ.x; a = Math.min(xg, e.xV); b = Math.max(xg, e.xV); }
        else { a = Math.min(e.gP.x, e.gQ.x); b = Math.max(e.gP.x, e.gQ.x); }
        ds.push({ id: `${e.P}>${e.Q}#${j}`, a, b, e, j });
      });
    }
    const kq = toMau(ds);
    for (const d of ds) {
      const i = kq.get(d.id);
      const top = kheHy(h);
      (d.e.yLan ||= [])[d.j] = top + (h === 0 ? 8 : 17) + i * LAN;
    }
  }
  for (let v = 0; v <= CC; v++) {
    const ds = s.canh.filter((e) => e.kheV === v).map((e) => ({ id: `${e.P}>${e.Q}`, a: Math.min(e.yLan[0], e.yLan[1]), b: Math.max(e.yLan[0], e.yLan[1]), e }));
    const kq = toMau(ds);
    for (const d of ds) d.e.xV = kheVx(v) + (v === 0 ? 8 : 23) + kq.get(d.id) * LAN;
  }

  // ---------------- ve ----------------
  let net = '', hinh = '', chu = '';
  const duong = (pts, mau) => { net += `<polyline points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${mau}" stroke-width="1.6"/>`; };
  // Dau bang cha: vach ngang ngan; dau bang con (giu khoa ngoai): cham tron
  const dauNoi = (g, mau, cha) => {
    if (!cha) { net += `<circle cx="${g.x}" cy="${g.y}" r="3.6" fill="${mau}"/>`; return; }
    if (g.canh === 'tren' || g.canh === 'duoi') {
      const y = g.y + (g.canh === 'tren' ? -3 : 3);
      net += `<line x1="${g.x - 6}" y1="${y}" x2="${g.x + 6}" y2="${y}" stroke="${mau}" stroke-width="2.4"/>`;
    } else {
      const x = g.x + (g.canh === 'trai' ? -3 : 3);
      net += `<line x1="${x}" y1="${g.y - 6}" x2="${x}" y2="${g.y + 6}" stroke="${mau}" stroke-width="2.4"/>`;
    }
  };
  for (const e of s.canh) {
    const p = e.gP, q = e.gQ;
    if (e.loai === 'ngang' || e.loai === 'doc') duong([[p.x, p.y], [q.x, q.y]], e.mauDay);
    else if (e.loai === 'duoi' || e.loai === 'ke') duong([[p.x, p.y], [p.x, e.yLan[0]], [q.x, e.yLan[0]], [q.x, q.y]], e.mauDay);
    else duong([[p.x, p.y], [p.x, e.yLan[0]], [e.xV, e.yLan[0]], [e.xV, e.yLan[1]], [q.x, e.yLan[1]], [q.x, q.y]], e.mauDay);
    dauNoi(p, e.mauDay, e.P === e.a);
    dauNoi(q, e.mauDay, e.Q === e.a);
  }
  for (const k of ks) {
    const b = N[k];
    const y1 = b.y + b.hTen;
    hinh += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="3" fill="#fff" stroke="${b.vien}" stroke-width="1.4"/>`
      + `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.hTen}" rx="3" fill="${b.mau}" stroke="${b.vien}" stroke-width="1.4"/>`;
    chu += `<text x="${b.x + b.w / 2}" y="${b.y + LH + 1}" text-anchor="middle" font-weight="bold">${esc(k)}</text>`;
    b.dong.forEach(([g, t], i) => {
      const yy = y1 + 4 + (i + 1) * LH - 4;
      if (i) hinh += `<line x1="${b.x + 1}" y1="${y1 + 4 + i * LH - 0.5}" x2="${b.x + b.w - 1}" y2="${y1 + 4 + i * LH - 0.5}" stroke="#E6E6E6"/>`;
      chu += `<text x="${b.x + PX}" y="${yy}" font-weight="bold" fill="#333">${g}</text><text x="${b.x + PX + TAG}" y="${yy}">${esc(t)}</text>`;
    });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}" font-size="${CO}">
    <rect width="100%" height="100%" fill="#fff"/>${net}${hinh}<g fill="#000">${chu}</g></svg>`;
}

(async () => {
  const s = chuanBi(await khoaDuyNhat());
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 3000, height: 2000, deviceScaleFactor: 2.5 });
  await page.setContent('<html><body style="margin:0"></body></html>');
  const svg = await page.evaluate(`(${veSvg.toString()})(${JSON.stringify(s)})`);
  await page.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
  const el = await page.$('svg');
  await el.screenshot({ path: path.join(OUT, 'mo_hinh_csdl.png') });
  console.log('ok mo_hinh_csdl', s.hop.length, 'bang', s.canh.length, 'quan he');
  await browser.close();
})();
