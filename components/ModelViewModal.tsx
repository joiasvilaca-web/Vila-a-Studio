
import React from 'react';

interface ModelViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelImageUrl: string;
  category: string;
}

const ModelViewModal: React.FC<ModelViewModalProps> = ({ isOpen, onClose, modelImageUrl, category }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="absolute top-8 right-8 z-10">
        <button 
          onClick={onClose} 
          className="p-4 bg-white/10 backdrop-blur-xl rounded-full text-white border border-white/10 hover:bg-white/20 transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative max-w-md w-full aspect-[4/5] bg-zinc-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/5">
        <img src={modelImageUrl} className="w-full h-full object-cover" alt="Visualização IA" />
        
        <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
          <div className="text-center">
            <p className="text-[9px] text-white/80 font-bold uppercase tracking-[0.1em] leading-relaxed">
              IMAGEM GERADA POR I.A. PODE CONTER DISTORÇÕES,<br/> SEMPRE FALE COM UMA ATENDENTE.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelViewModal;
