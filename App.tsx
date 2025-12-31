
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import CameraModal from './components/CameraModal';
import ImageEditor from './components/ImageEditor';
import { 
  enhanceJewelryImage, 
  generateModelView,
  createComparisonImage,
  generateStoryAndHashtags,
  JewelryStoryResponse
} from './services/geminiService';
import { ProcessingState } from './types';

interface AppImageState {
  original: string;
  treated?: string;
  cleanTreated?: string;
  edited?: string;
  category?: string;
  material?: string;
  gender?: string;
  model?: string;
  cleanModel?: string;
  composite?: string;
  storyData?: JewelryStoryResponse;
}

const App: React.FC = () => {
  const [image, setImage] = useState<AppImageState | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageInput = async (base64: string) => {
    setIsCameraOpen(false);
    setProcessing({ status: 'loading', message: 'Etapa 1: Recorte e Tratamento Vilaça...' });
    
    try {
      const treatmentResult = await enhanceJewelryImage(base64);
      setImage({ 
        original: base64, 
        treated: treatmentResult.imageUrl, 
        cleanTreated: treatmentResult.cleanUrl,
        edited: treatmentResult.imageUrl,
        category: treatmentResult.category,
        material: treatmentResult.material,
        gender: treatmentResult.gender
      });

      setProcessing({ status: 'loading', message: 'Etapa 2: Campanha Editorial...' });
      const modelResult = await generateModelView(treatmentResult.cleanUrl, treatmentResult.category, treatmentResult.material, treatmentResult.gender);
      
      setProcessing({ status: 'loading', message: 'Etapa 3: Moodboard de Composição...' });
      const compositeUrl = await createComparisonImage(treatmentResult.cleanUrl, modelResult.cleanUrl);

      setProcessing({ status: 'loading', message: 'Etapa 4: Narrativa & Tendências...' });
      const storyData = await generateStoryAndHashtags(treatmentResult.category, treatmentResult.material);

      setImage(prev => prev ? { 
        ...prev, 
        model: modelResult.imageUrl, 
        cleanModel: modelResult.cleanUrl,
        composite: compositeUrl, 
        storyData 
      } : null);
      setProcessing({ status: 'success' });

    } catch (e: any) {
      console.error(e);
      setProcessing({ status: 'error', message: "Erro no processamento Vilaça." });
    }
  };

  return (
    <Layout>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = ev => processImageInput(ev.target?.result as string);
          reader.readAsDataURL(file);
        }
      }} />
      
      {processing.status === 'loading' ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center animate-pulse">
          <div className="w-24 h-24 border-t-4 border-[#662344] rounded-full animate-spin mb-8" />
          <p className="text-[#662344] font-serif italic text-xl">{processing.message}</p>
        </div>
      ) : !image ? (
        <div className="max-w-4xl mx-auto text-center py-10">
          <h1 className="text-8xl font-serif text-[#662344] italic mb-4">Vilaça</h1>
          <p className="text-[10px] tracking-[0.6em] text-[#662344]/50 font-black mb-16 uppercase">Joalheria & Ourivesaria Digital</p>
          <div className="flex flex-col md:flex-row gap-8 justify-center">
            <button onClick={() => setIsCameraOpen(true)} className="p-12 bg-white border rounded-[3rem] shadow-xl hover:scale-105 transition-all text-[#662344] font-black uppercase tracking-widest text-xs">Capturar Joia</button>
            <button onClick={() => fileInputRef.current?.click()} className="p-12 bg-white border rounded-[3rem] shadow-xl hover:scale-105 transition-all text-[#662344] font-black uppercase tracking-widest text-xs">Galeria</button>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-24 pb-32 animate-in fade-in">
          
          {/* ETAPA 3 */}
          {image.composite && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-[12px] font-black tracking-[0.4em] text-[#662344]">ETAPA 3: MOODBOARD DE CAMPANHA</span>
              </div>
              <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border">
                <img src={image.composite} className="w-full h-auto" alt="Composição" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
               <span className="text-[10px] font-black tracking-widest text-[#662344]/40 uppercase">Etapa 1: Foto Técnica</span>
               <div className="bg-white rounded-[2rem] shadow-lg p-2 border">
                 <img src={image.treated} className="w-full h-auto rounded-[1.5rem]" />
               </div>
            </div>
            <div className="space-y-4">
               <span className="text-[10px] font-black tracking-widest text-[#662344]/40 uppercase">Etapa 2: Lookbook</span>
               <div className="bg-zinc-100 rounded-[2rem] shadow-lg overflow-hidden border">
                 {image.model ? <img src={image.model} className="w-full h-auto" /> : <div className="h-64 flex items-center justify-center">Gerando...</div>}
               </div>
            </div>
          </div>

          {image.storyData && (
            <div className="bg-white rounded-[3.5rem] p-16 shadow-2xl border border-[#fdd49e]/20 space-y-12">
              <div className="text-center">
                <span className="text-[12px] font-black tracking-[0.5em] text-[#662344] uppercase">Etapa 4: Narrativa & Social</span>
              </div>
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="font-serif italic text-2xl text-[#662344] leading-relaxed text-center">
                  "{image.storyData.story}"
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  {image.storyData.hashtags.slice(0, 5).map(tag => (
                    <span key={tag} className="px-6 py-2 bg-[#662344] text-[#fdd49e] rounded-full text-[10px] font-black uppercase tracking-widest">
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <button onClick={() => setImage(null)} className="px-16 py-6 bg-[#662344] text-[#fdd49e] rounded-full text-[10px] font-black uppercase tracking-[0.4em] shadow-xl hover:brightness-110 active:scale-95 transition-all">Novo Estudo</button>
            <p className="text-[8px] text-zinc-400 tracking-widest uppercase text-center">
              Vilaça Joalheria & Ourivesaria v5.0<br/>
              Uso de I.A. pode conter distorções. Consulte uma atendente.
            </p>
          </div>
        </div>
      )}

      <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={processImageInput} mode="photo" />
    </Layout>
  );
};

export default App;
