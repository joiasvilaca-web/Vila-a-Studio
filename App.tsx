
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
  
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const [userObservation, setUserObservation] = useState('');

  // Função centralizada para garantir que o usuário tenha uma chave de API selecionada
  const ensureApiKey = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await aistudio.openSelectKey();
          // Race condition: assumimos sucesso após abrir o diálogo conforme instruções
          return true;
        }
        return true;
      }
    } catch (e) {
      console.warn("AI Studio API check not available, continuing with default key...");
    }
    return true;
  };

  const handleCaptureOrUpload = (base64: string) => {
    setPendingBase64(base64);
    setShowObservationDialog(true);
  };

  const processImage = async (base64: string, observation?: string) => {
    setShowObservationDialog(false);
    
    // Garantir chave antes de iniciar processamento pesado
    await ensureApiKey();
    
    setProcessing({ status: 'loading', message: 'Iniciando extração e retoque Vilaça...' });
    setImage({ original: base64 });
    
    try {
      const result = await enhanceJewelryImage(base64, observation);
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
      
      // Se o erro for de entidade/permissão, forçar nova seleção de chave
      if (error.message?.includes('Requested entity was not found') || error.message?.includes('permission')) {
        const aistudio = (window as any).aistudio;
        if (aistudio) await aistudio.openSelectKey();
        setProcessing({ status: 'error', message: 'Erro de Permissão API. Selecione uma chave paga (billing ativo) para o modelo Pro.' });
      } else {
        setProcessing({ status: 'error', message: error.message || 'Erro ao processar a joia.' });
      }
    }
    setPendingBase64(null);
    setUserObservation('');
  };

  const handleGenerateModelView = async () => {
    if (!image?.edited || !image.category || !image.material) return;

    await ensureApiKey();

    setProcessing({ status: 'loading', message: 'Gerando ambientação real com modelo...' });
    
    try {
      const url = await generateModelView(image.edited, image.category, image.material);
      setModelImageUrl(url);
      setIsModelViewOpen(true);
      setProcessing({ status: 'success' });
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('Requested entity was not found')) {
        const aistudio = (window as any).aistudio;
        if (aistudio) await aistudio.openSelectKey();
      }
      setProcessing({ status: 'error', message: 'Erro de permissão no modelo Pro. Verifique sua chave API.' });
    }
  };

  const reset = () => {
    setImage(null);
    setModelImageUrl(null);
    setProcessing({ status: 'idle' });
    setPendingBase64(null);
    setUserObservation('');
  };

  return (
    <Layout>
      {processing.status === 'idle' ? (
        <div className="max-w-2xl mx-auto mt-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-16">
            <h1 className="text-[#662344] font-serif text-4xl md:text-5xl mb-4 tracking-tight">Vilaça I.A. Studio</h1>
            <p className="text-[#662344]/60 text-sm tracking-wide">Excelência em fotografia e pós-processamento de joias</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <button 
              onClick={() => setIsCameraOpen(true)}
              className="flex flex-col items-center justify-center p-14 border-2 border-[#fdd49e]/40 bg-white hover:border-[#fdd49e] hover:shadow-[0_20px_50px_rgba(253,212,158,0.2)] transition-all group active:scale-95 rounded-[2.5rem]"
            >
              <div className="w-16 h-16 mb-6 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <span className="text-xs uppercase tracking-[0.3em] font-black text-[#662344]">Tirar Foto</span>
            </button>

            <label className="flex flex-col items-center justify-center p-14 border-2 border-[#fdd49e]/40 bg-white hover:border-[#fdd49e] hover:shadow-[0_20px_50px_rgba(253,212,158,0.2)] transition-all cursor-pointer group active:scale-95 rounded-[2.5rem]">
              <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => handleCaptureOrUpload(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }} />
              <div className="w-16 h-16 mb-6 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <span className="text-xs uppercase tracking-[0.3em] font-black text-[#662344]">Anexar Foto</span>
            </label>
          </div>
          
          <div className="mt-12">
            <button 
              onClick={() => (window as any).aistudio?.openSelectKey()}
              className="text-[10px] uppercase tracking-widest text-[#662344]/40 font-bold hover:text-[#662344] transition-colors"
            >
              Configurar Chave API Studio
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            <div className="flex-grow w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-widest text-[#662344]/40 font-black">Original</span>
                  <div className="aspect-square bg-white flex items-center justify-center overflow-hidden border border-[#fdd49e]/20 rounded-3xl shadow-sm">
                    <img src={image?.original} alt="Original" className="w-full h-full object-contain p-6" />
                  </div>
                </div>

                <div className="space-y-3 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest text-[#662344] font-black">Padrão Editorial Vilaça</span>
                    {processing.status === 'success' && (
                      <button 
                        onClick={() => setIsEditorOpen(true)}
                        className="text-[9px] uppercase font-black text-[#662344] bg-[#fdd49e] px-4 py-1.5 rounded-full hover:brightness-105 transition-all shadow-sm active:scale-95"
                      >
                        Ajustar Brilhos
                      </button>
                    )}
                  </div>
                  <div className={`aspect-square flex items-center justify-center overflow-hidden border-2 border-[#fdd49e]/30 relative transition-all rounded-3xl bg-white ${processing.status === 'loading' ? '' : 'shadow-2xl'}`}>
                    {processing.status === 'loading' ? (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-t-2 border-[#662344] border-r-2 border-transparent rounded-full animate-spin mb-6"></div>
                        <p className="text-[10px] uppercase tracking-widest text-[#662344] animate-pulse font-black px-8 text-center">{processing.message || 'Processando...'}</p>
                      </div>
                    ) : (
                      <>
                        {image?.edited ? (
                            <img src={image?.edited} alt="Processed" className="w-full h-full object-contain animate-in zoom-in-95 duration-1000 p-2" />
                        ) : (
                            <div className="text-xs text-zinc-400">Falha na visualização</div>
                        )}
                        <div className="absolute bottom-6 right-6 bg-[#662344]/90 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                           <span className="text-[9px] uppercase tracking-widest font-black text-[#fdd49e]">{image?.material?.replace('_', ' ')} • {image?.category}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {processing.status === 'error' && (
                      <div className="mt-4 p-6 bg-red-50 border border-red-100 rounded-[2rem] text-red-600 text-[10px] font-bold uppercase text-center flex flex-col items-center gap-4">
                          <span>{processing.message}</span>
                          <button onClick={reset} className="bg-red-600 text-white px-6 py-2 rounded-full active:scale-95 transition-transform">Tentar novamente</button>
                      </div>
                  )}
                </div>
            </div>

            <div className="w-full lg:w-96 space-y-6">
              <div className="p-10 border-2 border-[#fdd49e]/30 bg-white shadow-2xl text-center rounded-[3rem]">
                <h3 className="text-2xl font-serif text-[#662344] mb-10 uppercase tracking-widest font-black border-b border-[#fdd49e]/10 pb-6 italic">Experiência</h3>
                <div className="space-y-5">
                  <button 
                    disabled={processing.status !== 'success' || !image?.edited}
                    onClick={() => setIsTryOnOpen(true)}
                    className="w-full bg-[#662344] text-[#fdd49e] py-6 text-[11px] uppercase tracking-[0.2em] font-black hover:brightness-110 transition-all disabled:opacity-20 flex items-center justify-center gap-3 shadow-xl rounded-2xl active:scale-95"
                  >
                    Provador Virtual
                  </button>
                  <button 
                    disabled={processing.status !== 'success' || !image?.edited}
                    onClick={handleGenerateModelView}
                    className="w-full bg-[#fdd49e] text-[#662344] py-6 text-[11px] uppercase tracking-[0.2em] font-black hover:brightness-105 transition-all disabled:opacity-20 flex items-center justify-center gap-3 shadow-xl rounded-2xl active:scale-95"
                  >
                    Visualizar na Modelo
                  </button>
                  <button 
                    onClick={reset} 
                    className="w-full border-2 border-[#662344] bg-white text-[#662344] py-4 text-[9px] uppercase tracking-[0.4em] font-black hover:bg-[#662344] hover:text-[#fdd49e] transition-all mt-4 rounded-xl active:scale-95"
                  >
                    Tirar Nova Foto
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Observação */}
      {showObservationDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-[0_30px_100px_rgba(0,0,0,0.5)] border border-[#fdd49e]/20 overflow-hidden">
            <h2 className="text-[#662344] font-serif text-3xl mb-8 text-center">Comando I.A.</h2>
            
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#662344]/40 mb-4 text-center font-bold">Instruções para o Retoque (Opcional)</p>
            
            <textarea
              className="w-full h-36 p-5 border border-zinc-100 rounded-3xl bg-zinc-50 text-sm focus:ring-2 focus:ring-[#fdd49e] outline-none transition-all resize-none mb-8 placeholder:text-zinc-300"
              placeholder="Ex: Realce mais o dourado, foque no brilho dos diamantes, etc..."
              value={userObservation}
              onChange={(e) => setUserObservation(e.target.value)}
            />
            
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => processImage(pendingBase64!, userObservation)}
                className="w-full bg-[#662344] text-[#fdd49e] py-5 rounded-2xl text-[11px] uppercase tracking-[0.2em] font-black shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                Com Observação
              </button>
              <button
                onClick={() => processImage(pendingBase64!, '')}
                className="w-full border-2 border-zinc-100 text-zinc-400 py-5 rounded-2xl text-[11px] uppercase tracking-[0.2em] font-black hover:bg-zinc-50 active:scale-95 transition-all"
              >
                Sem Observação
              </button>
            </div>
          </div>
        </div>
      )}

      <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handleCaptureOrUpload} />
      {isEditorOpen && image?.processed && <ImageEditor imageUrl={image.processed} onSave={(url) => { setImage(p => p ? {...p, edited: url} : null); setIsEditorOpen(false); }} onCancel={() => setIsEditorOpen(false)} />}
      {isTryOnOpen && image?.edited && image.category && <TryOnModal isOpen={isTryOnOpen} onClose={() => setIsTryOnOpen(false)} image={image.edited} category={image.category} />}
      {isModelViewOpen && modelImageUrl && image?.category && <ModelViewModal isOpen={isModelViewOpen} onClose={() => setIsModelViewOpen(false)} modelImageUrl={modelImageUrl} category={image.category} />}
    </Layout>
  );
};

export default App;
