
import React, { useState, useEffect } from 'react';
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
    setProcessing({ status: 'loading', message: 'Removendo fundo e otimizando iluminação...' });
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
      link.download = `vilaca-joias-${Date.now()}.png`;
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
          title: 'Joia Tratada - Vilaça Studio',
          text: 'Confira o resultado do tratamento profissional de imagem da minha joia.',
          url: currentUrl,
        });
      } else {
        await navigator.clipboard.writeText(currentUrl);
        alert('Link do estúdio copiado para a área de transferência!');
      }
    } catch (err) {
      console.error('Erro ao compartilhar resultado:', err);
      try {
        await navigator.clipboard.writeText(currentUrl);
        alert('Link copiado!');
      } catch (clipErr) {
        // Fallback final silencioso ou log
      }
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
          <div className="mb-10">
            <h2 className="text-4xl font-serif text-[#662344] mb-4">A perfeição em um clique.</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <button 
              onClick={() => setIsCameraOpen(true)}
              className="flex flex-col items-center justify-center p-12 border border-[#fdd49e]/30 bg-white hover:bg-[#fdd49e]/5 transition-all group shadow-sm active:scale-95"
            >
              <div className="w-12 h-12 mb-4 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#662344]">Tirar Foto</span>
            </button>

            <label className="flex flex-col items-center justify-center p-12 border border-[#fdd49e]/30 bg-white hover:bg-[#fdd49e]/5 transition-all cursor-pointer group shadow-sm active:scale-95">
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              <div className="w-12 h-12 mb-4 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#662344]">Subir da Galeria</span>
            </label>
          </div>
        </div>
      )}

      {(processing.status === 'loading' || processing.status === 'success' || processing.status === 'error') && (
        <div className="animate-in fade-in duration-500">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            <div className="flex-grow w-full space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#662344]/50 font-bold">Original</span>
                  <div className="aspect-square bg-zinc-100 flex items-center justify-center overflow-hidden border border-[#fdd49e]/20">
                    <img src={image?.original} alt="Original" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <span className="text-[10px] uppercase tracking-widest text-[#662344] font-bold italic">Resultado Vilaça</span>
                  <div className={`aspect-square flex items-center justify-center overflow-hidden border border-[#fdd49e]/40 relative transition-all ${processing.status === 'loading' ? 'bg-white' : 'bg-white shadow-xl'}`}>
                    {processing.status === 'loading' ? (
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-t-2 border-[#662344] border-r-2 border-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-[10px] uppercase tracking-widest text-[#662344] animate-pulse font-bold">Otimizando Brilho...</p>
                      </div>
                    ) : image?.processed ? (
                      <img src={image.processed} alt="Processed" className="w-full h-full object-contain animate-in fade-in duration-1000" />
                    ) : (
                      <div className="p-8 text-center text-red-600 text-xs font-medium">
                        {processing.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-72 flex flex-col gap-4">
               <div className="p-6 border border-[#fdd49e]/30 bg-white shadow-md text-center">
                  <h3 className="text-xl font-serif text-[#662344] mb-6 uppercase tracking-widest font-bold">FOTO TRATADA</h3>

                  <div className="space-y-3">
                    <button 
                      disabled={processing.status !== 'success'}
                      onClick={handleDownload}
                      className="w-full bg-[#662344] text-[#fdd49e] py-4 text-xs uppercase tracking-widest font-bold hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm active:scale-95"
                    >
                      Baixar Imagem
                    </button>

                    <button 
                      disabled={processing.status !== 'success'}
                      onClick={handleShareResult}
                      className="w-full border border-[#fdd49e] text-[#662344] py-4 text-xs uppercase tracking-widest font-bold hover:bg-[#fdd49e]/10 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9a3 3 0 100-2.684 3 3 0 000 2.684z" />
                      </svg>
                      Compartilhar Link
                    </button>
                    
                    <button 
                      onClick={reset}
                      className="w-full border border-[#662344] text-[#662344] py-4 text-xs uppercase tracking-widest font-bold hover:bg-[#662344] hover:text-[#fdd49e] transition-all"
                    >
                      Nova Joia
                    </button>
                  </div>
               </div>

               {processing.status === 'success' && (
                 <div className="p-4 bg-[#fdd49e]/10 border border-[#fdd49e]/30 flex items-center justify-center gap-3">
                    <svg className="w-5 h-5 text-[#662344]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[10px] text-[#662344] font-medium leading-relaxed uppercase tracking-tight">
                      Pronto para seu site.
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
