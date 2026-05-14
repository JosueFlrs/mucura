import { CalculadoraCotizaciones } from './componentes/calculadoraCotizaciones'

function App() {
  return (
    <div className="min-h-screen bg-gray-200 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-800 text-center mb-8 tracking-tight">
          sistema de impresion y stock
        </h1>
        <CalculadoraCotizaciones />
      </div>
    </div>
  )
}

export default App