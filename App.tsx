
import React, { useState } from 'react';
import Layout from './components/Layout';
import CameraModal from './components/CameraModal';
import TryOnModal from './components/TryOnModal';
import ImageEditor from './components/ImageEditor';
import ModelViewModal from './components/ModelViewModal';
import { enhanceJewelryImage, generateModelView, EnhancedJewelryResponse } from './services/geminiService';
import { ProcessingState } from './types';

interface AppImageState {
  original: string;
  processed?: string;
  edited?: string;
  category?: EnhancedJewelryResponse['category'];
  material?: EnhancedJewelryResponse['material'];
}

const App: React.FC = () => {
  const [image, setImage] = useState<AppImageState | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isModelViewOpen, setIsModelViewOpen] = useState(false);
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle' });

  const processImage = async (base64: string) => {
    setProcessing({ status: 'loading', message: 'Tratando joia no padrão editorial...' });
    setImage({ original: base64 });
    
    try {
      const result = await enhanceJewelryImage(base64);
      setImage({ 
        original: base64, 
        processed: result.imageUrl, 
        edited: result.imageUrl,
        category: result.category,
        material: result.material
      });
      setProcessing({ status: 'success' });
    } catch (error: any) {
      console.error(error);
      setProcessing({ status: 'error', message: error.message || 'Erro ao mapear a peça.' });
    }
  };

  const handleGenerateModelView = async () => {
    if (!image?.edited || !image.category || !image.material) return;
    setProcessing({ status: 'loading', message: 'Criando cenário editorial...' });
    
    try {
      const url = await generateModelView(image.edited, image.category, image.material);
      setModelImageUrl(url);
      setIsModelViewOpen(true);
      setProcessing({ status: 'success' });
    } catch (error: any) {
      console.error(error);
      setProcessing({ status: 'error', message: error.message || 'Erro ao gerar modelo.' });
    }
  };

  const handleSaveEdition = (newUrl: string) => {
    setImage(prev => prev ? { ...prev, edited: newUrl } : null);
    setIsEditorOpen(false);
  };

  const reset = () => {
    setImage(null);
    setModelImageUrl(null);
    setProcessing({ status: 'idle' });
  };

  return (
    <Layout>
      {processing.status === 'idle' ? (
        <div className="max-w-2xl mx-auto mt-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-16">
            <h1 className="text-[#662344] font-serif text-4xl md:text-5xl mb-4 tracking-tight">Estúdio Digital</h1>
            <p className="text-[#662344]/60 tracking-[0.4em] text-[10px] uppercase font-bold">Mapeamento & Provador Virtual</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <button 
              onClick={() => setIsCameraOpen(true)}
              className="flex flex-col items-center justify-center p-14 border-2 border-[#fdd49e]/30 bg-white hover:border-[#fdd49e] hover:bg-[#fdd49e]/5 transition-all group shadow-sm active:scale-95 rounded-[2.5rem]"
            >
              <div className="w-16 h-16 mb-6 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <span className="text-xs uppercase tracking-[0.3em] font-black text-[#662344]">Capturar Joia</span>
            </button>

            <label className="flex flex-col items-center justify-center p-14 border-2 border-[#fdd49e]/30 bg-white hover:border-[#fdd49e] hover:bg-[#fdd49e]/5 transition-all cursor-pointer group shadow-sm active:scale-95 rounded-[2.5rem]">
              <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => processImage(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }} />
              <div className="w-16 h-16 mb-6 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <span className="text-xs uppercase tracking-[0.3em] font-black text-[#662344]">Abrir Galeria</span>
            </label>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            <div className="flex-grow w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-widest text-[#662344]/40 font-black">Original</span>
                  <div className="aspect-square bg-zinc-100 flex items-center justify-center overflow-hidden border border-[#fdd49e]/10 rounded-3xl shadow-inner">
                    <img src={image?.original} alt="Original" className="w-full h-full object-contain p-4" />
                  </div>
                </div>

                <div className="space-y-3 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest text-[#662344] font-black">Resultado Editorial</span>
                    {processing.status === 'success' && (
                      <button 
                        onClick={() => setIsEditorOpen(true)}
                        className="text-[9px] uppercase font-black text-[#662344] bg-[#fdd49e] px-4 py-1.5 rounded-full hover:brightness-105 transition-all shadow-sm"
                      >
                        Ajustar Estética
                      </button>
                    )}
                  </div>
                  <div className={`aspect-square flex items-center justify-center overflow-hidden border-2 border-[#fdd49e]/20 relative transition-all rounded-3xl ${processing.status === 'loading' ? 'bg-white' : 'bg-white shadow-2xl'}`}>
                    {processing.status === 'loading' ? (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-t-2 border-[#662344] border-r-2 border-transparent rounded-full animate-spin mb-6"></div>
                        <p className="text-[10px] uppercase tracking-widest text-[#662344] animate-pulse font-black px-8 text-center">{processing.message || 'Escaneando...'}</p>
                      </div>
                    ) : (
                      <>
                        {image?.edited ? (
                            <img src={image?.edited} alt="Processed" className="w-full h-full object-contain animate-in zoom-in-95 duration-1000 p-2" />
                        ) : (
                            <div className="text-xs text-zinc-400">Falha ao carregar visualização</div>
                        )}
                        <div className="absolute bottom-6 right-6 bg-[#662344]/90 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                           <span className="text-[9px] uppercase tracking-widest font-black text-[#fdd49e]">{image?.material} • {image?.category}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {processing.status === 'error' && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold uppercase text-center">
                          {processing.message}
                          <button onClick={reset} className="block w-full mt-2 underline opacity-60">Tentar novamente</button>
                      </div>
                  )}
                </div>
            </div>

            <div className="w-full lg:w-96 space-y-6">
              <div className="p-10 border-2 border-[#fdd49e]/20 bg-white shadow-2xl text-center rounded-[3rem]">
                <h3 className="text-2xl font-serif text-[#662344] mb-10 uppercase tracking-widest font-black border-b border-[#fdd49e]/10 pb-6 italic">Experience</h3>
                <div className="space-y-5">
                  <button 
                    disabled={processing.status !== 'success' || !image?.edited}
                    onClick={() => setIsTryOnOpen(true)}
                    className="w-full bg-[#662344] text-[#fdd49e] py-6 text-[11px] uppercase tracking-[0.2em] font-black hover:brightness-110 transition-all disabled:opacity-20 flex items-center justify-center gap-3 shadow-xl rounded-2xl active:scale-95"
                  >
                    Provador em Tempo Real
                  </button>
                  <button 
                    disabled={processing.status !== 'success' || !image?.edited}
                    onClick={handleGenerateModelView}
                    className="w-full bg-[#fdd49e] text-[#662344] py-6 text-[11px] uppercase tracking-[0.2em] font-black hover:brightness-105 transition-all disabled:opacity-20 flex items-center justify-center gap-3 shadow-xl rounded-2xl active:scale-95"
                  >
                    Ver no Modelo (IA)
                  </button>
                  <button onClick={reset} className="w-full text-zinc-400 py-4 text-[9px] uppercase tracking-[0.4em] font-black hover:text-[#662344] transition-all mt-4">Nova Captura</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={processImage} />
      
      {isEditorOpen && image?.processed && (
        <ImageEditor 
          imageUrl={image.processed} 
          onSave={handleSaveEdition} 
          onCancel={() => setIsEditorOpen(false)} 
        />
      )}

      {isTryOnOpen && image?.edited && image.category && (
        <TryOnModal 
            isOpen={isTryOnOpen} 
            onClose={() => setIsTryOnOpen(false)} 
            image={image.edited} 
            category={image.category}
        />
      )}

      {isModelViewOpen && modelImageUrl && image?.category && (
        <ModelViewModal 
          isOpen={isModelViewOpen} 
          onClose={() => setIsModelViewOpen(false)} 
          modelImageUrl={modelImageUrl} 
          category={image.category}
        />
      )}
    </Layout>
  );
};

export default App;
