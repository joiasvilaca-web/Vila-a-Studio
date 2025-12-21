
import React, { useRef, useState, useEffect } from 'react';

// Declarações globais para as libs do MediaPipe
declare var FaceMesh: any;
declare var Hands: any;
declare var Camera: any;

interface TryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string;
  category: 'RING' | 'EARRING' | 'NECKLACE' | 'BRACELET' | 'PENDANT';
}

const TryOnModal: React.FC<TryOnModalProps> = ({ isOpen, onClose, image, category }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const [processedJewelry, setProcessedJewelry] = useState<HTMLImageElement | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const toggleCamera = () => {
    setIsInitializing(true);
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Processamento de transparência com preservação de brilhos
  useEffect(() => {
    if (!image) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Torna transparente apenas o branco puro do fundo gerado pela IA
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        // Threshold alto (253-255) para não apagar o brilho da peça (que geralmente é < 250)
        if (r > 252 && g > 252 && b > 252) {
          data[i+3] = 0;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const processed = new Image();
      processed.src = canvas.toDataURL('image/png');
      processed.onload = () => setProcessedJewelry(processed);
    };
  }, [image]);

  useEffect(() => {
    if (!isOpen || !videoRef.current || !canvasOverlayRef.current) return;

    const video = videoRef.current;
    const canvas = canvasOverlayRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    
    let tracker: any;
    let cameraInstance: any;
    let isActive = true;

    const onResults = (results: any) => {
      if (!isActive || !ctx || !processedJewelry) return;
      if (isInitializing) setIsInitializing(false);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      let found = false;
      let pos = { x: 0, y: 0, angle: 0, width: 0 };
      let occluderPoints: any[] = [];

      // SELECIONA O MOTOR DE ANCORAGEM CORRETO
      const useHandTracker = (category === 'RING' || category === 'BRACELET');

      if (useHandTracker && results.multiHandLandmarks?.length > 0) {
        const hand = results.multiHandLandmarks[0];
        found = true;
        
        if (category === 'RING') {
          // Ancoragem no dedo anelar (Pontos 13 e 14)
          const mcp = hand[13]; 
          const pip = hand[14]; 
          pos.x = ((mcp.x + pip.x) / 2) * canvas.width;
          pos.y = ((mcp.y + pip.y) / 2) * canvas.height;
          
          const rawAngle = Math.atan2(pip.y - mcp.y, pip.x - mcp.x) + Math.PI / 2;
          pos.angle = facingMode === 'user' ? -rawAngle : rawAngle;
          
          const dist = Math.sqrt(Math.pow(pip.x - mcp.x, 2) + Math.pow(pip.y - mcp.y, 2));
          pos.width = dist * canvas.width * 1.5;
        } else {
          // Pulseira no pulso (Ponto 0)
          const wrist = hand[0];
          pos.x = wrist.x * canvas.width;
          pos.y = wrist.y * canvas.height;
          pos.width = Math.abs(hand[0].x - hand[5].x) * canvas.width * 1.5;
        }
      } else if (!useHandTracker && results.multiFaceLandmarks?.length > 0) {
        const face = results.multiFaceLandmarks[0];
        found = true;
        
        if (category === 'EARRING') {
          // Escolhe o lóbulo da orelha mais visível
          const leftLobe = face[454];
          const rightLobe = face[234];
          const useRight = Math.abs(rightLobe.x - face[1].x) > Math.abs(leftLobe.x - face[1].x);
          const lobe = useRight ? rightLobe : leftLobe;
          
          pos.x = lobe.x * canvas.width;
          pos.y = lobe.y * canvas.height;
          pos.width = Math.abs(face[33].x - face[263].x) * canvas.width * 0.35;
        } else {
          // Colar ou Pingente abaixo do queixo
          const chin = face[152];
          const nose = face[1];
          const headHeight = Math.sqrt(Math.pow(nose.x - chin.x, 2) + Math.pow(nose.y - chin.y, 2));
          pos.x = chin.x * canvas.width;
          pos.y = (chin.y + headHeight * 0.4) * canvas.height;
          pos.width = headHeight * canvas.width * 3.5;
          occluderPoints = [face[152], face[148]];
        }
      }

      setIsTracking(found);

      if (found) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.angle);
        
        const aspect = processedJewelry.height / processedJewelry.width;
        const drawWidth = pos.width;
        const drawHeight = pos.width * aspect;
        
        ctx.drawImage(processedJewelry, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
        ctx.restore();

        // Oclusão simples para não sobrepor o rosto/mão onde não deve
        if (occluderPoints.length > 0) {
          ctx.save();
          ctx.beginPath();
          occluderPoints.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
            else ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
          });
          ctx.lineWidth = pos.width * 0.2;
          ctx.lineCap = 'round';
          ctx.globalCompositeOperation = 'destination-out';
          ctx.stroke();
          ctx.restore();
        }
      }
    };

    try {
      const useHands = (category === 'RING' || category === 'BRACELET');
      
      if (useHands) {
        tracker = new Hands({ locateFile: (f: any) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
        tracker.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      } else {
        tracker = new FaceMesh({ locateFile: (f: any) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
        tracker.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      }

      tracker.onResults(onResults);

      cameraInstance = new Camera(video, {
        onFrame: async () => {
          if (!isActive) return;
          if (video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            await tracker.send({ image: video });
          }
        },
        width: 1280,
        height: 720,
        facingMode: facingMode
      });
      
      cameraInstance.start().catch(() => setIsInitializing(false));

    } catch (e) {
      setIsInitializing(false);
    }

    return () => {
      isActive = false;
      if (cameraInstance) cameraInstance.stop();
      if (tracker) tracker.close();
    };
  }, [isOpen, category, processedJewelry, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden select-none">
      <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-50">
        <button 
          onClick={onClose} 
          className="p-4 bg-black/40 backdrop-blur-2xl rounded-full text-white border border-white/20 active:scale-90 transition-transform shadow-2xl"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="px-5 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center gap-3 shadow-2xl">
          <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`}></div>
          <span className="text-[10px] text-white font-black uppercase tracking-[0.2em]">
            {isInitializing ? 'Iniciando...' : isTracking ? `${category} Detectado` : `Buscando ${category === 'RING' || category === 'BRACELET' ? 'Mão' : 'Rosto'}`}
          </span>
        </div>
        
        <button 
          onClick={toggleCamera} 
          className="p-4 bg-black/40 backdrop-blur-2xl rounded-full text-white border border-white/20 active:scale-90 transition-transform shadow-2xl"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 4h-3.17L15 2H9L7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
            <path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
            <path d="M12 19a7 7 0 0 0 7-7"/>
            <path d="M5 12a7 7 0 0 0 7 7"/>
            <polyline points="16 19 19 19 19 16"/>
            <polyline points="8 5 5 5 5 8"/>
          </svg>
        </button>
      </div>

      <div className="relative flex-grow bg-zinc-950">
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        
        <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
           <canvas 
             ref={canvasOverlayRef} 
             style={{ 
               transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
               imageRendering: 'crisp-edges'
             }}
             className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
           />
           
           <video 
             autoPlay 
             playsInline 
             muted 
             ref={(el) => { if(el && videoRef.current) el.srcObject = videoRef.current.srcObject; }}
             style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
             className="absolute inset-0 w-full h-full object-cover" 
           />
        </div>

        {isInitializing && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-[3px] border-[#fdd49e] border-t-transparent rounded-full animate-spin"></div>
              <div className="text-white text-[10px] uppercase font-bold tracking-[0.5em] opacity-60">Smart Lens Ativa</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 bg-black border-t border-white/5 text-center">
        <p className="text-[10px] text-white/40 uppercase tracking-[0.3em]">Vilaça Smart Fit Studio</p>
      </div>
    </div>
  );
};

export default TryOnModal;
