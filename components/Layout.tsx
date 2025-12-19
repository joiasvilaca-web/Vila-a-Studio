
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const handleShareApp = async () => {
    // Validação para garantir que a URL seja absoluta e válida para a API de Share
    const currentUrl = window.location.href;
    const isUrlValid = currentUrl.startsWith('http');
    
    const shareData: ShareData = {
      title: 'Vilaça Joias Studio',
      text: 'Transforme suas fotos de joias em imagens profissionais para site com um clique!',
      url: isUrlValid ? currentUrl : undefined,
    };

    try {
      if (navigator.share && isUrlValid) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(currentUrl);
        alert('Link copiado para a área de transferência!');
      }
    } catch (err) {
      // Se falhar o share (mesmo com validação), tenta o clipboard como fallback final
      console.error('Erro ao compartilhar:', err);
      try {
        await navigator.clipboard.writeText(currentUrl);
        alert('Link copiado para a área de transferência!');
      } catch (clipErr) {
        console.error('Erro ao copiar para clipboard:', clipErr);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fffcf9]">
      <header className="border-b border-[#fdd49e]/30 py-6 px-4 sticky top-0 bg-[#662344] z-50 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="w-10 md:hidden"></div> {/* Spacer for mobile center */}
          <div className="flex flex-col items-center flex-grow">
            <h1 className="text-3xl font-serif tracking-widest text-[#fdd49e] font-semibold uppercase">
              Vilaça Joias
            </h1>
            <p className="text-[10px] tracking-[0.2em] text-[#fdd49e]/80 uppercase mt-1">
              Estúdio de Retoque Profissional
            </p>
          </div>
          <button 
            onClick={handleShareApp}
            className="text-[#fdd49e] hover:opacity-80 transition-opacity p-2"
            title="Compartilhar Aplicativo"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9a3 3 0 100-2.684 3 3 0 000 2.684z" />
            </svg>
          </button>
        </div>
      </header>
      
      <main className="flex-grow max-w-5xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>

      <footer className="border-t border-[#fdd49e]/20 py-8 px-4 text-center bg-white">
        <p className="text-sm text-[#662344] font-medium italic">
          Por que entendemos de joias
        </p>
      </footer>
    </div>
  );
};

export default Layout;
