
import React from 'react';

interface LogoProps {
  className?: string;
  color?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-8", color = "currentColor", showText = true }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Monograma Vilaça - 'V' estilizado */}
      <svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-auto">
        <path 
          d="M25 25C38 18 58 12 68 38C78 64 48 78 48 78L58 52C58 52 88 22 58 22C28 22 25 48 25 48" 
          stroke={color} 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      
      {showText && (
        <div className="flex flex-col items-center mt-2">
          <div className="relative">
            <span className="text-[18px] font-serif tracking-[0.4em] font-bold leading-none uppercase" style={{ color }}>
              VILAÇA
            </span>
          </div>
          <span className="text-[6px] tracking-[0.45em] mt-1 opacity-90 uppercase font-light whitespace-nowrap" style={{ color }}>
            Joalheria e Ourivesaria
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
