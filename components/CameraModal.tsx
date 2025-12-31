
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string) => void;
  mode: 'photo';
}

const CameraModal: React.FC<CameraModalProps> = ({ 
  isOpen, 
  onClose, 
  onCapture
}) => {
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
      const constraints: any = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          frameRate: { ideal: 60 },
          focusMode: { ideal: "continuous" }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();

        const track = mediaStream.getVideoTracks()[0];
        if (track && track.getCapabilities) {
          const caps = track.getCapabilities() as any;
          setCapabilities(caps);
          if (caps.zoom) setZoom(caps.zoom.min);
        }
      }
    } catch (err) {
      console.error("Erro na Câmera:", err);
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = fallback;
        if (videoRef.current) {
          videoRef.current.srcObject = fallback;
          await videoRef.current.play();
        }
      } catch (inner) {
        onClose();
      }
    }
  }, [onClose, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
      return () => stopCamera();
    }
  }, [isOpen, startCamera, stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && capabilities?.torch) {
      try {
        const nextTorch = !torch;
        await track.applyConstraints({ advanced: [{ torch: nextTorch }] } as any);
        setTorch(nextTorch);
      } catch (e) {
        console.warn("Falha no flash", e);
      }
    }
  };

  const updateZoom = async (val: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && capabilities?.zoom) {
      const clamped = Math.max(capabilities.zoom.min, Math.min(val, capabilities.zoom.max));
      setZoom(clamped);
      try {
        await track.applyConstraints({ advanced: [{ zoom: clamped }] } as any);
      } catch (e) {
        console.warn("Falha no zoom", e);
      }
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0);
      onCapture(canvas.toDataURL('image/jpeg', 0.95));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col h-screen overflow-hidden">
      <div className="absolute top-0 inset-x-0 z-[100] p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="p-4 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-white/20 transition-all shadow-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5}/></svg>
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#fdd49e] drop-shadow-md">VILAÇA HDR STUDIO</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[8px] text-white/70 uppercase tracking-widest font-black">
              MODO RAW 4K ATIVO
            </span>
          </div>
        </div>

        <button 
          onClick={toggleTorch}
          className={`p-4 rounded-full border transition-all shadow-lg ${torch ? 'bg-[#fdd49e] text-[#662344] border-[#fdd49e]' : 'bg-white/10 text-white border-white/20'}`}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7,2V5H10V22H14V5H17V2H7M9,4H15V5H9V4M12,20V11H12V20M12,9V7H12V9Z" />
          </svg>
        </button>
      </div>

      <div className="flex-grow bg-[#050505] flex items-center justify-center relative overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="min-w-full min-h-full object-cover" 
        />
        
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 bg-black/40 backdrop-blur-2xl p-5 rounded-full border border-white/10 shadow-2xl">
          <button onClick={() => updateZoom(zoom + 0.5)} className="text-white/80 hover:text-[#fdd49e] transition-colors p-2 rounded-full hover:bg-white/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={2.5}/></svg>
          </button>
          <div className="h-40 flex flex-col items-center justify-center relative">
             <input 
              type="range"
              min={capabilities?.zoom?.min || 1}
              max={capabilities?.zoom?.max || 10}
              step="0.1"
              value={zoom}
              onChange={(e) => updateZoom(parseFloat(e.target.value))}
              className="h-32 w-1 accent-[#fdd49e] cursor-pointer"
              style={{ writingMode: 'bt-lr', appearance: 'slider-vertical' } as any}
            />
          </div>
          <button onClick={() => updateZoom(zoom - 0.5)} className="text-white/80 hover:text-[#fdd49e] transition-colors p-2 rounded-full hover:bg-white/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 12H4" strokeWidth={2.5}/></svg>
          </button>
          <span className="text-[10px] font-black text-[#fdd49e] font-mono mt-2">{zoom.toFixed(1)}x</span>
        </div>

        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className={`w-[85vw] h-[85vw] max-w-[400px] max-h-[400px] border-[0.5px] rounded-full border-[#fdd49e]/20 transition-all duration-1000`}>
            <div className="absolute inset-0 border border-white/5 rounded-full scale-95" />
          </div>
        </div>
      </div>

      <div className="h-60 bg-[#0a0a0a] flex flex-col items-center justify-center gap-8 border-t border-white/5 z-[101]">
        <button 
          onClick={capturePhoto} 
          className="w-24 h-24 rounded-full border-[6px] border-white/10 p-1 bg-white shadow-2xl hover:scale-105 active:scale-90 transition-all flex items-center justify-center"
        >
          <div className="w-full h-full rounded-full border-2 border-[#662344]/5 bg-gradient-to-br from-white to-zinc-100 shadow-inner" />
        </button>
        
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-black">
            ENQUADRE A JOIA NO CENTRO
          </p>
          <div className="flex gap-4">
            <span className="text-[8px] text-[#fdd49e]/40 font-bold uppercase tracking-widest">RES: 4K UHD</span>
            <span className="text-[8px] text-[#fdd49e]/40 font-bold uppercase tracking-widest">FPS: 60</span>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraModal;
