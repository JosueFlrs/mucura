import { useState, useEffect } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';

export const Configuracion = () => {
    const [listaTarifas, setListaTarifas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensajeEstado, setMensajeEstado] = useState({ tipo: '', texto: '' });

    useEffect(() => {
        obtenerTarifasBase();
    }, []);

    const obtenerTarifasBase = async () => {
        try {
            setCargando(true);
            const { data, error } = await clienteSupabase.from('tarifasImpresion').select('*');
            if (error) throw error;
            // Ordenamos para que siempre aparezcan en el mismo orden visual
            const datosOrdenados = data.sort((a, b) => a.tipoImpresion.localeCompare(b.tipoImpresion));
            setListaTarifas(datosOrdenados);
        } catch (error) {
            console.error("error al cargar tarifas:", error);
            mostrarNotificacion('error', 'No se pudieron cargar las tarifas de la base de datos.');
        } finally {
            setCargando(false);
        }
    };

    const manejarCambioPrecio = (id, campo, valor) => {
        setListaTarifas(listaActual =>
            listaActual.map(tarifa =>
                tarifa.id === id ? { ...tarifa, [campo]: parseInt(valor) || 0 } : tarifa
            )
        );
    };

    const guardarCambiosBD = async () => {
        try {
            setGuardando(true);
            
            // Ejecutamos las actualizaciones en paralelo para cada tarifa modificada
            const promesasActualizacion = listaTarifas.map(tarifa => 
                clienteSupabase
                    .from('tarifasImpresion')
                    .update({
                        precioHasta50: tarifa.precioHasta50,
                        precioHasta100: tarifa.precioHasta100,
                        precioHasta200: tarifa.precioHasta200,
                        precioMasDe200: tarifa.precioMasDe200
                    })
                    .eq('id', tarifa.id)
            );

            const resultados = await Promise.all(promesasActualizacion);
            
            // Verificamos si alguna promesa arrojó error
            const hayError = resultados.some(res => res.error);
            if (hayError) throw new Error("error en la actualización");

            mostrarNotificacion('exito', '¡Tarifas actualizadas correctamente en el sistema!');
        } catch (error) {
            console.error("error al guardar cambios:", error);
            mostrarNotificacion('error', 'Hubo un problema al intentar guardar los precios.');
        } finally {
            setGuardando(false);
        }
    };

    const mostrarNotificacion = (tipo, texto) => {
        setMensajeEstado({ tipo, texto });
        setTimeout(() => setMensajeEstado({ tipo: '', texto: '' }), 4000);
    };

    const formatearNombreServicio = (clave) => {
        const nombres = {
            a4BlancoYNegro: "A4 Blanco y Negro (Simple Faz)",
            a4BlancoYNegroDobleFaz: "A4 Blanco y Negro (Doble Faz)",
            a4Color: "A4 Color (Simple Faz)",
            a4ColorDobleFaz: "A4 Color (Doble Faz)"
        };
        return nombres[clave] || clave;
    };

    if (cargando) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-empresa"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
            
            {/* Cabecera */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Panel de Configuración</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ajuste las escalas de precios mayoristas y minoristas</p>
                </div>
                
                <button
                    onClick={guardarCambiosBD}
                    disabled={guardando}
                    className={`px-6 py-3 rounded-2xl font-bold text-white shadow-md transition-all text-sm flex items-center gap-2 ${guardando ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-empresa to-[#D12E9E] hover:opacity-90'}`}
                >
                    {guardando ? 'Guardando...' : 'Guardar Precios'}
                </button>
            </div>

            {/* Mensaje de Feedback Visual */}
            {mensajeEstado.texto && (
                <div className={`p-4 rounded-2xl border text-sm font-bold shadow-sm transition-all text-center ${mensajeEstado.tipo === 'exito' ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
                    {mensajeEstado.texto}
                </div>
            )}

            {/* Lista de Tarjetas de Precios */}
            <div className="grid grid-cols-1 gap-6">
                {listaTarifas.map((tarifa) => (
                    <div key={tarifa.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                        
                        <div className="border-b dark:border-gray-700 pb-2">
                            <h3 className="text-lg font-black text-gray-800 dark:text-white tracking-tight">
                                {formatearNombreServicio(tarifa.tipoImpresion)}
                            </h3>
                        </div>

                        {/* Fila de Inputs para las 4 Escalas */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="relative">
                                <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">Hasta 50</label>
                                <input
                                    type="number"
                                    className="w-full h-12 px-3 pt-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-empresa transition-all"
                                    value={tarifa.precioHasta50}
                                    onChange={(e) => manejarCambioPrecio(tarifa.id, 'precioHasta50', e.target.value)}
                                />
                            </div>

                            <div className="relative">
                                <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">Hasta 100</label>
                                <input
                                    type="number"
                                    className="w-full h-12 px-3 pt-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-empresa transition-all"
                                    value={tarifa.precioHasta100}
                                    onChange={(e) => manejarCambioPrecio(tarifa.id, 'precioHasta100', e.target.value)}
                                />
                            </div>

                            <div className="relative">
                                <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">Hasta 200</label>
                                <input
                                    type="number"
                                    className="w-full h-12 px-3 pt-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-empresa transition-all"
                                    value={tarifa.precioHasta200}
                                    onChange={(e) => manejarCambioPrecio(tarifa.id, 'precioHasta200', e.target.value)}
                                />
                            </div>

                            <div className="relative">
                                <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">Más de 200</label>
                                <input
                                    type="number"
                                    className="w-full h-12 px-3 pt-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-empresa transition-all"
                                    value={tarifa.precioMasDe200}
                                    onChange={(e) => manejarCambioPrecio(tarifa.id, 'precioMasDe200', e.target.value)}
                                />
                            </div>
                        </div>

                    </div>
                ))}
            </div>
            
        </div>
    );
};