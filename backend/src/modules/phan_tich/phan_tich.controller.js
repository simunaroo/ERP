import * as service from './phan_tich.service.js';

export const tongHop = async (req, res) => res.json(await service.tongHop(req.query));
export const nhanXetAi = async (req, res) => res.json(await service.nhanXetAi(req.body));
