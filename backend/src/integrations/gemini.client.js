import { AppError } from '../utils/AppError.js';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';

// Goi Gemini va buoc tra ve JSON dung schema (structured output), khong phai doan van tu do.
export async function sinhJson({ systemPrompt, userText, schema }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AppError(503, 'Chưa cấu hình GEMINI_API_KEY cho trợ lý AI');
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  let res;
  try {
    res = await fetch(`${API}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: schema },
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    throw new AppError(504, err.name === 'TimeoutError' ? 'Trợ lý AI phản hồi quá lâu, vui lòng thử lại' : 'Không kết nối được dịch vụ AI');
  }

  if (!res.ok) {
    const detail = await res.text();
    console.error('Gemini lỗi', res.status, detail.slice(0, 500));
    if (res.status === 429) throw new AppError(429, 'Đã vượt giới hạn lượt gọi AI, vui lòng thử lại sau ít phút');
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
