
import { GoogleGenAI } from "@google/genai";

export interface EnhancedJewelryResponse {
  imageUrl: string;
  category: 'RING' | 'EARRING' | 'NECKLACE' | 'BRACELET' | 'PENDANT';
  material: 'YELLOW_GOLD' | 'WHITE_GOLD' | 'SILVER' | 'ROSE_GOLD';
}

/**
 * Realiza o TRATAMENTO (Retoque) da foto original.
 * Proibido reconstruir ou trocar o objeto por um de banco de dados.
 */
export const enhanceJewelryImage = async (base64Image: string, observation?: string): Promise<EnhancedJewelryResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Usando Flash 2.5 para edição fiel à imagem de entrada, evitando alucinações de geração
  const model: any = 'gemini-2.5-flash-image'; 
  
  const prompt = `
    VOCÊ É UM EDITOR DE FOTOGRAFIA PROFISSIONAL (RETOUCHER).
    TAREFA: TRATAMENTO DE IMAGEM DA JOIA ORIGINAL FORNECIDA.

    REGRAS INVIOLÁVEIS:
    1. NÃO RECONSTRUA A JOIA. NÃO USE IMAGENS DE BANCO DE DADOS.
    2. PRESERVE 100% A GEOMETRIA, AS IMPERFEIÇÕES NATURAIS E A FORMA DO OBJETO ORIGINAL.
    3. REMOÇÃO DE FUNDO: Isole o objeto perfeitamente. O fundo deve ser #FFFFFF (BRANCO ABSOLUTO).
    4. MELHORIA DE PIXELS: Apenas limpe o ruído, ajuste nitidez e melhore os realces de luz (highlights) do metal original.
    5. SOMBRA TÉCNICA: Mantenha apenas uma sombra de contato sutil para realismo no fundo branco.

    OBSERVAÇÃO DO CLIENTE VILAÇA: ${observation || 'Tratamento padrão de luxo.'}

    RETORNE APENAS A IMAGEM TRATADA E O METADADO: [META: CATEGORIA, MATERIAL]
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
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

    if (!imageUrl) throw new Error("Falha no tratamento da imagem.");
    return { imageUrl, category, material };
  } catch (error: any) {
    console.error("Erro no Tratamento:", error);
    throw error;
  }
};

/**
 * Gera a visualização na modelo usando a I.A. apenas para ambientação e proporção.
 */
export const generateModelView = async (base64Jewelry: string, category: string, material: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-pro-image-preview'; 

  const prompt = `
    VILAÇA ESTÚDIO - AMBIENTAÇÃO EDITORIAL.
    USE A JOIA DA IMAGEM EM ANEXO. 
    REGRAS DE PROPORÇÃO:
    1. A joia deve ser colocada em uma modelo I.A. respeitando a escala real (ex: um anel deve caber no dedo, um colar no pescoço).
    2. USE SEU CONHECIMENTO DE PROPORÇÃO HUMANA APENAS PARA MEDIR E ESCALAR A JOIA CORRETAMENTE.
    3. A modelo deve ser luxuosa, pele impecável, fundo de estúdio.
    4. A JOIA DEVE SER IDENTICA À ANEXADA.
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
    throw new Error("Erro na ambientação.");
  } catch (error: any) {
    console.error("Erro ao gerar modelo:", error);
    throw error;
  }
};
