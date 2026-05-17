import { useState, useEffect } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';

export const DashboardOrdenes = () => {
    const [ordenes, setOrdenes] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        obtenerOrdenes();
    }, []);

    const obtenerOrdenes = async () => {
        try {
            setCargando(true);
            // Traemos las últimas 50 órdenes ordenadas por fecha
            const { data, error } = await clienteSupabase
                .from('ordenesProduccion')
                .select('*')
                .order('fechaCreacion', { ascending: false })
                .limit(50);

            if (error) throw error;
            setOrdenes(data);
        } catch (error) {
            console.error("error al cargar órdenes:", error);
        } finally {
            setCargando(false);
        }
    };

    const formatearFecha = (fechaISO) => {
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-AR', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    const totalRecaudado = ordenes.reduce((acc, orden) => acc + orden.totalCobrado, 0);

    if (cargando) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-empresa"></div></div>;

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in pb-10">
            
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

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs uppercase tracking-widest text-gray-400 font-bold">
                                <th className="p-5">Fecha / Hora</th>
                                <th className="p-5">Detalle Archivos</th>
                                <th className="p-5">Librería</th>
                                <th className="p-5">Método Pago</th>
                                <th className="p-5 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {ordenes.map((orden) => (
                                <tr key={orden.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                    <td className="p-5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        {formatearFecha(orden.fechaCreacion)}
                                    </td>
                                    <td className="p-5 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-bold">{orden.resumenPedido?.cantidadArchivosImpresos || 0}</span> PDFs | <span className="font-bold">{orden.resumenPedido?.cantidadAnillados || 0}</span> Anillados
                                    </td>
                                    <td className="p-5 text-sm text-gray-600 dark:text-gray-300">
                                        ${(orden.montoLibreria || 0).toLocaleString('es-AR')}
                                    </td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${orden.metodoPago === 'efectivo' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                                            {orden.metodoPago}
                                        </span>
                                    </td>
                                    <td className="p-5 text-right text-lg font-black text-gray-800 dark:text-white">
                                        ${orden.totalCobrado.toLocaleString('es-AR')}
                                    </td>
                                </tr>
                            ))}
                            {ordenes.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-400 italic">No hay órdenes registradas aún.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};