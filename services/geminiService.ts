
import { GoogleGenAI } from "@google/genai";

export interface EnhancedJewelryResponse {
  imageUrl: string;
  category: 'RING' | 'EARRING' | 'NECKLACE' | 'BRACELET' | 'PENDANT';
  material: 'YELLOW_GOLD' | 'WHITE_GOLD' | 'SILVER' | 'ROSE_GOLD';
}

export const enhanceJewelryImage = async (base64Image: string): Promise<EnhancedJewelryResponse> => {
  // Inicialização usando a chave do ambiente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-2.5-flash-image'; 
  
  const prompt = `
    AJA COMO UM RETOCADOR MASTER DE JOALHERIA (PADRÃO VIVARA EDITORIAL).
    INSTRUÇÕES DE IMAGEM:
    1. FUNDO: Remova perfeitamente o fundo original e substitua por Branco Puro (#FFFFFF).
    2. REFLEXO: Adicione uma sombra de contato muito fina sob a joia e um reflexo espelhado vertical sutil (opacidade 15%).
    3. QUALIDADE: Melhore a nitidez e o brilho do metal (ouro/prata) e pedras preciosas.
    4. METADADOS: Identifique a categoria e o material.
    SAÍDA DE TEXTO NO FINAL: [META: CATEGORIA, MATERIAL]
    Categorias: RING, EARRING, NECKLACE, BRACELET, PENDANT.
    Materiais: YELLOW_GOLD, WHITE_GOLD, SILVER, ROSE_GOLD.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] || base64Image } },
          { text: prompt }
        ]
      }
    });

    let imageUrl = '';
    let category: any = 'RING';
    let material: any = 'YELLOW_GOLD';

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          const metadataMatch = part.text.match(/\[META:\s*(\w+),\s*(\w+)\]/i);
          if (metadataMatch) {
            category = metadataMatch[1].toUpperCase();
            material = metadataMatch[2].toUpperCase();
          }
        }
      }
    }

    if (!imageUrl) {
        throw new Error("Não foi possível processar a imagem. Tente novamente com melhor iluminação.");
    }

    return { imageUrl, category, material };
  } catch (error: any) {
    console.error("Erro no Gemini Service:", error);
    throw error;
  }
};

export const generateModelView = async (base64Jewelry: string, category: string, material: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-2.5-flash-image';

  const prompt = `
    FOTOGRAFIA ULTRA-REALISTA DE ALTA MODA.
    Uma pessoa real (modelo) usando esta joia (${category}) de ${material}.
    - Integrar a joia ao corpo/pele com sombras naturais.
    - Estilo Editorial de Joalheria. Fundo neutro e elegante.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Jewelry.split(',')[1] || base64Jewelry } },
          { text: prompt }
        ]
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Falha na geração da modelo.");
  } catch (error) {
    console.error(error);
    throw error;
  }
};
