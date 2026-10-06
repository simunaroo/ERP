import { AppError } from '../utils/AppError.js';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const LOI_TAM_THOI = new Set([500, 503]); // qua tai / loi tam thoi phia Google: thu lai co the thanh cong
const SO_LAN_THU = 3;
const cho = (ms) => new Promise((r) => setTimeout(r, ms));

async function goi(model, key, body) {
  let res;
  try {
    res = await fetch(`${API}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    throw new AppError(504, err.name === 'TimeoutError' ? 'Trợ lý AI phản hồi quá lâu, vui lòng thử lại' : 'Không kết nối được dịch vụ AI');
  }
  return res;
}

// Goi Gemini va buoc tra ve JSON dung schema (structured output), khong phai doan van tu do.
// anh: [{ mime, data }] voi data la base64 (khong co tien to "data:...;base64,").
// Loi tam thoi (503 qua tai) -> thu lai voi thoi gian cho tang dan; van loi -> doi sang model du phong (neu cau hinh).
export async function sinhJson({ systemPrompt, userText, anh = [], schema }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AppError(503, 'Chưa cấu hình GEMINI_API_KEY cho trợ lý AI');
  const models = [process.env.GEMINI_MODEL || 'gemini-3.8-flash', process.env.GEMINI_MODEL_DU_PHONG].filter(Boolean);
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [...anh.map((a) => ({ inline_data: { mime_type: a.mime, data: a.data } })), { text: userText }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: schema },
  };

  let res;
  let loiMang = null;
  for (const model of models) {
    for (let lan = 1; lan <= SO_LAN_THU; lan++) {
      try {
        res = await goi(model, key, body);
        loiMang = null;
      } catch (err) {
        // Timeout/mat ket noi: khong thu lai cung model (da cho 30s), chuyen sang model du phong.
        loiMang = err;
        res = null;
        console.warn(`Gemini ${model}: ${err.message}`);
        break;
      }
      if (res.ok || !LOI_TAM_THOI.has(res.status)) break;
      console.warn(`Gemini ${model} lỗi ${res.status}, thử lại lần ${lan}/${SO_LAN_THU}`);
      if (lan < SO_LAN_THU) await cho(800 * 2 ** (lan - 1)); // 0,8s -> 1,6s (exponential backoff)
    }
    if (res && (res.ok || !LOI_TAM_THOI.has(res.status))) break;
  }

  if (!res) throw loiMang;
  if (!res.ok) {
    const detail = await res.text();
    console.error('Gemini lỗi', res.status, detail.slice(0, 500));
    if (res.status === 429) throw new AppError(429, 'Đã vượt giới hạn lượt gọi AI, vui lòng thử lại sau ít phút');
    if (LOI_TAM_THOI.has(res.status)) throw new AppError(503, 'Dịch vụ AI đang quá tải, vui lòng thử lại sau ít phút');
    if (res.status === 404) throw new AppError(502, 'Model AI không còn khả dụng, kiểm tra GEMINI_MODEL trong .env');
    throw new AppError(502, 'Dịch vụ AI trả về lỗi');
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(502, 'Trợ lý AI trả về dữ liệu không đọc được');
  }
}
