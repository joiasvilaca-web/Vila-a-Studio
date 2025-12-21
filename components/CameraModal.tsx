
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [zoom, setZoom] = useState(1);
  const [torch, setTorch] = useState(false);
  const [capabilities, setCapabilities] = useState<any>(null);

  const startCamera = useCallback(async () => {
    try {
      // Solicita a maior qualidade possível com preferência para a câmera traseira
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { min: 1280, ideal: 3840, max: 4096 },
          height: { min: 720, ideal: 2160, max: 3072 },
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      const track = mediaStream.getVideoTracks()[0];
      
      // Pequeno delay para garantir que o hardware responda com as capacidades
      setTimeout(() => {
        if (track && track.getCapabilities) {
          const caps = track.getCapabilities();
          setCapabilities(caps);
          console.log("Camera Capabilities:", caps);
        }
      }, 700);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        // Desliga a lanterna antes de parar o track
        if (capabilities?.torch) {
           track.applyConstraints({ advanced: [{ torch: false }] } as any).catch(() => {});
        }
        track.stop();
      });
      setStream(null);
      setTorch(false);
    }
  }, [stream, capabilities]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  // Aplica as restrições de Lanterna e Zoom sempre que o estado mudar
  useEffect(() => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        const constraints: any = { advanced: [] };
        
        // Verifica se o dispositivo suporta zoom e lanterna
        if (capabilities?.zoom) {
          constraints.advanced.push({ zoom: zoom });
        }
        if (capabilities?.torch) {
          constraints.advanced.push({ torch: torch });
        }
        
        if (constraints.advanced.length > 0) {
          track.applyConstraints(constraints)
            .then(() => console.log("Constraints applied:", constraints))
            .catch(e => console.error("Falha ao aplicar lanterna/zoom:", e));
        }
      }
    }
  }, [torch, zoom, stream, capabilities]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Captura na resolução real do sensor (não apenas o tamanho do elemento de vídeo)
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        // Usa qualidade máxima na conversão para base64
        onCapture(canvas.toDataURL('image/png', 1.0));
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#662344] flex flex-col animate-in fade-in duration-300">
      {/* Header com botões de controle */}
      <div className="p-6 flex justify-between items-center text-[#fdd49e] z-10">
        <button onClick={onClose} className="p-3 bg-white/10 rounded-full active:scale-90 transition-all">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <button 
          onClick={() => setTorch(!torch)}
          className={`p-4 rounded-full transition-all flex items-center justify-center border-2 ${torch ? 'bg-[#fdd49e] border-[#fdd49e] text-[#662344] shadow-[0_0_20px_rgba(253,212,158,0.5)]' : 'bg-white/5 border-white/20 text-[#fdd49e]'} active:scale-95`}
        >
          {/* Ícone de Lanterna (Flashlight) */}
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 2H9a2 2 0 0 0-2 2v2h10V4a2 2 0 0 0-2-2Z" />
            <path d="M7 6v2c0 .55.45 1 1 1h8c.55 0 1-.45 1-1V6" />
            <path d="M15 9h-6a2 2 0 0 0-2 2v7a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-7a2 2 0 0 0-2-2Z" />
            <line x1="12" y1="13" x2="12" y2="13" strokeWidth="3" />
          </svg>
          <span className="ml-2 text-[10px] font-black uppercase tracking-widest">{torch ? 'Luz On' : 'Luz Off'}</span>
        </button>
      </div>
      
      {/* Área do Vídeo */}
      <div className="flex-grow relative bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-contain"
        />
        
        {/* Controle de Zoom Lateral */}
        {capabilities?.zoom && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 bg-black/40 backdrop-blur-md p-5 rounded-full border border-white/10 shadow-2xl">
            <span className="text-[10px] text-[#fdd49e] font-black">{capabilities.zoom.max.toFixed(0)}x</span>
            <input 
              type="range" 
              min={capabilities.zoom.min} 
              max={capabilities.zoom.max} 
              step={0.1} 
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="appearance-none bg-white/20 h-48 w-1.5 rounded-full accent-[#fdd49e] cursor-pointer"
              style={{ writingMode: 'bt-lr' as any, appearance: 'slider-vertical' as any }}
            />
            <span className="text-[10px] text-[#fdd49e] font-black">{zoom.toFixed(1)}x</span>
          </div>
        )}

        {/* Overlay de ajuda para centralizar */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-dashed border-white/20 rounded-3xl"></div>
        </div>
      </div>

      {/* Footer com o botão de disparo (Restaurado e Visível) */}
      <div className="h-40 flex items-center justify-center bg-[#662344] relative z-20">
        <button 
          onClick={capturePhoto}
          className="w-24 h-24 rounded-full border-[6px] border-white/20 p-1 flex items-center justify-center active:scale-90 transition-all duration-200 shadow-[0_0_40px_rgba(0,0,0,0.3)] hover:border-[#fdd49e]/40"
        >
          <div className="w-full h-full rounded-full bg-white shadow-inner flex items-center justify-center">
             <div className="w-4 h-4 rounded-full border-2 border-[#662344]/10"></div>
          </div>
        </button>
        <p className="absolute bottom-4 text-[9px] uppercase tracking-[0.3em] text-[#fdd49e]/40 font-bold">Toque para capturar em alta resolução</p>
      </div>

      {/* Canvas oculto para processamento da imagem em tamanho real */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraModal;
