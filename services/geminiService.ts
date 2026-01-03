
import { GoogleGenAI, Type } from "@google/genai";

export interface EnhancedJewelryResponse {
  imageUrl: string;
  cleanUrl: string; 
  category: string;
  material: string;
  gender: string;
}

export interface ModelViewResponse {
  imageUrl: string;
  cleanUrl: string;
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
      brightness += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    }
    return (brightness / (data.length / 4)) > 140; // Sensibilidade ajustada
  } catch (e) {
    return true; 
  }
};

/**
 * Aplica Identidade Visual e Avisos Legais em uma única passada.
 * Frase centralizada na borda inferior e Logo no canto inferior direito.
 */
const applyVilaçaBranding = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.save();
  
  // Detecta luminosidade na faixa inferior para contraste adaptativo
  const bgIsLight = isAreaLight(ctx, 0, h - 120, w, 120);
  
  // Cores institucionais adaptativas
  const color = bgIsLight ? 'rgba(102, 35, 68, 0.9)' : 'rgba(255, 255, 255, 0.95)';
  const shadowColor = bgIsLight ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';

  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;

  // 1. Frase de Aviso (Centro Inferior - TAMANHO MAIOR)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  ctx.font = 'bold 18px "Inter", sans-serif';
  ctx.fillText('GERADO POR I.A. PODE CONTER DISTORÇÕES', w / 2, h - 55);
  
  ctx.font = '600 14px "Inter", sans-serif';
  ctx.fillText('CONSULTE UMA ATENDENTE', w / 2, h - 35);

  // 2. Logotipo Vilaça (Canto Inferior Direito)
  ctx.textAlign = 'right';
  ctx.font = 'bold 26px "Playfair Display", serif';
  ctx.fillText('VILAÇA', w - 40, h - 55);
  
  ctx.font = 'italic 10px "Inter", sans-serif';
  ctx.fillText('Joalheria e Ourivesaria', w - 40, h - 40);
  
  ctx.restore();
};

/**
 * Filtra a imagem para tornar o fundo branco transparente.
 */
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
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 240 && g > 240 && b > 240) {
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
  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
  let found = false;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
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
  targetMaxHeight: number
) => {
  const transparentCanvas = getTransparentJewelry(img);
  const bounds = getContentBounds(transparentCanvas);
  
  const scale = Math.min(targetMaxWidth / bounds.w, targetMaxHeight / bounds.h) * 0.8;
  const drawW = bounds.w * scale;
  const drawH = bounds.h * scale;
  
  const x = centerX - drawW / 2;
  const y = centerY - drawH / 2;

  ctx.save();
  ctx.save();
  ctx.translate(0, (y + drawH) * 2 + 5); 
  ctx.scale(1, -0.4); 
  ctx.globalAlpha = 0.12;
  ctx.drawImage(transparentCanvas, bounds.x, bounds.y, bounds.w, bounds.h, x, y, drawW, drawH);
  
  const mirrorGrad = ctx.createLinearGradient(0, y, 0, y + drawH);
  mirrorGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  mirrorGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = mirrorGrad;
  ctx.fillRect(x, y, drawW, drawH);
  ctx.restore();

  ctx.drawImage(transparentCanvas, bounds.x, bounds.y, bounds.w, bounds.h, x, y, drawW, drawH);
  ctx.restore();
};

export const createInstagramStyleComposite = (cleanProductUrl: string, modelImageUrl: string): Promise<string> => {
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
        if (!ctx) return resolve(modelImageUrl);

        const scale = Math.max(canvas.width / modelImg.width, canvas.height / modelImg.height);
        const x = (canvas.width - modelImg.width * scale) / 2;
        const y = (canvas.height - modelImg.height * scale) / 2;
        ctx.drawImage(modelImg, x, y, modelImg.width * scale, modelImg.height * scale);

        const circleX = canvas.width * 0.22;
        const circleY = canvas.height * 0.78;
        const radius = 180;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 50;
        ctx.beginPath();
        ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.clip(); 

        drawJewelryWithMirrorShadow(ctx, productImg, circleX, circleY - 10, radius * 1.1, radius * 1.1);
        ctx.restore();

        // Branding único no final
        applyVilaçaBranding(ctx, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      }
    };
    productImg.onload = modelImg.onload = onLoad;
    productImg.src = cleanProductUrl;
    modelImg.src = modelImageUrl;
  });
};

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
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        drawJewelryWithMirrorShadow(ctx, productImg, width/2, height/4, width * 0.5, height * 0.4);
        
        const mScale = Math.max(width / modelImg.width, (height/2) / modelImg.height);
        ctx.drawImage(modelImg, (width - modelImg.width * mScale) / 2, height/2, modelImg.width * mScale, modelImg.height * mScale);
        
        // Branding único no final
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
    contents: `Gere uma narrativa de luxo em PORTUGUÊS para um(a) ${category} de ${material}. Retorne em JSON.`,
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
  const modelType = gender === 'male' ? 'modelo masculino sofisticado' : 'modelo feminina elegante';
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { 
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Jewelry.split(",")[1] } }, 
        { text: `Editorial de luxo. ${modelType} usando este(a) ${category} de ${material}. A joia deve estar em alta definição integrada ao corpo de forma natural e minimalista.` }
      ] 
    },
    config: { imageConfig: { aspectRatio: "3:4" } }
  });
  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  const rawUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  
  return { imageUrl: rawUrl, cleanUrl: rawUrl };
};

export const enhanceJewelryImage = async (base64Image: string): Promise<EnhancedJewelryResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const metaResp = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image.split(",")[1] } }, { text: "Analise a joia e responda em JSON: categoria, material, genero (male/female)." }] },
    config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, material: { type: Type.STRING }, gender: { type: Type.STRING } }, required: ["category", "material", "gender"] } }
  });
  const meta = JSON.parse(metaResp.text || '{}');

  const genResp = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image.split(",")[1] } }, { text: "Recorte a joia perfeitamente, removendo todo o fundo original. Deixe apenas o produto isolado e centralizado em fundo branco puro (#FFFFFF). Alta nitidez." }] },
    config: { imageConfig: { aspectRatio: "3:4" } }
  });
  
  const part = genResp.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Erro no processamento");

  const cleanUrlRaw = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;

  const cleanUrl = await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1400; 
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(cleanUrlRaw);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      drawJewelryWithMirrorShadow(ctx, img, canvas.width / 2, canvas.height / 2.3, canvas.width * 0.65, canvas.height * 0.55);
      
      // Branding único no final
      applyVilaçaBranding(ctx, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = cleanUrlRaw;
  });

  return { imageUrl: cleanUrl, cleanUrl, ...meta };
};
