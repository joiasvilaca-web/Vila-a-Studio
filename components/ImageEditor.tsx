
import React, { useState, useEffect, useRef } from 'react';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onSave, onCancel }) => {
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    warmth: 0,
    mirror: 10
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null); 
  const filterBufferRef = useRef<HTMLCanvasElement>(null); 
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      
      const sCanvas = sourceCanvasRef.current;
      if (sCanvas) {
        sCanvas.width = img.width;
        sCanvas.height = img.height;
        const sCtx = sCanvas.getContext('2d', { willReadFrequently: true });
        sCtx?.drawImage(img, 0, 0);
      }
      
      applyFilters();
    };
  }, [imageUrl]);

  const applyFilters = () => {
    const mainCanvas = canvasRef.current;
    const sCanvas = sourceCanvasRef.current;
    const bCanvas = filterBufferRef.current;
    const img = imageRef.current;
    
    if (!mainCanvas || !sCanvas || !bCanvas || !img) return;

    const ctx = mainCanvas.getContext('2d');
    const bCtx = bCanvas.getContext('2d', { willReadFrequently: true });
    const sCtx = sCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !bCtx || !sCtx) return;

    const w = img.width;
    const h = img.height;
    const totalHeight = h + (h * (filters.mirror / 100));

    mainCanvas.width = bCanvas.width = w;
    mainCanvas.height = bCanvas.height = totalHeight;

    // 1. FUNDO BLINDADO: Preenchemos o canvas principal com Branco Puro imutável
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, totalHeight);

    // 2. BUFFER DE AJUSTE: Aplicamos os filtros de brilho/contraste no buffer temporário
    bCtx.clearRect(0, 0, w, totalHeight);
    bCtx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) sepia(${filters.warmth}%)`;
    bCtx.drawImage(img, 0, 0, w, h);
    bCtx.filter = 'none';

    // 3. TRANSFERÊNCIA SELETIVA (MÁSCARA CIRÚRGICA)
    // Analisamos o original para saber exatamente onde está o objeto (pixels não-brancos)
    const sourceData = sCtx.getImageData(0, 0, w, h);
    const filterData = bCtx.getImageData(0, 0, w, h);
    const finalData = ctx.getImageData(0, 0, w, h);

    const sPixels = sourceData.data;
    const fPixels = filterData.data;
    const outPixels = finalData.data;

    // Um pixel é considerado fundo se for muito próximo do branco puro
    const bgThreshold = 250; 

    for (let i = 0; i < sPixels.length; i += 4) {
      const r = sPixels[i];
      const g = sPixels[i+1];
      const b = sPixels[i+2];

      // Se o pixel original NÃO for fundo branco, ele é objeto e recebe o ajuste
      if (r < bgThreshold || g < bgThreshold || b < bgThreshold) {
        outPixels[i] = fPixels[i];
        outPixels[i+1] = fPixels[i+1];
        outPixels[i+2] = fPixels[i+2];
        outPixels[i+3] = 255;
      } else {
        // Se for fundo, mantemos o branco puro preenchido no passo 1
        // Não alteramos outPixels[i...i+3] pois o fillRect já cuidou disso
      }
    }
    ctx.putImageData(finalData, 0, 0);

    // 4. REFLEXO DE ESTÚDIO (Opcional)
    if (filters.mirror > 0) {
      ctx.save();
      const mirrorH = h * (filters.mirror / 100);
      ctx.translate(0, h * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = 0.08; 
      
      // Desenha o objeto já filtrado no reflexo, respeitando a máscara
      ctx.drawImage(bCanvas, 0, h, w, h);
      
      // Fade-out do reflexo
      ctx.globalCompositeOperation = 'destination-out';
      const grad = ctx.createLinearGradient(0, h, 0, h + mirrorH);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, h, w, h);
      ctx.restore();
    }
  };

  useEffect(() => {
    const timer = setTimeout(applyFilters, 40);
    return () => clearTimeout(timer);
  }, [filters]);

  const handleSave = () => {
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png', 1.0));
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#020202] flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-500">
      <div className="flex-grow relative flex items-center justify-center p-4 md:p-16 overflow-y-auto">
        <button onClick={onCancel} className="absolute top-8 left-8 p-4 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors z-10 backdrop-blur-md">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div className="bg-white p-1 rounded-2xl shadow-[0_60px_120px_rgba(0,0,0,0.9)] max-w-full">
          <canvas ref={canvasRef} className="max-w-full max-h-[75vh] object-contain rounded-xl" />
        </div>
      </div>

      <div className="w-full md:w-96 bg-[#080808] border-l border-white/5 p-10 flex flex-col shadow-2xl">
        <div className="mb-12 text-center">
          <h3 className="text-[#fdd49e] font-serif text-3xl uppercase tracking-tighter italic">Photo Treatment</h3>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black mt-3">Fidelidade Vilaça Joias</p>
        </div>
        
        <div className="space-y-12 flex-grow">
          <div className="space-y-5">
            <div className="flex justify-between items-end">
               <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Luz do Objeto</label>
               <span className="text-[10px] text-[#fdd49e] font-mono">{filters.brightness}%</span>
            </div>
            <input type="range" min="60" max="160" value={filters.brightness} onChange={e => setFilters(f => ({...f, brightness: +e.target.value}))} className="w-full accent-[#fdd49e]" />
          </div>
          
          <div className="space-y-5">
            <div className="flex justify-between items-end">
               <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Definição Metal</label>
               <span className="text-[10px] text-[#fdd49e] font-mono">{filters.contrast}%</span>
            </div>
            <input type="range" min="80" max="140" value={filters.contrast} onChange={e => setFilters(f => ({...f, contrast: +e.target.value}))} className="w-full accent-[#fdd49e]" />
          </div>

          <div className="space-y-5">
            <div className="flex justify-between items-end">
               <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Reflexo de Base</label>
               <span className="text-[10px] text-[#fdd49e] font-mono">{filters.mirror}%</span>
            </div>
            <input type="range" min="0" max="30" value={filters.mirror} onChange={e => setFilters(f => ({...f, mirror: +e.target.value}))} className="w-full accent-[#fdd49e]" />
          </div>
        </div>
        
        <div className="pt-10 border-t border-white/5">
           <button onClick={handleSave} className="w-full bg-[#fdd49e] text-[#662344] py-6 font-black uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 transition-all shadow-xl active:scale-95 mb-4">Finalizar Tratamento</button>
           <p className="text-[9px] text-white/20 text-center uppercase tracking-widest leading-relaxed">Nota: O fundo branco (#FFFFFF) permanece inalterado para preservação do catálogo.</p>
        </div>
      </div>
      
      <canvas ref={sourceCanvasRef} className="hidden" />
      <canvas ref={filterBufferRef} className="hidden" />
    </div>
  );
};

export default ImageEditor;
