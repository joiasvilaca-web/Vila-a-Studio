
import React from 'react';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const handleShareApp = async () => {
    const currentUrl = window.location.href;
    const shareData = {
      title: 'Vilaça Joias Studio',
      text: 'Transforme suas fotos de joias em imagens profissionais com um clique!',
      url: currentUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(currentUrl);
        alert('Link copiado!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fffcf9]">
      <header className="border-b border-[#fdd49e]/30 py-4 px-6 sticky top-0 bg-[#662344] z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Logo color="#fdd49e" className="h-10" />
          </div>
          
          <div className="hidden md:block">
            <p className="text-[9px] tracking-[0.4em] text-[#fdd49e]/60 uppercase font-black">
              Digital Studio Experience
            </p>
          </div>

          <button 
            onClick={handleShareApp}
            className="text-[#fdd49e] hover:opacity-80 transition-opacity p-2 bg-white/5 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9a3 3 0 100-2.684 3 3 0 000 2.684z" />
            </svg>
          </button>
        </div>
      </header>
      
      <main className="flex-grow max-w-7xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>

      <footer className="py-8 text-center bg-white border-t border-[#fdd49e]/10">
        <Logo color="#662344" className="h-8 mb-4 opacity-40" />
        <p className="text-[10px] text-[#662344]/40 uppercase tracking-widest">
          © {new Date().getFullYear()} Vilaça Joalheria - Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
};

export default Layout;
