
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
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.debug("Track finalizada:", track.label);
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    if (isInitializing) return;
    setIsInitializing(true);
    stopCamera();
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta acesso à câmera ou a conexão não é segura (HTTPS).");
      }

      // Solicita a melhor câmera traseira disponível com resolução 4K ideal
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 3840, min: 1280 },
          height: { ideal: 2160, min: 720 },
          frameRate: { ideal: 30 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Tenta aplicar configurações de foco e nitidez avançadas se o navegador suportar
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      
      const advancedConstraints: any = {};
      if ((capabilities as any).focusMode?.includes('continuous')) {
        advancedConstraints.focusMode = 'continuous';
      }
      if ((capabilities as any).whiteBalanceMode?.includes('continuous')) {
        advancedConstraints.whiteBalanceMode = 'continuous';
      }
      
      if (Object.keys(advancedConstraints).length > 0) {
        try {
          await track.applyConstraints({ advanced: [advancedConstraints] } as any);
        } catch (e) {
          console.warn("Não foi possível aplicar foco contínuo:", e);
        }
      }

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Tenta dar play explicitamente
        try {
          await videoRef.current.play();
        } catch (e) {
          console.error("Erro ao dar play no vídeo:", e);
        }
      }
    } catch (err: any) {
      console.error("Erro fatal na câmera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Permissão negada. Por favor, autorize o acesso à câmera nas configurações do site/navegador.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("Nenhuma câmera encontrada neste dispositivo.");
      } else {
        setError(`Erro: ${err.message || "Não foi possível acessar a câmera."}`);
      }
    } finally {
      setIsInitializing(false);
    }
  }, [stopCamera, isInitializing]);

  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(startCamera, 300);
      return () => clearTimeout(timeout);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Captura na resolução máxima nativa do stream para manter nitidez
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        // Melhora a qualidade da renderização no canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Exporta em alta qualidade
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        onCapture(dataUrl);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#662344] flex flex-col animate-in fade-in duration-300">
      <div className="p-4 flex justify-between items-center text-[#fdd49e]">
        <button onClick={onClose} className="hover:opacity-75 transition-opacity p-2" aria-label="Fechar">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest font-bold">Captura Vilaça</span>
          <span className="text-[8px] uppercase tracking-[0.3em] opacity-60">Alta Definição</span>
        </div>
        <div className="w-12"></div>
      </div>
      
      <div className="flex-grow relative overflow-hidden flex items-center justify-center bg-black">
        {error ? (
          <div className="text-[#fdd49e] text-center p-8 max-w-sm">
            <div className="mb-4 text-[#fdd49e]/40">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="font-serif italic mb-6 leading-relaxed">{error}</p>
            <button 
              onClick={startCamera}
              className="px-8 py-3 border border-[#fdd49e] text-[#fdd49e] text-xs uppercase tracking-[0.2em] font-bold hover:bg-[#fdd49e] hover:text-[#662344] transition-all active:scale-95"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            {isInitializing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                <div className="w-8 h-8 border-2 border-[#fdd49e] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-contain"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
               <div className="w-72 h-72 border border-[#fdd49e]/20 rounded-full flex items-center justify-center relative">
                  <div className="absolute inset-0 border-[2px] border-[#fdd49e]/10 rounded-full scale-110"></div>
                  <div className="text-[#fdd49e] text-[9px] uppercase tracking-[0.3em] font-bold bg-[#662344]/40 px-3 py-1 rounded backdrop-blur-sm">
                    Foco na Joia
                  </div>
               </div>
               <p className="mt-8 text-[10px] text-[#fdd49e]/60 uppercase tracking-widest font-light">
                 Aproxime para capturar detalhes
               </p>
            </div>
          </>
        )}
      </div>

      <div className="p-10 flex flex-col items-center justify-center bg-[#662344]">
        <button 
          onClick={capturePhoto}
          disabled={!!error || !stream || isInitializing}
          className="w-20 h-20 rounded-full border-4 border-[#fdd49e] flex items-center justify-center active:scale-90 transition-all bg-transparent disabled:opacity-20 shadow-2xl group"
        >
          <div className="w-16 h-16 rounded-full bg-[#fdd49e] group-hover:scale-95 transition-transform shadow-inner flex items-center justify-center">
            <div className="w-14 h-14 border border-[#662344]/20 rounded-full"></div>
          </div>
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraModal;
