
import { GoogleGenAI, Type } from "@google/genai";
import { ImageSize, AspectRatio } from "../types";

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
 * ANÁLISE DE METADADOS (FLASH LITE - FAST AI)
 * Resposta ultra-rápida para identificação de contexto.
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
        { text: "Analise esta joia. Identifique CATEGORIA (ANEL, BRINCO, COLO, PULSEIRA) e MATERIAL (OURO AMARELO, OURO BRANCO, PRATA, OURO ROSE)." }
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

  return JSON.parse(response.text || '{"category":"JOIA","material":"PRECIOSO"}');
};

/**
 * GERAÇÃO DE VISTA EDITORIAL (MODELO USANDO A JOIA)
 * Usa Gemini 3 Pro Image para alta qualidade.
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
        { text: `A professional high-fashion model elegantly wearing this ${category} made of ${material}. Editorial magazine style, luxury studio lighting, blurred background, macro focus on the jewelry.` }
      ]
    },
    config: {
      imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
    }
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Falha ao criar visual editorial.");
};

/**
 * EDIÇÃO DE IMAGEM COM PROMPT (NANO BANANA / 2.5 FLASH IMAGE)
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
        { text: `Edite a imagem conforme o prompt: ${prompt}. Estilo fotografia de joias de luxo, foco nítido, realce de brilho e reflexos.` }
      ]
    }
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Não foi possível editar com I.A.");
};

/**
 * GERAÇÃO DE IMAGEM PRO (GEMINI 3 PRO IMAGE)
 */
export const generateImagePro = async (prompt: string, size: ImageSize = '1K'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: `High-end luxury jewelry product photography: ${prompt}. Professional lighting, macro lens, 8k resolution, extreme detail.` }] },
    config: {
      imageConfig: { aspectRatio: "1:1", imageSize: size }
    }
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Falha na geração Pro.");
};

/**
 * ANIMAÇÃO VEO 3.1 (IMAGE TO VIDEO)
 */
export const animateWithVeo = async (base64Image: string, prompt: string, ratio: AspectRatio = '9:16'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = cleanBase64(base64Image);
  const mimeType = getMimeType(base64Image);

  // Garantir que ratio seja compatível (Veo 3.1 exige 16:9 ou 9:16)
  const finalRatio = (ratio === '16:9' || ratio === '9:16') ? ratio : '9:16';

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `${prompt}. Luxury slow-motion cinematic showcase, glints, reflections, 4k detail.`,
    image: { imageBytes: pureData, mimeType },
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: finalRatio }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 8000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};

/**
 * RETOQUE PADRÃO (REMOVE FUNDO)
 */
export const enhanceJewelryImage = async (base64Image: string, observation?: string): Promise<EnhancedJewelryResponse> => {
  const meta = await analyzeJewelryFast(base64Image);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = cleanBase64(base64Image);
  const mimeType = getMimeType(base64Image);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: `Retoque esta joia (${meta.category} de ${meta.material}). ${observation || ''}. Remova o fundo, aplique branco puro #FFFFFF, realce o brilho dos metais e pedras.` }
      ]
    }
  });

  let treatedUrl = base64Image;
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        treatedUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  return { imageUrl: treatedUrl, ...meta };
};
