// Ve bieu do lop phan tich (boundary / control / entity) kieu Rational Rose bang SVG tu xep cho:
// bo cuc NGANG cho do ton giay, moi net deu THANG (ngang / doc, re vuong goc), khong cat qua hop.
//   - Hang tren: boundary giao dien | control | boundary he thong ngoai, noi bang net ngang.
//   - Ben duoi: entity xep luoi (toi da 4 cot); control noi xuong entity bang duong cay vuong goc.
//   - Khoa ngoai giua entity: canh nhau cung hang -> net ngang thang; con lai di theo "lan" trong khe giua cac hang.
// Du lieu: lop_ve.json (sinh_rose.cjs sinh tu DB test). Chay: node ve_lop.cjs  -> png/cls_*.png
const fs = require('fs');
const path = require('path');
const puppeteer = require('F:/DATN/_cong_cu_bao_cao/node_modules/puppeteer-core');

const OUT = path.join(__dirname, 'png');
const DS = JSON.parse(fs.readFileSync(path.join(__dirname, 'lop_ve.json'), 'utf8'));

// Chay trong trinh duyet: do chu that, xep cho, tra ve chuoi SVG.
function veSvg(s) {
  const VIEN = '#990033', NEN = '#FFFFCC', FONT = 'Arial', CO = 12.5, LH = 16, PX = 8;
  const GAPX = 64, GAP_TREN = 90, LAN = 12;
  const ctx = document.createElement('canvas').getContext('2d');
  const rong = (t, nghieng) => { ctx.font = `${nghieng ? 'italic ' : ''}${CO}px ${FONT}`; return ctx.measureText(t).width; };
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---- kich thuoc hop
  const L = {};
  for (const c of s.lop) {
    const ster = `«${c.loai}»`;
    const w = Math.max(130, rong(ster, true), rong(c.ten), ...c.thuoc.map((t) => rong(t)), ...c.thao.map((t) => rong(t))) + 2 * PX;
    const hDau = 2 * LH + 10;
    const hThuoc = c.thuoc.length ? c.thuoc.length * LH + 8 : 8;
    const hThao = c.thao.length ? c.thao.length * LH + 8 : 8;
    L[c.k] = { ...c, ster, w, h: hDau + hThuoc + hThao, hDau, hThuoc, hThao };
  }
  const tren = s.lop.filter((c) => c.loai !== 'entity');
  const ents = s.lop.filter((c) => c.loai === 'entity').map((c) => c.k);
  const ctrl = tren.find((c) => c.loai === 'control').k;
  const bnd = tren.filter((c) => c.loai === 'boundary').map((c) => c.k);
  const fk = s.lien.filter(([a, b]) => ents.includes(a) && ents.includes(b));

  // ---- luoi entity: dua entity nhieu khoa ngoai len hang dau, giu cap co quan he canh nhau
  const bac = Object.fromEntries(ents.map((k) => [k, fk.filter(([a, b]) => a === k || b === k).length]));
  let thuTu = [...ents];
  if (fk.length) {
    // chuoi tham lam: bat dau tu entity bac cao nhat, moi buoc them entity co quan he nhieu nhat voi phan da xep
    thuTu = [ents.reduce((m, k) => (bac[k] > bac[m] ? k : m), ents[0])];
    while (thuTu.length < ents.length) {
      const con = ents.filter((k) => !thuTu.includes(k));
      const diem = (k) => fk.filter(([a, b]) => (a === k && thuTu.at(-1) === b) || (b === k && thuTu.at(-1) === a)).length * 10
        + fk.filter(([a, b]) => (a === k && thuTu.includes(b)) || (b === k && thuTu.includes(a))).length;
      thuTu.push(con.reduce((m, k) => (diem(k) > diem(m) ? k : m), con[0]));
    }
  }
  const n = thuTu.length;
  // <= 4 bang: 1 hang; 5 bang: 1 hang neu van vua be ngang trang (~1300 px), khong thi chia 2 hang
  const motHang = thuTu.reduce((a, k) => a + L[k].w, 0) + GAPX * (n - 1);
  const soCot = n <= 4 || (n === 5 && motHang <= 1300) ? n : Math.ceil(n / 2);
  const soHang = Math.ceil(n / soCot);
  const o = {}; // k -> { r, c }
  thuTu.forEach((k, i) => { o[k] = { r: Math.floor(i / soCot), c: i % soCot }; });
  const colW = [...Array(soCot)].map((_, c) => Math.max(...thuTu.filter((k) => o[k].c === c).map((k) => L[k].w)));
  const rowH = [...Array(soHang)].map((_, r) => Math.max(...thuTu.filter((k) => o[k].r === r).map((k) => L[k].h)));

  // ---- phan loai khoa ngoai: canh nhau cung hang (net ngang truc tiep) / di lan
  const truc = [], lan = [];
  for (const [a, b, ma, mb] of fk) {
    if (o[a].r === o[b].r && Math.abs(o[a].c - o[b].c) === 1) truc.push({ a, b, ma, mb });
    else lan.push({ a, b, ma, mb });
  }
  // khe ngang: khe r nam DUOI hang r. Lien hang tren-duoi: dung khe cua hang tren; cung hang: khe duoi hang do.
  for (const x of lan) {
    const [t, d] = o[x.a].r <= o[x.b].r ? [x.a, x.b] : [x.b, x.a];
    Object.assign(x, { tren: t, duoi: d, khe: o[t].r, cungHang: o[t].r === o[d].r });
  }
  // Hang tren - hang ngay duoi cung cot: noi bang 1 net doc thang (khong can lan)
  const doc = lan.filter((x) => !x.cungHang && o[x.duoi].r === o[x.tren].r + 1 && o[x.duoi].c === o[x.tren].c);
  for (const x of doc) lan.splice(lan.indexOf(x), 1);
  // Cung hang nhung khong phai hang cuoi: di vong PHIA TREN hang (giua bus va hop), nhuong khe duoi cho hang sau
  for (const x of lan) x.len = x.cungHang && o[x.tren].r < soHang - 1;
  const soLanKhe = [...Array(soHang)].map((_, r) => lan.filter((x) => !x.len && x.khe === r).length);
  const soLanTren = [...Array(soHang)].map((_, r) => lan.filter((x) => x.len && x.khe === r).length);
  const coBus = (r) => r + 1 < soHang; // khe r (giua hang r va r+1) co bus cua control cho hang r+1
  const caoKhe = (r) => 26 + (coBus(r) ? LAN + 4 : 0) + soLanKhe[r] * LAN + 14;

  // ---- toa do entity
  const gridW = colW.reduce((a, b) => a + b, 0) + GAPX * (soCot - 1);
  const topBox = tren.map((c) => L[c.k]);
  const trai = bnd.slice(0, 1), phai = bnd.slice(1); // boundary dau ben trai control, con lai ben phai
  const hangTren = [...trai, ctrl, ...phai].map((k) => L[k]);
  const topW = hangTren.reduce((a, b) => a + b.w, 0) + GAP_TREN * (hangTren.length - 1);
  const W = Math.max(gridW, topW) + 60 + (soHang > 1 ? 40 : 0); // chua le trai cho truc doc xuong hang 2
  const x0Grid = (W - gridW) / 2;
  const topH = Math.max(...topBox.map((b) => b.h));
  const yc = 20 + topH / 2;
  // control nam thang tren tam luoi; boundary hai ben
  const cx = W / 2;
  L[ctrl].x = cx - L[ctrl].w / 2;
  let xt = L[ctrl].x;
  for (const k of [...trai].reverse()) { xt -= GAP_TREN + L[k].w; L[k].x = xt; }
  xt = L[ctrl].x + L[ctrl].w;
  for (const k of phai) { L[k].x = xt + GAP_TREN; xt = L[k].x + L[k].w; }
  for (const b of hangTren) b.y = yc - b.h / 2;
  const minX = Math.min(...hangTren.map((b) => b.x));
  const dichX = minX < 20 ? 20 - minX : 0;
  if (dichX) for (const b of hangTren) b.x += dichX;
  const topBottom = Math.max(...hangTren.map((b) => b.y + b.h));

  const bus0 = topBottom + 24;
  const rowTop = [bus0 + 26 + soLanTren[0] * LAN];
  for (let r = 1; r < soHang; r++) rowTop[r] = rowTop[r - 1] + rowH[r - 1] + caoKhe(r - 1) + soLanTren[r] * LAN;
  const colX = [];
  let xx = x0Grid + dichX;
  for (let c = 0; c < soCot; c++) { colX[c] = xx; xx += colW[c] + GAPX; }
  for (const k of thuTu) {
    const b = L[k];
    b.x = colX[o[k].c] + (colW[o[k].c] - b.w) / 2;
    b.y = rowTop[o[k].r];
  }

  // ---- diem gan tren canh tren/duoi cua entity (chia deu, bus chiem o gan giua nhat o canh tren)
  const ganTren = Object.fromEntries(thuTu.map((k) => [k, [{ bus: true }]]));
  const ganDuoi = Object.fromEntries(thuTu.map((k) => [k, []]));
  for (const x of lan) {
    x.gA = { cung: x.tren, canh: x.len ? 'tren' : 'duoi' };
    (x.len ? ganTren : ganDuoi)[x.tren].push(x.gA);
    x.gB = { cung: x.duoi, canh: x.cungHang && !x.len ? 'duoi' : 'tren' };
    (x.gB.canh === 'duoi' ? ganDuoi : ganTren)[x.duoi].push(x.gB);
  }
  const chia = (k, ds, y) => {
    const b = L[k], m = ds.length;
    // sap theo huong toi diem kia de it cat nhau
    ds.forEach((g, i) => { g.x = b.x + (b.w * (i + 1)) / (m + 1); g.y = y; });
  };
  for (const k of thuTu) {
    const b = L[k];
    const dsT = ganTren[k];
    // dat bus vao o giua
    const fkT = dsT.filter((g) => !g.bus);
    const bus = dsT.find((g) => g.bus);
    const sx = (g) => { const x = lan.find((l) => l.gA === g || l.gB === g); const kia = x.gA === g ? x.duoi : x.tren; return L[kia].x + L[kia].w / 2; };
    fkT.sort((p, q) => sx(p) - sx(q));
    const giua = Math.floor(fkT.length / 2);
    const xep = [...fkT.slice(0, giua), bus, ...fkT.slice(giua)];
    chia(k, xep, b.y);
    const dsD = ganDuoi[k];
    dsD.sort((p, q) => sx(p) - sx(q));
    chia(k, dsD, b.y + b.h);
  }

  // ---- gan lan trong tung khe (to mau khoang: doan ngang khong chong nhau thi dung chung lan)
  for (let r = 0; r < soHang; r++) {
    for (const len of [false, true]) {
      const ds = lan.filter((x) => x.khe === r && !!x.len === len).map((x) => ({ x, a: Math.min(x.gA.x, x.gB.x) - 6, b: Math.max(x.gA.x, x.gB.x) + 6 }));
      ds.sort((p, q) => (q.b - q.a) - (p.b - p.a));
      const lanDung = [];
      for (const d of ds) {
        let i = 0;
        while ((lanDung[i] || []).some((e) => !(d.b < e.a || d.a > e.b))) i++;
        (lanDung[i] ||= []).push(d);
        d.x.yLan = len ? rowTop[r] - 14 - i * LAN : rowTop[r] + rowH[r] + 18 + (coBus(r) ? LAN + 4 : 0) + i * LAN;
      }
    }
  }

  let net = '', hinh = '', chu = '';
  const duong = (pts) => { net += `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${VIEN}" stroke-width="1.2"/>`; };
  const nhan = (x, y, t, anchor = 'start') => { chu += `<text x="${x}" y="${y}" font-size="11.5" text-anchor="${anchor}">${esc(t)}</text>`; };

  // hang tren: boundary - control ngang thang o yc
  for (const k of bnd) {
    const b = L[k], c = L[ctrl];
    const benTrai = b.x < c.x;
    const x1 = benTrai ? b.x + b.w : b.x, x2 = benTrai ? c.x : c.x + c.w;
    duong([[x1, yc], [x2, yc]]);
    nhan(benTrai ? x1 + 5 : x1 - 5, yc - 5, '1', benTrai ? 'start' : 'end');
    nhan(benTrai ? x2 - 5 : x2 + 5, yc - 5, '1', benTrai ? 'end' : 'start');
  }
  // control -> entity: duong cay
  const c = L[ctrl];
  const xTruc = c.x + c.w / 2;
  const busY = [bus0];
  for (let r = 1; r < soHang; r++) busY[r] = rowTop[r - 1] + rowH[r - 1] + 16;
  duong([[xTruc, c.y + c.h], [xTruc, bus0]]);
  nhan(xTruc + 5, c.y + c.h + 13, '1');
  // truc doc xuong cac hang sau: chay o MEP NGOAI ben trai luoi (khong cat cac net khoa ngoai giua cac cot)
  let xDoc = xTruc;
  if (soHang > 1) {
    xDoc = colX[0] - 30;
    duong([[xDoc, bus0], [xDoc, busY[soHang - 1]]]);
  }
  for (let r = 0; r < soHang; r++) {
    const hang = thuTu.filter((k) => o[k].r === r);
    const xs = hang.map((k) => ganTren[k].find((g) => g.bus).x);
    const goc = r === 0 ? (soHang > 1 ? [xTruc, xDoc] : [xTruc]) : [xDoc];
    duong([[Math.min(...goc, ...xs), busY[r]], [Math.max(...goc, ...xs), busY[r]]]);
    for (const k of hang) {
      const g = ganTren[k].find((q) => q.bus);
      duong([[g.x, busY[r]], [g.x, g.y]]);
      nhan(g.x + 5, g.y - 5, '*');
    }
  }
  // khoa ngoai canh nhau: net ngang thang giua 2 canh doi dien
  const demKhe = {};
  for (const x of truc) {
    const A = L[x.a], B = L[x.b];
    const [P, Q] = A.x < B.x ? [A, B] : [B, A];
    const khe = `${o[x.a].r}-${Math.min(o[x.a].c, o[x.b].c)}`;
    const i = (demKhe[khe] = (demKhe[khe] ?? -1) + 1);
    const y = P.y + Math.min(P.h, Q.h) / 2 + i * 24 - 12;
    duong([[P.x + P.w, y], [Q.x, y]]);
    const [mP, mQ] = P === A ? [x.ma, x.mb] : [x.mb, x.ma];
    nhan(P.x + P.w + 5, y - 5, mP);
    nhan(Q.x - 5, y - 5, mQ, 'end');
  }
  // khoa ngoai tren - duoi cung cot: 1 net doc thang, lech khoi tam (tam canh tren hop duoi la duong bus)
  for (const x of doc) {
    const T = L[x.tren], D = L[x.duoi];
    const trai = Math.max(T.x, D.x) + 16, phai = Math.min(T.x + T.w, D.x + D.w) - 16;
    const xx = Math.min(phai, Math.max(trai, D.x + D.w / 2 + 34));
    duong([[xx, T.y + T.h], [xx, D.y]]);
    const mTren = x.tren === x.a ? x.ma : x.mb, mDuoi = x.tren === x.a ? x.mb : x.ma;
    nhan(xx + 5, T.y + T.h + 13, mTren);
    nhan(xx + 5, D.y - 5, mDuoi);
  }
  // khoa ngoai di lan: tu diem gan A xuong lan, chay ngang, vao diem gan B
  for (const x of lan) {
    const a = x.gA, b = x.gB;
    duong([[a.x, a.y], [a.x, x.yLan], [b.x, x.yLan], [b.x, b.y]]);
    const mTren = x.tren === x.a ? x.ma : x.mb, mDuoi = x.tren === x.a ? x.mb : x.ma;
    nhan(a.x + 5, a.canh === 'duoi' ? a.y + 13 : a.y - 5, mTren);
    nhan(b.x + 5, b.canh === 'duoi' ? b.y + 13 : b.y - 5, mDuoi);
  }

  // ---- hop
  for (const b of Object.values(L)) {
    const { x, y, w } = b;
    hinh += `<rect x="${x}" y="${y}" width="${w}" height="${b.h}" fill="${NEN}" stroke="${VIEN}" stroke-width="1.2"/>`;
    const y1 = y + b.hDau, y2 = y1 + b.hThuoc;
    hinh += `<line x1="${x}" y1="${y1}" x2="${x + w}" y2="${y1}" stroke="${VIEN}" stroke-width="1.2"/>`
      + `<line x1="${x}" y1="${y2}" x2="${x + w}" y2="${y2}" stroke="${VIEN}" stroke-width="1.2"/>`;
    chu += `<text x="${x + w / 2}" y="${y + LH}" text-anchor="middle" font-style="italic">${esc(b.ster)}</text>`
      + `<text x="${x + w / 2}" y="${y + 2 * LH + 2}" text-anchor="middle">${esc(b.ten)}</text>`;
    b.thuoc.forEach((t, i) => { chu += `<text x="${x + PX}" y="${y1 + 4 + (i + 1) * LH - 3}">${esc(t)}</text>`; });
    b.thao.forEach((t, i) => { chu += `<text x="${x + PX}" y="${y2 + 4 + (i + 1) * LH - 3}">${esc(t)}</text>`; });
  }
  const H = Math.max(...Object.values(L).map((b) => b.y + b.h), ...lan.map((x) => x.yLan || 0)) + 30;
  const Wt = Math.max(...Object.values(L).map((b) => b.x + b.w)) + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Wt}" height="${H}" font-family="${FONT}" font-size="${CO}">
    <rect width="100%" height="100%" fill="#fff"/>${net}${hinh}<g fill="#000">${chu}</g></svg>`;
}

(async () => {
  const chi = process.argv.slice(2);
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 2400, height: 1600, deviceScaleFactor: 2.5 });
  for (const s of DS) {
    if (chi.length && !chi.includes(s.ten)) continue;
    await page.setContent('<html><body style="margin:0"></body></html>');
    const svg = await page.evaluate(`(${veSvg.toString()})(${JSON.stringify(s)})`);
    await page.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
    const el = await page.$('svg');
    await el.screenshot({ path: path.join(OUT, `${s.ten}.png`) });
    console.log('ok', s.ten);
  }
  await browser.close();
})();
