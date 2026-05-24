import { useState, useEffect } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';
import Swal from 'sweetalert2';

const ESTADOS_PEDIDO = [
    { id: 'sin_iniciar', titulo: 'Pendientes', color: 'bg-gray-100 dark:bg-gray-800', borde: 'border-gray-300 dark:border-gray-600', texto: 'text-gray-800 dark:text-gray-200' },
    { id: 'iniciado', titulo: 'En Producción', color: 'bg-blue-50 dark:bg-blue-900/20', borde: 'border-blue-300 dark:border-blue-800', texto: 'text-blue-800 dark:text-blue-300' },
    { id: 'finalizado', titulo: 'Listos p/ Retirar', color: 'bg-green-50 dark:bg-green-900/20', borde: 'border-green-300 dark:border-green-800', texto: 'text-green-800 dark:text-green-300' }
    // 'entregado' no tiene columna, se oculta o va a un historial
];

export const GestionPedidos = () => {
    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [nuevoDetalle, setNuevoDetalle] = useState('');

    useEffect(() => {
        obtenerPedidosActivos();
    }, []);

    const obtenerPedidosActivos = async () => {
        try {
            setCargando(true);
            const { data, error } = await clienteSupabase
                .from('pedidosTaller')
                .select('*')
                .neq('estado', 'entregado') // Ocultamos los entregados del tablero principal
                .order('fechaCreacion', { ascending: true });

            if (error) throw error;
            setPedidos(data);
        } catch (error) {
            console.error("error al cargar pedidos:", error);
        } finally {
            setCargando(false);
        }
    };

    const enviarMensajeWhatsApp = async (telefono, codigoCliente, nuevoEstado) => {
        // Limpiamos el número y le agregamos el código de país (Argentina 54) si no lo tiene
        const numeroLimpio = telefono.replace(/\D/g, '');
        const numeroFinal = numeroLimpio.startsWith('54') ? numeroLimpio : `54${numeroLimpio}`;
        const esModoOscuro = document.documentElement.classList.contains('dark');
        
        let mensaje = '';
        if (nuevoEstado === 'iniciado') {
            mensaje = `¡Hola! Te avisamos desde la imprenta que tu pedido (Orden #${codigoCliente}) ya entró a producción. Te avisaremos cuando esté listo. ⚙️`;
        } else if (nuevoEstado === 'finalizado') {
            mensaje = `¡Hola! Tu pedido (Orden #${codigoCliente}) ya está LISTO para que pases a retirarlo. ¡Te esperamos! 📦✅`;
        }

        if (mensaje === '') return;

        try {
            // Leemos las credenciales ocultas en el archivo .env
            const token = import.meta.env.VITE_WHATSAPP_TOKEN;
            const phoneId = import.meta.env.VITE_WHATSAPP_PHONE_ID;

            if (!token || !phoneId) throw new Error("Faltan las credenciales en el archivo .env");

            // Ejecutamos la petición POST a la API Cloud de Meta
            const respuesta = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: numeroFinal,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: mensaje
                    }
                })
            });

            const datos = await respuesta.json();
            
            // Si Meta responde con error (ej. ventana 24hs cerrada o token vencido)
            if (!respuesta.ok) {
                throw new Error(datos.error?.message || 'Error desconocido de Meta');
            }

            console.log("✅ Mensaje enviado a través de la API:", datos);

        } catch (error) {
            console.error("❌ Falló la API de WhatsApp:", error.message);
            
            // FALLBACK INTELIGENTE: Si falla la API silenciosa, abrimos WhatsApp Web
            Swal.fire({
                icon: 'warning',
                title: 'Aviso API WhatsApp',
                text: 'No se pudo usar el servidor automático. Se abrirá WhatsApp Web.',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                background: esModoOscuro ? '#1f2937' : '#ffffff',
                color: esModoOscuro ? '#ffffff' : '#1f2937',
            });

            setTimeout(() => {
                const urlWaMe = `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`;
                window.open(urlWaMe, '_blank');
            }, 1500);
        }
    };

    const crearPedido = async (evento) => {
        evento.preventDefault();
        const esModoOscuro = document.documentElement.classList.contains('dark');

        if (nuevoTelefono.length < 4) {
            Swal.fire({ icon: 'warning', title: 'Teléfono inválido', text: 'El teléfono debe tener al menos 4 números.', background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937' });
            return;
        }

        const codigoCliente = nuevoTelefono.slice(-4);

        try {
            const { error } = await clienteSupabase.from('pedidosTaller').insert([{
                telefono: nuevoTelefono,
                codigoCliente: codigoCliente,
                detalle: nuevoDetalle,
                estado: 'sin_iniciar'
            }]);

            if (error) throw error;

            setNuevoTelefono('');
            setNuevoDetalle('');
            obtenerPedidosActivos();

            Swal.fire({ icon: 'success', title: `Orden #${codigoCliente} Creada`, toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937', customClass: { popup: 'rounded-2xl shadow-xl' }});
        } catch (error) {
            console.error("error al crear pedido:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo crear el pedido.', background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937' });
        }
    };

    const avanzarEstado = async (pedido) => {
        const esModoOscuro = document.documentElement.classList.contains('dark');
        let nuevoEstado = '';
        
        if (pedido.estado === 'sin_iniciar') nuevoEstado = 'iniciado';
        else if (pedido.estado === 'iniciado') nuevoEstado = 'finalizado';
        else if (pedido.estado === 'finalizado') nuevoEstado = 'entregado';

        try {
            const { error } = await clienteSupabase
                .from('pedidosTaller')
                .update({ estado: nuevoEstado })
                .eq('id', pedido.id);

            if (error) throw error;

            // Alerta visual de avance
            Swal.fire({ icon: 'success', title: 'Estado Actualizado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937', customClass: { popup: 'rounded-2xl shadow-md' }});

            // Disparamos la integración de WhatsApp
            enviarMensajeWhatsApp(pedido.telefono, pedido.codigoCliente, nuevoEstado);

            // Refrescamos tablero
            obtenerPedidosActivos();
            
        } catch (error) {
            console.error("error al cambiar estado:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar el estado.', background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937' });
        }
    };

    if (cargando) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-empresa"></div></div>;

    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pb-10">
            
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Taller de Producción</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión visual de pedidos e integración con WhatsApp</p>
                </div>
                
                {/* FORMULARIO DE NUEVO PEDIDO */}
                <form onSubmit={crearPedido} className="w-full md:w-auto flex flex-col sm:flex-row gap-3 bg-gray-50 dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div className="relative w-full sm:w-40">
                        <label className="text-[9px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-gray-50 dark:bg-gray-900 px-1">Tel. WhatsApp</label>
                        <input type="text" required className="w-full h-10 px-3 bg-transparent border-2 border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-empresa text-sm" value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} placeholder="Ej: 2615555555" />
                    </div>
                    <div className="relative w-full sm:w-64">
                        <label className="text-[9px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-gray-50 dark:bg-gray-900 px-1">Detalle (Breve)</label>
                        <input type="text" required className="w-full h-10 px-3 bg-transparent border-2 border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-800 dark:text-white outline-none focus:border-empresa text-sm" value={nuevoDetalle} onChange={(e) => setNuevoDetalle(e.target.value)} placeholder="Ej: 3 Anillados, 1 Lona" />
                    </div>
                    <button type="submit" className="h-10 px-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:scale-105 transition-transform text-sm whitespace-nowrap">
                        + Ingresar
                    </button>
                </form>
            </div>

            {/* TABLERO KANBAN */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {ESTADOS_PEDIDO.map(columna => {
                    const pedidosColumna = pedidos.filter(p => p.estado === columna.id);
                    
                    return (
                        <div key={columna.id} className={`${columna.color} rounded-3xl border ${columna.borde} p-5 min-h-[500px] flex flex-col gap-4 shadow-inner transition-colors`}>
                            <div className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-3">
                                <h3 className={`font-black text-lg uppercase tracking-tight ${columna.texto}`}>{columna.titulo}</h3>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black bg-white dark:bg-gray-800 shadow-sm ${columna.texto}`}>
                                    {pedidosColumna.length}
                                </span>
                            </div>

                            {pedidosColumna.map(pedido => (
                                <div key={pedido.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3 group hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Orden / Cliente</p>
                                            <p className="text-2xl font-black text-empresa">#{pedido.codigoCliente}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-lg text-right">
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">WhatsApp</p>
                                            <p className="text-xs font-bold text-gray-600 dark:text-gray-300">{pedido.telefono}</p>
                                        </div>
                                    </div>
                                    
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 border-l-2 border-empresa/30 pl-2">
                                        {pedido.detalle}
                                    </p>

                                    <button 
                                        onClick={() => avanzarEstado(pedido)}
                                        className={`mt-2 py-2 rounded-xl font-bold text-sm text-white flex justify-center items-center gap-2 transition-transform hover:-translate-y-1 ${
                                            pedido.estado === 'sin_iniciar' ? 'bg-blue-500 hover:bg-blue-600' :
                                            pedido.estado === 'iniciado' ? 'bg-green-500 hover:bg-green-600' :
                                            'bg-gray-800 hover:bg-gray-900 dark:bg-gray-700'
                                        }`}
                                    >
                                        {pedido.estado === 'sin_iniciar' ? 'Comenzar Producción' :
                                         pedido.estado === 'iniciado' ? (
                                            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Terminar y Avisar</>
                                         ) : 'Entregar y Cerrar'}
                                    </button>
                                </div>
                            ))}

                            {pedidosColumna.length === 0 && (
                                <div className="flex-1 flex items-center justify-center text-center opacity-50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl m-2">
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Sin pedidos en esta etapa</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};