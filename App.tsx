
import React, { useState, useCallback } from 'react';
import Layout from './components/Layout';
import CameraModal from './components/CameraModal';
import ImageEditor from './components/ImageEditor';
import ModelViewModal from './components/ModelViewModal';
import { enhanceJewelryImage, generateModelView, generateJewelryVideo } from './services/geminiService';
import { ProcessingState } from './types';

interface AppImageState {
  original: string;
  treated?: string;
  model?: string;
  video?: string;
  edited?: string;
  category?: string;
  material?: string;
}

const App: React.FC = () => {
  const [image, setImage] = useState<AppImageState | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isModelViewOpen, setIsModelViewOpen] = useState(false);
  const [selectedFullScreenImage, setSelectedFullScreenImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle' });
  
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const [userObservation, setUserObservation] = useState('');

  const disclaimerLines = [
    "IMAGENS GERADAS/TRATADAS POR I.A.",
    "PODEM CONTER DISTORÇÕES",
    "CONSULTE DETALHES COM A ATENDENTE"
  ];

  const ensureApiKey = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        if (!(await aistudio.hasSelectedApiKey())) {
          await aistudio.openSelectKey();
        }
      }
    } catch (e) {
      console.warn("AISTUDIO helper not found", e);
    }
  };

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
        
        const fontSize = Math.floor(canvas.width * 0.025); 
        ctx.font = `bold ${fontSize}px 'Inter', sans-serif`;
        
        const lineHeight = fontSize * 1.4;
        const padding = fontSize * 2;
        const barHeight = (lineHeight * disclaimerLines.length) + padding;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        
        const totalTextHeight = (disclaimerLines.length - 1) * lineHeight;
        const startY = canvas.height - (barHeight / 2) - (totalTextHeight / 2);
        
        disclaimerLines.forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, startY + (i * lineHeight));
        });
        
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async (url: string, title: string) => {
    try {
      if (url.startsWith('blob:')) {
        handleDownload(url, `${title}.mp4`);
        return;
      }
      const response = await fetch(url);
      const blob = await response.blob();
      const ext = blob.type.split('/')[1] || 'jpg';
      const file = new File([blob], `${title}.${ext}`, { type: blob.type });
      
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Vilaça Joias Studio',
          text: 'Confira esta criação do Vilaça Studio!'
        });
      } else {
        handleDownload(url, `${title}.${ext}`);
      }
    } catch (e) {
      console.error("Erro ao compartilhar:", e);
      handleDownload(url, `${title}.jpg`);
    }
  };

  const processImage = async (base64: string, observation?: string) => {
    setShowObservationDialog(false);
    await ensureApiKey();
    
    setProcessing({ status: 'loading', message: 'Iniciando Laboratório Vilaça...' });
    setImage({ original: base64 });
    
    try {
      setProcessing({ status: 'loading', message: 'Tratando joia para catálogo...' });
      const treatedResult = await enhanceJewelryImage(base64, observation);
      const treatedWithText = await addDisclaimerToImage(treatedResult.imageUrl);

      setProcessing({ status: 'loading', message: 'Ambientando em modelo editorial...' });
      const modelUrl = await generateModelView(treatedResult.imageUrl, treatedResult.category, treatedResult.material);
      const modelWithText = await addDisclaimerToImage(modelUrl);

      setProcessing({ status: 'loading', message: 'Gerando vídeo cinematográfico...' });
      const videoUrl = await generateJewelryVideo(treatedResult.imageUrl, treatedResult.category, treatedResult.material);

      setImage({ 
        original: base64, 
        treated: treatedWithText,
        model: modelWithText,
        video: videoUrl,
        edited: treatedWithText,
        category: treatedResult.category,
        material: treatedResult.material
      });
      setProcessing({ status: 'success' });
    } catch (error: any) {
      console.error(error);
      setProcessing({ status: 'error', message: error.message || 'Falha técnica. Tente uma foto mais nítida.' });
    }
  };

  const reset = useCallback(() => {
    setImage(null);
    setProcessing({ status: 'idle' });
    setPendingBase64(null);
    setUserObservation('');
  }, []);

  return (
    <Layout>
      {processing.status === 'idle' ? (
        <div className="max-w-2xl mx-auto mt-12 md:mt-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="mb-12">
            <h1 className="text-[#662344] font-serif text-4xl md:text-5xl mb-4 italic">Vilaça Studio</h1>
            <p className="text-[#662344]/50 text-[10px] tracking-[0.4em] uppercase font-black">Digital Jewelry Excellence</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <button onClick={() => setIsCameraOpen(true)} className="flex flex-col items-center justify-center p-12 border border-[#fdd49e]/30 bg-white hover:border-[#fdd49e] hover:shadow-xl transition-all rounded-[3rem] group">
              <div className="w-16 h-16 mb-6 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#662344]">Captura Pro</span>
            </button>

            <label className="flex flex-col items-center justify-center p-12 border border-[#fdd49e]/30 bg-white hover:border-[#fdd49e] hover:shadow-xl transition-all rounded-[3rem] cursor-pointer group">
              <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setPendingBase64(ev.target?.result as string);
                    setShowObservationDialog(true);
                  };
                  reader.readAsDataURL(file);
                }
              }} />
              <div className="w-16 h-16 mb-6 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#662344]">Importar Foto</span>
            </label>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-700">
          {processing.status === 'loading' ? (
            <div className="min-h-[65vh] flex flex-col items-center justify-center bg-white border border-[#fdd49e]/10 rounded-[4rem] shadow-sm p-12">
              <div className="relative w-24 h-24 mb-10">
                <div className="absolute inset-0 border-4 border-[#fdd49e]/20 rounded-full"></div>
                <div className="absolute inset-0 border-t-4 border-[#662344] rounded-full animate-spin"></div>
              </div>
              <h2 className="text-2xl font-serif text-[#662344] mb-4 italic">Estúdio Vilaça</h2>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[#662344]/40 font-black animate-pulse">{processing.message}</p>
            </div>
          ) : (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 1. CATÁLOGO */}
                <div className="space-y-4 group">
                  <div className="flex justify-between items-center px-4">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#662344] font-black italic">Catálogo Macro</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDownload(image?.edited!, 'Vilaca_Catalogo.jpg')} className="p-2 bg-[#fdd49e] text-[#662344] rounded-full shadow-sm"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2.5}/></svg></button>
                      <button onClick={() => handleShare(image?.edited!, 'Joia Catalogo')} className="p-2 bg-[#fdd49e] text-[#662344] rounded-full shadow-sm"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeWidth={2.5}/></svg></button>
                    </div>
                  </div>
                  <div className="aspect-square bg-white border border-[#fdd49e]/20 rounded-[2.5rem] overflow-hidden shadow-xl cursor-pointer" onClick={() => { setSelectedFullScreenImage(image?.edited!); setIsModelViewOpen(true); }}>
                    <img src={image?.edited} className="w-full h-full object-contain p-4 hover:scale-105 transition-transform duration-700" alt="Catálogo" />
                  </div>
                </div>

                {/* 2. CAMPANHA */}
                <div className="space-y-4 group">
                  <div className="flex justify-between items-center px-4">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#662344] font-black italic">Editorial</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDownload(image?.model!, 'Vilaca_Campanha.jpg')} className="p-2 bg-[#fdd49e] text-[#662344] rounded-full shadow-sm"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2.5}/></svg></button>
                      <button onClick={() => handleShare(image?.model!, 'Joia Campanha')} className="p-2 bg-[#fdd49e] text-[#662344] rounded-full shadow-sm"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeWidth={2.5}/></svg></button>
                    </div>
                  </div>
                  <div className="aspect-square bg-zinc-100 border border-[#fdd49e]/20 rounded-[2.5rem] overflow-hidden shadow-xl cursor-pointer" onClick={() => { setSelectedFullScreenImage(image?.model!); setIsModelViewOpen(true); }}>
                    <img src={image?.model} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Campanha" />
                  </div>
                </div>

                {/* 3. VÍDEO CINEMATOGRÁFICO */}
                <div className="space-y-4 group">
                  <div className="flex justify-between items-center px-4">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#662344] font-black italic">Vídeo Cinematic</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleShare(image?.video!, 'Vilaca_Cinematic')} className="p-2 bg-[#fdd49e] text-[#662344] rounded-full shadow-sm"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2.5}/></svg></button>
                    </div>
                  </div>
                  <div className="aspect-square bg-black border border-[#fdd49e]/20 rounded-[2.5rem] overflow-hidden shadow-xl">
                    <video src={image?.video} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6 pt-10 border-t border-[#fdd49e]/10">
                <button onClick={reset} className="px-16 py-5 bg-[#662344] text-[#fdd49e] rounded-2xl text-[11px] uppercase tracking-[0.4em] font-black shadow-2xl active:scale-95 transition-all">Novo Projeto</button>
                <p className="text-[9px] text-[#662344]/30 uppercase tracking-widest font-bold">Vilaça Studio I.A. Protocol 3.1</p>
              </div>
            </div>
          )}

          {processing.status === 'error' && (
            <div className="mt-8 p-12 bg-red-50 border border-red-100 rounded-[3rem] text-center">
              <p className="text-red-700 font-black uppercase text-[10px] tracking-widest mb-6">{processing.message}</p>
              <button onClick={reset} className="bg-red-600 text-white px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Tentar Novamente</button>
            </div>
          )}
        </div>
      )}

      {showObservationDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-md bg-white rounded-[4rem] p-10 shadow-2xl border border-[#fdd49e]/20">
            <div className="text-center mb-8">
              <h2 className="text-[#662344] font-serif text-3xl italic">Retoque Vilaça</h2>
              <p className="text-[9px] uppercase tracking-[0.3em] text-[#662344]/40 font-black mt-2">Personalize o Tratamento</p>
            </div>
            <textarea 
              className="w-full h-32 p-6 border border-zinc-100 rounded-[2rem] bg-zinc-50 text-sm outline-none mb-8 resize-none shadow-inner focus:ring-1 focus:ring-[#fdd49e]/50 transition-all" 
              placeholder="Ex: Realçar brilho dos rubis, ouro amarelo 18k polido..." 
              value={userObservation} 
              onChange={(e) => setUserObservation(e.target.value)} 
            />
            <div className="grid gap-3">
              <button onClick={() => processImage(pendingBase64!, userObservation)} className="w-full bg-[#662344] text-[#fdd49e] py-5 rounded-2xl text-[10px] uppercase tracking-[0.3em] font-black shadow-lg">Gerar Conteúdo I.A.</button>
              <button onClick={() => setShowObservationDialog(false)} className="w-full text-zinc-400 py-3 text-[10px] uppercase font-bold tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(base64) => { setIsCameraOpen(false); setPendingBase64(base64); setShowObservationDialog(true); }} />
      {isEditorOpen && image?.treated && <ImageEditor imageUrl={image.treated} onSave={(url) => { setImage(p => p ? {...p, edited: url} : null); setIsEditorOpen(false); }} onCancel={() => setIsEditorOpen(false)} />}
      {isModelViewOpen && selectedFullScreenImage && <ModelViewModal isOpen={isModelViewOpen} onClose={() => { setIsModelViewOpen(false); setSelectedFullScreenImage(null); }} modelImageUrl={selectedFullScreenImage} category={image?.category || ''} />}
    </Layout>
  );
};

export default App;
