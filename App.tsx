
import React, { useState, useCallback } from 'react';
import Layout from './components/Layout';
import CameraModal from './components/CameraModal';
import ImageEditor from './components/ImageEditor';
import ModelViewModal from './components/ModelViewModal';
import { 
  enhanceJewelryImage, 
  generateImagePro, 
  editImageWithAI, 
  animateWithVeo,
  generateModelView
} from './services/geminiService';
import { ProcessingState, ImageSize, AspectRatio } from './types';

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
  const [activeTab, setActiveTab] = useState<'home' | 'create'>('home');
  const [image, setImage] = useState<AppImageState | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isModelViewOpen, setIsModelViewOpen] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle' });
  
  // States para Criação Pro
  const [proPrompt, setProPrompt] = useState('');
  const [proSize, setProSize] = useState<ImageSize>('1K');
  
  // States para Edição AI
  const [aiEditPrompt, setAiEditPrompt] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);

  const ensureApiKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && !(await aistudio.hasSelectedApiKey())) await aistudio.openSelectKey();
  };

  const handleCreatePro = async () => {
    if (!proPrompt) return;
    await ensureApiKey();
    setProcessing({ status: 'loading', message: `Gerando Joia Pro ${proSize}...` });
    try {
      const url = await generateImagePro(proPrompt, proSize);
      setImage({ original: url, edited: url, treated: url });
      setProcessing({ status: 'success' });
    } catch (e: any) {
      setProcessing({ status: 'error', message: e.message || "Erro na geração Pro" });
    }
  };

  const handleAIEdit = async () => {
    if (!aiEditPrompt || !image?.edited) return;
    setShowEditDialog(false);
    setProcessing({ status: 'loading', message: 'I.A. Refinando a peça...' });
    try {
      const newUrl = await editImageWithAI(image.edited, aiEditPrompt);
      setImage(p => p ? { ...p, edited: newUrl } : null);
      setProcessing({ status: 'success' });
      setAiEditPrompt('');
    } catch (e: any) {
      setProcessing({ status: 'error', message: e.message || "Erro na edição I.A." });
    }
  };

  const handleAnimate = async (ratio: AspectRatio, useModel: boolean = false) => {
    const sourceImage = useModel ? image?.model : image?.edited;
    if (!sourceImage) return;
    
    await ensureApiKey();
    setProcessing({ status: 'loading', message: 'Veo 3.1 Animando...' });
    try {
      const videoUrl = await animateWithVeo(sourceImage, useModel ? "Fashion editorial cinematic animation" : "Product showcase slow motion", ratio);
      setImage(p => p ? { ...p, video: videoUrl } : null);
      setProcessing({ status: 'success' });
    } catch (e: any) {
      setProcessing({ status: 'error', message: e.message || "Erro na animação" });
    }
  };

  const processImageFile = async (base64: string) => {
    setIsCameraOpen(false);
    await ensureApiKey();
    setProcessing({ status: 'loading', message: 'Processando I.A. Vilaça...' });
    try {
      const result = await enhanceJewelryImage(base64);
      
      setProcessing({ status: 'loading', message: 'Criando Visual Editorial...' });
      const modelUrl = await generateModelView(result.imageUrl, result.category, result.material);

      setImage({ 
        original: base64, 
        treated: result.imageUrl, 
        edited: result.imageUrl,
        model: modelUrl,
        category: result.category,
        material: result.material
      });
      setProcessing({ status: 'success' });
    } catch (e: any) {
      setProcessing({ status: 'error', message: e.message || "Erro no processamento" });
    }
  };

  return (
    <Layout>
      {/* NAVEGAÇÃO SUPERIOR */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex bg-zinc-200/50 p-1 rounded-full backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('home')}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'home' ? 'bg-[#662344] text-[#fdd49e] shadow-lg' : 'text-[#662344]/50 hover:text-[#662344]'}`}
          >
            Captura e Retoque
          </button>
          <button 
            onClick={() => setActiveTab('create')}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'create' ? 'bg-[#662344] text-[#fdd49e] shadow-lg' : 'text-[#662344]/50 hover:text-[#662344]'}`}
          >
            Criação Digital Pro
          </button>
        </div>
      </div>

      {processing.status === 'loading' ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
          <div className="relative w-40 h-40 mb-12">
            <div className="absolute inset-0 border-[6px] border-[#fdd49e]/10 rounded-full"></div>
            <div className="absolute inset-0 border-t-[6px] border-[#662344] rounded-full animate-spin"></div>
            <div className="absolute inset-4 border-[2px] border-dashed border-[#662344]/20 rounded-full animate-pulse"></div>
          </div>
          <p className="text-[12px] uppercase tracking-[0.5em] font-black text-[#662344]">{processing.message}</p>
        </div>
      ) : activeTab === 'home' && !image ? (
        <div className="max-w-3xl mx-auto text-center py-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-6xl md:text-8xl font-serif text-[#662344] italic mb-6">Vilaça Studio</h1>
          <p className="text-[11px] uppercase tracking-[0.5em] text-[#662344]/40 font-black mb-16">Fotografia para Joalheria</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <button onClick={() => setIsCameraOpen(true)} className="p-16 bg-white border border-[#fdd49e]/30 rounded-[5rem] shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all group">
              <div className="w-20 h-20 mx-auto mb-8 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth={1.5}/><circle cx="12" cy="13" r="3" strokeWidth={1.5}/></svg>
              </div>
              <span className="text-[12px] font-black uppercase tracking-[0.4em] text-[#662344]">Tirar Foto</span>
            </button>
            <label className="p-16 bg-white border border-[#fdd49e]/30 rounded-[5rem] shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group">
              <input type="file" className="hidden" accept="image/*" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = ev => processImageFile(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }} />
              <div className="w-20 h-20 mx-auto mb-8 text-[#662344] group-hover:scale-110 transition-transform">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={1.5}/></svg>
              </div>
              <span className="text-[12px] font-black uppercase tracking-[0.4em] text-[#662344]">Arquivo</span>
            </label>
          </div>
        </div>
      ) : activeTab === 'create' && !image ? (
        <div className="max-w-2xl mx-auto bg-white p-16 rounded-[6rem] shadow-2xl border border-[#fdd49e]/20 animate-in fade-in zoom-in duration-700">
          <h2 className="text-4xl font-serif text-[#662344] italic text-center mb-10">Gerador de Luxo</h2>
          <textarea 
            className="w-full h-44 p-10 bg-zinc-50 border border-zinc-100 rounded-[4rem] text-lg outline-none mb-10 resize-none focus:ring-2 focus:ring-[#fdd49e]/40 transition-all text-[#662344]"
            placeholder="Descreva a joia... Ex: Anel de esmeralda colombiana lapidação gota em ouro 18k."
            value={proPrompt}
            onChange={e => setProPrompt(e.target.value)}
          />
          
          <div className="flex flex-col items-center mb-12">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-5">Resolução de Imagem</span>
            <div className="flex gap-4">
              {(['1K', '2K', '4K'] as ImageSize[]).map(s => (
                <button 
                  key={s} 
                  onClick={() => setProSize(s)}
                  className={`px-8 py-3 rounded-full text-[11px] font-black tracking-widest transition-all ${proSize === s ? 'bg-[#662344] text-[#fdd49e] shadow-lg' : 'bg-zinc-100 text-[#662344]/30 hover:bg-zinc-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          
          <button onClick={handleCreatePro} className="w-full bg-[#662344] text-[#fdd49e] py-7 rounded-[3rem] text-[12px] uppercase tracking-[0.5em] font-black shadow-2xl hover:brightness-110 active:scale-95 transition-all">Gerar Obra-Prima Digital</button>
        </div>
      ) : (
        <div className="animate-in fade-in duration-1000 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-7xl mx-auto">
            {/* ITEM 1: CATÁLOGO */}
            <div className="space-y-8">
              <div className="flex justify-between items-center px-6">
                <span className="text-[12px] font-black uppercase tracking-[0.3em] text-[#662344]">Catálogo White</span>
                <div className="flex gap-4">
                  <button onClick={() => setShowEditDialog(true)} className="px-6 py-3 bg-[#fdd49e] text-[#662344] rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Edição I.A.</button>
                  <button onClick={() => setIsEditorOpen(true)} className="px-6 py-3 border border-[#fdd49e] text-[#662344] rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#fdd49e]/10 transition-all">Ajustes</button>
                </div>
              </div>
              <div className="aspect-square bg-white rounded-[5rem] shadow-2xl overflow-hidden border border-[#fdd49e]/10 group relative">
                <img src={image?.edited} className="w-full h-full object-contain p-14 group-hover:scale-[1.05] transition-transform duration-1000" alt="Joia" />
              </div>
              <div className="flex gap-4">
                  <button onClick={() => handleAnimate('9:16', false)} className="flex-grow py-4 bg-[#662344]/5 text-[#662344] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#662344]/10 transition-colors">Vídeo Produto (9:16)</button>
              </div>
            </div>

            {/* ITEM 2: EDITORIAL (MODELO) */}
            <div className="space-y-8">
              <div className="flex justify-between items-center px-6">
                <span className="text-[12px] font-black uppercase tracking-[0.3em] text-[#662344]">Editorial Moda</span>
                <span className="text-[10px] text-zinc-400 uppercase">Visual de Campanha</span>
              </div>
              <div className="aspect-square bg-zinc-100 rounded-[5rem] shadow-2xl overflow-hidden border border-[#fdd49e]/10 group relative">
                <img src={image?.model} className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-1000" alt="Modelo" />
              </div>
              <div className="flex gap-4">
                  <button onClick={() => handleAnimate('9:16', true)} className="flex-grow py-4 bg-[#662344] text-[#fdd49e] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all">Animar Editorial (Veo)</button>
              </div>
            </div>
          </div>

          {image?.video && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-12 duration-1000">
              <h3 className="text-2xl font-serif text-[#662344] text-center italic">Showcase Cinematográfico</h3>
              <div className="aspect-video bg-black rounded-[3rem] overflow-hidden shadow-2xl ring-4 ring-[#fdd49e]/20">
                <video src={image.video} controls autoPlay loop className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <div className="flex justify-center pb-20">
            <button 
              onClick={() => { setImage(null); setActiveTab('home'); setProcessing({ status: 'idle' }); }}
              className="px-20 py-7 bg-white border-2 border-[#662344] text-[#662344] rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.4em] hover:bg-[#662344] hover:text-[#fdd49e] transition-all"
            >
              Reiniciar Estúdio
            </button>
          </div>
        </div>
      )}

      {/* DIÁLOGO DE EDIÇÃO I.A. (NANO BANANA) */}
      {showEditDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white rounded-[5rem] p-16 shadow-2xl">
            <h2 className="text-4xl font-serif text-[#662344] italic text-center mb-10">Laboratório I.A.</h2>
            <textarea 
              className="w-full h-40 p-10 bg-zinc-50 border border-zinc-100 rounded-[3rem] text-lg outline-none mb-10 resize-none focus:ring-2 focus:ring-[#fdd49e]/40 transition-all text-[#662344]"
              placeholder="Ex: 'Remova o fundo e coloque textura de mármore', 'Realce o brilho dos diamantes', 'Mude para Ouro Rose'..."
              value={aiEditPrompt}
              onChange={e => setAiEditPrompt(e.target.value)}
            />
            <div className="grid gap-4">
              <button onClick={handleAIEdit} className="w-full bg-[#662344] text-[#fdd49e] py-7 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl hover:brightness-110 active:scale-95 transition-all">Executar Edição Inteligente</button>
              <button onClick={() => setShowEditDialog(false)} className="w-full py-4 text-zinc-400 text-[11px] font-black uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={processImageFile} />
      {isEditorOpen && image?.edited && <ImageEditor imageUrl={image.edited} onSave={(url) => { setImage(p => p ? {...p, edited: url} : null); setIsEditorOpen(false); }} onCancel={() => setIsEditorOpen(false)} />}
    </Layout>
  );
};

export default App;
