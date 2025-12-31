
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

const getAreaBrightness = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): number => {
  try {
    const imageData = ctx.getImageData(
      Math.max(0, x), 
      Math.max(0, y), 
      Math.min(w, ctx.canvas.width - x), 
      Math.min(h, ctx.canvas.height - y)
    );
    const data = imageData.data;
    let brightnessSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      brightnessSum += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }
    return brightnessSum / (data.length / 4);
  } catch (e) {
    return 255; 
  }
};

const addVilacaOverlays = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.save();
  const logoAreaBrightness = getAreaBrightness(ctx, w - 250, h - 80, 220, 60);
  const isDarkBackground = logoAreaBrightness < 140;
  
  const logoColor = isDarkBackground ? 'rgba(253, 212, 158, 0.95)' : 'rgba(102, 35, 68, 0.95)';
  const shadowColor = isDarkBackground ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';

  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 5;
  ctx.fillStyle = logoColor;
  ctx.textAlign = 'right';
  ctx.font = 'bold 28px "Playfair Display", serif';
  ctx.fillText('VILAÇA', w - 30, h - 50);
  ctx.font = 'italic 10px "Inter", sans-serif';
  ctx.fillText('Joalheria e Ourivesaria', w - 30, h - 35);

  const discAreaBrightness = getAreaBrightness(ctx, w / 2 - 150, h - 50, 300, 40);
  const discColor = discAreaBrightness < 140 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';
  ctx.shadowColor = discAreaBrightness < 140 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
  ctx.shadowBlur = 3;
  ctx.textAlign = 'center';
  ctx.fillStyle = discColor;
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.fillText('Uso de I.A. pode conter distorções', w / 2, h - 35);
  ctx.fillText('Consulte uma atendente', w / 2, h - 20);
  ctx.restore();
};

const applyVivaraFinishing = (base64: string, addLogo: boolean = true): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64;
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const reflectionHeight = h * 0.08; 
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h + reflectionHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(base64);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (tCtx) {
        tCtx.drawImage(img, 0, 0);
        const imageData = tCtx.getImageData(0, 0, w, h);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          if (r > 245 && g > 245 && b > 245) data[i+3] = 0; 
        }
        tCtx.putImageData(imageData, 0, 0);
      }

      ctx.drawImage(tempCanvas, 0, 0);
      ctx.save();
      ctx.translate(0, h * 2); 
      ctx.scale(1, -1);
      ctx.globalAlpha = 0.04; 
      ctx.drawImage(tempCanvas, 0, h, w, h);
      ctx.globalCompositeOperation = 'destination-out';
      const grad = ctx.createLinearGradient(0, h, 0, h + reflectionHeight);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, h, w, reflectionHeight);
      ctx.restore();

      if (addLogo) addVilacaOverlays(ctx, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(base64);
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
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(cleanProductUrl);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        const halfH = height / 2;
        const pScale = (width * 0.7) / Math.max(productImg.width, productImg.height);
        const pW = productImg.width * pScale;
        const pH = productImg.height * pScale;
        ctx.drawImage(productImg, (width - pW) / 2, (halfH - pH) / 2, pW, pH);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, halfH, width, halfH); ctx.clip();
        const zoom = 1.15; 
        const mScale = Math.max(width / modelImg.width, halfH / modelImg.height) * zoom;
        const mW = modelImg.width * mScale;
        const mH = modelImg.height * mScale;
        ctx.drawImage(modelImg, (width - mW) / 2, halfH + (halfH - mH) / 2 - (mH * 0.05), mW, mH);
        ctx.restore();
        ctx.strokeStyle = 'rgba(102, 35, 68, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(width * 0.2, halfH); ctx.lineTo(width * 0.8, halfH); ctx.stroke();
        addVilacaOverlays(ctx, width, height);
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
  const prompt = `Gere uma narrativa de luxo em PORTUGUÊS para um(a) ${category} de ${material}. Além disso, pesquise as tendências dos últimos 10 dias no Brasil e retorne 5 hashtags: 2 do segmento de joalheria, 1 do segmento de ourivesaria e 2 específicas para o tipo de produto (${category}). Retorne em JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
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
  try {
    return JSON.parse(response.text || '{}');
  } catch {
    return { story: "Vilaça: onde a tradição da ourivesaria encontra o futuro digital.", hashtags: ["#vilaca", "#joiasdeluxo", "#ourivesaria", "#anel", "#estilo"] };
  }
};

export const generateModelView = async (base64Jewelry: string, category: string, material: string, gender: string): Promise<ModelViewResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = base64Jewelry.includes(",") ? base64Jewelry.split(",")[1] : base64Jewelry;
  const modelType = gender === 'male' ? 'modelo masculino sofisticado' : 'modelo feminina elegante';
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { 
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: pureData } }, 
        { text: `Editorial de luxo. ${modelType} usando este(a) ${category} de ${material}. A joia deve ser pequena, delicada e em escala REALISTA (aprox 10% do tamanho da cabeça do modelo), aparecendo como um detalhe minimalista e sofisticado. Luz natural e suave.` }
      ] 
    },
    config: { imageConfig: { aspectRatio: "3:4" } }
  });
  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Erro de geração");
  const rawUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  const cleanUrl = await new Promise<string>((resolve) => {
    const img = new Image();
    img.src = rawUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
  });
  const urlWithLogo = await new Promise<string>((resolve) => {
    const img = new Image();
    img.src = rawUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) { ctx.drawImage(img, 0, 0); addVilacaOverlays(ctx, canvas.width, canvas.height); }
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
  });
  return { imageUrl: urlWithLogo, cleanUrl };
};

export const enhanceJewelryImage = async (base64Image: string): Promise<EnhancedJewelryResponse> => {
  const pureData = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const metaResp = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: pureData } }, { text: "Responda em JSON: categoria (anel, colar, brinco, etc), material (ouro, prata, platina), genero (male/female)." }] },
    config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, material: { type: Type.STRING }, gender: { type: Type.STRING } }, required: ["category", "material", "gender"] } }
  });
  const meta = JSON.parse(metaResp.text || '{}');
  const genResp = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: pureData } }, { text: "Joia centralizada, fundo branco absoluto, foco nítido." }] },
    config: { imageConfig: { aspectRatio: "3:4" } }
  });
  const part = genResp.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  const aiUrl = part?.inlineData ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : base64Image;
  const imageUrl = await applyVivaraFinishing(aiUrl, true);
  const cleanUrl = await applyVivaraFinishing(aiUrl, false);
  return { imageUrl, cleanUrl, ...meta };
};
