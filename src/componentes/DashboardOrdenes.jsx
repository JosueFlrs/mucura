import { useState, useEffect } from 'react';
import { clienteSupabase } from '/mucura/src/servicios/clienteSupabase';
import Swal from 'sweetalert2';

const NOMBRES_SERVICIOS = {
    a4Color: "A4 Color", a4BlancoYNegro: "A4 B/N", a4ObraColor: "A4 Obra", a3ObraColor: "A3 Obra",
    a4Cartulina: "A4 Cartulina", a4Fotografico120: "A4 Foto 120g", a4Fotografico200: "A4 Foto 200g",
    a4Fotografico250: "A4 Foto 250g", a4FotoAdhesivo135: "A4 Foto Adhes. 135g", sa3OppAdhesivo: "S.A3 OPP Adhes.",
    a4OppAdhesivo: "A4 OPP Adhes.", sa3Ilustracion115: "S.A3 Ilust. 115g", a4Ilustracion115: "A4 Ilust. 115g",
    sa3Ilustracion200: "S.A3 Ilust. 200g", a4Ilustracion200: "A4 Ilust. 200g", sa3Ilustracion300: "S.A3 Ilust. 300g",
    a4Ilustracion300: "A4 Ilust. 300g", sa3IlustracionAdhesivo: "S.A3 Ilust. Adhes.", a4IlustracionAdhesivo: "A4 Ilust. Adhes."
};

const SIN_DOBLE_FAZ = ['a4Fotografico120', 'a4Fotografico200', 'a4Fotografico250', 'a4FotoAdhesivo135', 'sa3OppAdhesivo', 'a4OppAdhesivo', 'sa3IlustracionAdhesivo', 'a4IlustracionAdhesivo'];

export const DashboardOrdenes = () => {
    const [ordenes, setOrdenes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);

    useEffect(() => {
        obtenerOrdenes();
    }, []);

    const obtenerOrdenes = async () => {
        try {
            setCargando(true);
            const { data, error } = await clienteSupabase
                .from('ordenesProduccion')
                .select('*')
                .order('fechaCreacion', { ascending: false })
                .limit(50);

            if (error) throw error;
            setOrdenes(data);
        } catch (error) {
            console.error("error al cargar ordenes:", error);
        } finally {
            setCargando(false);
        }
    };

    const eliminarOrden = async (id, evento) => {
        evento.stopPropagation();
        const esModoOscuro = document.documentElement.classList.contains('dark');

        const confirmacionEliminar = await Swal.fire({
            title: '¿Eliminar orden?',
            text: "Esta acción borrará el registro de forma permanente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: esModoOscuro ? '#1f2937' : '#ffffff',
            color: esModoOscuro ? '#ffffff' : '#1f2937',
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700',
                title: 'text-2xl font-black',
                confirmButton: 'bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-2xl mx-2 transition-all',
                cancelButton: esModoOscuro ? 'bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-2xl mx-2 transition-all' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-2xl mx-2 transition-all'
            }
        });

        if (!confirmacionEliminar.isConfirmed) return;

        try {
            const { error } = await clienteSupabase.from('ordenesProduccion').delete().eq('id', id);
            if (error) throw error;

            setOrdenes(ordenesActuales => ordenesActuales.filter(orden => orden.id !== id));
            
            Swal.fire({
                icon: 'success', title: 'Eliminada', text: 'La orden ha sido borrada del historial.',
                toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000,
                background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937',
                customClass: { popup: 'rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700' }
            });
        } catch (error) {
            console.error("error al intentar eliminar la orden:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Hubo un error en el servidor.', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 4000, background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937', customClass: { popup: 'rounded-2xl shadow-xl' }});
        }
    };

    const formatearFecha = (fechaISO) => {
        if (!fechaISO) return '';
        // Truco: Si Supabase devuelve la fecha sin la 'Z', JS asume que es local y suma 3hs.
        // Forzamos que la interprete como UTC añadiendo la 'Z' al final si le falta.
        const fechaValida = fechaISO.endsWith('Z') ? fechaISO : `${fechaISO}Z`;
        const fecha = new Date(fechaValida);
        return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const totalRecaudado = ordenes.reduce((acumulador, orden) => acumulador + orden.totalCobrado, 0);

    if (cargando) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-empresa"></div></div>;

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in pb-10">
            
            {/* INFORME SUPERIOR */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Dashboard de Ventas</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Historial de las últimas órdenes registradas</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-6 py-4 rounded-2xl text-center">
                    <p className="text-[10px] uppercase font-bold text-green-600 dark:text-green-500 tracking-widest">Total Recaudado (Recientes)</p>
                    <p className="text-3xl font-black text-green-700 dark:text-green-400">${totalRecaudado.toLocaleString('es-AR')}</p>
                </div>
            </div>

            {/* TABLA PRINCIPAL */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs uppercase tracking-widest text-gray-400 font-bold">
                                <th className="p-5">Fecha / Hora</th>
                                <th className="p-5">Concepto</th> {/* CAMBIADO: De Resumen Rápido a Concepto */}
                                <th className="p-5">Librería</th>
                                <th className="p-5">Método Pago</th>
                                <th className="p-5 text-right">Total</th>
                                <th className="p-5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {ordenes.map((orden) => (
                                <tr 
                                    key={orden.id} 
                                    onDoubleClick={() => setOrdenSeleccionada(orden)} // CAMBIADO: Ahora se abre exclusivamente con Doble Click
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer select-none"
                                >
                                    <td className="p-5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        {formatearFecha(orden.fechaCreacion)}
                                    </td>
                                    
                                    {/* --- MEJORA: COLUMNA CONCEPTO INTELIGENTE --- */}
                                    <td className="p-5 text-xs text-gray-500 dark:text-gray-400">
                                        {orden.resumenPedido?.notaExtra ? (
                                            <div className="flex flex-col gap-1">
                                                <span className={`font-black uppercase tracking-wide text-[10px] px-2 py-0.5 rounded w-max ${
                                                    orden.resumenPedido.notaExtra.includes('SEÑA') ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                }`}>
                                                    {orden.resumenPedido.notaExtra.includes('SEÑA') ? '💰 Seña Registrada' : '✅ Saldo de Taller'}
                                                </span>
                                                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate max-w-[250px] italic">
                                                    {orden.resumenPedido.notaExtra}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-black text-gray-700 dark:text-gray-200 uppercase tracking-wide text-[10px] bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded w-max">
                                                    🛒 Venta Directa
                                                </span>
                                                <span className="text-[11px] font-medium text-gray-400 mt-0.5">
                                                    {orden.resumenPedido?.cantidadArchivosImpresos || 0} Juegos | {orden.resumenPedido?.cantidadAnillados || 0} Anillados
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    
                                    {/* --- MEJORA: OCULTAR MONTO LIBRERÍA SI ES CERO --- */}
                                    <td className="p-5 text-sm text-gray-600 dark:text-gray-300">
                                        {orden.montoLibreria > 0 ? (
                                            <span className="font-bold text-gray-700 dark:text-gray-200">${orden.montoLibreria.toLocaleString('es-AR')}</span>
                                        ) : (
                                            <span className="text-gray-300 dark:text-gray-600 font-normal">-</span>
                                        )}
                                    </td>
                                    
                                    <td className="p-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            orden.metodoPago === 'efectivo' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 
                                            orden.metodoPago === 'mixto' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' : 
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                        }`}>
                                            {orden.metodoPago}
                                        </span>
                                    </td>
                                    
                                    <td className="p-5 text-right">
                                        <span className="text-lg font-black text-gray-800 dark:text-white block">
                                            ${orden.totalCobrado.toLocaleString('es-AR')}
                                        </span>
                                        {orden.metodoPago === 'mixto' && orden.resumenPedido?.desglosePago && (
                                            <div className="flex flex-col items-end gap-0.5 mt-1">
                                                <span className="text-[9px] font-black text-green-600 dark:text-green-400">💵 ${orden.resumenPedido.desglosePago.efectivo.toLocaleString('es-AR')}</span>
                                                <span className="text-[9px] font-black text-blue-600 dark:text-blue-400">📱 ${orden.resumenPedido.desglosePago.digital.toLocaleString('es-AR')}</span>
                                            </div>
                                        )}
                                    </td>
                                    
                                    <td className="p-5 text-center">
                                        <button
                                            onClick={(evento) => eliminarOrden(orden.id, evento)}
                                            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all group"
                                            title="Eliminar del historial"
                                        >
                                            <svg className="w-5 h-5 transform group-hover:scale-110 duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {ordenes.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400 italic">No hay órdenes registradas aún.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DETALLES PROFUNDOS (AL HACER DOBLE CLICK) */}
            {ordenSeleccionada && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden w-full max-w-md flex flex-col relative animate-slide-up">
                        
                        <button 
                            onClick={() => setOrdenSeleccionada(null)}
                            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-full transition-colors"
                        >
                            <svg className="w-4 h-4 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <div className="p-6 md:p-8 max-h-[85vh] overflow-y-auto hide-scrollbar flex flex-col gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-empresa" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Detalle de la Operación
                                </h3>
                                <p className="text-xs text-gray-400 font-medium">{formatearFecha(ordenSeleccionada.fechaCreacion)}</p>
                            </div>

                            {/* --- CORRECCIÓN: EXPANSIÓN COMPLETA DE LA NOTA EXTRA Y COMENTARIOS DEL RECUADRO --- */}
                            {/* --- MOSTRAR EL DETALLE REAL DEL TRABAJO --- */}
                            {ordenSeleccionada.resumenPedido?.detalleTrabajo && (
                                <div className="bg-blue-50/60 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-sm shadow-inner animate-fade-in">
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest font-black mb-1.5">Detalle del Pedido</p>
                                    <p className="font-bold text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                        {ordenSeleccionada.resumenPedido.detalleTrabajo}
                                    </p>
                                </div>
                            )}

                            {/* DESGLOSE EXACTO POR ARCHIVO (Ventas de Mostrador o Señas del Cotizador) */}
                            {ordenSeleccionada.resumenPedido?.archivosOriginales && ordenSeleccionada.resumenPedido.archivosOriginales.length > 0 && (
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">Desglose de Producción</p>
                                    <div className="space-y-2">
                                        {ordenSeleccionada.resumenPedido.archivosOriginales.map((archivo, idx) => {
                                            const nombreBase = NOMBRES_SERVICIOS[archivo.tipoServicio] || archivo.tipoServicio;
                                            const noAceptaDobleFaz = SIN_DOBLE_FAZ.includes(archivo.tipoServicio);
                                            
                                            return (
                                                <div key={idx} className="flex justify-between items-center text-sm bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-800 dark:text-gray-200">
                                                            {archivo.paginas || 0} págs <span className="text-gray-400 font-normal mx-1">x</span> <span className="text-empresa">{archivo.copias || 1} Juegos</span>
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 mt-0.5">
                                                            {nombreBase} {!noAceptaDobleFaz && (archivo.esDobleFaz ? '(Doble)' : '(Simple)')}
                                                        </span>
                                                    </div>
                                                    {archivo.anillado && (
                                                        <span className="text-[9px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-md font-bold uppercase tracking-widest">
                                                            Anillado
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* TOTALES AGRUPADOS */}
                            {ordenSeleccionada.resumenPedido?.paginas && Object.keys(ordenSeleccionada.resumenPedido.paginas).length > 0 && (
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">Páginas Totales a Imprimir</p>
                                    {Object.entries(ordenSeleccionada.resumenPedido.paginas).map(([clave, cantidad]) => {
                                        const [tipo, dobleFazStr] = clave.split('-');
                                        const esDobleFaz = dobleFazStr === 'true';
                                        const nombreBase = NOMBRES_SERVICIOS[tipo] || tipo;
                                        const noAceptaDobleFaz = SIN_DOBLE_FAZ.includes(tipo);

                                        return (
                                            <div key={clave} className="flex justify-between items-center text-sm mb-2 last:mb-0">
                                                <span className="text-gray-600 dark:text-gray-300 font-medium">
                                                    {nombreBase} {!noAceptaDobleFaz && (esDobleFaz ? <span className="text-[10px] text-empresa font-bold ml-1">(Doble)</span> : <span className="text-[10px] text-gray-400 ml-1">(Simple)</span>)}
                                                </span>
                                                <span className="text-gray-800 dark:text-white font-black">{cantidad} págs</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* OTROS SERVICIOS ACUMULADOS */}
                            <div className="space-y-2 px-1">
                                {ordenSeleccionada.resumenPedido?.cantidadAnillados > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">Anillados (Total)</span>
                                        <span className="text-gray-800 dark:text-white font-bold">{ordenSeleccionada.resumenPedido.cantidadAnillados}</span>
                                    </div>
                                )}
                                {ordenSeleccionada.montoLibreria > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">Librería / Otros</span>
                                        <span className="text-gray-800 dark:text-white font-bold">${ordenSeleccionada.montoLibreria.toLocaleString('es-AR')}</span>
                                    </div>
                                )}
                            </div>

                            {/* METODO Y DESGLOSE INTERIOR DEL MODAL */}
                            <div className="mt-4 pt-5 border-t border-gray-100 dark:border-gray-700 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Método de Pago</p>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        ordenSeleccionada.metodoPago === 'efectivo' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 
                                        ordenSeleccionada.metodoPago === 'mixto' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' : 
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                    }`}>
                                        {ordenSeleccionada.metodoPago}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Cobrado</p>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white leading-none">${ordenSeleccionada.totalCobrado.toLocaleString('es-AR')}</p>
                                    
                                    {ordenSeleccionada.metodoPago === 'mixto' && ordenSeleccionada.resumenPedido?.desglosePago && (
                                        <div className="flex gap-2 justify-end mt-2">
                                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-md">
                                                💵 ${ordenSeleccionada.resumenPedido.desglosePago.efectivo.toLocaleString('es-AR')}
                                            </span>
                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                                                📱 ${ordenSeleccionada.resumenPedido.desglosePago.digital.toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};