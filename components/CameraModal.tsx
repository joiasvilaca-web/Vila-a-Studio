
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

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorch(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 3840 },
          height: { ideal: 2160 }
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
              
              const advanced: any = {};
              if (caps.focusMode?.includes('continuous')) advanced.focusMode = 'continuous';
              if (caps.whiteBalanceMode?.includes('continuous')) advanced.whiteBalanceMode = 'continuous';
              if (caps.zoom) setZoom(caps.zoom.min);
              
              if (Object.keys(advanced).length > 0) {
                track.applyConstraints({ advanced: [advanced] }).catch(e => console.warn("Constraints falharam", e));
              }
            }
          } catch (e) {
            console.error(e);
          }
        };
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao acessar câmera traseira.");
      onClose();
    }
  }, [onClose, stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && capabilities?.torch) {
      try {
        const nextTorch = !torch;
        await track.applyConstraints({
          advanced: [{ torch: nextTorch }]
        } as any);
        setTorch(nextTorch);
      } catch (e) {
        console.warn("Lanterna não suportada", e);
      }
    }
  };

  useEffect(() => {
    if (isOpen) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0);
      onCapture(canvas.toDataURL('image/jpeg', 0.98));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black flex flex-col animate-in fade-in duration-300">
      <div className="p-6 flex justify-between items-center text-white absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="p-4 bg-white/10 backdrop-blur-2xl rounded-full border border-white/10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5}/></svg>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fdd49e]">Macro Studio</span>
          <span className="text-[7px] text-white/50 uppercase tracking-[0.2em]">Foco Vivara Nítido</span>
        </div>
        {capabilities?.torch ? (
          <button 
            onClick={toggleTorch}
            className={`p-4 rounded-full border transition-all ${torch ? 'bg-[#fdd49e] text-[#662344]' : 'bg-white/10 border-white/10'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </button>
        ) : <div className="w-14"></div>}
      </div>
      
      <video ref={videoRef} autoPlay playsInline muted className="flex-grow object-cover" />

      <div className="h-48 bg-black flex flex-col items-center justify-center gap-6">
        {capabilities?.zoom && (
          <div className="w-64 flex flex-col items-center gap-2">
            <input type="range" min={capabilities.zoom.min} max={capabilities.zoom.max} step="0.1" value={zoom} onChange={async (e) => {
              const v = parseFloat(e.target.value);
              setZoom(v);
              streamRef.current?.getVideoTracks()[0].applyConstraints({ advanced: [{ zoom: v }] as any });
            }} className="w-full accent-[#fdd49e]" />
            <span className="text-[9px] text-[#fdd49e] font-bold uppercase tracking-widest">{zoom.toFixed(1)}x</span>
          </div>
        )}
        <button 
          onClick={capturePhoto} 
          className="w-24 h-24 rounded-full border-[6px] border-white/20 p-2 active:scale-95 transition-all flex items-center justify-center"
        >
          <div className="w-full h-full rounded-full bg-[#fdd49e] shadow-[0_0_50px_rgba(253,212,158,0.4)]"></div>
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraModal;
