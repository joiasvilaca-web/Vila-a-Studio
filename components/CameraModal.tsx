
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
  const [torch, setTorch] = useState(true); 
  const [capabilities, setCapabilities] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        // Importante: Desligar explicitamente a lanterna antes de parar o track
        try {
          if ((track as any).applyConstraints) {
            (track as any).applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
          }
        } catch(e) {}
        track.stop();
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
          width: { ideal: 2560 },
          height: { ideal: 1440 },
          frameRate: { max: 30 }
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
              
              const adv: any = {};
              if (caps.focusMode?.includes('continuous')) adv.focusMode = 'continuous';
              if (caps.zoom) setZoom(caps.zoom.min);
              if (caps.torch !== undefined) {
                adv.torch = true;
                setTorch(true);
              }
              
              if (Object.keys(adv).length > 0) {
                await track.applyConstraints({ advanced: [adv] }).catch(() => {});
              }
            }
          } catch (e) {
            console.warn("Erro ao iniciar hardware da câmera", e);
          }
        };
      }
    } catch (err) {
      console.error(err);
      alert("Permissão de câmera negada ou erro de hardware.");
      onClose();
    }
  }, [onClose, stopCamera]);

  useEffect(() => {
    if (isOpen) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  useEffect(() => {
    const apply = async () => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (track && capabilities) {
        const adv: any = {};
        if (capabilities.zoom) adv.zoom = zoom;
        if (capabilities.torch !== undefined) adv.torch = torch;
        if (Object.keys(adv).length > 0) {
          await track.applyConstraints({ advanced: [adv] }).catch(() => {});
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
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      onCapture(canvas.toDataURL('image/png', 0.95));
    }
    setIsCapturing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black flex flex-col animate-in fade-in duration-300">
      <div className="p-6 flex justify-between items-center text-white z-20 absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="p-4 bg-white/10 backdrop-blur-md rounded-full active:scale-90 border border-white/5">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fdd49e]">Precision Focus</span>
        {capabilities?.torch !== undefined ? (
          <button onClick={() => setTorch(!torch)} className={`p-4 rounded-full border transition-all ${torch ? 'bg-[#fdd49e] text-[#662344] border-[#fdd49e]' : 'bg-white/10 border-white/5'}`}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7,2V5H17V2H7M7,6V7H17V6H7M7,8V21A2,2 0 0,0 9,23H15A2,2 0 0,0 17,21V8H7M12,14A2,2 0 1,1 10,16A2,2 0 0,1 12,14Z" />
            </svg>
          </button>
        ) : <div className="w-14"></div>}
      </div>
      
      <div className="flex-grow relative flex items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute inset-0 border-[1.5rem] border-black/20 pointer-events-none"></div>
        
        {capabilities?.zoom && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-56 flex flex-col items-center gap-3 px-8 py-5 bg-black/60 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl">
            <input type="range" min={capabilities.zoom.min} max={capabilities.zoom.max} step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full accent-[#fdd49e]" />
            <span className="text-[9px] text-[#fdd49e] font-black uppercase tracking-[0.3em]">{zoom.toFixed(1)}x MACRO</span>
          </div>
        )}
      </div>

      <div className="h-44 bg-black flex items-center justify-center">
        <button onClick={capturePhoto} disabled={!cameraActive || isCapturing} className="w-24 h-24 rounded-full border-[8px] border-white/10 flex items-center justify-center active:scale-95 transition-all">
          <div className="w-18 h-18 rounded-full bg-[#fdd49e] shadow-[0_0_20px_rgba(253,212,158,0.4)]"></div>
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraModal;
