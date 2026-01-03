
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import CameraModal from './components/CameraModal';
import ClientExperience from './components/ClientExperience';
import { 
  enhanceJewelryImage, 
  generateModelView,
  createComparisonImage,
  createInstagramStyleComposite,
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
  instaComposite?: string;
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
    setProcessing({ status: 'loading', message: 'Iniciando Processamento de Luxo...' });
    try {
      const treatmentResult = await enhanceJewelryImage(base64);
      
      setProcessing({ status: 'loading', message: 'Gerando Lookbook e Editorial...' });
      const modelResult = await generateModelView(treatmentResult.cleanUrl, treatmentResult.category, treatmentResult.material, treatmentResult.gender);
      
      setProcessing({ status: 'loading', message: 'Criando Composições de Campanha...' });
      const compositeUrl = await createComparisonImage(treatmentResult.cleanUrl, modelResult.cleanUrl);
      const instaUrl = await createInstagramStyleComposite(treatmentResult.cleanUrl, modelResult.cleanUrl);

      const storyData = await generateStoryAndHashtags(treatmentResult.category, treatmentResult.material);

      setImage({ 
        original: base64, 
        treated: treatmentResult.imageUrl, 
        cleanTreated: treatmentResult.cleanUrl,
        category: treatmentResult.category,
        material: treatmentResult.material,
        gender: treatmentResult.gender,
        model: modelResult.imageUrl, 
        composite: compositeUrl,
        instaComposite: instaUrl,
        storyData 
      });
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
        <button onClick={() => setView('landing')} className="text-[10px] font-black text-[#662344] uppercase tracking-widest">Sair do Studio</button>
        <span className="text-[10px] font-black text-[#662344]/30 uppercase tracking-[0.5em]">Studio Vilaça Pro v2.0</span>
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
          <div className="w-16 h-16 border-t-2 border-[#662344] rounded-full animate-spin mb-8" />
          <p className="text-[#662344] font-serif italic text-lg animate-pulse">{processing.message}</p>
        </div>
      ) : !image ? (
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-7xl font-serif text-[#662344] italic mb-4">Studio Vilaça</h1>
          <p className="text-[9px] tracking-[0.5em] text-[#662344]/40 font-black mb-16 uppercase">Produção Profissional de Assets</p>
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <button onClick={() => setIsCameraOpen(true)} className="px-10 py-6 bg-white border rounded-[1.5rem] shadow-xl hover:scale-105 transition-all text-[#662344] font-black uppercase tracking-widest text-[9px]">Capturar Produto</button>
            <button onClick={() => fileInputRef.current?.click()} className="px-10 py-6 bg-[#662344] text-[#fdd49e] rounded-[1.5rem] shadow-xl hover:scale-105 transition-all font-black uppercase tracking-widest text-[9px]">Enviar Foto</button>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-16 pb-32 animate-in fade-in duration-1000">
          {/* Header minimalista com metadados */}
          <div className="flex flex-col items-center gap-4 border-b border-zinc-100 pb-10">
            <span className="text-[9px] font-black tracking-[0.5em] text-[#662344]/30 uppercase">Assets Gerados com Sucesso</span>
            <div className="flex gap-4">
              <div className="px-6 py-2 bg-[#662344]/5 text-[#662344] rounded-full text-[8px] font-black uppercase tracking-widest border border-[#662344]/10">{image.category}</div>
              <div className="px-6 py-2 bg-[#662344]/5 text-[#662344] rounded-full text-[8px] font-black uppercase tracking-widest border border-[#662344]/10">{image.material}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-sm font-black text-[#662344] uppercase tracking-widest">Tratamento Packshot</h3>
              <div className="bg-white p-4 rounded-[2rem] shadow-xl border border-zinc-100">
                <img src={image.treated} className="w-full h-auto rounded-[1.5rem]" alt="Treated" />
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-sm font-black text-[#662344] uppercase tracking-widest">Editorial IA</h3>
              <div className="bg-white p-4 rounded-[2rem] shadow-xl border border-zinc-100">
                <img src={image.model} className="w-full h-auto rounded-[1.5rem]" alt="Model" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black text-[#662344] uppercase tracking-widest text-center">Composições de Campanha</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <img src={image.composite} className="w-full h-auto rounded-[2rem] shadow-2xl" alt="Composite" />
              <img src={image.instaComposite} className="w-full h-auto rounded-[2rem] shadow-2xl" alt="Instagram Style" />
            </div>
          </div>

          {image.storyData && (
            <div className="bg-[#662344] p-12 rounded-[3rem] text-[#fdd49e] space-y-8">
              <div className="text-center">
                <h3 className="text-3xl font-serif italic mb-2">Narrativa de Luxo</h3>
                <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Storytelling para Redes Sociais</p>
              </div>
              <p className="text-lg leading-relaxed font-serif italic text-center px-4">"{image.storyData.story}"</p>
              <div className="flex flex-wrap justify-center gap-3">
                {image.storyData.hashtags.map((tag, i) => (
                  <span key={i} className="text-[10px] font-black uppercase tracking-widest opacity-60">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-10">
            <button 
              onClick={() => setImage(null)}
              className="px-12 py-5 bg-white border border-[#662344]/10 text-[#662344] rounded-full font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-zinc-50"
            >
              Processar Nova Joia
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
    </Layout>
  );
};

export default App;
