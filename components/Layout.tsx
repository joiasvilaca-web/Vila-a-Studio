
import React from 'react';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <header className="border-b border-[#fdd49e]/20 py-6 px-8 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto relative flex justify-center items-center">
          <Logo className="h-10" color="#662344" />
        </div>
      </header>
      
      <main className="flex-grow max-w-7xl mx-auto w-full p-6 md:p-10">
        {children}
      </main>

      <footer className="py-12 text-center bg-white border-t border-[#fdd49e]/10">
        <p className="text-[10px] text-[#662344]/40 uppercase tracking-[0.25em] font-bold">
          VILAÇA STUDIO - TRATAMENTO DIGITAL DE ALTA JOALHERIA
        </p>
      </footer>
    </div>
  );
};

export default Layout;
