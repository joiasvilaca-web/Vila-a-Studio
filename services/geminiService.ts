
import { GoogleGenAI, Type } from "@google/genai";

export interface EnhancedJewelryResponse {
  imageUrl: string;
  category: string;
  material: string;
}

const getMimeType = (base64: string): string => {
  const match = base64.match(/^data:(image\/[a-zA-Z]+);base64,/);
  return match ? match[1] : 'image/png';
};

const getPureBase64 = (base64: string): string => {
  return base64.replace(/^data:image\/[a-z]+;base64,/, "");
};

/**
 * TRATAMENTO DE IMAGEM (PADRÃO VILAÇA)
 */
export const enhanceJewelryImage = async (base64Image: string, observation?: string): Promise<EnhancedJewelryResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = getMimeType(base64Image);
  const pureData = getPureBase64(base64Image);

  // 1. ANÁLISE E METADADOS COM SCHEMA ESTRITO
  const metadataModel = 'gemini-3-flash-preview';
  const analysisPrompt = `
    Analise esta joia e extraia informações para catálogo de luxo.
    CATEGORIA: Escolha entre ANEL, BRINCO, COLO (Colar/Pingente) ou PULSEIRA.
    MATERIAL: Escolha entre OURO AMARELO, OURO BRANCO, PRATA ou OURO ROSÉ.
    OBSERVAÇÃO DO USUÁRIO: ${observation || 'Nenhuma'}
  `;

  try {
    const metaResponse = await ai.models.generateContent({
      model: metadataModel,
      contents: {
        parts: [
          { inlineData: { mimeType, data: pureData } },
          { text: analysisPrompt }
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

    const metadata = JSON.parse(metaResponse.text || '{"category":"JOIA","material":"PRECIOSO"}');

    // 2. GERAÇÃO DA IMAGEM TRATADA (IMAGE-TO-IMAGE RETOUCH)
    const imageGenModel = 'gemini-2.5-flash-image';
    const retouchPrompt = `
      Perform a professional high-end jewelry retouch on this ${metadata.category}.
      Task: Remove the original background completely and replace it with pure white (#FFFFFF).
      Enhance the sparkle of the gemstones and the polish of the ${metadata.material}.
      Keep the jewelry exact shape and details. Professional studio macro photography style.
    `;

    const genResponse = await ai.models.generateContent({
      model: imageGenModel,
      contents: {
        parts: [
          { inlineData: { mimeType, data: pureData } },
          { text: retouchPrompt }
        ]
      }
    });

    let treatedImageUrl = base64Image;
    if (genResponse.candidates?.[0]?.content?.parts) {
      for (const part of genResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          treatedImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    return { 
      imageUrl: treatedImageUrl, 
      category: metadata.category, 
      material: metadata.material 
    };
  } catch (error: any) {
    console.error("Erro no Tratamento Vilaça:", error);
    throw new Error("A I.A. não conseguiu processar esta imagem. Tente uma foto com iluminação diferente.");
  }
};

/**
 * AMBIENTAÇÃO COM MODELO (ESTÁTICA)
 */
export const generateModelView = async (base64Jewelry: string, category: string, material: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-pro-image-preview'; 
  const mimeType = getMimeType(base64Jewelry);
  const pureData = getPureBase64(base64Jewelry);

  const prompt = `
    Create a high-end luxury editorial photograph of a model wearing this ${category} made of ${material}.
    Focus: Close-up macro shot of the body part where the ${category} is worn.
    Style: Vogue/Tiffany & Co campaign style. Flawless skin, elegant lighting, neutral blurred background.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType, data: pureData } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Falha ao gerar visualização editorial.");
  } catch (error: any) {
    console.error("Erro na Modelo:", error);
    throw error;
  }
};

/**
 * GERAÇÃO DE VÍDEO CINEMATOGRÁFICO (VEO 3.1)
 */
export const generateJewelryVideo = async (base64Jewelry: string, category: string, material: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = getPureBase64(base64Jewelry);
  const mimeType = getMimeType(base64Jewelry);
  
  const prompt = `A professional cinematic video, ultra slow motion, focusing on a luxury ${category} made of ${material}. A model is moving slightly, making the gems sparkle under studio lights. High fashion jewelry commercial style, 4k, bokeh.`;

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: pureData,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    });

    // Timeout de segurança para evitar loop infinito
    let attempts = 0;
    while (!operation.done && attempts < 40) {
      await new Promise(resolve => setTimeout(resolve, 8000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      attempts++;
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Tempo limite de geração de vídeo excedido.");

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error: any) {
    console.error("Erro na Geração de Vídeo:", error);
    throw error;
  }
};
