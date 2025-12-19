
import { GoogleGenAI } from "@google/genai";

// A chave API é obtida exclusivamente do ambiente, sem necessidade de input do usuário.
const API_KEY = process.env.API_KEY || '';

export const enhanceJewelryImage = async (base64Image: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Modelo otimizado para edição rápida e precisa de imagens
  const model = 'gemini-2.5-flash-image';
  
  const prompt = `
    TASK: Professional high-end jewelry retouching.
    1. BACKGROUND: Remove the original background completely. Replace it with a PURE, SOLID WHITE background (#FFFFFF).
    2. CLEANLINESS: Do NOT add any watermarks, text, logos, signatures, or borders. The image must be 100% clean.
    3. JEWELRY ENHANCEMENT:
       - Enhance the metallic luster (Gold/Silver/Platinum) to a mirror-like finish.
       - Increase the brilliance and fire of all gemstones (Diamonds, etc.).
       - Ensure all edges are perfectly sharp and aliasing-free.
    4. NATURAL SHADOW: Place a very subtle, soft contact shadow at the base of the item to ensure it looks grounded on the white surface.
    5. COMPOSITION: Center the item and fill the frame appropriately for a professional catalog.
    
    OUTPUT: Return ONLY the processed image.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("O processamento não retornou uma imagem válida.");
  } catch (error) {
    console.error("Erro no Gemini Service:", error);
    throw new Error("Falha ao processar imagem. Verifique a conexão ou a iluminação da foto.");
  }
};
