
import { GoogleGenAI, Type } from "@google/genai";
import { ImageSize } from "../types";

export interface EnhancedJewelryResponse {
  imageUrl: string;
  category: string;
  material: string;
}

const cleanBase64 = (base64: string): string => {
  if (base64.includes(",")) return base64.split(",")[1];
  return base64;
};

const getMimeType = (base64: string): string => {
  const match = base64.match(/^data:(image\/[a-zA-Z]+);base64,/);
  return match ? match[1] : 'image/png';
};

/**
 * ANÁLISE RÁPIDA (FLASH LITE)
 */
export const analyzeJewelryFast = async (base64Image: string): Promise<{category: string, material: string}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = cleanBase64(base64Image);
  const mimeType = getMimeType(base64Image);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite-latest',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: "Identifique a CATEGORIA (ANEL, BRINCO, COLO, PULSEIRA) e MATERIAL (OURO AMARELO, OURO BRANCO, PRATA, OURO ROSE) desta joia." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          material: { type: Type.STRING },
        },
        required: ["category", "material"]
      }
    }
  });

  return JSON.parse(response.text || '{"category":"JOIA","material":"METAL"}');
};

/**
 * GERAÇÃO EDITORIAL (GEMINI 3 PRO IMAGE)
 */
export const generateModelView = async (base64Jewelry: string, category: string, material: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = cleanBase64(base64Jewelry);
  const mimeType = getMimeType(base64Jewelry);

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: `A high-end professional fashion editorial photo of a model wearing this ${category} made of ${material}. Luxury magazine aesthetic, sharp focus on the jewelry, soft studio lighting.` }
      ]
    },
    config: {
      imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Falha ao gerar visual editorial.");
};

/**
 * TRATAMENTO E RECORTE (GEMINI 2.5 FLASH IMAGE)
 */
export const enhanceJewelryImage = async (base64Image: string): Promise<EnhancedJewelryResponse> => {
  const meta = await analyzeJewelryFast(base64Image);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = cleanBase64(base64Image);
  const mimeType = getMimeType(base64Image);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: `Remove original background completely. Set a solid pure white background #FFFFFF. Enhance the jewelry's natural sparkle, sharpen the edges, and polish the ${meta.material} material. Professional product photography style.` }
      ]
    }
  });

  let treatedUrl = base64Image;
  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData) {
        treatedUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  return { imageUrl: treatedUrl, ...meta };
};

/**
 * GERAÇÃO PRO (GEMINI 3 PRO IMAGE)
 */
export const generateImagePro = async (prompt: string, size: ImageSize = '1K'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: `Masterpiece luxury jewelry photography, ultra-detailed: ${prompt}. Solid white background, high-end studio lighting, 8k resolution.` }] },
    config: {
      imageConfig: { aspectRatio: "1:1", imageSize: size }
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Erro na geração da imagem Pro.");
};

/**
 * EDIÇÃO POR PROMPT (GEMINI 2.5 FLASH IMAGE)
 */
export const editImageWithAI = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = cleanBase64(base64Image);
  const mimeType = getMimeType(base64Image);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: `Modify this jewelry based on: ${prompt}. Keep professional quality.` }
      ]
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Erro na edição assistida.");
};
