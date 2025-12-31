
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import CameraModal from './components/CameraModal';
import ImageEditor from './components/ImageEditor';
import { 
  enhanceJewelryImage, 
  generateImagePro,
  generateModelView
} from './services/geminiService';
import { ProcessingState } from './types';

interface AppImageState {
  original: string;
  treated?: string;
  edited?: string;
  category?: string;
  material?: string;
  gender?: string;
  model?: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'capture' | 'design'>('capture');
  const [image, setImage] = useState<AppImageState | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'capture' | 'design'>('capture');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle' });
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);
  const [proPrompt, setProPrompt] = useState('');
  const [designReferences, setDesignReferences] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCapture = (target: 'capture' | 'design') => {
    setCameraTarget(target);
    setIsCameraOpen(true);
  };

  const handleFileSelect = (target: 'capture' | 'design') => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.target = target;
      fileInputRef.current.click();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = e.target.dataset.target as 'capture' | 'design';
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const base64 = ev.target?.result as string;
        if (target === 'capture') {
          processImageInput(base64);
        } else {
          setDesignReferences(prev => [...prev, base64].slice(-3));
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const processImageInput = async (base64: string) => {
    setIsCameraOpen(false);
    if (cameraTarget === 'design') {
      setDesignReferences(prev => [...prev, base64].slice(-3));
      return;
    }

    setProcessing({ status: 'loading', message: 'Executando Recorte e Tratamento Vilaça...' });
    
    try {
      const result = await enhanceJewelryImage(base64);
      setImage({ 
        original: base64, 
        treated: result.imageUrl, 
        edited: result.imageUrl,
        category: result.category,
        material: result.material,
        gender: result.gender
      });
      setProcessing({ status: 'success' });
    } catch (e: any) {
      console.error(e);
      setProcessing({ status: 'error', message: "Falha no tratamento da imagem." });
    }
  };

  const handleGenerateModel = async () => {
    if (!image?.edited || !image.category || isGeneratingModel) return;

    // Verificar se existe chave de API para o modelo Pro
    const aistudio = (window as any).aistudio;
    if (typeof aistudio?.hasSelectedApiKey === 'function') {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey && typeof aistudio.openSelectKey === 'function') {
        await aistudio.openSelectKey();
        // Seguindo as instruções: após o diálogo, prosseguimos assumindo sucesso.
      }
    }
    
    setIsGeneratingModel(true);
    try {
      const modelUrl = await generateModelView(
        image.edited, 
        image.category, 
        image.material || 'gold', 
        image.gender || 'female'
      );
      setImage(prev => prev ? { ...prev, model: modelUrl } : null);
      
      // Scroll automático para a nova imagem da modelo
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 500);
    } catch (err) {
      console.error("Editorial generation failed:", err);
      alert("Houve um problema ao gerar a modelo. Tente novamente.");
    } finally {
      setIsGeneratingModel(false);
    }
  };

  const handleGenerateDesign = async () => {
    if(!proPrompt && designReferences.length === 0) return;
    setProcessing({status: 'loading', message: 'Gerando Design Digital Vilaça 3:4...'});
    try {
      const url = await generateImagePro(proPrompt, designReferences);
      setImage({ original: url, edited: url, treated: url });
      setProcessing({status: 'success'});
    } catch(e) {
      setProcessing({status: 'error', message: 'Falha na geração.'});
    }
  };

  return (
    <Layout>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileChange} />
      
      <div className="flex justify-center mb-10">
        <div className="inline-flex bg-zinc-200/50 p-1.5 rounded-full border border-zinc-200 backdrop-blur-md shadow-inner">
          <button 
            onClick={() => { setActiveTab('capture'); setImage(null); setProcessing({status:'idle'}); }}
            className={`px-10 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'capture' ? 'bg-[#662344] text-[#fdd49e] shadow-xl scale-105' : 'text-zinc-500 hover:text-[#662344]'}`}
          >
            FOTO HDR PROFISSIONAL
          </button>
          <button 
            onClick={() => { setActiveTab('design'); setImage(null); setProcessing({status:'idle'}); setDesignReferences([]); }}
            className={`px-10 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'design' ? 'bg-[#662344] text-[#fdd49e] shadow-xl scale-105' : 'text-zinc-500 hover:text-[#662344]'}`}
          >
            DESIGN I.A.
          </button>
        </div>
      </div>

      {processing.status === 'error' && (
        <div className="max-w-xl mx-auto mb-10 p-6 bg-red-50 border border-red-200 rounded-[2rem] text-red-700 text-center animate-in slide-in-from-top duration-500 shadow-sm">
          <p className="text-[12px] font-black uppercase tracking-[0.2em]">{processing.message}</p>
          <button onClick={() => setProcessing({status:'idle'})} className="mt-3 text-[10px] font-bold underline opacity-50 hover:opacity-100 transition-opacity uppercase">Tentar novamente</button>
        </div>
      )}

      {processing.status === 'loading' ? (
        <div className="min-h-[55vh] flex flex-col items-center justify-center animate-in fade-in duration-700">
          <div className="relative w-32 h-32 mb-14">
            <div className="absolute inset-0 border-[4px] border-[#662344]/5 rounded-full"></div>
            <div className="absolute inset-0 border-t-[4px] border-[#662344] rounded-full animate-spin"></div>
            <div className="absolute inset-6 border-[1px] border-[#662344]/10 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-1.5 h-1.5 bg-[#662344] rounded-full animate-ping" />
            </div>
          </div>
          <p className="text-[14px] font-serif italic text-[#662344] tracking-[0.25em] text-center max-w-sm leading-relaxed animate-pulse">{processing.message}</p>
        </div>
      ) : !image ? (
        <div className="max-w-5xl mx-auto text-center py-10 animate-in fade-in duration-1000">
          <h1 className="text-8xl md:text-9xl font-serif text-[#662344] italic mb-8 tracking-tighter drop-shadow-sm">Vilaça Studio</h1>
          <p className="text-[11px] uppercase tracking-[0.7em] text-[#662344]/40 font-black mb-20">ESTÚDIO DE ALTA DEFINIÇÃO PARA JOALHERIA</p>
          
          {activeTab === 'capture' ? (
            <div className="flex flex-col gap-10 max-w-2xl mx-auto px-6">
              <div className="grid grid-cols-1 gap-6">
                <button 
                  onClick={() => openCapture('capture')} 
                  className="group relative p-16 bg-white border border-zinc-100 rounded-[3.5rem] shadow-2xl hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] transition-all flex flex-col items-center overflow-hidden active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-50/50 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 w-16 h-16 mb-8 text-[#662344] group-hover:scale-110 transition-transform duration-500">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth={1}/><circle cx="12" cy="13" r="3" strokeWidth={1}/></svg>
                  </div>
                  <span className="relative z-10 text-[14px] font-black uppercase tracking-[0.5em] text-[#662344]">ABRIR CÂMERA STUDIO</span>
                </button>
              </div>

              <button 
                onClick={() => handleFileSelect('capture')}
                className="group p-10 bg-white border border-zinc-200 border-dashed rounded-[3rem] hover:bg-zinc-50 transition-all cursor-pointer flex flex-col items-center shadow-sm"
              >
                <div className="w-10 h-10 mb-4 text-[#662344]/20 group-hover:text-[#662344]/40 transition-colors">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={1.5}/></svg>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#662344]/30">IMPORTAR DA GALERIA</span>
              </button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto bg-white p-10 rounded-[4rem] shadow-2xl border border-zinc-100 animate-in slide-in-from-bottom duration-700">
              <div className="mb-10 text-left px-4">
                <span className="text-[10px] font-black text-[#662344]/40 uppercase tracking-[0.3em]">1. Referências Visuais (Opcional)</span>
                <div className="flex gap-4 mt-4 items-center overflow-x-auto pb-2">
                  {designReferences.map((ref, i) => (
                    <div key={i} className="relative group min-w-[5rem] w-20 h-20 rounded-2xl overflow-hidden border border-zinc-100">
                      <img src={ref} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setDesignReferences(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
                      </button>
                    </div>
                  ))}
                  {designReferences.length < 3 && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openCapture('design')}
                        className="w-20 h-20 rounded-2xl border-2 border-dashed border-zinc-200 flex items-center justify-center text-zinc-300 hover:text-[#662344] hover:border-[#662344]/30 transition-all"
                        title="Tirar Foto"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth={2}/><circle cx="12" cy="13" r="3" strokeWidth={2}/></svg>
                      </button>
                      <button 
                        onClick={() => handleFileSelect('design')}
                        className="w-20 h-20 rounded-2xl border-2 border-dashed border-zinc-200 flex items-center justify-center text-zinc-300 hover:text-[#662344] hover:border-[#662344]/30 transition-all"
                        title="Anexar Arquivo"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={2}/></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-10 text-left px-4">
                <span className="text-[10px] font-black text-[#662344]/40 uppercase tracking-[0.3em]">2. Conceito do Design</span>
                <textarea 
                  className="w-full h-32 p-8 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] text-lg outline-none mt-4 resize-none text-[#662344] placeholder:text-zinc-200 font-serif italic"
                  placeholder="Ex: Anel de ouro branco com diamante lapidação gota..."
                  value={proPrompt}
                  onChange={e => setProPrompt(e.target.value)}
                />
              </div>

              <button 
                onClick={handleGenerateDesign} 
                className="w-full bg-[#662344] text-[#fdd49e] py-7 rounded-full text-[14px] font-black uppercase tracking-[0.5em] shadow-xl hover:brightness-110 active:scale-95 transition-all"
              >
                GERAR DESIGN EXCLUSIVO
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in duration-700 space-y-24 pb-32">
          <div className="max-w-2xl mx-auto px-6 space-y-20">
            
            {/* Seção 1: Foto Tratada (Sempre no topo) */}
            <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
              <div className="flex justify-between items-end px-4">
                <div className="flex flex-col">
                  <span className="text-[14px] font-black uppercase tracking-[0.4em] text-[#662344]">FOTO TRATADA</span>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-widest mt-1">3:4 Macro | Padrão Vilaça</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsEditorOpen(true)} className="px-6 py-2 bg-[#662344] text-[#fdd49e] rounded-full text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all">AJUSTAR ESTÚDIO</button>
                  <button 
                    onClick={handleGenerateModel} 
                    disabled={isGeneratingModel}
                    className={`px-6 py-2 bg-[#fdd49e] text-[#662344] border border-[#662344]/10 rounded-full text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all ${isGeneratingModel ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {image.model ? 'Regerar modelo' : 'Gerar modelo'}
                  </button>
                </div>
              </div>
              
              <div className="aspect-[3/4] bg-white rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.02)] overflow-hidden border border-zinc-100 flex items-center justify-center p-0 transition-transform hover:scale-[1.01] duration-500">
                <img src={image.edited} className="w-full h-full object-contain" alt="Tratamento Profissional" />
              </div>
            </div>

            {/* Seção 2: Foto Modelo (Aparece abaixo conforme solicitado) */}
            {(image.model || isGeneratingModel) && (
              <div className="space-y-8 animate-in slide-in-from-bottom duration-1000 border-t border-zinc-100 pt-16">
                <div className="flex flex-col px-4">
                  <span className="text-[14px] font-black uppercase tracking-[0.4em] text-[#662344]">LOOKBOOK EDITORIAL</span>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-widest mt-1">Geração Gemini 3 Pro | Escala Minimalista</span>
                </div>
                <div className="aspect-[3/4] bg-zinc-50 rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.02)] overflow-hidden border border-zinc-100 flex items-center justify-center relative group">
                  {image.model ? (
                    <img src={image.model} className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105" alt="Lookbook Editorial" />
                  ) : (
                    <div className="flex flex-col items-center p-12">
                      <div className="w-16 h-16 border-[4px] border-[#662344]/5 border-t-[#662344] rounded-full animate-spin mb-10" />
                      <p className="text-[11px] text-[#662344]/40 font-black uppercase tracking-[0.5em] animate-pulse text-center leading-loose">
                        Renderizando composição de luxo...<br/>
                        <span className="text-[8px] opacity-60">Ajustando escala da joia</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          <div className="flex justify-center">
            <button 
              onClick={() => { setImage(null); setProcessing({ status: 'idle' }); setIsGeneratingModel(false); }}
              className="px-24 py-7 bg-white border-2 border-[#662344] text-[#662344] rounded-full text-[12px] font-black uppercase tracking-[0.4em] shadow-xl hover:bg-[#662344] hover:text-[#fdd49e] transition-all duration-500 active:scale-95"
            >
              INICIAR NOVO PROJETO
            </button>
          </div>
        </div>
      )}

      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={processImageInput}
        mode="photo"
      />
      {isEditorOpen && image?.edited && (
        <ImageEditor 
          imageUrl={image.treated || image.original} 
          onSave={(url) => { setImage({...image, edited: url}); setIsEditorOpen(false); }}
          onCancel={() => setIsEditorOpen(false)}
        />
      )}
    </Layout>
  );
};

export default App;
