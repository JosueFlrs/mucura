import { useState } from 'react';
import { ConfiguracionPrecios } from './ConfiguracionPrecios'; 
import { ConfiguracionOperarios } from './ConfiguracionOperarios';

export const Configuracion = () => {
    const [pestanaActiva, setPestanaActiva] = useState('precios');

    const MENU_OPCIONES = [
        { 
            id: 'precios', 
            titulo: 'Tarifas y Precios', 
            descripcion: 'Actualizá los costos de impresión',
            icono: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' 
        },
        { 
            id: 'operarios', 
            titulo: 'Equipo de Trabajo', 
            descripcion: 'Gestión de staff del taller',
            icono: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' 
        },
        { 
            id: 'whatsapp', 
            titulo: 'API de WhatsApp', 
            descripcion: 'Tokens y conexión a Meta',
            icono: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' 
        }
    ];

    return (
        <div className="max-w-[1400px] mx-auto animate-fade-in pb-10">
            
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
                <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Ajustes del Sistema</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Administrá las reglas de negocio, precios y tu equipo de trabajo.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                
                {/* --- SIDEBAR --- */}
                <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-2 sticky top-6">
                    {MENU_OPCIONES.map(opcion => {
                        const activo = pestanaActiva === opcion.id;
                        return (
                            <button 
                                key={opcion.id}
                                onClick={() => setPestanaActiva(opcion.id)}
                                className={`w-full flex items-start gap-4 p-4 rounded-2xl text-left transition-all duration-300 border-2 ${
                                    activo 
                                    ? 'bg-white dark:bg-gray-800 border-empresa shadow-md transform scale-[1.02]' 
                                    : 'bg-transparent border-transparent hover:bg-white dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                                }`}
                            >
                                <div className={`p-2 rounded-xl mt-0.5 ${activo ? 'bg-empresa/10 text-empresa' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={opcion.icono} />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className={`font-black text-sm ${activo ? 'text-empresa' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {opcion.titulo}
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                        {opcion.descripcion}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* --- ÁREA DE CONTENIDO DINÁMICO (Ahora con h-fit y p-6/p-8) --- */}
                <div className="flex-1 w-full bg-white dark:bg-gray-800 rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
                    
                    {pestanaActiva === 'precios' && (
                        <div className="animate-fade-in w-full">
                            <ConfiguracionPrecios />
                        </div>
                    )}

                    {pestanaActiva === 'operarios' && (
                        <div className="animate-fade-in w-full">
                            <ConfiguracionOperarios />
                        </div>
                    )}

                    {pestanaActiva === 'whatsapp' && (
                        <div className="animate-fade-in w-full py-10 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-500 mb-6 border-4 border-white dark:border-gray-800 shadow-lg">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-gray-800 dark:text-white">Conexión con Meta API</h3>
                            <p className="text-gray-500 text-sm mt-3 max-w-md">Próximamente: Desde acá vas a poder actualizar tu Token de WhatsApp cuando venza sin necesidad de tocar el archivo <code>.env</code> ni reiniciar el servidor.</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};