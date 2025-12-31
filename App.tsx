
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import CameraModal from './components/CameraModal';
import ClientExperience from './components/ClientExperience';
import { 
  enhanceJewelryImage, 
  generateModelView,
  createComparisonImage,
  generateStoryAndHashtags,
  JewelryStoryResponse
} from './services/geminiService';
import { ProcessingState } from './types';

type ViewMode = 'landing' | 'joalheria_login' | 'joalheria_studio' | 'cliente_experience';

interface AppImageState {
  original: string;
  treated?: string;
  cleanTreated?: string;
  category?: string;
  material?: string;
  gender?: string;
  model?: string;
  composite?: string;
  storyData?: JewelryStoryResponse;
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('landing');
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState(false);
  const [image, setImage] = useState<AppImageState | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJoalheriaAccess = () => {
    if (password === '1397314') {
      setView('joalheria_studio');
      setPassError(false);
    } else {
      setPassError(true);
    }
  };

  const processImageInput = async (base64: string) => {
    setIsCameraOpen(false);
    setProcessing({ status: 'loading', message: 'Identificando e Tratando Peça...' });
    try {
      const treatmentResult = await enhanceJewelryImage(base64);
      setImage({ 
        original: base64, 
        treated: treatmentResult.imageUrl, 
        cleanTreated: treatmentResult.cleanUrl,
        category: treatmentResult.category,
        material: treatmentResult.material,
        gender: treatmentResult.gender
      });

      setProcessing({ status: 'loading', message: 'Gerando Lookbook Minimalista...' });
      const modelResult = await generateModelView(treatmentResult.cleanUrl, treatmentResult.category, treatmentResult.material, treatmentResult.gender);
      
      setProcessing({ status: 'loading', message: 'Criando Moodboard Vilaça...' });
      const compositeUrl = await createComparisonImage(treatmentResult.cleanUrl, modelResult.cleanUrl);

      setProcessing({ status: 'loading', message: 'Buscando Tendências & Hashtags...' });
      const storyData = await generateStoryAndHashtags(treatmentResult.category, treatmentResult.material);

      setImage(prev => prev ? { ...prev, model: modelResult.imageUrl, composite: compositeUrl, storyData } : null);
      setProcessing({ status: 'success' });
    } catch (e) {
      setProcessing({ status: 'error', message: "Erro no Estúdio Vilaça." });
    }
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-16">
          <h1 className="text-8xl font-serif text-[#662344] italic mb-4">Vilaça</h1>
          <p className="text-[10px] tracking-[0.6em] text-[#662344]/50 font-black uppercase">Exclusividade em cada detalhe</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <button 
            onClick={() => setView('cliente_experience')}
            className="group bg-white p-12 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all border border-zinc-100 flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 bg-[#fdd49e]/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-[#662344]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-serif text-[#662344] italic">Sou Cliente</h3>
              <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase mt-2">Experimente suas joias favoritas</p>
            </div>
          </button>

          <button 
            onClick={() => setView('joalheria_login')}
            className="group bg-[#662344] p-12 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-[#fdd49e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-serif text-[#fdd49e] italic">Sou Joalheria</h3>
              <p className="text-[9px] font-black tracking-widest text-[#fdd49e]/40 uppercase mt-2">Acesso ao Studio Profissional</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (view === 'joalheria_login') {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-zinc-100 w-full max-w-md text-center">
          <h2 className="text-4xl font-serif text-[#662344] italic mb-8">Acesso Restrito</h2>
          <input 
            type="password" 
            placeholder="Senha da Joalheria"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full p-6 rounded-2xl border ${passError ? 'border-red-500' : 'border-zinc-200'} focus:outline-none focus:ring-2 focus:ring-[#662344] text-center text-2xl tracking-widest mb-6`}
          />
          {passError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-6">Senha Incorreta</p>}
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleJoalheriaAccess}
              className="w-full py-6 bg-[#662344] text-[#fdd49e] rounded-2xl font-black uppercase tracking-widest shadow-lg hover:brightness-110"
            >
              Entrar no Studio
            </button>
            <button onClick={() => setView('landing')} className="text-[10px] text-zinc-400 font-black uppercase tracking-widest py-2">Voltar</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'cliente_experience') {
    return (
      <Layout>
        <button 
          onClick={() => setView('landing')} 
          className="mb-8 flex items-center gap-2 text-[10px] font-black text-[#662344] uppercase tracking-widest hover:translate-x-[-4px] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          Voltar para Início
        </button>
        <ClientExperience />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-10">
        <button onClick={() => setView('landing')} className="text-[10px] font-black text-[#662344] uppercase tracking-widest">Voltar</button>
        <span className="text-[10px] font-black text-[#662344]/30 uppercase tracking-[0.5em]">Studio Pro</span>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = ev => processImageInput(ev.target?.result as string);
          reader.readAsDataURL(file);
        }
      }} />
      
      {processing.status === 'loading' ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <div className="w-20 h-20 border-t-4 border-[#662344] rounded-full animate-spin mb-8" />
          <p className="text-[#662344] font-serif italic text-xl animate-pulse">{processing.message}</p>
        </div>
      ) : !image ? (
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-8xl font-serif text-[#662344] italic mb-4">Vilaça</h1>
          <p className="text-[10px] tracking-[0.6em] text-[#662344]/50 font-black mb-16 uppercase">Joalheria & Ourivesaria Digital</p>
          <div className="flex flex-col md:flex-row gap-8 justify-center">
            <button onClick={() => setIsCameraOpen(true)} className="px-12 py-8 bg-white border rounded-[2rem] shadow-xl hover:scale-105 transition-all text-[#662344] font-black uppercase tracking-widest text-[10px]">Câmera Studio</button>
            <button onClick={() => fileInputRef.current?.click()} className="px-12 py-8 bg-white border rounded-[2rem] shadow-xl hover:scale-105 transition-all text-[#662344] font-black uppercase tracking-widest text-[10px]">Abrir Arquivo</button>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-20 pb-32">
          {image.composite && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] font-black tracking-[0.4em] text-[#662344] uppercase">Campanha Vilaça</span>
                <div className="flex gap-4">
                  <div className="px-4 py-1.5 bg-[#662344] text-[#fdd49e] rounded-full text-[8px] font-black uppercase tracking-widest">{image.category}</div>
                  <div className="px-4 py-1.5 bg-[#fdd49e] text-[#662344] rounded-full text-[8px] font-black uppercase tracking-widest">{image.material}</div>
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border">
                <img src={image.composite} className="w-full h-auto" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
               <span className="text-[9px] font-black tracking-widest text-[#662344]/40 uppercase ml-4">01. Fotografia Técnica</span>
               <div className="bg-white rounded-[2rem] shadow-lg p-2 border">
                 <img src={image.treated} className="w-full h-auto rounded-[1.5rem]" />
               </div>
            </div>
            <div className="space-y-4">
               <span className="text-[9px] font-black tracking-widest text-[#662344]/40 uppercase ml-4">02. Lookbook Minimalista</span>
               <div className="bg-zinc-100 rounded-[2rem] shadow-lg overflow-hidden border">
                 <img src={image.model} className="w-full h-auto" />
               </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <button onClick={() => setImage(null)} className="px-16 py-6 bg-[#662344] text-[#fdd49e] rounded-full text-[10px] font-black uppercase tracking-[0.4em] shadow-xl hover:scale-105 active:scale-95 transition-all">Iniciar Novo Processo</button>
            <p className="text-[8px] text-zinc-400 tracking-widest uppercase text-center leading-relaxed">
              Sistema Vilaça v6.2 - Alta Ourivesaria Digital<br/>
              Processamento em 4K HDR via I.A. Geminaris
            </p>
          </div>
        </div>
      )}

      <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={processImageInput} mode="photo" />
    </Layout>
  );
};

export default App;
