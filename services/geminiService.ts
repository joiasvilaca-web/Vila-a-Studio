
import { GoogleGenAI } from "@google/genai";

export interface EnhancedJewelryResponse {
  imageUrl: string;
  category: 'RING' | 'EARRING' | 'NECKLACE' | 'BRACELET' | 'PENDANT';
  material: 'YELLOW_GOLD' | 'WHITE_GOLD' | 'SILVER' | 'ROSE_GOLD';
}

/**
 * TRATAMENTO DE IMAGEM (PADRÃO VILAÇA)
 * Foco estritamente no produto isolado. PROIBIDO o uso de modelos nesta etapa.
 */
export const enhanceJewelryImage = async (base64Image: string, observation?: string): Promise<EnhancedJewelryResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model: any = 'gemini-2.5-flash-image'; 
  
  const prompt = `
    VOCÊ É UM RETOCADOR TÉCNICO DE JOALHERIA DE ELITE. 
    ESTILO DE REFERÊNCIA OBRIGATÓRIO: VILAÇA (Padronização Fotográfica de Luxo).

    DIRETRIZES ESTÉTICAS VILAÇA:
    1. FUNDO: Branco Absoluto (#FFFFFF). Imagem puramente isolada.
    2. ZERO MODELOS: Não inclua pessoas, mãos ou qualquer elemento humano nesta foto. Apenas a joia.
    3. ILUMINAÇÃO: Metal com brilho especular nítido, cores neutras e realistas.
    4. NITIDEZ: Máxima em gemas e detalhes do metal para mostrar a originalidade técnica.
    5. RECORTE: Perfeito com sombra de contato (contact shadow) sutil e difusa para realismo.
    6. ENQUADRAMENTO: Amplie a joia para ocupar 85-90% do quadro (Close-up).
    7. FIDELIDADE ABSOLUTA: Não reconstrua a joia. Apenas trate a luz, limpe impurezas do fundo e melhore o contraste da foto original. Mantenha a originalidade da peça.
    
    PEDIDO ADICIONAL: ${observation || 'Tratamento padrão Vilaça de alta fidelidade.'}

    RETORNE O METADADO: [META: CATEGORIA, MATERIAL]
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] || base64Image } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
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

    if (!imageUrl) throw new Error("Falha no processamento.");
    return { imageUrl, category, material };
  } catch (error: any) {
    console.error("Erro no Tratamento Vilaça:", error);
    throw error;
  }
};

/**
 * AMBIENTAÇÃO COM MODELO I.A. (FOCO EM CLOSE-UP / MACRO)
 */
export const generateModelView = async (base64Jewelry: string, category: string, material: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-pro-image-preview'; 

  const prompt = `
    VILAÇA ESTÚDIO - FOTOGRAFIA MACRO EDITORIAL.
    OBJETIVO: Mostrar a joia em uma modelo real (I.A.).
    
    DIRETRIZES DE ENQUADRAMENTO:
    1. FOCO ÚNICO: Mostre APENAS a parte do corpo onde a joia é usada (ex: apenas a mão para anéis, apenas a orelha para brincos, apenas o pescoço/colo para colares).
    2. CLOSE-UP: A imagem deve ser um "close-up" extremo para valorizar o produto na pele.
    3. ESCALA: A joia deve estar em proporção anatômica perfeita.
    4. ESTILO VILAÇA: Pele perfeita, iluminação de estúdio luxuosa, fundo neutro elegante.
    5. FIDELIDADE: A joia deve ser IDÊNTICA à imagem anexada.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Jewelry.split(',')[1] || base64Jewelry } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: { aspectRatio: "4:5" }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Erro ao gerar visualização.");
  } catch (error: any) {
    console.error("Erro na Modelo:", error);
    throw error;
  }
};
