import { useState, useEffect } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';
import Swal from 'sweetalert2';

export const ConfiguracionOperarios = () => {
    const [operarios, setOperarios] = useState([]);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        obtenerOperarios();
    }, []);

    const obtenerOperarios = async () => {
        try {
            setCargando(true);
            const { data, error } = await clienteSupabase.from('operarios').select('*').order('nombre');
            if (error) throw error;
            setOperarios(data);
        } catch (error) {
            console.error(error);
        } finally {
            setCargando(false);
        }
    };

    const agregarOperario = async (e) => {
        e.preventDefault();
        if (!nuevoNombre.trim()) return;
        
        try {
            const { error } = await clienteSupabase.from('operarios').insert([{ nombre: nuevoNombre.trim() }]);
            if (error) throw error;
            
            setNuevoNombre('');
            obtenerOperarios();
            Swal.fire({ icon: 'success', title: 'Operario Agregado', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000 });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error al agregar' });
        }
    };

    const eliminarOperario = async (id) => {
        const confirmacion = await Swal.fire({
            title: '¿Eliminar operario?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (confirmacion.isConfirmed) {
            try {
                await clienteSupabase.from('operarios').delete().eq('id', id);
                obtenerOperarios();
                Swal.fire({ icon: 'success', title: 'Eliminado', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000 });
            } catch (error) {
                console.error(error);
            }
        }
    };

    if (cargando) return <div className="p-4 text-gray-500">Cargando operarios...</div>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-md">
            <h3 className="text-xl font-black text-gray-800 dark:text-white mb-4">Gestión de Operarios</h3>
            
            <form onSubmit={agregarOperario} className="flex gap-2 mb-6">
                <input 
                    type="text" 
                    placeholder="Nombre del operario..." 
                    className="flex-1 h-10 px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-empresa"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                />
                <button type="submit" className="px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl text-sm">
                    Agregar
                </button>
            </form>

            <div className="space-y-2">
                {operarios.map(op => (
                    <div key={op.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                        <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400"></span>
                            {op.nombre}
                        </span>
                        <button onClick={() => eliminarOperario(op.id)} className="text-red-400 hover:text-red-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                ))}
                {operarios.length === 0 && <p className="text-center text-sm text-gray-400">No hay operarios registrados.</p>}
            </div>
        </div>
    );
};