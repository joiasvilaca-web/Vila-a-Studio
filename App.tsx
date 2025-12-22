
import React, { useState, useCallback } from 'react';
import Layout from './components/Layout';
import CameraModal from './components/CameraModal';
import TryOnModal from './components/TryOnModal';
import ImageEditor from './components/ImageEditor';
import ModelViewModal from './components/ModelViewModal';
import { enhanceJewelryImage, generateModelView, EnhancedJewelryResponse } from './services/geminiService';
import { ProcessingState } from './types';

interface AppImageState {
  original: string;
  treated?: string;
  model?: string;
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
  const [selectedFullScreenImage, setSelectedFullScreenImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle' });
  
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const [userObservation, setUserObservation] = useState('');

  // Texto obrigatório conforme solicitado pelo cliente
  const disclaimerText = "IMAGEMS GERADATRATADA POR I.A. PODE CONTER DISTORÇOES - CONSULTE DETALHES COM A ATENDENTE.";

  const addDisclaimerToImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(base64); return; }

        ctx.drawImage(img, 0, 0);
        
        // Configuração do texto adaptável ao tamanho da imagem
        const fontSize = Math.max(10, Math.floor(canvas.width * 0.025));
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        
        // Barra de fundo para leitura
        const padding = fontSize * 1.8;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, canvas.height - padding, canvas.width, padding);
        
        // Texto Centralizado
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(disclaimerText, canvas.width / 2, canvas.height - (padding / 2.5));
        
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = base64;
    });
  };

  const ensureApiKey = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await aistudio.openSelectKey();
          return true;
        }
      }
    } catch (e) { console.warn(e); }
    return true;
  };

  const handleCaptureOrUpload = useCallback((base64: string) => {
    setIsCameraOpen(false);
    setPendingBase64(base64);
    setShowObservationDialog(true);
  }, []);

  const processImage = async (base64: string, observation?: string) => {
    setShowObservationDialog(false);
    await ensureApiKey();
    
    setProcessing({ status: 'loading', message: 'Iniciando Estúdio Vilaça...' });
    setImage({ original: base64 });
    
    try {
      // 1. Gerar Tratada (Padrão Vilaça - Apenas Joia)
      setProcessing({ status: 'loading', message: 'Tratando joia (Padrão Vilaça)...' });
      const treatedResult = await enhanceJewelryImage(base64, observation);
      const treatedWithText = await addDisclaimerToImage(treatedResult.imageUrl);

      // 2. Gerar Modelo (Foco Macro em parte do corpo)
      setProcessing({ status: 'loading', message: 'Gerando visão na modelo (Macro)...' });
      const modelUrl = await generateModelView(treatedResult.imageUrl, treatedResult.category, treatedResult.material);
      const modelWithText = await addDisclaimerToImage(modelUrl);

      setImage({ 
        original: base64, 
        treated: treatedWithText,
        model: modelWithText,
        edited: treatedWithText,
        category: treatedResult.category,
        material: treatedResult.material
      });
      setProcessing({ status: 'success' });
    } catch (error: any) {
      setProcessing({ status: 'error', message: error.message || 'Erro no estúdio Vilaça.' });
    }
    setPendingBase64(null);
    setUserObservation('');
  };

  const reset = useCallback(() => {
    setImage(null);
    setProcessing({ status: 'idle' });
    setPendingBase64(null);
    setIsEditorOpen(false);
    setIsTryOnOpen(false);
    setIsModelViewOpen(false);
  }, []);

  return (
    <Layout>
      {processing.status === 'idle' ? (
        <div className="max-w-2xl mx-auto mt-16 md:mt-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-12 md:mb-16">
            <h1 className="text-[#662344] font-serif text-4xl md:text-5xl mb-4 tracking-tight">Vilaça I.A. Studio</h1>
            <p className="text-[#662344]/60 text-xs md:text-sm tracking-[0.2em] uppercase font-medium">Estúdio Fotográfico Digital</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <button onClick={() => setIsCameraOpen(true)} className="flex flex-col items-center justify-center p-12 border-2 border-[#fdd49e]/40 bg-white hover:border-[#fdd49e] hover:shadow-2xl transition-all group active:scale-95 rounded-[2.5rem]">
              <div className="w-16 h-16 mb-6 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#662344]">Tirar Foto</span>
            </button>

            <label className="flex flex-col items-center justify-center p-12 border-2 border-[#fdd49e]/40 bg-white hover:border-[#fdd49e] hover:shadow-2xl transition-all cursor-pointer group active:scale-95 rounded-[2.5rem]">
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
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#662344]">Anexar Arquivo</span>
            </label>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="flex flex-col gap-10">
            {processing.status === 'loading' ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white border border-[#fdd49e]/20 rounded-[3rem] shadow-sm p-12">
                <div className="w-16 h-16 border-t-4 border-[#662344] border-r-4 border-transparent rounded-full animate-spin mb-10"></div>
                <h2 className="text-2xl font-serif text-[#662344] mb-4">Revelando Estúdio Vilaça...</h2>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#662344]/60 font-black animate-pulse">{processing.message}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Imagem Tratada - Padrão Vilaça */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-4">
                    <span className="text-[10px] uppercase tracking-widest text-[#662344] font-black italic">Catálogo (Padrão Vilaça)</span>
                    <button onClick={() => setIsEditorOpen(true)} className="text-[9px] uppercase font-black text-[#662344] bg-[#fdd49e] px-4 py-1.5 rounded-full shadow-md active:scale-95">Ajustar Brilho</button>
                  </div>
                  <div className="aspect-square bg-white border-2 border-[#fdd49e]/30 rounded-[2.5rem] overflow-hidden shadow-xl group relative cursor-pointer" onClick={() => { setSelectedFullScreenImage(image?.edited!); setIsModelViewOpen(true); }}>
                    <img src={image?.edited} className="w-full h-full object-contain p-2" alt="Tratada" />
                  </div>
                </div>

                {/* Imagem Modelo - Visão Macro */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-4">
                    <span className="text-[10px] uppercase tracking-widest text-[#662344] font-black italic">Visualização Macro (I.A. Vilaça)</span>
                    <button onClick={() => setIsTryOnOpen(true)} className="text-[9px] uppercase font-black text-[#fdd49e] bg-[#662344] px-4 py-1.5 rounded-full shadow-md active:scale-95">Provador AR</button>
                  </div>
                  <div className="aspect-[4/5] bg-zinc-100 border-2 border-[#fdd49e]/30 rounded-[2.5rem] overflow-hidden shadow-xl relative cursor-pointer" onClick={() => { setSelectedFullScreenImage(image?.model!); setIsModelViewOpen(true); }}>
                    <img src={image?.model} className="w-full h-full object-cover" alt="Modelo" />
                  </div>
                </div>
              </div>
            )}

            {processing.status === 'success' && (
              <div className="flex justify-center pt-8 border-t border-[#fdd49e]/10">
                <button onClick={reset} className="px-12 py-5 bg-[#662344] text-[#fdd49e] rounded-2xl text-[10px] uppercase tracking-[0.3em] font-black shadow-xl active:scale-95 hover:brightness-110 transition-all">Nova Captura</button>
              </div>
            )}

            {processing.status === 'error' && (
              <div className="p-10 bg-red-50 border-2 border-red-100 rounded-[3rem] text-center">
                <p className="text-red-700 font-black uppercase text-xs tracking-widest mb-6">{processing.message}</p>
                <button onClick={reset} className="bg-red-600 text-white px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">Tentar Novamente</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showObservationDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-lg animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl border border-[#fdd49e]/20">
            <h2 className="text-[#662344] font-serif text-3xl mb-8 text-center">Instruções</h2>
            <textarea className="w-full h-32 p-5 border border-zinc-100 rounded-3xl bg-zinc-50 text-sm focus:ring-2 focus:ring-[#fdd49e] outline-none mb-8 resize-none" placeholder="Ex: Realce o brilho da prata..." value={userObservation} onChange={(e) => setUserObservation(e.target.value)} />
            <div className="grid gap-4">
              <button onClick={() => processImage(pendingBase64!, userObservation)} className="w-full bg-[#662344] text-[#fdd49e] py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black">Iniciar Revelação</button>
              <button onClick={() => setShowObservationDialog(false)} className="w-full border border-zinc-200 text-zinc-400 py-4 rounded-2xl text-[10px] uppercase font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handleCaptureOrUpload} />
      {isEditorOpen && image?.treated && <ImageEditor imageUrl={image.treated} onSave={(url) => { setImage(p => p ? {...p, edited: url} : null); setIsEditorOpen(false); }} onCancel={() => setIsEditorOpen(false)} />}
      {isTryOnOpen && image?.edited && image.category && <TryOnModal isOpen={isTryOnOpen} onClose={() => setIsTryOnOpen(false)} image={image.edited} category={image.category} />}
      {isModelViewOpen && selectedFullScreenImage && <ModelViewModal isOpen={isModelViewOpen} onClose={() => { setIsModelViewOpen(false); setSelectedFullScreenImage(null); }} modelImageUrl={selectedFullScreenImage} category={image?.category || ''} />}
    </Layout>
  );
};

export default App;
