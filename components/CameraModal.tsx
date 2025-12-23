
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [zoom, setZoom] = useState(1);
  const [torch, setTorch] = useState(false);
  const [capabilities, setCapabilities] = useState<any>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setTorch(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Importante para Android: playsInline e forçar o play
        videoRef.current.setAttribute("playsinline", "true");
        
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.warn("Auto-play blocked, retrying on metadata load", e);
          });
        }

        videoRef.current.onloadedmetadata = () => {
          const track = mediaStream.getVideoTracks()[0];
          if (track && track.getCapabilities) {
            const caps = track.getCapabilities() as any;
            setCapabilities(caps);
            if (caps.zoom) setZoom(caps.zoom.min);
          }
        };
      }
    } catch (err) {
      console.error(err);
      alert("Acesso à câmera negado. Verifique as permissões do seu navegador.");
      onClose();
    }
  }, [onClose, stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && capabilities?.torch) {
      try {
        const nextTorch = !torch;
        await track.applyConstraints({ advanced: [{ torch: nextTorch }] } as any);
        setTorch(nextTorch);
      } catch (e) {
        console.warn("Torch not supported on this device/track", e);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Pequeno atraso para garantir que o DOM renderizou
      const timer = setTimeout(startCamera, 100);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    
    // Captura com a resolução real da câmera
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0);
      // Salva em JPEG para reduzir tamanho antes do processamento I.A.
      onCapture(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col h-screen overflow-hidden animate-in fade-in duration-300">
      <div className="absolute top-0 inset-x-0 z-[1001] p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="p-4 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 active:scale-90 text-white shadow-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5}/></svg>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fdd49e]">VILAÇA VIVARA</span>
          <span className="text-[7px] text-white/50 uppercase tracking-[0.2em]">Sensor Macro Ativado</span>
        </div>
        <button 
          onClick={toggleTorch}
          className={`p-4 rounded-full border transition-all active:scale-90 shadow-lg ${torch ? 'bg-[#fdd49e] text-[#662344] border-[#fdd49e]' : 'bg-white/10 border-white/20 text-white'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
        </button>
      </div>

      <div className="flex-grow bg-black flex items-center justify-center relative overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="min-w-full min-h-full object-cover" 
        />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
           <div className="w-64 h-64 border border-[#fdd49e] rounded-full shadow-[0_0_100px_rgba(253,212,158,0.2)]"></div>
        </div>
      </div>

      <div className="h-48 bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 z-[1002] border-t border-white/10 relative">
        {capabilities?.zoom && (
          <div className="absolute top-0 -translate-y-24 w-full px-12 flex flex-col items-center gap-2">
             <input 
               type="range" 
               min={capabilities.zoom.min} 
               max={capabilities.zoom.max} 
               step="0.1" 
               value={zoom} 
               onChange={async (e) => {
                 const v = parseFloat(e.target.value);
                 setZoom(v);
                 streamRef.current?.getVideoTracks()[0].applyConstraints({ advanced: [{ zoom: v }] } as any);
               }} 
               className="w-full h-1 bg-white/20 rounded-full appearance-none accent-[#fdd49e]" 
             />
             <span className="text-[10px] text-[#fdd49e] font-black tracking-[0.2em]">{zoom.toFixed(1)}X</span>
          </div>
        )}
        
        <button 
          onClick={capturePhoto} 
          className="group w-20 h-20 rounded-full border-[4px] border-white/20 p-1 active:scale-95 transition-all"
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-2xl">
             <div className="w-14 h-14 rounded-full border-2 border-[#662344]/10 bg-gradient-to-br from-white to-zinc-200"></div>
          </div>
        </button>
        <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Enquadre no círculo para melhor tratamento</p>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraModal;
