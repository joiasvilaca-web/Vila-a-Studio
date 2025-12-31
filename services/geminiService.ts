
import { GoogleGenAI, Type } from "@google/genai";
import { ImageSize } from "../types";

export interface EnhancedJewelryResponse {
  imageUrl: string;
  category: string;
  material: string;
  gender: string;
}

/**
 * Redimensiona e enquadra a imagem para o padrão 3:4.
 */
const resizeImage = (base64Str: string, maxWidth = 1024, maxHeight = 1365): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = maxHeight;
      
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, maxWidth, maxHeight);
        
        const width = img.width;
        const height = img.height;
        const scale = Math.min((maxWidth * 0.90) / width, (maxHeight * 0.80) / height);
        
        const x = (maxWidth - width * scale) / 2;
        const y = (maxHeight - height * scale) / 3.0;
        
        ctx.drawImage(img, x, y, width * scale, height * scale);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.95));
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

export const analyzeJewelryFast = async (base64Image: string): Promise<{category: string, material: string, gender: string}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = cleanBase64(base64Image);
  const mimeType = getMimeType(base64Image);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: "Analyze this jewelry image. Return ONLY a JSON object with: 1. CATEGORY (ring, necklace, earring, or bracelet), 2. MATERIAL, 3. GENDER ('male' or 'female')." }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  try {
    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch (e) {
    return { category: "jewelry", material: "precious metal", gender: "female" };
  }
};

/**
 * GERAÇÃO DE MODELO (LOOKBOOK)
 * Usa Gemini 3 Pro para garantir que a joia seja aplicada em escala minimalista e realista.
 */
export const generateModelView = async (base64Jewelry: string, category: string, material: string, gender: string): Promise<string> => {
  // Criamos uma nova instância para garantir que use a chave de API mais recente do diálogo, se houver.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = cleanBase64(base64Jewelry);
  const mimeType = getMimeType(base64Jewelry);
  
  const isMale = gender.toLowerCase().includes('male') || gender.toLowerCase().includes('masculino');
  const modelDescription = isMale ? 'a sophisticated male model' : 'an elegant female model';
  
  let placement = "the appropriate body part";
  const cat = category.toLowerCase();
  if (cat.includes("ring")) placement = "the ring finger";
  else if (cat.includes("necklace")) placement = "the neck";
  else if (cat.includes("earring")) placement = "the earlobe";
  else if (cat.includes("bracelet")) placement = "the wrist";

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: `Create a high-end luxury editorial lookbook photo.
                 SUBJECT: ${modelDescription} wearing the EXACT ${category} shown in the reference image.
                 PLACEMENT: The ${category} must be placed realistically and delicately on ${placement}.
                 
                 STRICT SCALE RULE: The jewelry must be MINIMALIST and TINY. It should be scaled down significantly to match real-life human proportions. Do NOT make the jewelry oversized.
                 
                 AESTHETIC: High-fashion minimalist studio, soft cinematic lighting, neutral background. 
                 The jewelry must be perfectly detailed as in the reference, but realistically small.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
        imageSize: "1K"
      }
    }
  });
  
  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  }
  throw new Error("Editorial generation failed.");
};

export const enhanceJewelryImage = async (base64Image: string): Promise<EnhancedJewelryResponse> => {
  const meta = await analyzeJewelryFast(base64Image);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const resized = await resizeImage(base64Image, 1024, 1365);
  const pureData = cleanBase64(resized);
  const mimeType = getMimeType(resized);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: `VILAÇA BRAND STANDARD: Cut out from background, white background #FFFFFF, sharp focus, enhance brilliance and metal shine. Keep original shape.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4"
      }
    }
  });
  
  let treatedUrl = resized;
  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      treatedUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      break;
    }
  }
  return { imageUrl: treatedUrl, ...meta };
};

export const generateImagePro = async (prompt: string, referenceImages: string[] = []): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts = referenceImages.map(img => ({
    inlineData: { data: cleanBase64(img), mimeType: getMimeType(img) }
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { 
      parts: [...parts, { text: `Luxurious jewelry design: ${prompt}. Minimalist, white background, 3:4.` }] 
    },
    config: { imageConfig: { aspectRatio: "3:4" } }
  });

  const contentParts = response.candidates?.[0]?.content?.parts || [];
  for (const part of contentParts) {
    if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  }
  throw new Error("Generation failed.");
};
