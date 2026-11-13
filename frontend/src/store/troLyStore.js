import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// sessionStorage co the bi chan (che do rieng tu, chan cookie) -> bo qua loi, khung chat van chay, chi khong nho khi tai lai trang.
const khoAnToan = {
  getItem: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* bo qua */ } },
  removeItem: (k) => { try { sessionStorage.removeItem(k); } catch { /* bo qua */ } },
};

// Trang thai khung chat tro ly san pham: dung chung moi man hinh (Layout giu khung chat, khong mat khi chuyen trang).
// Luu theo phien trinh duyet: tai lai trang van mo dung cuoc tro chuyen dang do.
export const useTroLyStore = create(
  persist(
    (set) => ({
      mo: false,
      sanPhamId: null,
      hoiThoaiId: null,
      khachHangId: null,
      // Mo tu man khac (vd ho so khach): chon san pham + gan khach, bat dau cuoc tro chuyen moi.
      // Mo khong tham so (nut tron): giu nguyen cuoc tro chuyen dang do.
      moTroLy: ({ sanPhamId, khachHangId } = {}) => set((s) => (sanPhamId || khachHangId
        ? { mo: true, sanPhamId: sanPhamId ?? s.sanPhamId, khachHangId: khachHangId ?? null, hoiThoaiId: null }
        : { mo: true })),
      dong: () => set({ mo: false }),
      chonSanPham: (sanPhamId) => set({ sanPhamId, hoiThoaiId: null }),
      chonHoiThoai: (hoiThoaiId) => set({ hoiThoaiId }),
      moi: () => set({ hoiThoaiId: null }),
      boKhach: () => set({ khachHangId: null }),
    }),
    { name: 'erp-tro-ly', storage: createJSONStorage(() => khoAnToan) },
  ),
);
