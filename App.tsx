
import React, { useState } from 'react';
import Layout from './components/Layout';
import CameraModal from './components/CameraModal';
import ImageEditor from './components/ImageEditor';
import { 
  enhanceJewelryImage, 
  generateImagePro, 
  editImageWithAI, 
  generateModelView
} from './services/geminiService';
import { ProcessingState, ImageSize } from './types';

interface AppImageState {
  original: string;
  treated?: string;
  model?: string;
  edited?: string;
  category?: string;
  material?: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'create'>('home');
  const [image, setImage] = useState<AppImageState | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle' });
  
  const [proPrompt, setProPrompt] = useState('');
  const [proSize, setProSize] = useState<ImageSize>('1K');
  const [aiEditPrompt, setAiEditPrompt] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);

  const ensureApiKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && !(await aistudio.hasSelectedApiKey())) {
      await aistudio.openSelectKey();
    }
  };

  const handleCreatePro = async () => {
    if (!proPrompt) return;
    await ensureApiKey();
    setProcessing({ status: 'loading', message: `Gerando Ativo Digital ${proSize}...` });
    try {
      const url = await generateImagePro(proPrompt, proSize);
      setImage({ original: url, edited: url, treated: url });
      setProcessing({ status: 'success' });
    } catch (e: any) {
      setProcessing({ status: 'error', message: "Erro na geração. Verifique sua conexão ou chave de API." });
    }
  };

  const handleAIEdit = async () => {
    if (!aiEditPrompt || !image?.edited) return;
    setShowEditDialog(false);
    setProcessing({ status: 'loading', message: 'I.A. Refinando peça...' });
    try {
      const newUrl = await editImageWithAI(image.edited, aiEditPrompt);
      setImage(p => p ? { ...p, edited: newUrl } : null);
      setProcessing({ status: 'success' });
      setAiEditPrompt('');
    } catch (e: any) {
      setProcessing({ status: 'error', message: "Falha ao editar peça." });
    }
  };

  const processImageInput = async (base64: string) => {
    setIsCameraOpen(false);
    await ensureApiKey();
    setProcessing({ status: 'loading', message: 'Removendo Fundo e Retocando...' });
    
    try {
      // 1. Tratamento da Joia (Fundo Branco)
      const result = await enhanceJewelryImage(base64);
      
      const newState: AppImageState = { 
        original: base64, 
        treated: result.imageUrl, 
        edited: result.imageUrl,
        category: result.category,
        material: result.material
      };
      
      setImage(newState);

      // 2. Geração Editorial (Modelo) - Processo secundário
      setProcessing({ status: 'loading', message: 'Criando Visual de Campanha...' });
      try {
        const modelUrl = await generateModelView(result.imageUrl, result.category, result.material);
        setImage(p => p ? { ...p, model: modelUrl } : null);
      } catch (err) {
        console.warn("Editorial não gerado, exibindo apenas tratamento.");
      }

      setProcessing({ status: 'success' });
    } catch (e: any) {
      setProcessing({ status: 'error', message: "Falha no processamento. Tente novamente." });
    }
  };

  return (
    <Layout>
      <div className="flex justify-center mb-12">
        <div className="inline-flex bg-zinc-200/40 p-1.5 rounded-full backdrop-blur-xl border border-white/20">
          <button 
            onClick={() => { setActiveTab('home'); setImage(null); setProcessing({status:'idle'}); }}
            className={`px-10 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'home' ? 'bg-[#662344] text-[#fdd49e] shadow-xl' : 'text-[#662344]/50 hover:text-[#662344]'}`}
          >
            Fotografia e Retoque
          </button>
          <button 
            onClick={() => { setActiveTab('create'); setImage(null); setProcessing({status:'idle'}); }}
            className={`px-10 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'create' ? 'bg-[#662344] text-[#fdd49e] shadow-xl' : 'text-[#662344]/50 hover:text-[#662344]'}`}
          >
            Criação Digital
          </button>
        </div>
      </div>

      {processing.status === 'error' && (
        <div className="max-w-2xl mx-auto mb-10 p-6 bg-red-50 border border-red-100 rounded-3xl text-red-600 text-center animate-in fade-in">
          <p className="text-sm font-bold uppercase tracking-widest">{processing.message}</p>
          <button onClick={() => setProcessing({status:'idle'})} className="mt-4 text-[10px] font-black underline uppercase tracking-tighter">Limpar Erro</button>
        </div>
      )}

      {processing.status === 'loading' ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
          <div className="relative w-44 h-44 mb-16">
            <div className="absolute inset-0 border-[4px] border-[#fdd49e]/10 rounded-full"></div>
            <div className="absolute inset-0 border-t-[4px] border-[#662344] rounded-full animate-spin"></div>
            <div className="absolute inset-8 border border-dashed border-[#662344]/20 rounded-full animate-pulse"></div>
          </div>
          <p className="text-[14px] font-serif italic text-[#662344] tracking-widest text-center animate-pulse">{processing.message}</p>
        </div>
      ) : activeTab === 'home' && !image ? (
        <div className="max-w-4xl mx-auto text-center py-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <h1 className="text-7xl md:text-9xl font-serif text-[#662344] italic mb-8">Vilaça Studio</h1>
          <p className="text-[13px] uppercase tracking-[0.7em] text-[#662344]/40 font-black mb-24">ESTÚDIO DE FOTOGRAFIA DE JOIAS</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 px-6">
            <button 
              onClick={() => setIsCameraOpen(true)} 
              className="p-20 bg-white border border-[#fdd49e]/30 rounded-[6rem] shadow-2xl hover:shadow-[0_40px_100px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-95 transition-all group flex flex-col items-center"
            >
              <div className="w-24 h-24 mb-10 text-[#662344] group-hover:scale-110 transition-transform duration-700">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth={1}/><circle cx="12" cy="13" r="3" strokeWidth={1}/></svg>
              </div>
              <span className="text-[15px] font-black uppercase tracking-[0.5em] text-[#662344]">TIRAR FOTO</span>
            </button>

            <label className="p-20 bg-white border border-[#fdd49e]/30 rounded-[6rem] shadow-2xl hover:shadow-[0_40px_100px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group flex flex-col items-center">
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => processImageInput(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }} 
              />
              <div className="w-24 h-24 mb-10 text-[#662344] group-hover:scale-110 transition-transform duration-700">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={1}/></svg>
              </div>
              <span className="text-[15px] font-black uppercase tracking-[0.5em] text-[#662344]">ANEXAR ARQUIVO</span>
            </label>
          </div>
        </div>
      ) : activeTab === 'create' && !image ? (
        <div className="max-w-3xl mx-auto bg-white p-20 rounded-[6rem] shadow-2xl border border-[#fdd49e]/10 animate-in fade-in zoom-in duration-700">
          <h2 className="text-5xl font-serif text-[#662344] italic text-center mb-14">Atelier Digital Pro</h2>
          <textarea 
            className="w-full h-52 p-12 bg-zinc-50 border border-zinc-100 rounded-[4rem] text-xl outline-none mb-14 resize-none focus:ring-2 focus:ring-[#fdd49e]/20 transition-all text-[#662344] font-light"
            placeholder="Descreva a joia que deseja criar... Ex: Brincos de esmeralda com moldura de diamantes."
            value={proPrompt}
            onChange={e => setProPrompt(e.target.value)}
          />
          
          <div className="flex flex-col items-center mb-16">
            <span className="text-[11px] uppercase tracking-widest text-zinc-300 font-black mb-8">Definição da Joia</span>
            <div className="flex gap-6">
              {(['1K', '2K', '4K'] as ImageSize[]).map(s => (
                <button 
                  key={s} 
                  onClick={() => setProSize(s)}
                  className={`px-12 py-5 rounded-full text-[12px] font-black tracking-widest transition-all ${proSize === s ? 'bg-[#662344] text-[#fdd49e] shadow-2xl' : 'bg-zinc-100 text-[#662344]/30 hover:bg-zinc-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          
          <button onClick={handleCreatePro} className="w-full bg-[#662344] text-[#fdd49e] py-9 rounded-full text-[16px] uppercase tracking-[0.6em] font-black shadow-2xl hover:brightness-110 active:scale-95 transition-all">GERAR ATIVO PRO</button>
        </div>
      ) : (
        <div className="animate-in fade-in duration-1000 space-y-24 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 max-w-7xl mx-auto">
            {/* CATÁLOGO */}
            <div className="space-y-10">
              <div className="flex justify-between items-center px-10">
                <div className="flex flex-col">
                  <span className="text-[15px] font-black uppercase tracking-[0.5em] text-[#662344]">FOTO CATÁLOGO</span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest">Branco Puro Tratado</span>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setShowEditDialog(true)} className="px-7 py-3 bg-[#fdd49e] text-[#662344] rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg">AJUSTE I.A.</button>
                  <button onClick={() => setIsEditorOpen(true)} className="px-7 py-3 border border-[#fdd49e] text-[#662344] rounded-full text-[11px] font-black uppercase tracking-widest">FILTROS</button>
                </div>
              </div>
              <div className="aspect-square bg-white rounded-[6rem] shadow-2xl overflow-hidden border border-[#fdd49e]/10 group">
                {image?.edited ? (
                  <img src={image.edited} className="w-full h-full object-contain p-20 group-hover:scale-105 transition-transform duration-[2000ms]" alt="Joia Tratada" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-50 animate-pulse" />
                )}
              </div>
            </div>

            {/* EDITORIAL */}
            <div className="space-y-10">
              <div className="flex justify-between items-center px-10">
                <div className="flex flex-col">
                  <span className="text-[15px] font-black uppercase tracking-[0.5em] text-[#662344]">FOTO CAMPANHA</span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest">Ambientação Editorial</span>
                </div>
              </div>
              <div className="aspect-square bg-zinc-100 rounded-[6rem] shadow-2xl overflow-hidden border border-[#fdd49e]/10 group">
                {image?.model ? (
                  <img src={image.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms]" alt="Editorial de Moda" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50/50">
                    <div className="w-12 h-12 border-4 border-[#662344]/10 border-t-[#662344] rounded-full animate-spin mb-4" />
                    <span className="text-[10px] text-[#662344]/30 uppercase font-black tracking-widest">Renderizando Visual...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={() => { setImage(null); setActiveTab('home'); setProcessing({ status: 'idle' }); }}
              className="px-32 py-9 bg-white border-2 border-[#662344] text-[#662344] rounded-full text-[14px] font-black uppercase tracking-[0.6em] hover:bg-[#662344] hover:text-[#fdd49e] transition-all shadow-2xl active:scale-95"
            >
              NOVO TRABALHO
            </button>
          </div>
        </div>
      )}

      {/* MODAL REFINAMENTO I.A. */}
      {showEditDialog && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-10 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="w-full max-w-2xl bg-white rounded-[6rem] p-20 shadow-2xl border border-white/10">
            <h2 className="text-5xl font-serif text-[#662344] italic text-center mb-12">Retoque Vilaça I.A.</h2>
            <textarea 
              className="w-full h-52 p-12 bg-zinc-50 border border-zinc-100 rounded-[4rem] text-xl outline-none mb-12 resize-none focus:ring-2 focus:ring-[#fdd49e]/40 transition-all text-[#662344]"
              placeholder="Ex: 'Troque a cor da pedra para Safira', 'Dê mais brilho ao ouro'..."
              value={aiEditPrompt}
              onChange={e => setAiEditPrompt(e.target.value)}
            />
            <div className="grid gap-6">
              <button onClick={handleAIEdit} className="w-full bg-[#662344] text-[#fdd49e] py-8 rounded-full text-[14px] font-black uppercase tracking-[0.5em] shadow-2xl hover:brightness-110 active:scale-95 transition-all">PROCESSAR ALTERAÇÃO</button>
              <button onClick={() => setShowEditDialog(false)} className="w-full py-5 text-zinc-300 text-[12px] font-black uppercase tracking-[0.4em] text-center">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={processImageInput} />
      {isEditorOpen && image?.edited && <ImageEditor imageUrl={image.edited} onSave={(url) => { setImage(p => p ? {...p, edited: url} : null); setIsEditorOpen(false); }} onCancel={() => setIsEditorOpen(false)} />}
    </Layout>
  );
};

export default App;
