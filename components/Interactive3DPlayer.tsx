
import React, { useRef, useState } from 'react';

interface Interactive3DPlayerProps {
  videoUrl: string;
}

const Interactive3DPlayer: React.FC<Interactive3DPlayerProps> = ({ videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setProgress(value);
    if (videoRef.current) {
      const duration = videoRef.current.duration || 0;
      videoRef.current.currentTime = (value / 100) * duration;
    }
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div 
      className="relative group w-full aspect-video bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-zinc-100"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <video 
        ref={videoRef}
        src={videoUrl}
        loop
        playsInline
        muted
        className="w-full h-full object-contain"
        onTimeUpdate={() => {
          if (videoRef.current) {
            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
          }
        }}
      />

      <div className={`absolute inset-0 bg-black/5 flex items-center justify-center transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
        <button 
          onClick={togglePlayback}
          className="p-6 bg-white/20 backdrop-blur-xl rounded-full text-white border border-white/20 hover:scale-110 transition-transform"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-8 inset-x-8 flex flex-col gap-2">
        <div className="flex justify-between items-center px-4">
          <span className="text-[9px] font-black text-[#662344] uppercase tracking-widest">Giro 360° Interativo</span>
          <span className="text-[9px] font-mono text-[#662344]/40">{Math.round(progress)}%</span>
        </div>
        <input 
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSliderChange}
          className="w-full h-1 bg-zinc-200 rounded-full appearance-none accent-[#662344] cursor-ew-resize"
        />
      </div>
      
      <div className="absolute top-8 left-8 flex gap-2">
         <div className="px-3 py-1 bg-[#662344] text-[#fdd49e] rounded-full text-[7px] font-black uppercase tracking-widest">VEO 3.1 ENGINE</div>
         <div className="px-3 py-1 bg-white text-[#662344] border border-zinc-100 rounded-full text-[7px] font-black uppercase tracking-widest">4K RENDER</div>
      </div>
    </div>
  );
};

export default Interactive3DPlayer;
