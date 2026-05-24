import { useState, useEffect } from 'react';
import { Sidebar } from './componentes/Sidebar';
import { CalculadoraCotizaciones } from './componentes/CalculadoraCotizaciones';
import { CotizadorRapido } from './componentes/CotizadorRapido';
import { Configuracion } from './componentes/Configuracion';
import { DashboardOrdenes } from './componentes/DashboardOrdenes';
import { GestionPedidos } from './componentes/GestionPedidos';

function App() {
    const [temaOscuro, setTemaOscuro] = useState(() => {
        const temaGuardado = window.localStorage.getItem('preferenciaTemaOscuro');
        if (temaGuardado !== null) return JSON.parse(temaGuardado);
        return false;
    });

    const [pantallaActiva, setPantallaActiva] = useState(() => {
        const pantallaGuardada = window.localStorage.getItem('preferenciaPantallaActiva');
        return pantallaGuardada !== null ? pantallaGuardada : 'calculadora';
    });

    // AQUÍ ESTÁ EL PUENTE DE DATOS
    const [datosPrecargados, setDatosPrecargados] = useState(null);

    useEffect(() => {
        if (temaOscuro) {
            document.documentElement.classList.add('dark');
            window.localStorage.setItem('preferenciaTemaOscuro', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            window.localStorage.setItem('preferenciaTemaOscuro', 'false');
        }
    }, [temaOscuro]);

    useEffect(() => {
        window.localStorage.setItem('preferenciaPantallaActiva', pantallaActiva);
    }, [pantallaActiva]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex font-sans">
            
            <Sidebar 
                pantallaActiva={pantallaActiva} 
                setPantallaActiva={setPantallaActiva} 
                temaOscuro={temaOscuro} 
                setTemaOscuro={setTemaOscuro} 
            />

            <main className="flex-1 w-full overflow-y-auto overflow-x-hidden p-4 md:p-8 lg:p-10 h-screen pb-24 md:pb-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                
                {/* LE PASAMOS EL PUENTE A LA CALCULADORA Y AL COTIZADOR */}
                {pantallaActiva === 'calculadora' && (
                    <CalculadoraCotizaciones 
                        datosPrecargados={datosPrecargados} 
                        setDatosPrecargados={setDatosPrecargados} 
                    />
                )}
                
                {pantallaActiva === 'cotizadorRapido' && (
                    <CotizadorRapido 
                        setPantallaActiva={setPantallaActiva} 
                        setDatosPrecargados={setDatosPrecargados} 
                    />
                )}
                {pantallaActiva === 'gestionPedidos' && <GestionPedidos />}
                {pantallaActiva === 'configuracion' && <Configuracion />}
                {pantallaActiva === 'dashboard' && <DashboardOrdenes />}
            </main>

        </div>
    );
}

export default App;