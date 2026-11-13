// Ve bieu do use case kieu Rational Rose bang SVG tu xep cho (net thang, it cat nhau), chup PNG bang Chrome.
// Actor chinh ben trai, actor ngoai ben phai; use case chinh o cot 0, use case include/extend o cot 1 ngay canh.
// Chay: node ve_usecase.cjs   -> png/uc_*.png
const fs = require('fs');
const path = require('path');
const puppeteer = require('F:/DATN/_cong_cu_bao_cao/node_modules/puppeteer-core');

const OUT = path.join(__dirname, 'png');

// trai/phai: [ma, nhan, cot?]  cot -1 = cot xa hon ben trai (actor cha khi tong quat hoa)
// cot0: thu tu use case tu tren xuong; cot1: {ma: hang (co the le, vd 2.5)}
// lien: [actor, usecase]; quanHe: [tu, den, 'include'|'extend']; tongQuat: [con, cha]
const SO_DO = [
  {
    ten: 'uc_tongquan',
    trai: [['ND', 'Nguoi dung', -1], ['VH', 'Van hanh'], ['SALE', 'Sale'], ['KT', 'Ke toan'], ['AD', 'Admin']],
    phai: [['NCC', 'Nha cung cap'], ['KH', 'Khach hang'], ['AI', 'Gemini AI'], ['NH', 'Ngan hang'], ['DC', 'Nguoi duyet chi'], ['WEB', 'Website quang cao']],
    uc: {
      DN: 'Dang nhap', TB: 'Xem thong bao',
      TD: 'Cap nhat tien do don', MH: 'Dat hang nha cung cap', TC: 'Quan ly thi cong', NT: 'Nghiem thu va quyet toan',
      CS: 'Cham soc khach hang', TLAI: 'Hoi tro ly AI san pham', DH: 'Quan ly don hang', BG: 'Gui bao gia', THU: 'Quan ly thu tien',
      DX: 'Quan ly de xuat chi', NCCBG: 'Quan ly NCC va bang gia', DS: 'Doi soat ngan hang', BC: 'Bao cao va phan tich',
      BCCS: 'Bao cao cham soc khach hang', DUYET: 'Duyet de xuat chi', NS: 'Nhap va chia so', QT: 'Quan tri he thong',
    },
    cot0: ['DN', 'TB', 'TD', 'MH', 'TC', 'NT', 'CS', 'TLAI', 'BG', 'DH', 'THU', 'DX', 'NCCBG', 'DS', 'BC', 'BCCS', 'DUYET', 'NS', 'QT'],
    lien: [['ND', 'DN'], ['ND', 'TB'],
      ['VH', 'TD'], ['VH', 'MH'], ['VH', 'TC'], ['VH', 'NT'],
      ['SALE', 'CS'], ['SALE', 'TLAI'], ['SALE', 'DH'], ['SALE', 'BG'], ['SALE', 'THU'],
      ['KT', 'THU'], ['KT', 'DX'], ['KT', 'NCCBG'], ['KT', 'DS'], ['KT', 'BC'],
      ['AD', 'BC'], ['AD', 'BCCS'], ['AD', 'DUYET'], ['AD', 'NS'], ['AD', 'QT'],
      // Gemini AI: tra loi tro ly san pham cho Sale + nhan xet 2 bao cao.
      ['NCC', 'MH'], ['KH', 'BG'], ['AI', 'TLAI'], ['AI', 'BC'], ['AI', 'BCCS'], ['NH', 'DS'], ['DC', 'DUYET'], ['WEB', 'NS']],
    tongQuat: [['VH', 'ND'], ['SALE', 'ND'], ['KT', 'ND'], ['AD', 'ND']],
  },
  {
    ten: 'uc_sale',
    trai: [['SALE', 'Sale']],
    phai: [['AI', 'Gemini AI'], ['KH', 'Khach hang']],
    uc: {
      DN: 'Dang nhap', NS: 'Nhap so tu tim', TRUNG: 'Kiem tra trung so', CS: 'Cham soc khach hang', HEN: 'Hen goi lai',
      TLAI: 'Hoi tro ly AI san pham', ANH: 'Gui anh hien trang', TAO: 'Tao don hang', CHOT: 'Chot don hang', LINK: 'Gui link bao gia', XEM: 'Xem bao gia',
      TD: 'Theo doi tien do don', YC: 'Gui yeu cau chinh sua', THU: 'Ghi nhan khach thanh toan',
    },
    cot0: ['DN', 'NS', 'CS', 'TLAI', 'TAO', 'CHOT', 'LINK', 'TD', 'THU'],
    cot1: { TRUNG: 1, HEN: 2, ANH: 4, XEM: 6, YC: 7 },
    lien: [['SALE', 'DN'], ['SALE', 'NS'], ['SALE', 'CS'], ['SALE', 'TLAI'], ['SALE', 'TAO'], ['SALE', 'CHOT'], ['SALE', 'LINK'], ['SALE', 'TD'], ['SALE', 'THU'],
      ['AI', 'TLAI'], ['KH', 'XEM']],
    quanHe: [['NS', 'TRUNG', 'include'], ['HEN', 'CS', 'extend'], ['ANH', 'TLAI', 'extend'], ['XEM', 'LINK', 'extend'], ['YC', 'TD', 'extend']],
  },
  {
    ten: 'uc_vanhanh',
    trai: [['VH', 'Van hanh']],
    phai: [['NCC', 'Nha cung cap']],
    uc: {
      DN: 'Dang nhap', PA: 'Cap nhat phuong an', CB: 'Chuyen buoc tien do', HUY: 'Huy don', LD: 'Ghi ly do', KL: 'Tinh KLVT',
      CHON: 'Chon nha cung cap', DAT: 'Dat hang nha cung cap', PH: 'Phan hoi don dat hang', GH: 'Dang ky giao hang',
      GD: 'Quan ly giai doan thi cong', PS: 'Ghi phat sinh thi cong', NT: 'Nghiem thu', QT: 'Chot quyet toan',
      MBS: 'Lap phieu mua bo sung', XL: 'Xu ly yeu cau sua',
    },
    cot0: ['DN', 'PA', 'CB', 'HUY', 'KL', 'CHON', 'DAT', 'GH', 'GD', 'PS', 'NT', 'QT', 'MBS', 'XL'],
    cot1: { LD: 2.5, PH: 6 },
    lien: [['VH', 'DN'], ['VH', 'PA'], ['VH', 'CB'], ['VH', 'HUY'], ['VH', 'KL'], ['VH', 'CHON'], ['VH', 'DAT'], ['VH', 'GH'], ['VH', 'GD'],
      ['VH', 'PS'], ['VH', 'NT'], ['VH', 'QT'], ['VH', 'MBS'], ['VH', 'XL'], ['NCC', 'PH']],
    quanHe: [['CB', 'LD', 'include'], ['HUY', 'LD', 'include'], ['PH', 'DAT', 'extend']],
  },
  {
    ten: 'uc_ketoan',
    trai: [['KT', 'Ke toan']],
    phai: [['DC', 'Nguoi duyet chi'], ['NH', 'Ngan hang'], ['AI', 'Gemini AI']],
    uc: {
      DN: 'Dang nhap', XT: 'Xac thuc hai lop', NCC: 'Quan ly NCC va bang gia', VT: 'Quan ly danh muc vat tu', DX: 'Lap de xuat chi',
      DUYET: 'Duyet de xuat chi', CHI: 'Xac nhan da chi', CN: 'Theo doi cong no NCC, doi tho', XN: 'Xac nhan tien khach ve',
      CNK: 'Theo doi cong no khach', DS: 'Doi soat ngan hang', MBS: 'Chot phieu mua bo sung', PT: 'Phan tich vat tu va gia NCC',
      LL: 'Xem bao cao lai lo', XL: 'Xuat Excel',
    },
    cot0: ['DN', 'NCC', 'VT', 'DX', 'CHI', 'CN', 'XN', 'CNK', 'DS', 'MBS', 'PT', 'LL'],
    cot1: { XT: 0, DUYET: 3, XL: 11 },
    lien: [['KT', 'DN'], ['KT', 'NCC'], ['KT', 'VT'], ['KT', 'DX'], ['KT', 'CHI'], ['KT', 'CN'], ['KT', 'XN'], ['KT', 'CNK'], ['KT', 'DS'],
      ['KT', 'MBS'], ['KT', 'PT'], ['KT', 'LL'], ['DC', 'DUYET'], ['NH', 'DS'], ['AI', 'PT']],
    quanHe: [['XT', 'DN', 'extend'], ['XL', 'LL', 'extend']],
  },
  {
    ten: 'uc_admin',
    trai: [['AD', 'Admin']],
    phai: [['WEB', 'Website quang cao'], ['AI', 'Gemini AI']],
    uc: {
      DN: 'Dang nhap', XT: 'Xac thuc hai lop', ND: 'Quan ly nguoi dung', PQ: 'Phan quyen theo chuc nang', CHXT: 'Cau hinh xac thuc hai lop', NS: 'Nhap so khach tiem nang',
      TL: 'Quan ly ty le chia so', CHUYEN: 'Chuyen so sang Sale khac', BCCS: 'Bao cao cham soc khach hang', AINX: 'AI nhan xet Sale', KTAI: 'Soan kien thuc tro ly AI', DOC: 'Doc tai lieu bang AI',
      DUYET: 'Duyet de xuat chi', PC: 'Phan cong van hanh', NK: 'Xem nhat ky thay doi', SL: 'Sao luu du lieu',
      CH: 'Cau hinh tham so', TQ: 'Xem tong quan, lai lo',
    },
    cot0: ['DN', 'ND', 'PQ', 'CHXT', 'NS', 'TL', 'CHUYEN', 'BCCS', 'KTAI', 'DUYET', 'PC', 'NK', 'SL', 'CH', 'TQ'],
    cot1: { XT: 0, AINX: 7, DOC: 8 },
    lien: [['AD', 'DN'], ['AD', 'ND'], ['AD', 'PQ'], ['AD', 'CHXT'], ['AD', 'NS'], ['AD', 'TL'], ['AD', 'CHUYEN'], ['AD', 'BCCS'], ['AD', 'KTAI'],
      ['AD', 'DUYET'], ['AD', 'PC'], ['AD', 'NK'], ['AD', 'SL'], ['AD', 'CH'], ['AD', 'TQ'], ['WEB', 'NS'], ['AI', 'AINX'], ['AI', 'DOC']],
    quanHe: [['XT', 'DN', 'extend'], ['AINX', 'BCCS', 'extend'], ['DOC', 'KTAI', 'extend']],
  },
];

// Chay trong trinh duyet: do chu that, xep cho, tra ve chuoi SVG.
function veSvg(s) {
  const VIEN = '#990033', NEN = '#FFFFCC', FONT = 'Arial', CO = 13;
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${CO}px ${FONT}`;
  const rong = (t) => ctx.measureText(t).width;
  const HANG = 52, RY = 19, TREN = 50;
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const cot1 = s.cot1 || {};
  const rx = (id) => rong(s.uc[id]) / 2 + 24;
  const max0 = Math.max(...s.cot0.map(rx));
  const ds1 = Object.keys(cot1);
  const max1 = ds1.length ? Math.max(...ds1.map(rx)) : 0;
  const coCha = s.trai.some((a) => a[2] === -1);
  const xTrai0 = coCha ? 230 : 70;            // cot actor chinh
  const xTraiCha = 60;                         // cot actor cha
  const x0 = xTrai0 + 150 + max0;
  const x1 = x0 + max0 + 130 + max1;
  const xPhai = (ds1.length ? x1 + max1 : x0 + max0) + 150;

  const pos = {};
  s.cot0.forEach((id, i) => { pos[id] = { x: x0, y: TREN + i * HANG, rx: rx(id) }; });
  for (const [id, h] of Object.entries(cot1)) pos[id] = { x: x1, y: TREN + h * HANG, rx: rx(id) };

  // Actor: dat o trung binh y cua cac use case noi voi no, giu khoang cach toi thieu
  const xepActor = (ds, xDefault) => {
    const kq = ds.map(([ma, nhan, cot]) => {
      const ys = s.lien.filter(([a, u]) => a === ma && pos[u]).map(([, u]) => pos[u].y);
      const yMuon = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : TREN;
      return { ma, nhan, cot, x: cot === -1 ? xTraiCha : xDefault, y: yMuon };
    });
    const theoCot = {};
    for (const a of kq) (theoCot[a.x] ||= []).push(a);
    for (const nhom of Object.values(theoCot)) {
      nhom.sort((a, b) => a.y - b.y);
      for (let i = 1; i < nhom.length; i++) nhom[i].y = Math.max(nhom[i].y, nhom[i - 1].y + 105);
      if (nhom[0].y < TREN + 20) { const d = TREN + 20 - nhom[0].y; nhom.forEach((a) => { a.y += d; }); }
    }
    return kq;
  };
  const actors = [...xepActor(s.trai, xTrai0), ...xepActor(s.phai, xPhai)];
  const A = Object.fromEntries(actors.map((a) => [a.ma, a]));
  const phai = new Set(s.phai.map((a) => a[0]));

  // Can thang MEP TRAI cac use case cot 0 (net tu actor ben trai tro dung vao mep trai nen khong the
  // xuyen qua ellipse ben canh); cot 1 can thang mep trai sau mep phai xa nhat cua cot 0.
  const leTrai0 = xTrai0 + 240;
  for (const u of s.cot0) pos[u].x = leTrai0 + pos[u].rx;
  const mepPhai0 = Math.max(...s.cot0.map((u) => pos[u].x + pos[u].rx));
  for (const u of ds1) pos[u].x = mepPhai0 + 120 + pos[u].rx;
  const mepPhai = Math.max(mepPhai0, ...ds1.map((u) => pos[u].x + pos[u].rx));
  const xPhaiMoi = mepPhai + 170;
  for (const a of actors) if (phai.has(a.ma)) a.x = xPhaiMoi;

  const diemElip = (u, px, py) => {
    const dx = px - u.x, dy = py - u.y;
    const t = 1 / Math.sqrt((dx / u.rx) ** 2 + (dy / RY) ** 2);
    return [u.x + dx * t, u.y + dy * t];
  };
  const dauMui = (x1_, y1_, x2, y2, rong_ = 10, goc = 0.42) => {
    const a = Math.atan2(y2 - y1_, x2 - x1_);
    const p = (g) => `${x2 - rong_ * Math.cos(a + g)},${y2 - rong_ * Math.sin(a + g)}`;
    return `<polyline points="${p(goc)} ${x2},${y2} ${p(-goc)}" fill="none" stroke="${VIEN}" stroke-width="1.2"/>`;
  };
  let net = '', hinh = '', chu = '';

  for (const [a, u] of s.lien) {
    const ac = A[a], uc = pos[u];
    const benPhai = phai.has(a);
    const ax = benPhai ? ac.x - 18 : ac.x + 18, ay = ac.y - 4;
    // tro vao dau mut ellipse phia actor (mep trai / mep phai)
    const ex = benPhai ? uc.x + uc.rx : uc.x - uc.rx, ey = uc.y;
    net += `<line x1="${ax}" y1="${ay}" x2="${ex}" y2="${ey}" stroke="${VIEN}" stroke-width="1.2"/>` + dauMui(ax, ay, ex, ey);
  }
  for (const [tu, den, loai] of s.quanHe || []) {
    const a = pos[tu], b = pos[den];
    const [sx, sy] = diemElip(a, b.x, b.y), [ex, ey] = diemElip(b, a.x, a.y);
    net += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${VIEN}" stroke-width="1.2" stroke-dasharray="6 4"/>` + dauMui(sx, sy, ex, ey);
    const mx = (sx + ex) / 2, my = (sy + ey) / 2;
    chu += `<text x="${mx}" y="${my - 6}" text-anchor="middle" font-size="12">${esc(`<<${loai}>>`)}</text>`;
  }
  // Tong quat hoa ve dang cay: mot truc doc tu chan actor cha xuong, moi actor con noi ngang vao truc.
  const chaCuaCay = {};
  for (const [con, cha] of s.tongQuat || []) (chaCuaCay[cha] ||= []).push(A[con]);
  for (const [cha, cacCon] of Object.entries(chaCuaCay)) {
    const p = A[cha];
    p.nhanTren = true;
    const dinh = p.y + 30, day = Math.max(...cacCon.map((c) => c.y - 4));
    net += `<polygon points="${p.x},${dinh} ${p.x - 8},${dinh + 14} ${p.x + 8},${dinh + 14}" fill="#fff" stroke="${VIEN}" stroke-width="1.2"/>`
      + `<line x1="${p.x}" y1="${dinh + 14}" x2="${p.x}" y2="${day}" stroke="${VIEN}" stroke-width="1.2"/>`;
    for (const c of cacCon) net += `<line x1="${p.x}" y1="${c.y - 4}" x2="${c.x - 18}" y2="${c.y - 4}" stroke="${VIEN}" stroke-width="1.2"/>`;
  }
  for (const [id, u] of Object.entries(pos)) {
    hinh += `<ellipse cx="${u.x}" cy="${u.y}" rx="${u.rx}" ry="${RY}" fill="${NEN}" stroke="${VIEN}" stroke-width="1.2"/>`;
    chu += `<text x="${u.x}" y="${u.y + 4.5}" text-anchor="middle">${esc(s.uc[id])}</text>`;
  }
  for (const a of actors) {
    const { x, y } = a;
    hinh += `<g stroke="${VIEN}" stroke-width="1.4" fill="none">
      <circle cx="${x}" cy="${y - 27}" r="9" fill="${NEN}"/>
      <line x1="${x}" y1="${y - 18}" x2="${x}" y2="${y + 8}"/>
      <line x1="${x - 15}" y1="${y - 9}" x2="${x + 15}" y2="${y - 9}"/>
      <line x1="${x}" y1="${y + 8}" x2="${x - 12}" y2="${y + 27}"/>
      <line x1="${x}" y1="${y + 8}" x2="${x + 12}" y2="${y + 27}"/></g>`;
    chu += `<text x="${x}" y="${a.nhanTren ? y - 44 : y + 44}" text-anchor="middle">${esc(a.nhan)}</text>`;
  }
  const yMax = Math.max(...Object.values(pos).map((u) => u.y + RY), ...actors.map((a) => a.y + 50)) + 20;
  const xMax = Math.max(xPhaiMoi + 70, ...Object.values(pos).map((u) => u.x + u.rx + 30));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${xMax}" height="${yMax}" font-family="${FONT}" font-size="${CO}">
    <rect width="100%" height="100%" fill="#fff"/>${net}${hinh}<g fill="#000">${chu}</g></svg>`;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 2.5 });
  for (const s of SO_DO) {
    await page.setContent('<html><body style="margin:0"></body></html>');
    const svg = await page.evaluate(`(${veSvg.toString()})(${JSON.stringify(s)})`);

    await page.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
    const el = await page.$('svg');
    await el.screenshot({ path: path.join(OUT, `${s.ten}.png`) });
    console.log('ok', s.ten);
  }
  await browser.close();
})();
