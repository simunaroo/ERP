import { xuLyUpdate } from '../../integrations/telegram.router.js';
import * as service from './cong_no.service.js';

const id = (req) => Number(req.params.id);
export const dsDeXuatChi = async (req, res) => res.json(await service.dsDeXuatChi(req.query));
export const chiTiet = async (req, res) => res.json(await service.chiTiet(id(req)));
export const tao = async (req, res) => res.status(201).json(await service.taoDeXuat(req.user, req.body || {}));
export const guiLai = async (req, res) => res.json(await service.guiLai(req.user, id(req), req.body || {}));
export const duyet = async (req, res) => res.json(await service.duyetTrenWeb(req.user, id(req), req.body || {}));
export const thuHoi = async (req, res) => res.json(await service.thuHoi(req.user, id(req), req.body || {}));
export const daChi = async (req, res) => res.json(await service.daChi(req.user, id(req), req.body || {}));
export async function bill(req, res) {
  const f = await service.anhBill(id(req));
  res.set('X-Content-Type-Options', 'nosniff').type(f.mime).sendFile(f.file);
}
export async function xoa(req, res) {
  await service.xoa(id(req));
  res.status(204).end();
}
export const congNoNcc = async (req, res) => res.json(await service.congNoNcc());
export const congNoNccTheoDon = async (req, res) => res.json(await service.congNoNccTheoDon(id(req)));
export const congNoTho = async (req, res) => res.json(await service.congNoTho());
export const soTho = async (req, res) => res.json(await service.soTho(id(req)));

// Webhook Telegram: KHONG dung JWT (Telegram goi vao), xac thuc bang secret token trong header.
// Luon tra 200 nhanh: tra loi khac 200 thi Telegram gui lai lien tuc.
export async function webhook(req, res) {
  if (!service.dungSecret(req.get('X-Telegram-Bot-Api-Secret-Token'))) return res.status(401).end();
  res.json({ ok: true });
  xuLyUpdate(req.body).catch((e) => console.error('Telegram webhook:', e.message));
}
