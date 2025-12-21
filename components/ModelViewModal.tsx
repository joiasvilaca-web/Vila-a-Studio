
import React from 'react';
import Logo from './Logo';

interface ModelViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelImageUrl: string;
  category: string;
}

const ModelViewModal: React.FC<ModelViewModalProps> = ({ isOpen, onClose, modelImageUrl, category }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="absolute top-8 right-8 z-10">
        <button 
          onClick={onClose} 
          className="p-4 bg-white/10 backdrop-blur-xl rounded-full text-white border border-white/10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative max-w-4xl w-full aspect-[4/5] bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <img src={modelImageUrl} className="w-full h-full object-cover" alt="Modelo IA" />
        
        {/* Logomarca no canto inferior direito da imagem */}
        <div className="absolute bottom-6 right-6 opacity-60">
           <Logo color="white" className="h-10" showText={false} />
           <p className="text-[8px] text-white text-right font-serif tracking-widest mt-1">VILAÇA</p>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
          <div className="text-center">
            <span className="text-[10px] text-[#fdd49e] font-black uppercase tracking-[0.5em]">Editorial Vivara Style</span>
            <h3 className="text-white font-serif text-2xl italic mt-1">{category} em Uso</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelViewModal;
