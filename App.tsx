
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
import { ProcessingState } from './types';

interface AppImageState {
  original: string;
  treated?: string;
  edited?: string;
  model?: string;
  gender?: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'capture' | 'design'>('capture');
  const [image, setImage] = useState<AppImageState | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle' });
  const [aiEditPrompt, setAiEditPrompt] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [proPrompt, setProPrompt] = useState('');

  const processImageInput = async (base64: string) => {
    setIsCameraOpen(false);
    setProcessing({ status: 'loading', message: 'Iniciando Tratamento de Luxo...' });
    
    try {
      // 1. Tratamento Base (Fundo Branco)
      const result = await enhanceJewelryImage(base64);
      setImage({ 
        original: base64, 
        treated: result.imageUrl, 
        edited: result.imageUrl,
        gender: result.gender
      });
      setProcessing({ status: 'success' });

      // 2. Visual de Campanha (Editorial) em paralelo
      try {
        const modelUrl = await generateModelView(result.imageUrl, result.category, result.material, result.gender);
        setImage(p => p ? { ...p, model: modelUrl } : null);
      } catch (err) {
        console.warn("Editorial generation skipped.");
      }
    } catch (e: any) {
      console.error(e);
      setProcessing({ status: 'error', message: "Falha no processamento. Tente novamente." });
    }
  };

  const handleCreatePro = async () => {
    if (!proPrompt) return;
    setProcessing({ status: 'loading', message: 'Gerando Ativo Digital...' });
    try {
      const url = await generateImagePro(proPrompt);
      setImage({ original: url, edited: url, treated: url });
      setProcessing({ status: 'success' });
    } catch (e: any) {
      setProcessing({ status: 'error', message: "Erro na geração digital." });
    }
  };

  const handleAIEdit = async () => {
    if (!aiEditPrompt || !image?.edited) return;
    setShowEditDialog(false);
    setProcessing({ status: 'loading', message: 'Refinando peça...' });
    try {
      const newUrl = await editImageWithAI(image.edited, aiEditPrompt);
      setImage(p => p ? { ...p, edited: newUrl } : null);
      setProcessing({ status: 'success' });
      setAiEditPrompt('');
    } catch (e: any) {
      setProcessing({ status: 'error', message: "Falha na edição." });
    }
  };

  return (
    <Layout>
      <div className="flex justify-center mb-10">
        <div className="inline-flex bg-zinc-100 p-1 rounded-full border border-zinc-200">
          <button 
            onClick={() => { setActiveTab('capture'); setImage(null); setProcessing({status:'idle'}); }}
            className={`px-8 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'capture' ? 'bg-[#662344] text-[#fdd49e]' : 'text-zinc-400 hover:text-[#662344]'}`}
          >
            RETOQUE STUDIO
          </button>
          <button 
            onClick={() => { setActiveTab('design'); setImage(null); setProcessing({status:'idle'}); }}
            className={`px-8 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'design' ? 'bg-[#662344] text-[#fdd49e]' : 'text-zinc-400 hover:text-[#662344]'}`}
          >
            DESIGN I.A.
          </button>
        </div>
      </div>

      {processing.status === 'error' && (
        <div className="max-w-xl mx-auto mb-8 p-5 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-center animate-in fade-in">
          <p className="text-[12px] font-bold uppercase tracking-wide">{processing.message}</p>
          <button onClick={() => setProcessing({status:'idle'})} className="mt-3 text-[9px] font-black underline uppercase">Limpar</button>
        </div>
      )}

      {processing.status === 'loading' ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-[#662344]/10 border-t-[#662344] rounded-full animate-spin mb-8" />
          <p className="text-[12px] font-serif italic text-[#662344] tracking-widest animate-pulse">{processing.message}</p>
        </div>
      ) : !image ? (
        <div className="max-w-4xl mx-auto text-center py-16 animate-in fade-in">
          <h1 className="text-6xl md:text-8xl font-serif text-[#662344] italic mb-6">Vilaça Studio</h1>
          <p className="text-[11px] uppercase tracking-[0.5em] text-[#662344]/40 font-bold mb-16">ESTÚDIO DE ALTA JOALHERIA</p>
          
          {activeTab === 'capture' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
              <button onClick={() => setIsCameraOpen(true)} className="p-16 bg-white border border-zinc-100 rounded-[4rem] shadow-xl hover:scale-[1.01] active:scale-95 transition-all flex flex-col items-center">
                <div className="w-16 h-16 mb-8 text-[#662344]">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth={1.5}/><circle cx="12" cy="13" r="3" strokeWidth={1.5}/></svg>
                </div>
                <span className="text-[12px] font-black uppercase tracking-[0.4em] text-[#662344]">FOTOGRAFAR JOIA</span>
              </button>
              <label className="p-16 bg-white border border-zinc-100 rounded-[4rem] shadow-xl hover:scale-[1.01] active:scale-95 transition-all cursor-pointer flex flex-col items-center">
                <input type="file" className="hidden" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => processImageInput(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                <div className="w-16 h-16 mb-8 text-[#662344]">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={1.5}/></svg>
                </div>
                <span className="text-[12px] font-black uppercase tracking-[0.4em] text-[#662344]">DA GALERIA</span>
              </label>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-xl border border-zinc-100">
               <textarea 
                className="w-full h-40 p-8 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] text-lg outline-none mb-10 resize-none text-[#662344]"
                placeholder="Descreva a joia que deseja criar..."
                value={proPrompt}
                onChange={e => setProPrompt(e.target.value)}
              />
              <button onClick={handleCreatePro} className="w-full bg-[#662344] text-[#fdd49e] py-6 rounded-full text-[13px] font-black uppercase tracking-[0.4em] shadow-lg">GERAR DESIGN</button>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in duration-700 space-y-16 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto px-4">
            {/* CATÁLOGO */}
            <div className="space-y-6">
              <div className="flex justify-between items-center px-4">
                <div className="flex flex-col">
                  <span className="text-[12px] font-black uppercase tracking-[0.3em] text-[#662344]">VISTA CATÁLOGO</span>
                  <span className="text-[8px] text-zinc-400 uppercase tracking-widest">Fundo Branco Puro</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowEditDialog(true)} className="px-5 py-2 bg-[#fdd49e] text-[#662344] rounded-full text-[9px] font-black uppercase">REFINAR</button>
                  <button onClick={() => setIsEditorOpen(true)} className="px-5 py-2 border border-[#662344] text-[#662344] rounded-full text-[9px] font-black uppercase">FILTROS</button>
                </div>
              </div>
              <div className="aspect-square bg-white rounded-[3rem] shadow-lg overflow-hidden border border-zinc-100 flex items-center justify-center p-8">
                <img src={image.edited} className="max-w-full max-h-full object-contain" alt="Joia" />
              </div>
            </div>

            {/* EDITORIAL */}
            <div className="space-y-6">
              <div className="flex flex-col px-4">
                <span className="text-[12px] font-black uppercase tracking-[0.3em] text-[#662344]">VISUAL CAMPANHA</span>
                <span className="text-[8px] text-zinc-400 uppercase tracking-widest">Contexto: {image.gender || "Processando..."}</span>
              </div>
              <div className="aspect-square bg-zinc-50 rounded-[3rem] shadow-lg overflow-hidden border border-zinc-100 flex items-center justify-center">
                {image.model ? (
                  <img src={image.model} className="w-full h-full object-cover" alt="Editorial" />
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-[#662344]/10 border-t-[#662344] rounded-full animate-spin mb-4" />
                    <span className="text-[8px] text-[#662344]/30 font-black uppercase tracking-widest">Processando Editorial...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={() => { setImage(null); setProcessing({ status: 'idle' }); }}
              className="px-20 py-6 bg-white border-2 border-[#662344] text-[#662344] rounded-full text-[11px] font-black uppercase tracking-[0.3em] shadow-md active:scale-95 transition-all"
            >
              NOVO TRABALHO
            </button>
          </div>
        </div>
      )}

      {showEditDialog && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-[3rem] p-12 shadow-2xl">
            <h2 className="text-3xl font-serif text-[#662344] italic text-center mb-8">Refinamento I.A.</h2>
            <textarea 
              className="w-full h-32 p-6 bg-zinc-50 border border-zinc-100 rounded-[2rem] outline-none mb-8 text-[#662344] text-sm"
              placeholder="Descreva o ajuste desejado..."
              value={aiEditPrompt}
              onChange={e => setAiEditPrompt(e.target.value)}
            />
            <div className="grid gap-3">
              <button onClick={handleAIEdit} className="w-full bg-[#662344] text-[#fdd49e] py-5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg">APLICAR AJUSTE</button>
              <button onClick={() => setShowEditDialog(false)} className="w-full py-3 text-zinc-300 text-[10px] font-black uppercase text-center">FECHAR</button>
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

