
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import CameraModal from './CameraModal';

const ClientExperience: React.FC = () => {
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [jewelryRef, setJewelryRef] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isCapturingScreen, setIsCapturingScreen] = useState(false);
  
  const userFileRef = useRef<HTMLInputElement>(null);
  const jewelryFileRef = useRef<HTMLInputElement>(null);

  const handleInstagramRedirect = () => {
    window.open('https://www.instagram.com/vilacajoias', '_blank');
    setIsCapturingScreen(true);
  };

  const captureFromScreen = async () => {
    try {
      // Inicia a captura da tela/aba
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: false
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Aguarda um pequeno momento para o usuário se posicionar se necessário
      // Mas o prompt pede que ao clicar o app printa. 
      // Faremos o frame capture imediato do que o usuário selecionar
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const screenshot = canvas.toDataURL('image/jpeg', 0.95);
        setJewelryRef(screenshot);
      }

      // Para a captura
      stream.getTracks().forEach(track => track.stop());
      setIsCapturingScreen(false);
    } catch (err) {
      console.error("Erro na captura de tela:", err);
      setIsCapturingScreen(false);
    }
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
            { text: "Identifique a joia principal no print do Instagram (segunda imagem) e insira-a de forma natural e realista na pessoa da primeira imagem. Remova o fundo do print do Instagram e foque apenas no produto (anel, colar, brinco ou pulseira). Ajuste a escala para ser realista no corpo do cliente. Resultado editorial de luxo." }
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
             <p className="text-[9px] text-zinc-400 text-center px-10">Use nossa ferramenta de captura para "printar" a joia do Instagram.</p>
          </div>
          <div className="aspect-[3/4] bg-[#fdd49e]/5 rounded-[2.5rem] border-2 border-dashed border-[#fdd49e]/30 flex flex-col items-center justify-center relative overflow-hidden group">
            {jewelryRef ? (
              <div className="relative w-full h-full group">
                <img src={jewelryRef} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                  <button 
                    onClick={captureFromScreen}
                    className="px-6 py-2 bg-[#fdd49e] text-[#662344] rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                  >
                    Novo Print
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
              <div className="flex flex-col gap-6 text-center px-8 items-center">
                <div className="space-y-2">
                  <button 
                    onClick={handleInstagramRedirect} 
                    className="px-8 py-4 bg-gradient-to-tr from-[#662344] to-[#8a305d] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    Ver Coleção no Instagram
                  </button>
                  {isCapturingScreen && (
                    <div className="animate-bounce text-[#662344] text-[9px] font-black uppercase tracking-widest">
                      Clique no post e use o botão abaixo:
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={captureFromScreen}
                  className="px-8 py-4 bg-white border border-[#662344] text-[#662344] rounded-full text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-[#662344] hover:text-white transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Capturar Agora
                </button>
                
                <p className="text-[8px] text-zinc-300 font-bold uppercase tracking-widest mt-2 italic max-w-[200px]">
                  Ao clicar em Capturar, escolha a aba do Instagram e o app irá "printar" a joia automaticamente.
                </p>
              </div>
            )}
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
          setIsCameraOpen(false); 
        }} 
        mode="photo" 
      />
    </div>
  );
};

export default ClientExperience;
