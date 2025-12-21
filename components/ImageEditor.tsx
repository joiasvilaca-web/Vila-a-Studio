
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
    mirror: 20
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      applyFilters();
    };
  }, [imageUrl]);

  const applyFilters = () => {
    const canvas = canvasRef.current;
    const buffer = bufferCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !buffer || !img) return;

    const ctx = canvas.getContext('2d');
    const bctx = buffer.getContext('2d');
    if (!ctx || !bctx) return;

    canvas.width = buffer.width = img.width;
    canvas.height = buffer.height = img.height + (img.height * (filters.mirror / 100));

    bctx.clearRect(0, 0, buffer.width, buffer.height);
    bctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) sepia(${filters.warmth}%)`;
    bctx.drawImage(img, 0, 0, img.width, img.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(buffer, 0, 0, img.width, img.height);

    // Reflexo Espelhado
    if (filters.mirror > 0) {
      ctx.save();
      ctx.translate(0, img.height * 2);
      ctx.scale(1, -1);
      const grad = ctx.createLinearGradient(0, img.height, 0, img.height + (img.height * (filters.mirror / 100)));
      grad.addColorStop(0, `rgba(255, 255, 255, ${1 - (filters.mirror / 150)})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 1)');
      ctx.globalAlpha = filters.mirror / 200;
      ctx.drawImage(buffer, 0, img.height, img.width, img.height);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = grad;
      ctx.fillRect(0, img.height, canvas.width, img.height);
      ctx.restore();
    }

    // Marca d'água Vilaça no canto inferior direito
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#662344";
    ctx.font = `bold ${canvas.width * 0.025}px 'Playfair Display'`;
    ctx.textAlign = "right";
    ctx.fillText("VILAÇA STUDIO", canvas.width - 20, canvas.height - 20);
    ctx.restore();
  };

  useEffect(() => {
    const timeout = setTimeout(applyFilters, 50);
    return () => clearTimeout(timeout);
  }, [filters]);

  const handleSave = () => {
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png', 1.0));
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#0d0d0d] flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-500">
      <div className="flex-grow relative flex items-center justify-center p-6 overflow-y-auto">
        <button onClick={onCancel} className="absolute top-8 left-8 p-4 bg-white/5 rounded-full text-white/50">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="bg-white p-4 rounded-xl shadow-2xl">
          <canvas ref={canvasRef} className="max-w-full max-h-[70vh] object-contain" />
        </div>
      </div>

      <div className="w-full md:w-96 bg-[#141414] border-l border-white/5 p-8 flex flex-col">
        <h3 className="text-[#fdd49e] font-serif text-2xl mb-8">Retoque Vivara</h3>
        <div className="space-y-6 flex-grow">
          <div className="space-y-3">
            <label className="text-[9px] uppercase tracking-widest text-white/40">Brilho do Ouro</label>
            <input type="range" min="50" max="150" value={filters.brightness} onChange={e => setFilters(f => ({...f, brightness: +e.target.value}))} className="w-full accent-[#fdd49e]" />
          </div>
          <div className="space-y-3">
            <label className="text-[9px] uppercase tracking-widest text-white/40">Intensidade do Reflexo</label>
            <input type="range" min="0" max="60" value={filters.mirror} onChange={e => setFilters(f => ({...f, mirror: +e.target.value}))} className="w-full accent-[#fdd49e]" />
          </div>
        </div>
        <button onClick={handleSave} className="w-full bg-[#fdd49e] text-[#662344] py-5 font-black uppercase tracking-widest rounded-2xl shadow-xl mt-12">Confirmar</button>
      </div>
      <canvas ref={bufferCanvasRef} className="hidden" />
    </div>
  );
};

export default ImageEditor;
