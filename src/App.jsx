import { useState, useEffect } from 'react';
import { CalculadoraCotizaciones } from './componentes/CalculadoraCotizaciones';
import { CotizadorRapido } from './componentes/CotizadorRapido';

function App() {
  const [temaOscuro, setTemaOscuro] = useState(() => {
    const temaGuardado = window.localStorage.getItem('preferenciaTemaOscuro');
    if (temaGuardado !== null) return JSON.parse(temaGuardado);
    return false; 
  });

  const [pantallaActiva, setPantallaActiva] = useState('calculadora');

  useEffect(() => {
    if (temaOscuro) {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem('preferenciaTemaOscuro', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('preferenciaTemaOscuro', 'false');
    }
  }, [temaOscuro]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex font-sans">
      
      {/* SIDEBAR MINIMALISTA (Estilo Instagram: Sidebar en PC / Bottom Nav en Móvil) */}
      <aside className="fixed bottom-0 md:relative w-full md:w-20 bg-white dark:bg-gray-800 border-t md:border-t-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-row md:flex-col items-center justify-around md:justify-start py-2 md:py-6 z-50 md:h-screen transition-colors duration-300 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:shadow-none">
        
        {/* Logo Icono (Solo Escritorio) */}
        <div className="hidden md:flex mb-8 items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-empresa to-[#D12E9E] text-white font-black text-2xl shadow-md cursor-default">
            P
        </div>

        {/* Navegación por Íconos */}
        <nav className="flex flex-row md:flex-col gap-2 md:gap-6 w-full px-2 md:px-0">
            
            <button 
                onClick={() => setPantallaActiva('calculadora')}
                title="Orden Completa"
                className={`flex justify-center items-center p-3 md:mx-auto md:w-12 md:h-12 rounded-xl md:rounded-2xl transition-all ${pantallaActiva === 'calculadora' ? 'bg-empresa/10 text-empresa border border-empresa/20 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white'}`}
            >
                {/* Ícono de Documento / Orden */}
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </button>

            <button 
                onClick={() => setPantallaActiva('cotizadorRapido')}
                title="Consulta Rápida"
                className={`flex justify-center items-center p-3 md:mx-auto md:w-12 md:h-12 rounded-xl md:rounded-2xl transition-all ${pantallaActiva === 'cotizadorRapido' ? 'bg-empresa/10 text-empresa border border-empresa/20 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white'}`}
            >
                {/* Ícono de Rayo / Rápido */}
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </button>

        </nav>

        {/* Botón Tema Oscuro (Abajo en PC, a la derecha en Móvil) */}
        <div className="md:mt-auto">
            <button 
                onClick={() => setTemaOscuro(!temaOscuro)}
                title={temaOscuro ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                className="flex justify-center items-center p-3 md:mx-auto md:w-12 md:h-12 rounded-xl md:rounded-2xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-yellow-500 dark:hover:text-blue-400 transition-all"
            >
                {temaOscuro ? (
                    /* Ícono Sol */
                    <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                    /* Ícono Luna */
                    <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
            </button>
        </div>

      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      {/* NOTA: mb-20 es para que en celulares la barra flotante de abajo no tape el contenido */}
      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden p-4 md:p-8 lg:p-10 h-screen pb-24 md:pb-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          {pantallaActiva === 'calculadora' && <CalculadoraCotizaciones />}
          {pantallaActiva === 'cotizadorRapido' && <CotizadorRapido />}
      </main>

    </div>
  );
}

export default App;