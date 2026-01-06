
import { GoogleGenAI, Type } from "@google/genai";

export interface EnhancedJewelryResponse {
  imageUrl: string; // Versão com Branding (para exibição isolada)
  cleanUrl: string;  // Versão Limpa (para uso em composições)
  category: string;
  material: string;
  gender: string;
}

export interface ModelViewResponse {
  imageUrl: string; // Versão com Branding
  cleanUrl: string;  // Versão Limpa
}

export interface JewelryStoryResponse {
  story: string;
  hashtags: string[];
}

/**
 * Detecta a luminosidade média de uma área para decidir a cor do texto (claro/escuro).
 */
const isAreaLight = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): boolean => {
  try {
    const imageData = ctx.getImageData(Math.max(0, x), Math.max(0, y), Math.min(w, ctx.canvas.width - x), Math.min(h, ctx.canvas.height - y));
    const data = imageData.data;
    let brightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      brightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }
    const avg = brightness / (data.length / 4);
    return avg > 128; 
  } catch (e) {
    return true; 
  }
};

/**
 * Aplica Identidade Visual e Avisos Legais ÚNICOS na imagem final.
 * Frases: Esquerda Inferior | Logo: Direita Inferior.
 */
const applyVilaçaBranding = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.save();
  
  const margin = 50;
  const areaY = h - 130;
  const areaH = 130;
  
  const bgIsLight = isAreaLight(ctx, 0, areaY, w, areaH);
  const textColor = bgIsLight ? 'rgba(50, 20, 35, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const shadowColor = bgIsLight ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)';

  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 4;
  ctx.fillStyle = textColor;

  // 1. Frases de Aviso (Canto Esquerdo - Alinhamento à Esquerda)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font = 'bold 24px "Inter", sans-serif';
  ctx.fillText('GERADO POR I.A. PODE CONTER DISTORÇÕES', margin, h - 70);
  ctx.font = '600 16px "Inter", sans-serif';
  ctx.fillText('CONSULTE UMA ATENDENTE', margin, h - 45);

  // 2. Logotipo Vilaça (Canto Direito - Alinhamento à Direita)
  ctx.textAlign = 'right';
  ctx.font = 'bold 32px "Playfair Display", serif';
  ctx.fillText('VILAÇA', w - margin, h - 70);
  ctx.font = 'italic 12px "Inter", sans-serif';
  ctx.fillText('Joalheria e Ourivesaria', w - margin, h - 55);
  
  ctx.restore();
};

const getTransparentJewelry = (img: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Remove pixels brancos (recorte manual de segurança)
    if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

const getContentBounds = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { x: 0, y: 0, w: canvas.width, h: canvas.height };
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        found = true;
      }
    }
  }
  return found ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : { x: 0, y: 0, w: canvas.width, h: canvas.height };
};

const drawJewelryWithMirrorShadow = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  centerX: number,
  centerY: number,
  targetMaxWidth: number,
  targetMaxHeight: number,
  isMainHighlight: boolean = false
) => {
  const transparentCanvas = getTransparentJewelry(img);
  const bounds = getContentBounds(transparentCanvas);
  const scaleMultiplier = isMainHighlight ? 0.95 : 0.8; 
  const scale = Math.min(targetMaxWidth / bounds.w, targetMaxHeight / bounds.h) * scaleMultiplier;
  const drawW = bounds.w * scale;
  const drawH = bounds.h * scale;
  const x = centerX - drawW / 2;
  const y = centerY - drawH / 2;
  
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;
  
  // Sombra de espelhamento suave
  ctx.save();
  ctx.translate(0, (y + drawH) * 2 + 5); 
  ctx.scale(1, -0.25); 
  ctx.globalAlpha = 0.05;
  ctx.drawImage(transparentCanvas, bounds.x, bounds.y, bounds.w, bounds.h, x, y, drawW, drawH);
  ctx.restore();
  
  // Desenho da joia principal
  ctx.drawImage(transparentCanvas, bounds.x, bounds.y, bounds.w, bounds.h, x, y, drawW, drawH);
  ctx.restore();
};

/**
 * Cria a imagem estilo Instagram com a joia centralizada no cenário.
 */
export const createInstagramStyleComposite = (cleanProductUrl: string, cleanModelUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const productImg = new Image();
    const modelImg = new Image();
    productImg.crossOrigin = "anonymous";
    modelImg.crossOrigin = "anonymous";
    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === 2) {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920; 
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(cleanModelUrl);

        // Fundo (Cenário / Modelo)
        const scale = Math.max(canvas.width / modelImg.width, canvas.height / modelImg.height);
        ctx.drawImage(modelImg, (canvas.width - modelImg.width * scale) / 2, (canvas.height - modelImg.height * scale) / 2, modelImg.width * scale, modelImg.height * scale);

        // Círculo de Destaque CENTRALIZADO
        const circleX = canvas.width / 2;
        const circleY = canvas.height * 0.45;
        const radius = 240;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 80;
        ctx.beginPath();
        ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.clip(); 
        drawJewelryWithMirrorShadow(ctx, productImg, circleX, circleY, radius * 1.5, radius * 1.5, true);
        ctx.restore();

        // Branding único no rodapé
        applyVilaçaBranding(ctx, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      }
    };
    productImg.onload = modelImg.onload = onLoad;
    productImg.src = cleanProductUrl;
    modelImg.src = cleanModelUrl;
  });
};

/**
 * Cria a imagem 50/50 vertical.
 * Metade superior: Joia no centro (Fundo Branco).
 * Metade inferior: Apenas Cenário/Modelo (Sem joia sobreposta), conforme novo comando.
 */
export const createComparisonImage = (cleanProductUrl: string, cleanModelUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const productImg = new Image();
    const modelImg = new Image();
    productImg.crossOrigin = "anonymous";
    modelImg.crossOrigin = "anonymous";
    let loadedCount = 0;
    const onImgLoad = () => {
      loadedCount++;
      if (loadedCount === 2) {
        const canvas = document.createElement('canvas');
        const width = 1200;
        const height = 1800; 
        canvas.width = width; 
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(cleanProductUrl);

        // --- 1. Metade Superior (50%): Somente Joia Centralizada (Fundo Branco) ---
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height / 2);
        drawJewelryWithMirrorShadow(ctx, productImg, width / 2, height / 4, width * 0.85, (height / 2) * 0.8, true);
        
        // --- 2. Metade Inferior (50%): Apenas Cenário/Modelo (Foco no Cenário) ---
        const mScale = Math.max(width / modelImg.width, (height / 2) / modelImg.height);
        const mDrawW = modelImg.width * mScale;
        const mDrawH = modelImg.height * mScale;
        const mX = (width - mDrawW) / 2;
        const mY = height / 2 + (height / 2 - mDrawH) / 2;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, height / 2, width, height / 2);
        ctx.clip();
        ctx.drawImage(modelImg, mX, mY, mDrawW, mDrawH);
        ctx.restore();
        
        // Divisória sutil
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, height/2); ctx.lineTo(width, height/2); ctx.stroke();

        // --- 3. Branding Único no Rodapé ---
        applyVilaçaBranding(ctx, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      }
    };
    productImg.onload = modelImg.onload = onImgLoad;
    productImg.src = cleanProductUrl;
    modelImg.src = cleanModelUrl;
  });
};

export const generateStoryAndHashtags = async (category: string, material: string): Promise<JewelryStoryResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Gere uma narrativa curta e luxuosa para um(a) ${category} de ${material}. Retorne em JSON com "story" e "hashtags".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          story: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["story", "hashtags"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const generateModelView = async (base64Jewelry: string, category: string, material: string, gender: string): Promise<ModelViewResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelType = gender === 'male' ? 'homem sofisticado e elegante' : 'mulher refinada e elegante';
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { 
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Jewelry.split(",")[1] } }, 
        { text: `Fotografia editorial de luxo de um(a) ${modelType} usando este(a) ${category} de ${material}. A joia deve ser o ponto focal absoluto, centralizada e brilhante. Fundo clean e iluminação de estúdio profissional.` }
      ] 
    },
    config: { imageConfig: { aspectRatio: "3:4" } }
  });
  
  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Falha na geração");
  const cleanUrl = `data:${part.inlineData.mimeType};base64,{part.inlineData.data}`;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve({ imageUrl: cleanUrl, cleanUrl });
      ctx.drawImage(img, 0, 0);
      applyVilaçaBranding(ctx, canvas.width, canvas.height);
      resolve({ imageUrl: canvas.toDataURL('image/jpeg', 0.95), cleanUrl });
    };
    img.src = cleanUrl;
  });
};

export const enhanceJewelryImage = async (base64Image: string): Promise<EnhancedJewelryResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const metaResp = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image.split(",")[1] } }, { text: "Analise a joia e retorne JSON: category (ex: anel, brinco), material (ex: ouro 18k, prata), gender (male/female baseado no design)." }] },
    config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, material: { type: Type.STRING }, gender: { type: Type.STRING } }, required: ["category", "material", "gender"] } }
  });
  const meta = JSON.parse(metaResp.text || '{}');

  const genResp = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image.split(",")[1] } }, { text: "Recorte a joia perfeitamente, removendo o fundo. Deixe apenas o produto isolado e nítido em fundo branco puro #FFFFFF." }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });
  
  const part = genResp.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Erro no processamento");
  const cleanBaseUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;

  const cleanUrl = await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200; canvas.height = 1400; 
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(cleanBaseUrl);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawJewelryWithMirrorShadow(ctx, img, canvas.width / 2, canvas.height / 2.3, canvas.width * 0.8, canvas.height * 0.7, true);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = cleanBaseUrl;
  });

  const brandedUrl = await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200; canvas.height = 1400; 
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(cleanUrl);
      ctx.drawImage(img, 0, 0);
      applyVilaçaBranding(ctx, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = cleanUrl;
  });

  return { imageUrl: brandedUrl, cleanUrl, ...meta };
};
