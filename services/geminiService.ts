
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

export const enhanceJewelryImage = async (base64Image: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const model = 'gemini-2.5-flash-image';
  
  const prompt = `
    This is a professional macro photograph for Vilaça Joias. 
    Task: 
    1. EXTREME PRECISION: Remove the background completely, preserving every detail of the jewelry's edges, even fine chains or thin prongs.
    2. BACKGROUND: Place the jewelry on a perfectly solid, pure studio white background (#FFFFFF).
    3. POSITIONING: Center the jewelry. If it's a small item, ensure it's presented with a "hero" product scale.
    4. ENHANCEMENT: 
       - Maximize the brilliance of gemstones (diamonds, emeralds, etc.) with realistic prismatic sparkles.
       - Polish the metal surfaces (gold, silver) to remove any blur or camera noise, creating high-end studio reflections.
       - Ensure the focal point is razor-sharp.
    5. SHADOWS: Add a very soft, subtle "contact shadow" underneath the jewelry so it doesn't look like it's floating unnaturally.
    6. STYLE: Match the ultra-sharp, high-contrast luxury look of the world's finest jewelry catalogs (like Vivara).
    
    Return ONLY the final processed image.
  `;

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

  throw new Error("Não foi possível processar a imagem. Tente capturar novamente com mais luz.");
};
