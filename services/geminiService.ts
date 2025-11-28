import { GoogleGenAI, Type } from "@google/genai";
import { Language, SolutionResult } from '../types';

const cleanBase64 = (dataUrl: string): string => {
  // Removes "data:image/png;base64," or "data:application/pdf;base64," prefix
  return dataUrl.split(',')[1];
};

export const solveProblem = async (
  base64Data: string,
  mimeType: string,
  language: Language
): Promise<SolutionResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Bạn là một chuyên gia lập trình thi đấu và giáo viên tin học giỏi. 
      Nhiệm vụ của bạn là giải bài tập tin học có trong file đính kèm.
      
      Yêu cầu cụ thể:
      1. Phân tích đề bài ngắn gọn.
      2. Trình bày thuật toán hoặc ý tưởng giải quyết.
      3. Viết code hoàn chỉnh, tối ưu bằng ngôn ngữ ${language}. Code phải CHÍNH XÁC, không chứa markdown, không chứa chú thích thừa bên ngoài hàm.
      4. Tạo ra chính xác 20 bộ test case (Input và Output tương ứng) để kiểm tra tính đúng đắn của chương trình. Các test case phải bao gồm các trường hợp biên (edge cases), trường hợp nhỏ và trường hợp lớn.
      
      Hãy trả về kết quả dưới dạng JSON tuân thủ schema được cung cấp.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64(base64Data)
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        // Using structured output to ensure clean code and parsed test cases
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: {
              type: Type.STRING,
              description: "Phân tích đề bài và giải thích thuật toán (định dạng Markdown)",
            },
            sourceCode: {
              type: Type.STRING,
              description: `Mã nguồn hoàn chỉnh bằng ${language}. Chỉ chứa code, không chứa markdown blocks (như \`\`\`cpp).`,
            },
            testCases: {
              type: Type.ARRAY,
              description: "Danh sách 20 bộ test case",
              items: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING, description: "Dữ liệu đầu vào (Input)" },
                  output: { type: Type.STRING, description: "Kết quả mong đợi (Output)" }
                },
                required: ["input", "output"]
              }
            }
          },
          required: ["explanation", "sourceCode", "testCases"]
        },
        thinkingConfig: { thinkingBudget: 2048 }, // Increased budget for generating many test cases
        temperature: 0.2,
      }
    });

    const resultText = response.text || "{}";
    const parsedResult = JSON.parse(resultText);

    // Provide fallback if the model fails to return the exact structure (rare with schema)
    const markdown = parsedResult.explanation || "Không có lời giải thích.";
    let rawCode = parsedResult.sourceCode || "";
    const testCases = parsedResult.testCases || [];

    // Extra cleanup just in case the model put markdown fences inside the JSON string
    rawCode = rawCode.replace(/^```[a-z]*\n/i, '').replace(/```$/i, '').trim();

    return {
      markdown,
      rawCode,
      testCases
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Có lỗi xảy ra khi xử lý bài tập. Vui lòng thử lại.");
  }
};