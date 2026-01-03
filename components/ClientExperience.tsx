
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
            { text: "Aplique a joia da imagem 2 no corpo da pessoa da imagem 1 de forma ultra-realista. Ajuste perspectiva, luz e sombras para parecer uma foto original. Resultado minimalista e elegante." }
          ]
        },
        config: { imageConfig: { aspectRatio: "3:4" } }
      });

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData) {
        setResult(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
      }
    } catch (e) {
      alert("Erro ao processar sua experiência.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-md mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="text-center">
          <h2 className="text-3xl font-serif text-[#662344] italic">Seu Look Vilaça</h2>
          <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase mt-2">Visão Fotorealista</p>
        </div>
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border p-3">
          <img src={result} className="w-full h-auto rounded-[2rem]" />
        </div>
        <button 
          onClick={() => {setResult(null); setUserPhoto(null); setJewelryRef(null);}} 
          className="w-full py-5 bg-[#662344] text-[#fdd49e] rounded-full font-black uppercase tracking-widest shadow-lg hover:scale-102 transition-all text-[10px]"
        >
          Experimentar Outra Peça
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-12">
      <div className="text-center">
        <h2 className="text-4xl font-serif text-[#662344] italic">Provador Virtual</h2>
        <p className="text-[9px] font-black tracking-[0.4em] text-[#662344]/40 uppercase mt-4">Experiência Minimalista Vilaça</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-3xl mx-auto">
        {/* Passo 1: Sua Foto */}
        <div className="space-y-4">
          <div className="text-center space-y-1">
             <span className="text-[10px] font-black text-[#662344] uppercase tracking-widest">1. Sua Foto</span>
             <p className="text-[8px] text-zinc-400 uppercase">Selfie ou foto nítida</p>
          </div>
          <div className="aspect-[3/4] bg-white rounded-[2rem] border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center relative overflow-hidden group shadow-sm">
            {userPhoto ? (
              <div className="relative w-full h-full group">
                <img src={userPhoto} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                  <button onClick={() => setIsCameraOpen(true)} className="px-5 py-2 bg-white text-[#662344] rounded-full text-[9px] font-black uppercase tracking-widest">Nova Foto</button>
                  <button onClick={() => setUserPhoto(null)} className="px-5 py-2 border border-white text-white rounded-full text-[9px] font-black uppercase tracking-widest">Remover</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button onClick={() => setIsCameraOpen(true)} className="px-6 py-3 bg-[#662344] text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-md">Câmera</button>
                <button onClick={() => userFileRef.current?.click()} className="px-6 py-3 border border-[#662344] text-[#662344] rounded-full text-[9px] font-black uppercase tracking-widest">Arquivo</button>
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

        {/* Passo 2: Escolher Joia (Duas Etapas) */}
        <div className="space-y-4">
          <div className="text-center space-y-1">
             <span className="text-[10px] font-black text-[#662344] uppercase tracking-widest">2. Escolher Joia</span>
             <p className="text-[8px] text-zinc-400 uppercase">Acesse e anexe o print</p>
          </div>
          <div className="aspect-[3/4] bg-zinc-50 rounded-[2rem] border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center relative overflow-hidden group">
            {jewelryRef ? (
              <div className="relative w-full h-full">
                <img src={jewelryRef} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#662344]/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                  <button onClick={() => jewelryFileRef.current?.click()} className="px-5 py-2 bg-[#fdd49e] text-[#662344] rounded-full text-[9px] font-black uppercase tracking-widest">Novo Print</button>
                  <button onClick={() => setJewelryRef(null)} className="px-5 py-2 border border-white text-white rounded-full text-[9px] font-black uppercase tracking-widest">Remover</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 w-full px-8">
                {/* ETAPA 1 */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">Etapa 1: Abrir Catálogo</span>
                  <button onClick={handleInstagramRedirect} className="w-full py-4 bg-gradient-to-tr from-[#662344] to-[#8a305d] text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-md hover:scale-102 transition-transform">Ir para o Instagram</button>
                </div>
                
                <div className="h-px bg-zinc-200 w-full my-1" />

                {/* ETAPA 2 */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">Etapa 2: Já printei!</span>
                  <button onClick={() => jewelryFileRef.current?.click()} className="w-full py-4 bg-white border border-zinc-200 text-[#662344] rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-zinc-50">Anexar Captura</button>
                </div>
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

      <div className="flex flex-col items-center pt-6">
        <button 
          disabled={!userPhoto || !jewelryRef || loading}
          onClick={processTryOn}
          className={`px-16 py-6 rounded-full text-[11px] font-black uppercase tracking-[0.4em] shadow-xl transition-all ${(!userPhoto || !jewelryRef || loading) ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed shadow-none' : 'bg-[#662344] text-[#fdd49e] hover:scale-105 active:scale-95'}`}
        >
          {loading ? 'Processando Realismo...' : 'Gerar Look Virtual'}
        </button>
        <p className="text-[7px] text-zinc-400 uppercase tracking-[0.2em] mt-6">IA Generativa de Ultra-Definição Vilaça</p>
      </div>

      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={(img) => {
          setUserPhoto(img);
          setIsCameraOpen(false);
        }} 
        mode="photo" 
      />
    </div>
  );
};

export default ClientExperience;
