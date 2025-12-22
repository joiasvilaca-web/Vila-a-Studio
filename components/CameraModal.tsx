
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
  const [cameraActive, setCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const applyingConstraintsRef = useRef(false);

  const startCamera = useCallback(async () => {
    try {
      // Ajuste de resolução para 1080p: mais estável e compatível com a maioria dos sensores sem causar flickering
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, max: 4096 },
          height: { ideal: 1080, max: 2160 },
          frameRate: { ideal: 30 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Espera o vídeo estar pronto para ler as capacidades
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            setCameraActive(true);
            setStream(mediaStream);

            const track = mediaStream.getVideoTracks()[0];
            if (track && track.getCapabilities) {
              const caps = track.getCapabilities() as any;
              setCapabilities(caps);
              // Inicializa o zoom no mínimo permitido
              if (caps.zoom) setZoom(caps.zoom.min);
            }
          } catch (e) {
            console.error("Erro ao dar play no vídeo:", e);
          }
        };
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      alert("Certifique-se de dar permissão à câmera e que ela não esteja sendo usada por outro app.");
      onClose();
    }
  }, [onClose]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraActive(false);
      setCapabilities(null);
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]); // Dependência apenas de isOpen para evitar reinicializações

  // Aplicação controlada de Zoom e Lanterna para evitar flickering de hardware
  useEffect(() => {
    const applyConstraints = async () => {
      if (!stream || !capabilities || applyingConstraintsRef.current) return;
      
      const track = stream.getVideoTracks()[0];
      if (!track) return;

      const constraints: any = { advanced: [] };
      const currentConstraints: any = {};

      if (capabilities.zoom) {
        currentConstraints.zoom = Math.max(capabilities.zoom.min, Math.min(capabilities.zoom.max, zoom));
      }
      if (capabilities.torch !== undefined) {
        currentConstraints.torch = torch;
      }

      if (Object.keys(currentConstraints).length > 0) {
        applyingConstraintsRef.current = true;
        try {
          await track.applyConstraints({ advanced: [currentConstraints] });
        } catch (e) {
          console.warn("Hardware não aceitou as constraints:", e);
        } finally {
          applyingConstraintsRef.current = false;
        }
      }
    };

    applyConstraints();
  }, [torch, zoom, stream, capabilities]);

  const capturePhoto = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCapturing || !cameraActive) return;

    if (videoRef.current && canvasRef.current) {
      setIsCapturing(true);
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Feedback visual
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-white z-[100] animate-out fade-out duration-200';
      document.body.appendChild(overlay);
      setTimeout(() => overlay.remove(), 200);

      await new Promise(r => setTimeout(r, 100));

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        onCapture(dataUrl);
        onClose();
      } else {
        setIsCapturing(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-in fade-in duration-300">
      {/* Cabeçalho de Controles */}
      <div className="p-6 flex justify-between items-center text-white z-20 absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-full active:scale-90 transition-transform border border-white/20">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {capabilities?.torch !== undefined && (
          <button 
            onClick={() => setTorch(!torch)}
            className={`p-3 rounded-full border transition-all ${torch ? 'bg-[#fdd49e] text-[#662344] border-[#fdd49e]' : 'bg-white/10 border-white/20 text-white'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="flex-grow relative flex items-center justify-center overflow-hidden bg-zinc-900">
        {!cameraActive && (
          <div className="flex flex-col items-center gap-6 z-10">
            <div className="w-12 h-12 border-2 border-[#fdd49e] border-t-transparent rounded-full animate-spin"></div>
            <div className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-bold text-center">Sincronizando Sensor...</div>
          </div>
        )}
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        
        {/* Guia de Posicionamento */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-72 h-72 border-2 border-[#fdd49e]/30 rounded-full flex items-center justify-center relative shadow-[0_0_150px_rgba(0,0,0,0.6)]">
               <div className="absolute inset-0 border border-[#fdd49e]/10 rounded-full scale-125 animate-pulse"></div>
               <div className="w-0.5 h-10 bg-[#fdd49e]/60 absolute top-0"></div>
               <div className="w-0.5 h-10 bg-[#fdd49e]/60 absolute bottom-0"></div>
               <div className="h-0.5 w-10 bg-[#fdd49e]/60 absolute left-0"></div>
               <div className="h-0.5 w-10 bg-[#fdd49e]/60 absolute right-0"></div>
            </div>
            <span className="mt-10 text-[10px] uppercase tracking-[0.5em] text-[#fdd49e] font-black bg-black/60 px-6 py-3 rounded-full backdrop-blur-lg border border-[#fdd49e]/20">
              Posicione a Peça
            </span>
        </div>

        {/* Slider de Zoom Vertical */}
        {capabilities?.zoom && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 bg-black/40 backdrop-blur-xl p-5 rounded-full border border-white/10">
            <span className="text-[10px] text-white font-mono font-bold">{zoom.toFixed(1)}x</span>
            <input 
              type="range"
              min={capabilities.zoom.min}
              max={capabilities.zoom.max}
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="appearance-none bg-white/20 h-40 w-1 rounded-full outline-none accent-[#fdd49e] vertical-range cursor-pointer"
              style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any}
            />
          </div>
        )}
      </div>

      {/* Rodapé de Disparo */}
      <div className="h-56 flex flex-col items-center justify-center bg-black gap-8 z-30">
        <div className="flex items-center gap-12">
           <button 
             onClick={() => setZoom(Math.max((capabilities?.zoom?.min || 1), zoom - 0.5))}
             className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center active:scale-90 transition-all"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 12H4" strokeWidth="2" strokeLinecap="round"/></svg>
           </button>

           <button 
             onClick={capturePhoto}
             disabled={!cameraActive || isCapturing}
             className="w-24 h-24 rounded-full border-[8px] border-[#fdd49e]/40 p-2 flex items-center justify-center active:scale-90 transition-all shadow-[0_0_50px_rgba(253,212,158,0.2)] bg-transparent relative overflow-hidden group disabled:opacity-50"
           >
             <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-inner group-hover:scale-95 transition-transform">
                <div className="w-16 h-16 rounded-full border-2 border-[#662344]/5"></div>
             </div>
           </button>

           <button 
             onClick={() => setZoom(Math.min((capabilities?.zoom?.max || 4), zoom + 0.5))}
             className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center active:scale-90 transition-all"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round"/></svg>
           </button>
        </div>
        <span className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-black">Vilaça Precision Captures</span>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <style>{`
        .vertical-range {
          -webkit-appearance: slider-vertical;
          width: 8px;
          height: 140px;
        }
      `}</style>
    </div>
  );
};

export default CameraModal;
