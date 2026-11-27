// "Bi danh" cho du lieu gui AI: thong tin bi mat kinh doanh (ten nha cung cap, so tien: gia nhap, tien mua,
// cong no, doanh thu) KHONG duoc gui ra dich vu AI ben ngoai. Truoc khi gui: thay bang ma; sau khi AI tra loi: code doi lai.
//   - Nha cung cap -> "NCC-<id>"  (on dinh theo id: cuoc tro chuyen nhieu luot van khop ma)
//   - So tien      -> "[[T<n>]]"  (AI chi chep lai ma, khong biet gia tri; muon so sanh thi dung so tuong doi % di kem)
// AI van lap luan duoc nho cac chi so tuong doi (chenh %, xep hang, ty trong %) ma khong biet gia tri that.

const boDau = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export const dinhDangTien = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')} đ`;
export const maNcc = (id) => `NCC-${id}`;

export class BiDanh {
  constructor({ batDau = 1 } = {}) {
    this.dem = batDau;
    this.tien = new Map();   // "[[T1]]" -> so
    this.ncc = new Map();    // id -> ten that
  }

  soTien(v) {
    if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return null;
    // So 0 khong phai bi mat; gui nguyen de AI biet "chua co doanh thu / khong con no" (ma hoa thi AI tuong co so).
    if (Number(v) === 0) return 0;
    const ma = `[[T${this.dem++}]]`;
    this.tien.set(ma, Number(v));
    return ma;
  }

  // Nap lai ma tien cua cac luot truoc (cot ma_tien) de AI nhac lai ma cu van doi dung so.
  napLai(maTien) {
    for (const [ma, v] of Object.entries(maTien || {})) {
      this.tien.set(ma, Number(v));
      const n = Number(ma.match(/\d+/)?.[0]);
      if (n >= this.dem) this.dem = n + 1;
    }
  }

  // Cac ma tien co trong mot van ban -> {ma: so} (chi luu nhung ma AI thuc su dung).
  maTrong(text) {
    const kq = {};
    for (const [, n] of String(text || '').matchAll(/\[\[?\s*T(\d+)\s*\]?\]/g)) {
      const ma = `[[T${n}]]`;
      if (this.tien.has(ma)) kq[ma] = this.tien.get(ma);
    }
    return Object.keys(kq).length ? kq : null;
  }

  nhaCungCap(id, ten) {
    if (id === null || id === undefined) return null;
    if (ten) this.ncc.set(Number(id), ten);
    return maNcc(id);
  }

  // Doi ma -> gia tri that de hien cho nguoi dung. Chap nhan AI viet thieu ngoac ("[T3]").
  giaiMa(text, { tenNcc = (id) => this.ncc.get(id) } = {}) {
    return String(text || '')
      // AI boc ma NCC trong ngoac nhu ma tien ("[[NCC-2]]"): bo ngoac.
      .replace(/\[\[?\s*(NCC-\d+)\s*\]?\]/g, '$1')
      // Ma tien dung sai cho ty le ("[[T5]]%"): khong hien so tien thanh phan tram.
      .replace(/\[\[?\s*T\d+\s*\]?\]\s*%/g, '(không rõ)')
      .replace(/\[\[?\s*T(\d+)\s*\]?\]/g, (m, n) => {
        const v = this.tien.get(`[[T${n}]]`);
        return v === undefined ? '(không rõ)' : dinhDangTien(v);
      })
      .replace(/\bNCC-(\d+)\b/g, (m, id) => tenNcc(Number(id)) || m);
  }
}

// ---------------------------------------------------------------- so khop khong dau, giu dung vi tri
// "Gap" chuoi de so khop khong phan biet hoa thuong / dau / dau cau: "Sàn Việt-Phát" -> "san viet phat".
// Chuoi gap co the NGAN hon chuoi goc (chu go kieu to hop: dau la ky tu rieng; emoji; nhieu dau cach) nen giu
// bang vi tri: viTri[j] = chi so trong chuoi goc cua ky tu gap thu j -> thay dung cho tren chuoi goc.
function gap(s) {
  let chu = '';
  const viTri = [];
  let i = 0;
  for (const ch of String(s)) {               // duyet theo ky tu (code point), khong theo code unit
    const f = boDau(ch);                      // dau to hop -> '' (khong sinh ky tu gap)
    if (f && !/^[\p{L}\p{N}]+$/u.test(f)) {   // dau cau, khoang trang, emoji -> 1 dau cach (gop lien tiep)
      if (chu && !chu.endsWith(' ')) { chu += ' '; viTri.push(i); }
    } else {
      for (const c of f) { chu += c; viTri.push(i); }
    }
    i += ch.length;
  }
  viTri.push(i);
  return { chu, viTri };
}
const gapChu = (s) => gap(s).chu.trim();

// Thay moi lan xuat hien (tron tu, khong dau) cua `mau` trong s bang `thay`. Moi vong tim TIEP tu sau cho vua xet
// tren chuoi gap co dinh -> luon dung, khong the lap vo han.
export function thayKhongDau(s, mau, thay) {
  const k = gapChu(mau);
  if (!k) return s;
  const { chu, viTri } = gap(s);
  let kq = '';
  let tu = 0;
  for (let j = chu.indexOf(k); j >= 0; j = chu.indexOf(k, j + 1)) {
    const het = j + k.length;
    if ((j > 0 && chu[j - 1] !== ' ') || (het < chu.length && chu[het] !== ' ')) continue; // khong tron tu
    const a = viTri[j];
    if (a < tu) continue;                     // chong cheo voi cho vua thay
    let b = viTri[het];                       // ky tu ngay sau (dau to hop cua chu cuoi da nam trong doan bi thay)
    const doan = s.slice(a, b);               // ten co ngoac "(...)": ngoac dong ngay sau cung thuoc ve ten
    if ((doan.match(/\(/g) || []).length > (doan.match(/\)/g) || []).length && s[b] === ')') b++;
    kq += s.slice(tu, a) + thay;
    tu = b;
    j = het - 1;
  }
  return kq + s.slice(tu);
}

// ---------------------------------------------------------------- ten NCC nguoi dung tu go
// Nguoi dung hay goi tat: "Việt Phát" (ten that "Công ty Sàn Việt Phát"), "Minh Khang" ("Vật liệu Minh Khang").
// Cac cach goi = ten day du, bo loai hinh doanh nghiep o dau / cuoi, roi bo dan tu chi nganh hang o dau.
const CUM_LOAI_HINH = ['cong ty', 'cty', 'tnhh', 'mtv', 'co phan', 'cp', 'nha may', 'xuong', 'doanh nghiep', 'dntn', 'tap doan', 'chi nhanh', 'hop tac xa', 'htx'];
const CUM_NGANH = ['vat lieu xay dung', 'vat lieu', 'vlxd', 'tam op', 'san go', 'san', 'nano', 'cua nhom', 'cua', 'nhom kinh', 'nhom', 'kinh',
  'go', 'nhua', 'thep', 'son', 'noi that', 'trang tri', 'hoan thien', 'xay dung', 'thuong mai', 'dich vu', 'san xuat', 'ky thuat',
  'cong nghe', 'dau tu', 'tmdv', 'sxtm', 'tm', 'dv', 'sx', 'xd', 'va'];
const CUM_CUOI = ['jsc', 'co ltd', 'ltd', 'corp', 'group', 'viet nam', 'vn'];
const QUA_CHUNG = new Set(['viet nam', 'ha noi', 'sai gon', 'ho chi minh', 'tp hcm', 'mien bac', 'mien nam', 'mien trung']);

function boCum(chu, ds, oCuoi = false) {
  for (let doi = true; doi;) {
    doi = false;
    for (const c of ds) {
      if (!oCuoi && chu.startsWith(`${c} `)) { chu = chu.slice(c.length + 1); doi = true; break; }
      if (oCuoi && chu.endsWith(` ${c}`)) { chu = chu.slice(0, -c.length - 1); doi = true; break; }
    }
  }
  return chu;
}

export function cachGoiNcc(ten) {
  const goc = String(ten || '');
  const kq = new Set([gapChu(goc)]);
  let x = gapChu(goc.replace(/\(.*?\)/g, ' '));
  kq.add(x);
  x = boCum(boCum(x, CUM_LOAI_HINH), CUM_CUOI, true);
  kq.add(x);
  for (let y = x; ; x = y) {                 // "tam op nano hoang gia" -> "nano hoang gia" -> "hoang gia"
    for (const c of CUM_NGANH) if (x.startsWith(`${c} `)) { y = x.slice(c.length + 1); break; }
    if (y === x) break;
    kq.add(y);
  }
  // Ten qua ngan de nham voi chu thuong; chap nhan 3 ky tu neu la chu viet tat in hoa trong ten goc ("Công ty TNHH ABC").
  const vietTat = new Set(goc.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && /\p{Lu}/u.test(w) && w === w.toUpperCase()).map(gapChu));
  return [...kq].filter((a) => a && !QUA_CHUNG.has(a) && (a.length >= 4 || vietTat.has(a)));
}

// Thay ten NCC nguoi dung tu go trong cau hoi bang ma NCC-<id> truoc khi gui AI: khong phan biet hoa thuong / dau,
// chi khop tron tu ("tấm ốp nano" khong bi thay). Cach goi trung nhieu NCC -> "NCC-1 hoặc NCC-4" (AI se hoi lai).
export function anDanhNccTrongCau(text, dsNcc) {
  let s = String(text || '').normalize('NFC');
  const theoCachGoi = new Map();
  for (const n of dsNcc) {
    for (const a of cachGoiNcc(n.ten)) {
      if (!theoCachGoi.has(a)) theoCachGoi.set(a, new Set());
      theoCachGoi.get(a).add(n.id);
    }
  }
  const ds = [...theoCachGoi].sort((a, b) => b[0].length - a[0].length); // ten dai thay truoc
  for (const [a, ids] of ds) s = thayKhongDau(s, a, [...ids].map(maNcc).join(' hoặc '));
  return s;
}

// ---------------------------------------------------------------- so tien nguoi dung tu go
// "Giá 185.000 của …", "185k", "1,5 triệu", "12.500.000đ" -> ma [[Tn]] (giong so tien trong du lieu). Khong dung:
// so tron khong don vi ("top 3", "tháng 11", "năm 2026"), so luong ("2.000 m2"), %, ma (NCC-12, VT-0012), ngay gio.
const DON_VI_TIEN = { k: 1e3, nghin: 1e3, ngan: 1e3, tr: 1e6, trieu: 1e6, ty: 1e9, ti: 1e9, d: 1, dong: 1, vnd: 1 };
const MAU_TIEN = /(?<![\p{L}\p{N}_./:[])(?<![\p{L}\p{N}]-)(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)(?:\s*(nghìn|nghin|ngàn|ngan|triệu|trieu|tr|tỷ|tỉ|ty|ti|k|vnđ|vnd|đồng|dong|đ))?(?![\p{L}\p{N}])/giu;
const SO_LUONG = /^(?:m2|m²|m\b|md|mét|met|tấm|tam|cái|cai|bộ|bo\b|cuộn|cuon|kg|thanh|hộp|hop|thùng|thung|%|lần|lan\b|khách|khach|đơn|don\b|số|ngày|ngay|tháng|thang|năm|nam\b|giờ|gio|phút|phut|sản phẩm|san pham|người|nguoi)/iu;

export function anDanhTienTrongCau(text, bd) {
  return String(text || '').replace(MAU_TIEN, (m, so, dv, offset, str) => {
    const coNhom = /^\d{1,3}(?:[.,]\d{3})+$/.test(so);              // 185.000 / 1,200,000
    if (!dv && !coNhom) return m;
    if (!dv && SO_LUONG.test(str.slice(offset + m.length).trimStart())) return m;
    const v = (coNhom ? Number(so.replace(/[.,]/g, '')) : Number(so.replace(',', '.'))) * (dv ? DON_VI_TIEN[boDau(dv)] : 1);
    if (!Number.isFinite(v) || v < 1000) return m;                    // duoi 1.000 d: khong phai so tien
    return bd.soTien(Math.round(v)) ?? m;
  });
}
