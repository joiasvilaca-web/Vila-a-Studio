
import { GoogleGenAI, Type } from "@google/genai";
import { ImageSize } from "../types";

export interface EnhancedJewelryResponse {
  imageUrl: string;
  category: string;
  material: string;
  gender: string;
}

/**
 * Redimensiona a imagem para otimizar o processamento e evitar erros de memória em celulares.
 */
const resizeImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const cleanBase64 = (base64: string): string => {
  if (base64.includes(",")) return base64.split(",")[1];
  return base64;
};

const getMimeType = (base64: string): string => {
  const match = base64.match(/^data:(image\/[a-zA-Z]+);base64,/);
  return match ? match[1] : 'image/jpeg';
};

/**
 * ANÁLISE RÁPIDA (GEMINI 3 FLASH)
 * Identifica categoria, material e gênero do público-alvo.
 */
export const analyzeJewelryFast = async (base64Image: string): Promise<{category: string, material: string, gender: string}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = cleanBase64(base64Image);
  const mimeType = getMimeType(base64Image);

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: "Analise esta joia e identifique: 1. CATEGORIA (ANEL, BRINCO, COLAR, PULSEIRA); 2. MATERIAL (OURO, PRATA, ROSE); 3. GÊNERO ALVO (MASCULINO, FEMININO, UNISSEX). Retorne apenas um JSON com as chaves 'category', 'material' e 'gender'." }
      ]
    },
    config: { responseMimeType: "application/json" }
  });

  try {
    const result = JSON.parse(response.text?.replace(/```json/g, "").replace(/```/g, "").trim() || '{}');
    return {
      category: result.category || "JOIA",
      material: result.material || "METAL",
      gender: result.gender || "UNISSEX"
    };
  } catch (e) {
    return { category: "JOIA", material: "METAL", gender: "UNISSEX" };
  }
};

/**
 * GERAÇÃO EDITORIAL (GEMINI 2.5 FLASH IMAGE)
 * Usa o gênero identificado para escolher o modelo apropriado.
 */
export const generateModelView = async (base64Jewelry: string, category: string, material: string, gender: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const resized = await resizeImage(base64Jewelry, 1024, 1024);
  const pureData = cleanBase64(resized);
  const mimeType = getMimeType(resized);

  const modelDescription = gender.toUpperCase() === 'MASCULINO' 
    ? 'a handsome male model' 
    : gender.toUpperCase() === 'FEMININO' 
      ? 'a beautiful female model' 
      : 'a stylish model';

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: `Create a professional luxury fashion editorial photo of ${modelDescription} elegantly wearing this ${category} made of ${material}. High-end jewelry campaign style, soft lighting, elegant lifestyle background, close-up on the jewelry.` }
      ]
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Editorial failed.");
};

/**
 * TRATAMENTO (GEMINI 2.5 FLASH IMAGE)
 */
export const enhanceJewelryImage = async (base64Image: string): Promise<EnhancedJewelryResponse> => {
  const meta = await analyzeJewelryFast(base64Image);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const resized = await resizeImage(base64Image, 1024, 1024);
  const pureData = cleanBase64(resized);
  const mimeType = getMimeType(resized);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: `Remove original background. Set a solid pure white background (#FFFFFF). Polish the ${meta.material} to look shiny and clean, removing any shadows. Professional catalog style.` }
      ]
    }
  });

  let treatedUrl = resized;
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

export const generateImagePro = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `Masterpiece jewelry product photography: ${prompt}. Solid white background, luxury studio lighting.` }] }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Generation failed.");
};

export const editImageWithAI = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const resized = await resizeImage(base64Image, 1024, 1024);
  const pureData = cleanBase64(resized);
  const mimeType = getMimeType(resized);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: `Modify the jewelry based on: ${prompt}. Maintain the professional white background.` }
      ]
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Edit failed.");
};

