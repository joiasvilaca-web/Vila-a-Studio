
import React, { useState } from 'react';
import Layout from './components/Layout';
import CameraModal from './components/CameraModal';
import { enhanceJewelryImage } from './services/geminiService';
import { ProcessingState, ImageResult } from './types';

const App: React.FC = () => {
  const [image, setImage] = useState<ImageResult | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle' });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        processImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setProcessing({ status: 'loading', message: 'Removendo fundo e polindo metais...' });
    setImage({ original: base64 });
    
    try {
      const result = await enhanceJewelryImage(base64);
      setImage(prev => prev ? { ...prev, processed: result } : { original: base64, processed: result });
      setProcessing({ status: 'success' });
    } catch (error: any) {
      console.error(error);
      setProcessing({ status: 'error', message: error.message || 'Erro ao processar imagem' });
    }
  };

  const handleDownload = () => {
    if (image?.processed) {
      const link = document.createElement('a');
      link.href = image.processed;
      link.download = `vilaca-catalog-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShareResult = async () => {
    if (!image?.processed) return;
    
    const currentUrl = window.location.href;
    const isUrlValid = currentUrl.startsWith('http');
    
    try {
      if (navigator.share && isUrlValid) {
        await navigator.share({
          title: 'Vilaça Joias - Foto Tratada',
          text: 'Acabei de gerar uma foto profissional da minha joia no Vilaça Studio!',
          url: currentUrl,
        });
      } else {
        await navigator.clipboard.writeText(currentUrl);
        alert('Link do estúdio copiado para compartilhar!');
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
      alert('Link copiado para a área de transferência.');
    }
  };

  const reset = () => {
    setImage(null);
    setProcessing({ status: 'idle' });
  };

  return (
    <Layout>
      {processing.status === 'idle' && (
        <div className="max-w-2xl mx-auto mt-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-12">
            <h2 className="text-4xl md:text-5xl font-serif text-[#662344] mb-4">Vilaça Estúdio</h2>
            <p className="text-[#662344]/60 tracking-widest text-[10px] uppercase">Tratamento profissional de fotos</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <button 
              onClick={() => setIsCameraOpen(true)}
              className="flex flex-col items-center justify-center p-12 border border-[#fdd49e]/40 bg-white hover:bg-[#fdd49e]/5 transition-all group shadow-sm active:scale-95"
            >
              <div className="w-14 h-14 mb-4 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#662344]">Tirar Foto</span>
            </button>

            <label className="flex flex-col items-center justify-center p-12 border border-[#fdd49e]/40 bg-white hover:bg-[#fdd49e]/5 transition-all cursor-pointer group shadow-sm active:scale-95">
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              <div className="w-14 h-14 mb-4 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#662344]">Upload Galeria</span>
            </label>
          </div>
        </div>
      )}

      {(processing.status !== 'idle') && (
        <div className="animate-in fade-in duration-500">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            <div className="flex-grow w-full space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#662344]/50 font-bold">Foto Original</span>
                  <div className="aspect-square bg-zinc-100 flex items-center justify-center overflow-hidden border border-[#fdd49e]/20">
                    <img src={image?.original} alt="Original" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <span className="text-[10px] uppercase tracking-widest text-[#662344] font-bold italic">Padrão Vilaça Joias</span>
                  <div className={`aspect-square flex items-center justify-center overflow-hidden border border-[#fdd49e]/40 relative transition-all ${processing.status === 'loading' ? 'bg-white' : 'bg-white shadow-2xl'}`}>
                    {processing.status === 'loading' ? (
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 border-t-2 border-[#662344] border-r-2 border-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-[10px] uppercase tracking-widest text-[#662344] animate-pulse font-bold">Processando Joia...</p>
                      </div>
                    ) : image?.processed ? (
                      <img src={image.processed} alt="Processed" className="w-full h-full object-contain animate-in zoom-in-95 duration-1000" />
                    ) : (
                      <div className="p-8 text-center text-red-600 text-xs font-medium">
                        {processing.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-80 flex flex-col gap-4">
               <div className="p-8 border border-[#fdd49e]/30 bg-white shadow-lg text-center">
                  <h3 className="text-xl font-serif text-[#662344] mb-8 uppercase tracking-widest font-bold border-b border-[#fdd49e]/20 pb-4">Ações</h3>

                  <div className="space-y-4">
                    <button 
                      disabled={processing.status !== 'success'}
                      onClick={handleDownload}
                      className="w-full bg-[#662344] text-[#fdd49e] py-5 text-xs uppercase tracking-widest font-bold hover:brightness-125 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md active:scale-95"
                    >
                      Download PNG
                    </button>

                    <button 
                      disabled={processing.status !== 'success'}
                      onClick={handleShareResult}
                      className="w-full border border-[#fdd49e] text-[#662344] py-5 text-xs uppercase tracking-widest font-bold hover:bg-[#fdd49e]/10 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                      Compartilhar Link
                    </button>
                    
                    <button 
                      onClick={reset}
                      className="w-full border border-zinc-200 text-zinc-400 py-4 text-[9px] uppercase tracking-widest font-bold hover:bg-zinc-50 transition-all mt-4"
                    >
                      Nova Fotografia
                    </button>
                  </div>
               </div>

               {processing.status === 'success' && (
                 <div className="p-4 bg-[#662344] border border-[#fdd49e]/30 flex items-center justify-center gap-3">
                    <p className="text-[9px] text-[#fdd49e] font-bold leading-relaxed uppercase tracking-widest">
                      Fundo removido e brilho otimizado.
                    </p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={processImage} 
      />
    </Layout>
  );
};

export default App;
