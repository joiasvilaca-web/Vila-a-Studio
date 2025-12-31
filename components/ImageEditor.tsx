
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
    warmth: 0
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

    mainCanvas.width = bCanvas.width = w;
    mainCanvas.height = bCanvas.height = h;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    bCtx.clearRect(0, 0, w, h);
    bCtx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) sepia(${filters.warmth}%)`;
    bCtx.drawImage(img, 0, 0, w, h);

    const sourceData = sCtx.getImageData(0, 0, w, h);
    const filterData = bCtx.getImageData(0, 0, w, h);
    const finalData = ctx.getImageData(0, 0, w, h);

    const sPixels = sourceData.data;
    const fPixels = filterData.data;
    const outPixels = finalData.data;

    for (let i = 0; i < sPixels.length; i += 4) {
      if (sPixels[i] < 235 || sPixels[i+1] < 235 || sPixels[i+2] < 235) {
        outPixels[i] = fPixels[i];
        outPixels[i+1] = fPixels[i+1];
        outPixels[i+2] = fPixels[i+2];
        outPixels[i+3] = 255;
      } else {
        outPixels[i] = 255;
        outPixels[i+1] = 255;
        outPixels[i+2] = 255;
        outPixels[i+3] = 255;
      }
    }
    ctx.putImageData(finalData, 0, 0);
  };

  useEffect(() => {
    const timer = setTimeout(applyFilters, 50);
    return () => clearTimeout(timer);
  }, [filters]);

  const handleSave = () => {
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/jpeg', 0.95));
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#020202] flex flex-col md:flex-row overflow-hidden animate-in fade-in">
      <div className="flex-grow relative flex items-center justify-center p-4 md:p-16">
        <button onClick={onCancel} className="absolute top-8 left-8 p-4 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors z-10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="bg-white p-2 rounded-xl shadow-2xl overflow-hidden border-4 border-white">
          <canvas ref={canvasRef} className="max-w-full max-h-[70vh] object-contain" />
        </div>
      </div>

      <div className="w-full md:w-96 bg-[#080808] border-l border-white/5 p-10 flex flex-col">
        <div className="mb-12 text-center">
          <h3 className="text-[#fdd49e] font-serif text-3xl italic">Vilaça Joalheria</h3>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black mt-3">Ajustes Digitais de Precisão</p>
        </div>
        
        <div className="space-y-12 flex-grow">
          <div className="space-y-4">
            <div className="flex justify-between text-[11px] text-white/40 uppercase font-bold tracking-widest">
               <span>Brilho</span>
               <span className="text-[#fdd49e]">{filters.brightness}%</span>
            </div>
            <input type="range" min="60" max="150" value={filters.brightness} onChange={e => setFilters(f => ({...f, brightness: +e.target.value}))} className="w-full accent-[#fdd49e]" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-[11px] text-white/40 uppercase font-bold tracking-widest">
               <span>Contraste</span>
               <span className="text-[#fdd49e]">{filters.contrast}%</span>
            </div>
            <input type="range" min="80" max="140" value={filters.contrast} onChange={e => setFilters(f => ({...f, contrast: +e.target.value}))} className="w-full accent-[#fdd49e]" />
          </div>
        </div>
        
        <div className="pt-10 border-t border-white/5">
           <button onClick={handleSave} className="w-full bg-[#fdd49e] text-[#662344] py-6 font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:brightness-110 transition-all">Salvar Edição</button>
        </div>
      </div>
      
      <canvas ref={sourceCanvasRef} className="hidden" />
      <canvas ref={filterBufferRef} className="hidden" />
    </div>
  );
};

export default ImageEditor;
