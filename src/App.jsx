import { useState, useEffect } from 'react'
import { CalculadoraCotizaciones } from './componentes/calculadoraCotizaciones'

function App() {
  // 1. Iniciamos el estado leyendo el localStorage
  const [temaOscuro, setTemaOscuro] = useState(() => {
    const temaGuardado = window.localStorage.getItem('preferenciaTemaOscuro');
    // Si hay algo guardado, lo usamos. Si no, arranca en false (claro).
    if (temaGuardado !== null) {
      return JSON.parse(temaGuardado);
    }
    return false; 
  });

  // 2. Cada vez que cambia el tema, actualizamos el HTML y guardamos en localStorage
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-10 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setTemaOscuro(!temaOscuro)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white font-bold text-sm transition-all"
          >
            {temaOscuro ? '☀️ modo claro' : '🌙 modo oscuro'}
          </button>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 text-center mb-8 tracking-tight">
          Sistema de Impresión y Stock
        </h1>

        <CalculadoraCotizaciones />
      </div>
    </div>
  )
}

export default App