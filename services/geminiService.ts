
import { GoogleGenAI, Type } from "@google/genai";
import { ImageSize } from "../types";

export interface EnhancedJewelryResponse {
  imageUrl: string;
  category: string;
  material: string;
  gender: string;
}

const resizeImage = (base64Str: string, maxWidth = 1024, maxHeight = 1280): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Proporção 4:5 vertical rigorosa (Instagram Portrait Standard)
      canvas.width = maxWidth;
      canvas.height = maxHeight;
      
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, maxWidth, maxHeight);
        
        // Objeto ampliado para ocupar ~92% da área (Zoom Macro de Catálogo)
        const width = img.width;
        const height = img.height;
        const scale = Math.min((maxWidth * 0.92) / width, (maxHeight * 0.85) / height);
        
        const x = (maxWidth - width * scale) / 2;
        // Posicionado levemente acima do eixo central para dar espaço ao reflexo/sombra na base
        const y = (maxHeight - height * scale) / 2.8;
        
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
        { text: "Identify CATEGORY, MATERIAL, and GENDER of this jewelry. Return ONLY JSON." }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  try {
    const text = response.text || '{}';
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch (e) {
    return { category: "JOIA", material: "METAL", gender: "UNISSEX" };
  }
};

/**
 * Geração de Cenário Luxo (Apenas para o card de editorial)
 */
export const generateModelView = async (base64Jewelry: string, category: string, material: string, gender: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = cleanBase64(base64Jewelry);
  const mimeType = getMimeType(base64Jewelry);
  const modelDescription = gender.toUpperCase() === 'MASCULINO' ? 'a handsome male model' : 'a beautiful female model';
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: `Create a luxury editorial background for this jewelry. 
                 A ${modelDescription} is wearing it. 
                 STRICT: Do not change the jewelry shape. Use the photo as reference for the object. 
                 Setting: High-fashion minimalist studio. 4x5 ratio.` }
      ]
    }
  });
  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  }
  throw new Error("Editorial failed.");
};

/**
 * TRATAMENTO PADRÃO VIVARA: Recorte, Tratamento HDR, Ampliação e Reflexo de Espelho.
 * Não utiliza recursos generativos para alterar a forma da joia.
 */
export const enhanceJewelryImage = async (base64Image: string): Promise<EnhancedJewelryResponse> => {
  const meta = await analyzeJewelryFast(base64Image);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const resized = await resizeImage(base64Image, 1024, 1280);
  const pureData = cleanBase64(resized);
  const mimeType = getMimeType(resized);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: `VIVARA BRAND STANDARD TREATMENT - 4x5 PORTRAIT:
                 1. STRICT NO-GENERATION: Do NOT change the geometry, stones, or details of the jewelry. Keep it 100% original.
                 2. CLEAN CUT-OUT: Remove all background. Edges must be razor-sharp. 
                 3. REMOVE CONTOUR SHADOWS: No glow, no shadows, no halos around the jewelry edges.
                 4. BACKGROUND: Solid Pure White (#FFFFFF).
                 5. BASE REFLECTION: Add a subtle, professional MIRROR REFLECTION and a tiny soft contact shadow exactly beneath the object (Reflexo e Sombreamento de Base).
                 6. HDR POLISHING: Enhance natural metal shine and gem brilliance. 
                 7. MAGNIFY: The jewelry must appear large (Macro style) in the 4x5 frame.` }
      ]
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
  
  const parts: any[] = referenceImages.map(img => ({
    inlineData: {
      data: cleanBase64(img),
      mimeType: getMimeType(img)
    }
  }));

  const textPart = { 
    text: `Luxurious jewelry design generation. 
           ${referenceImages.length > 0 ? "Use these images as visual style references." : ""}
           Description: ${prompt || "a luxury masterpiece"}. 
           Format: 4x5 vertical, pure white background (#FFFFFF), macro view, mirror reflection on base. NO CONTOUR SHADOWS.` 
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [...parts, textPart] }
  });

  const contentParts = response.candidates?.[0]?.content?.parts || [];
  for (const part of contentParts) {
    if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  }
  throw new Error("Generation failed.");
};

export const editImageWithAI = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const resized = await resizeImage(base64Image, 1024, 1280);
  const pureData = cleanBase64(resized);
  const mimeType = getMimeType(resized);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType, data: pureData } },
        { text: `Refine this jewelry: ${prompt}. Maintain VIVARA standard: 4x5, large scale, pure white background, mirror reflection below. ABSOLUTELY NO CONTOUR SHADOWS.` }
      ]
    }
  });
  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  }
  throw new Error("Edit failed.");
};
