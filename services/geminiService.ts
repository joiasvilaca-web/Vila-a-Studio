
import { GoogleGenAI, Type } from "@google/genai";

export interface EnhancedJewelryResponse {
  imageUrl: string;
  cleanUrl: string; // Versão sem logo para o composite
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
  sources: { uri: string; title: string }[];
}

/**
 * Calcula a luminosidade média de uma área específica para decidir a cor do texto.
 */
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
      // Luminosidade perceptiva
      brightnessSum += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }
    return brightnessSum / (data.length / 4);
  } catch (e) {
    return 255; 
  }
};

/**
 * Adiciona Marcas d'água com cores inteligentes (Dark/Light mode automático).
 */
const addVilacaOverlays = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.save();
  
  // 1. Cor da Logo (Canto Direito Inferior)
  const logoAreaBrightness = getAreaBrightness(ctx, w - 250, h - 80, 220, 60);
  const isDarkBackground = logoAreaBrightness < 135;
  
  const logoColor = isDarkBackground ? 'rgba(253, 212, 158, 0.95)' : 'rgba(102, 35, 68, 0.95)';
  const shadowColor = isDarkBackground ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';

  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 5;
  ctx.fillStyle = logoColor;
  ctx.textAlign = 'right';
  
  // Nome Vilaça
  ctx.font = 'bold 28px "Playfair Display", serif';
  ctx.fillText('VILAÇA', w - 30, h - 50);
  
  // Subtítulo
  ctx.font = 'italic 10px "Inter", sans-serif';
  ctx.fillText('Joalheria e Ourivesaria', w - 30, h - 35);

  // 2. Cor do Disclaimer (Centro Inferior)
  const discAreaBrightness = getAreaBrightness(ctx, w / 2 - 150, h - 50, 300, 40);
  const discColor = discAreaBrightness < 135 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';

  ctx.shadowColor = discAreaBrightness < 135 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
  ctx.shadowBlur = 3;
  ctx.textAlign = 'center';
  ctx.fillStyle = discColor;
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.fillText('Uso de I.A. pode conter distorções', w / 2, h - 35);
  ctx.fillText('Consulte uma atendente', w / 2, h - 20);
  
  ctx.restore();
};

/**
 * Recorte profissional: Remove fundo e aplica reflexo sutil APENAS abaixo da peça.
 */
const applyVivaraFinishing = (base64: string, addLogo: boolean = true): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64;
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const reflectionHeight = h * 0.10; // Reduzido para ser mais discreto
      
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h + reflectionHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(base64);

      // Fundo Branco Absoluto
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Buffer para transparência
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
          // Limpeza agressiva de pixels "quase brancos" (fundo)
          if (r > 242 && g > 242 && b > 242) data[i+3] = 0; 
        }
        tCtx.putImageData(imageData, 0, 0);
      }

      // Desenha Joia centralizada
      ctx.drawImage(tempCanvas, 0, 0);

      // Reflexo Sutil apenas na base
      ctx.save();
      ctx.translate(0, h * 2); 
      ctx.scale(1, -1);
      ctx.globalAlpha = 0.05; 
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

/**
 * Moodboard: Zoom sutil para foco na joia sem perder a escala minimalista.
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
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(cleanProductUrl);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        const halfH = height / 2;
        
        // Superior: Foto Técnica
        const pScale = (width * 0.8) / Math.max(productImg.width, productImg.height);
        const pW = productImg.width * pScale;
        const pH = productImg.height * pScale;
        ctx.drawImage(productImg, (width - pW) / 2, (halfH - pH) / 2, pW, pH);

        // Inferior: Lookbook (Zoom 1.2x para foco mas mantendo a joia minimalista)
        ctx.save();
        ctx.beginPath(); ctx.rect(0, halfH, width, halfH); ctx.clip();
        
        const zoom = 1.2; 
        const mScale = Math.max(width / modelImg.width, halfH / modelImg.height) * zoom;
        const mW = modelImg.width * mScale;
        const mH = modelImg.height * mScale;
        
        const x = (width - mW) / 2;
        const y = halfH + (halfH - mH) / 2 - (mH * 0.08); // Centraliza no busto/pescoço
        
        ctx.drawImage(modelImg, x, y, mW, mH);
        ctx.restore();

        // Linha Divisória Luxury
        ctx.strokeStyle = 'rgba(102, 35, 68, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(width * 0.1, halfH); ctx.lineTo(width * 0.9, halfH); ctx.stroke();

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
  const prompt = `Gere uma narrativa de luxo curta para um(a) ${category} de ${material} em PORTUGUÊS. Pesquise as 5 hashtags de joalheria mais acessadas do Brasil nos últimos dias. Retorne em JSON.`;
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
    return { story: "A elegância da Vilaça em cada detalhe.", hashtags: ["#vilaca", "#joias", "#luxo", "#ouro", "#estilo"], sources: [] };
  }
};

/**
 * Geração da Modelo com escala minimalista e realista da joia.
 */
export const generateModelView = async (base64Jewelry: string, category: string, material: string, gender: string): Promise<ModelViewResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pureData = base64Jewelry.includes(",") ? base64Jewelry.split(",")[1] : base64Jewelry;
  const modelType = gender === 'male' ? 'modelo masculino de alta classe' : 'modelo feminina elegante';
  
  // Prompt focado em escala reduzida e naturalidade
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { 
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: pureData } }, 
        { text: `Fotografia editorial de luxo: ${modelType} usando este(a) ${category} de ${material}. IMPORTANTE: A joia deve ser pequena, delicada e em escala REALISTA, aparecendo como um detalhe minimalista e sofisticado no look. Sem exageros de tamanho. Luz natural de estúdio.` }
      ] 
    },
    config: { imageConfig: { aspectRatio: "3:4" } }
  });
  
  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Falha na geração");
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
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        addVilacaOverlays(ctx, canvas.width, canvas.height);
      }
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
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: pureData } }, { text: "Responda em JSON: categoria, material, genero (male/female)." }] },
    config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, material: { type: Type.STRING }, gender: { type: Type.STRING } }, required: ["category", "material", "gender"] } }
  });
  const meta = JSON.parse(metaResp.text || '{}');

  const genResp = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: pureData } }, { text: "Joia centralizada, fundo branco puro, nitidez 8k." }] },
    config: { imageConfig: { aspectRatio: "3:4" } }
  });
  
  const part = genResp.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  const aiUrl = part?.inlineData ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : base64Image;
  
  const imageUrl = await applyVivaraFinishing(aiUrl, true);
  const cleanUrl = await applyVivaraFinishing(aiUrl, false);

  return { imageUrl, cleanUrl, ...meta };
};
