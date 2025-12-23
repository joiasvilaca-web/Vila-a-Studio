
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
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            const track = mediaStream.getVideoTracks()[0];
            if (track && track.getCapabilities) {
              const caps = track.getCapabilities() as any;
              setCapabilities(caps);
              if (caps.zoom) setZoom(caps.zoom.min);
            }
          } catch (e) {
            console.error(e);
          }
        };
      }
    } catch (err) {
      console.error(err);
      alert("Acesso à câmera negado ou indisponível.");
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
        console.warn(e);
      }
    }
  };

  useEffect(() => {
    if (isOpen) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (ctx) {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0);
      onCapture(canvas.toDataURL('image/jpeg', 0.95));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col h-screen overflow-hidden animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="absolute top-0 inset-x-0 z-[1001] p-6 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent">
        <button onClick={onClose} className="p-4 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 active:scale-90 text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5}/></svg>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fdd49e]">Vilaça Studio</span>
          <span className="text-[7px] text-white/50 uppercase tracking-[0.2em]">Foco Macro Inteligente</span>
        </div>
        <button 
          onClick={toggleTorch}
          className={`p-4 rounded-full border transition-all active:scale-90 ${torch ? 'bg-[#fdd49e] text-[#662344] border-[#fdd49e]' : 'bg-white/10 border-white/20 text-white'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
        </button>
      </div>

      {/* VIEWPORT */}
      <div className="flex-grow bg-zinc-950 flex items-center justify-center relative overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="min-w-full min-h-full object-cover" />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
           <div className="w-64 h-64 border-2 border-[#fdd49e] rounded-full"></div>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="h-56 bg-black flex flex-col items-center justify-center gap-8 z-[1002] border-t border-white/5 relative">
        {capabilities?.zoom && (
          <div className="absolute top-0 -translate-y-20 w-64 flex flex-col items-center gap-3">
             <input type="range" min={capabilities.zoom.min} max={capabilities.zoom.max} step="0.1" value={zoom} onChange={async (e) => {
               const v = parseFloat(e.target.value);
               setZoom(v);
               streamRef.current?.getVideoTracks()[0].applyConstraints({ advanced: [{ zoom: v }] } as any);
             }} className="w-full h-1 bg-white/20 rounded-full appearance-none accent-[#fdd49e]" />
             <span className="text-[10px] text-[#fdd49e] font-black tracking-[0.2em]">{zoom.toFixed(1)}X ZOOM</span>
          </div>
        )}
        
        <button 
          onClick={capturePhoto} 
          className="group w-24 h-24 rounded-full border-[6px] border-white/10 p-1 active:scale-95 transition-all shadow-[0_0_60px_rgba(0,0,0,0.8)]"
        >
          <div className="w-full h-full rounded-full bg-[#fdd49e] flex items-center justify-center shadow-[0_0_40px_rgba(253,212,158,0.4)] group-hover:scale-105 transition-transform">
             <div className="w-16 h-16 rounded-full border-2 border-[#662344]/10"></div>
          </div>
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraModal;
