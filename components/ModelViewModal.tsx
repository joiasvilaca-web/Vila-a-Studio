
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

      <div className="relative max-w-2xl w-full h-auto max-h-[90vh] bg-zinc-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center">
        <img src={modelImageUrl} className="max-w-full max-h-full object-contain" alt="Visualização Full Screen" />
      </div>
    </div>
  );
};

export default ModelViewModal;
