
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
  const [cameraActive, setCameraActive] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [torch, setTorch] = useState(false);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    setCameraActive(false);
    setCapabilities(null);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
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
            setCameraActive(true);
            const track = mediaStream.getVideoTracks()[0];
            if (track && track.getCapabilities) {
              const caps = track.getCapabilities() as any;
              setCapabilities(caps);
              if (caps.zoom) setZoom(caps.zoom.min);
            }
          } catch (e) {
            console.error("Play error:", e);
          }
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Erro ao acessar câmera. Verifique as permissões.");
      onClose();
    }
  }, [onClose, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  useEffect(() => {
    const apply = async () => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (track && capabilities) {
        try {
          const adv: any = {};
          if (capabilities.zoom) adv.zoom = zoom;
          if (capabilities.torch !== undefined) adv.torch = torch;
          if (Object.keys(adv).length > 0) {
            await track.applyConstraints({ advanced: [adv] });
          }
        } catch (e) {
          console.warn("Constraints apply fail:", e);
        }
      }
    };
    apply();
  }, [zoom, torch, capabilities]);

  const capturePhoto = async () => {
    if (isCapturing || !cameraActive || !videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      onCapture(dataUrl);
    }
    setIsCapturing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black flex flex-col animate-in fade-in duration-300">
      <div className="p-6 flex justify-between items-center text-white z-20 absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="p-4 bg-white/10 backdrop-blur-md rounded-full active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        {capabilities?.torch !== undefined && (
          <button onClick={() => setTorch(!torch)} className={`p-4 rounded-full ${torch ? 'bg-[#fdd49e] text-[#662344]' : 'bg-white/10'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </button>
        )}
      </div>
      
      <div className="flex-grow relative bg-zinc-900 flex items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-64 h-64 border-2 border-[#fdd49e]/40 rounded-full shadow-[0_0_100px_rgba(0,0,0,0.5)]"></div>
            <span className="mt-8 text-[9px] uppercase tracking-[0.4em] text-[#fdd49e] font-black bg-black/60 px-5 py-2.5 rounded-full border border-[#fdd49e]/20">Centro da Joia</span>
        </div>

        {/* CONTROLE DE ZOOM ANTERIOR (Slider) */}
        {capabilities?.zoom && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 flex flex-col items-center gap-2 px-6 py-3 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
            <input 
              type="range" 
              min={capabilities.zoom.min} 
              max={capabilities.zoom.max} 
              step="0.1"
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-[#fdd49e]"
            />
            <span className="text-[10px] text-white font-black uppercase tracking-widest">{zoom.toFixed(1)}x</span>
          </div>
        )}
      </div>

      <div className="h-40 bg-black flex flex-col items-center justify-center">
        <button onClick={capturePhoto} disabled={!cameraActive || isCapturing} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-all">
          <div className="w-14 h-14 rounded-full bg-[#fdd49e]"></div>
        </button>
        <p className="mt-4 text-[9px] text-white/20 uppercase tracking-widest font-black">Vilaça Studio Camera</p>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraModal;
