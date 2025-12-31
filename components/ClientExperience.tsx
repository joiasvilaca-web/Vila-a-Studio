
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import CameraModal from './CameraModal';

const ClientExperience: React.FC = () => {
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [jewelryRef, setJewelryRef] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  const userFileRef = useRef<HTMLInputElement>(null);
  const jewelryFileRef = useRef<HTMLInputElement>(null);

  const handleInstagramRedirect = () => {
    window.open('https://www.instagram.com/vilacajoias', '_blank');
  };

  const processTryOn = async () => {
    if (!userPhoto || !jewelryRef) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const userBase64 = userPhoto.split(',')[1];
      const jewelryBase64 = jewelryRef.split(',')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: userBase64 } },
            { inlineData: { mimeType: 'image/jpeg', data: jewelryBase64 } },
            { text: "Pegue a joia mostrada na segunda imagem e insira-a de forma natural e realista na pessoa da primeira imagem. A joia deve aparecer como se estivesse sendo usada, respeitando proporções, luz e sombras. Resultado fotorealista de alta definição." }
          ]
        },
        config: { imageConfig: { aspectRatio: "3:4" } }
      });

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData) {
        setResult(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
      }
    } catch (e) {
      console.error(e);
      alert("Houve um erro ao processar sua experiência.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="text-center">
          <h2 className="text-4xl font-serif text-[#662344] italic">Sua Experiência Vilaça</h2>
          <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mt-2">Personalizada por Inteligência Artificial</p>
        </div>
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border p-4">
          <img src={result} className="w-full h-auto rounded-[2.5rem]" />
        </div>
        <button 
          onClick={() => {setResult(null); setUserPhoto(null); setJewelryRef(null);}} 
          className="w-full py-6 bg-[#662344] text-[#fdd49e] rounded-full font-black uppercase tracking-widest shadow-xl"
        >
          Experimentar Outra Joia
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-16">
      <div className="text-center">
        <h2 className="text-5xl font-serif text-[#662344] italic">Experimente sua Joia</h2>
        <p className="text-[10px] font-black tracking-[0.4em] text-[#662344]/40 uppercase mt-4">Provador Virtual de Alta Precisão</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Seção 1: Cliente */}
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-2">
             <span className="text-[11px] font-black text-[#662344] uppercase tracking-widest">1. Sua Foto</span>
             <p className="text-[9px] text-zinc-400 text-center px-10">Tire uma foto sua ou carregue uma imagem nítida do rosto ou busto.</p>
          </div>
          <div className="aspect-[3/4] bg-white rounded-[2.5rem] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center relative overflow-hidden group">
            {userPhoto ? (
              <div className="relative w-full h-full group">
                <img src={userPhoto} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                  <button 
                    onClick={() => setIsCameraOpen(true)} 
                    className="px-6 py-2 bg-white text-[#662344] rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                  >
                    Tirar Nova Foto
                  </button>
                  <button 
                    onClick={() => setUserPhoto(null)} 
                    className="px-6 py-2 border border-white text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <button onClick={() => setIsCameraOpen(true)} className="px-6 py-3 bg-[#662344] text-white rounded-full text-[10px] font-black uppercase tracking-widest">Usar Câmera</button>
                <button onClick={() => userFileRef.current?.click()} className="px-6 py-3 border border-[#662344] text-[#662344] rounded-full text-[10px] font-black uppercase tracking-widest">Abrir Arquivo</button>
              </div>
            )}
            <input type="file" ref={userFileRef} className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = ev => setUserPhoto(ev.target?.result as string);
                reader.readAsDataURL(file);
              }
            }} />
          </div>
        </div>

        {/* Seção 2: Joia */}
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-2">
             <span className="text-[11px] font-black text-[#662344] uppercase tracking-widest">2. Escolher Joia</span>
             <p className="text-[9px] text-zinc-400 text-center px-10">Escolha um post no Instagram e anexe o print da joia aqui.</p>
          </div>
          <div className="aspect-[3/4] bg-[#fdd49e]/5 rounded-[2.5rem] border-2 border-dashed border-[#fdd49e]/30 flex flex-col items-center justify-center relative overflow-hidden group">
            {jewelryRef ? (
              <div className="relative w-full h-full group">
                <img src={jewelryRef} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                  <button 
                    onClick={() => jewelryFileRef.current?.click()} 
                    className="px-6 py-2 bg-[#fdd49e] text-[#662344] rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                  >
                    Trocar Print
                  </button>
                  <button 
                    onClick={() => setJewelryRef(null)} 
                    className="px-6 py-2 border border-white text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-center px-8">
                <button onClick={handleInstagramRedirect} className="px-8 py-4 bg-gradient-to-tr from-[#662344] to-[#8a305d] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Ver Coleção no Instagram</button>
                <button onClick={() => jewelryFileRef.current?.click()} className="px-8 py-4 bg-white border border-zinc-200 text-zinc-400 rounded-full text-[10px] font-black uppercase tracking-widest">Anexar Print do Post</button>
                <p className="text-[8px] text-zinc-300 font-bold uppercase tracking-widest mt-2 italic">Dica: Tire um print do post desejado e anexe aqui</p>
              </div>
            )}
            <input type="file" ref={jewelryFileRef} className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = ev => setJewelryRef(ev.target?.result as string);
                reader.readAsDataURL(file);
              }
            }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center pt-10">
        <button 
          disabled={!userPhoto || !jewelryRef || loading}
          onClick={processTryOn}
          className={`px-24 py-8 rounded-full text-[12px] font-black uppercase tracking-[0.5em] shadow-2xl transition-all ${(!userPhoto || !jewelryRef || loading) ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed' : 'bg-[#662344] text-[#fdd49e] hover:scale-105 hover:shadow-[#662344]/20'}`}
        >
          {loading ? 'Processando Estilo...' : 'Gerar Experiência'}
        </button>
      </div>

      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={(img) => {
          setUserPhoto(img);
          setIsCameraOpen(false); // Volta para o app imediatamente após capturar
        }} 
        mode="photo" 
      />
    </div>
  );
};

export default ClientExperience;
