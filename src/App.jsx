import { useState, useEffect } from 'react'
import { CalculadoraCotizaciones } from './componentes/calculadoraCotizaciones'

function App() {
  const [temaOscuro, setTemaOscuro] = useState(false);

  // Efecto para aplicar la clase 'dark' al elemento raíz
  useEffect(() => {
    if (temaOscuro) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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