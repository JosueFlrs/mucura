import { useState, useEffect, useMemo } from 'react';
import { clienteSupabase } from '/mucura/src/servicios/clienteSupabase';
import Swal from 'sweetalert2';

// IMPORTAMOS TUS MODULARIZACIONES
import { ModalAltaManual, ModalSeleccionOperario, ModalDetallePedido } from './ModalesGestionPedidos';
import { VistaAgenda } from './VistaAgenda';
import { VistaLista } from './VistaLista';

const ESTADOS_PEDIDO = {
    'sin_iniciar': { titulo: 'Pendiente', color: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    'iniciado': { titulo: 'En Producción', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-400', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
    'finalizado': { titulo: 'Listo p/ Retirar', color: 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-400', icon: 'M5 13l4 4L19 7' },
    'entregado': { titulo: 'Entregado', color: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500', icon: 'M5 13l4 4L19 7' }
};

const obtenerFechaLocalISO = (diasAdicionales = 0, fechaBase = new Date()) => {
    const fecha = new Date(fechaBase);
    fecha.setDate(fecha.getDate() + diasAdicionales);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};

export const GestionPedidos = () => {
    // 1. ESTADOS
    const [pedidos, setPedidos] = useState([]);
    const [operarios, setOperarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    
    const [vistaActiva, setVistaActiva] = useState('agenda'); 
    const [fechaReferencia, setFechaReferencia] = useState(new Date()); 
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos'); 
    
    const [mostrarModalAlta, setMostrarModalAlta] = useState(false);
    const [pedidoParaIniciar, setPedidoParaIniciar] = useState(null);
    const [pedidoSeleccionadoDetalle, setPedidoSeleccionadoDetalle] = useState(null);

    // 2. EFECTOS Y CARGA DE DATOS
    useEffect(() => { obtenerDatosIniciales(); }, []);

    useEffect(() => {
        if (vistaActiva === 'agenda' && (filtroEstado === 'finalizado' || filtroEstado === 'entregado')) {
            setFiltroEstado('todos');
        }
    }, [vistaActiva]);

    const obtenerDatosIniciales = async () => {
        try {
            setCargando(true);
            const [resPedidos, resOperarios] = await Promise.all([
                clienteSupabase.from('pedidosTaller').select('*').order('fechaCreacion', { ascending: true }),
                clienteSupabase.from('operarios').select('*').order('nombre')
            ]);
            if (resPedidos.error) throw resPedidos.error;
            if (resOperarios.error) throw resOperarios.error;

            setPedidos(resPedidos.data);
            setOperarios(resOperarios.data);
        } catch (error) { console.error("error al cargar datos:", error); } 
        finally { setCargando(false); }
    };

    // 3. LÓGICA DE NEGOCIO (Filtrados y Días)
    const resumenEstadisticas = useMemo(() => {
        const hoy = obtenerFechaLocalISO();
        let pendientesHoy = 0; let enProduccion = 0; let listos = 0; let totalSenaAcumulada = 0;
        pedidos.forEach(p => {
            if (p.estado !== 'entregado') {
                if (p.fechaEntrega === hoy) pendientesHoy++;
                if (p.estado === 'iniciado') enProduccion++;
                if (p.estado === 'finalizado') listos++;
                if (p.resumenPedido?.sena) totalSenaAcumulada += p.resumenPedido.sena;
            }
        });
        return { pendientesHoy, enProduccion, listos, totalSenaAcumulada };
    }, [pedidos]);

    const diasSemana = useMemo(() => {
        const dias = [];
        const inicio = new Date(fechaReferencia);
        const diaSemana = inicio.getDay(); 
        const dif = inicio.getDate() - diaSemana + 1;
        inicio.setDate(dif);

        for (let i = 0; i < 6; i++) {
            const diaIterado = new Date(inicio);
            diaIterado.setDate(inicio.getDate() + i);
            dias.push({
                fechaRaw: diaIterado,
                fechaISO: obtenerFechaLocalISO(0, diaIterado),
                nombreDia: diaIterado.toLocaleDateString('es-AR', { weekday: 'long' }),
                numeroDia: diaIterado.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
            });
        }
        return dias;
    }, [fechaReferencia]);

    const cambiarSemana = (direccion) => {
        const nueva = new Date(fechaReferencia);
        nueva.setDate(nueva.getDate() + (direccion === 'sig' ? 7 : -7));
        setFechaReferencia(nueva);
    };

    const volverAHoy = () => setFechaReferencia(new Date());

    const pedidosAgenda = pedidos.filter(p => {
        if (p.estado === 'entregado' || p.estado === 'finalizado') return false; 
        if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
        return true;
    });

    const pedidosFiltradosLista = pedidos.filter(p => {
        const termino = busqueda.toLowerCase();
        const coincideBusqueda = busqueda === '' || 
            (p.nombreCliente?.toLowerCase().includes(termino) || p.telefono?.includes(termino) || p.detalle?.toLowerCase().includes(termino) || p.operario?.toLowerCase().includes(termino));
        const coincideEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
        return coincideBusqueda && coincideEstado;
    }).sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)); 

    // 4. FUNCIONES DE BASE DE DATOS
    const enviarMensajeWhatsApp = async (telefono, codigoCliente, nuevoEstado) => {
        if (!telefono) return;
        const numeroFinal = "+54" + telefono.replace(/\D/g, '').slice(-10); 
        const esModoOscuro = document.documentElement.classList.contains('dark');
        let mensaje = '';
        if (nuevoEstado === 'iniciado') mensaje = `¡Hola! Te avisamos desde la imprenta que tu pedido (Orden #${codigoCliente}) ya entró a producción. Te avisaremos cuando esté listo. ⚙️`;
        else if (nuevoEstado === 'finalizado') mensaje = `¡Hola! Tu pedido (Orden #${codigoCliente}) ya está LISTO para que pases a retirarlo. ¡Te esperamos! 📦✅`;
        if (mensaje === '') return;

        try {
            const token = import.meta.env.VITE_WHATSAPP_TOKEN;
            const phoneId = import.meta.env.VITE_WHATSAPP_PHONE_ID;
            if (!token || !phoneId) throw new Error("Faltan credenciales");

            await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: numeroFinal, type: 'text', text: { preview_url: false, body: mensaje } })
            });
        } catch (error) {
            Swal.fire({ icon: 'warning', title: 'WhatsApp Web', text: 'Se abrirá WhatsApp Web.', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937'});
            setTimeout(() => { window.open(`https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`, '_blank'); }, 1500);
        }
    };

    const ejecutarCambioEstadoBaseDatos = async (pedido, nuevoEstado, nombreOperario) => {
        setPedidos(actuales => actuales.map(p => p.id === pedido.id ? { ...p, estado: nuevoEstado, operario: nombreOperario } : p));
        try {
            await clienteSupabase.from('pedidosTaller').update({ estado: nuevoEstado, operario: nombreOperario }).eq('id', pedido.id);
            enviarMensajeWhatsApp(pedido.telefono, pedido.codigoCliente, nuevoEstado);
        } catch (error) { obtenerDatosIniciales(); }
    };

    const avanzarEstado = async (pedido, eventoStr = null) => {
        if(eventoStr) eventoStr.stopPropagation();
        if (pedido.estado === 'sin_iniciar') {
            if (operarios.length > 0) setPedidoParaIniciar(pedido); 
            else ejecutarCambioEstadoBaseDatos(pedido, 'iniciado', 'Sin Asignar');
        } else if (pedido.estado === 'iniciado') {
            ejecutarCambioEstadoBaseDatos(pedido, 'finalizado', pedido.operario);
        }
    };

    const confirmarInicioConOperario = (nombreOperario) => {
        if (!pedidoParaIniciar) return;
        ejecutarCambioEstadoBaseDatos(pedidoParaIniciar, 'iniciado', nombreOperario);
        setPedidoParaIniciar(null); 
    };

    const marcarComoEntregado = async (pedidoId, evento) => {
        evento.stopPropagation();
        const esModoOscuro = document.documentElement.classList.contains('dark');
        const pedido = pedidos.find(p => p.id === pedidoId);
        const saldoRestante = pedido.resumenPedido?.restante || 0;

        if (saldoRestante > 0) {
            const saldoConRecargo = Math.ceil(saldoRestante * 1.15);
            const confirmacionPago = await Swal.fire({
                title: 'Cobro de Saldo Restante',
                text: `El cliente debe abonar un saldo. ¿Cómo paga?`,
                icon: 'info', showDenyButton: true, showCancelButton: true,
                confirmButtonText: `Efectivo ($${saldoRestante.toLocaleString('es-AR')})`,
                denyButtonText: `Digital ($${saldoConRecargo.toLocaleString('es-AR')})`,
                cancelButtonText: 'Cancelar',
                background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937',
                customClass: { popup: 'rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700', confirmButton: 'bg-green-600 text-white font-bold py-2 px-4 rounded-xl m-1', denyButton: 'bg-blue-600 text-white font-bold py-2 px-4 rounded-xl m-1', cancelButton: 'bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-xl m-1'}
            });

            if (confirmacionPago.isDismissed || (!confirmacionPago.isConfirmed && !confirmacionPago.isDenied)) return;

            const montoFinalCobrado = confirmacionPago.isConfirmed ? saldoRestante : saldoConRecargo;
            const metodoFinal = confirmacionPago.isConfirmed ? 'efectivo' : 'digital';

            await clienteSupabase.from('ordenesProduccion').insert([{
                fechaCreacion: new Date().toISOString(), metodoPago: metodoFinal, totalCobrado: montoFinalCobrado,
                resumenPedido: { notaExtra: `SALDO CANCELADO - Pedido #${pedido.codigoCliente}` }, montoLibreria: 0
            }]);
        }

        try {
            await clienteSupabase.from('pedidosTaller').update({ estado: 'entregado' }).eq('id', pedidoId);
            setPedidos(actuales => actuales.map(p => p.id === pedidoId ? { ...p, estado: 'entregado' } : p));
            Swal.fire({ icon: 'success', title: 'Entregado', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937'});
        } catch (error) { console.error(error); }
    };

    const eliminarPedido = async (pedidoId, evento) => {
        evento.stopPropagation();
        const confirmacion = await Swal.fire({
            title: '¿Eliminar pedido?', text: "Esta acción lo borrará del historial.", icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700', confirmButton: 'bg-red-500 text-white font-bold py-2 px-4 rounded-xl mx-2', cancelButton: 'bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-xl mx-2'}
        });
        if(confirmacion.isConfirmed) {
            try {
                await clienteSupabase.from('pedidosTaller').delete().eq('id', pedidoId);
                setPedidos(actuales => actuales.filter(p => p.id !== pedidoId));
            } catch (error) { console.error(error); }
        }
    };

    const actualizarFechaPedido = async (pedidoId, nuevaFechaISO) => {
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (!pedido || pedido.fechaEntrega === nuevaFechaISO) return;
        setPedidos(actuales => actuales.map(p => p.id === pedidoId ? { ...p, fechaEntrega: nuevaFechaISO } : p));
        try { await clienteSupabase.from('pedidosTaller').update({ fechaEntrega: nuevaFechaISO }).eq('id', pedidoId); } 
        catch (error) { obtenerDatosIniciales(); }
    };

    const obtenerEtiquetaUI = (pedido) => {
        const txt = pedido.resumenPedido?.etiquetaVisual || 'Impresión Std';
        let color = 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300';
        if (txt.includes('Adhesivo') || txt.includes('OPP')) color = 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400';
        else if (txt.includes('Fotográfico')) color = 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/40 dark:text-pink-400';
        else if (txt.includes('Ilustración')) color = 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-400';
        else if (txt.includes('Anillados')) color = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400';
        return <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${color}`}>{txt}</span>;
    };

    // 5. RENDERIZADO
    if (cargando) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-empresa"></div></div>;

    return (
        <div className="max-w-[1400px] mx-auto flex flex-col gap-6 animate-fade-in pb-10">
            
            {/* CABECERA (Podemos extraerla después si querés) */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-5">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col lg:flex-row items-center gap-6 w-full">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight text-center lg:text-left">Gestión de Producción</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center lg:text-left">Planificación diaria e historial</p>
                        </div>
                        <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl w-max border border-gray-200 dark:border-gray-700 mx-auto lg:mx-0">
                            <button onClick={() => setVistaActiva('agenda')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${vistaActiva === 'agenda' ? 'bg-white dark:bg-gray-800 shadow-sm text-empresa' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Agenda</button>
                            <button onClick={() => setVistaActiva('lista')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${vistaActiva === 'lista' ? 'bg-white dark:bg-gray-800 shadow-sm text-empresa' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> Listado General</button>
                        </div>
                        <div className="relative mx-auto lg:mx-0">
                            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-empresa appearance-none pr-8 cursor-pointer">
                                <option value="todos">Todos los Estados</option>
                                <option value="sin_iniciar">⏱️ Pendientes</option>
                                <option value="iniciado">⚙️ En Producción</option>
                                {vistaActiva === 'lista' && <option value="finalizado">✅ Listos p/ Retirar</option>}
                                {vistaActiva === 'lista' && <option value="entregado">📦 Entregados</option>}
                            </select>
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
                        </div>
                    </div>
                    <button onClick={() => setMostrarModalAlta(true)} className="w-full lg:w-auto h-12 px-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl hover:scale-105 transition-transform text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Nuevo Manual</button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full bg-empresa/80"></span><span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Para Hoy</span><span className="text-sm font-black text-gray-800 dark:text-white">{resumenEstadisticas.pendientesHoy}</span></div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                    <div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span><span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">En Máquina</span><span className="text-sm font-black text-gray-800 dark:text-white">{resumenEstadisticas.enProduccion}</span></div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                    <div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400"></span><span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">A Retirar</span><span className="text-sm font-black text-gray-800 dark:text-white">{resumenEstadisticas.listos}</span></div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                    <div className="flex items-center gap-2.5"><span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Señas Acumuladas</span><span className="text-sm font-black text-green-600 dark:text-green-400">${resumenEstadisticas.totalSenaAcumulada.toLocaleString('es-AR')}</span></div>
                </div>
            </div>

            {/* VISTAS MODULARES */}
            {vistaActiva === 'agenda' ? (
                <>
                    <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-2">
                        <button onClick={() => cambiarSemana('ant')} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-600 dark:text-gray-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg></button>
                        <button onClick={volverAHoy} className="text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-empresa transition-colors">Ir a esta semana</button>
                        <button onClick={() => cambiarSemana('sig')} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-600 dark:text-gray-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></button>
                    </div>

                    <VistaAgenda 
                        diasSemana={diasSemana}
                        pedidosAgenda={pedidosAgenda}
                        obtenerFechaLocalISO={obtenerFechaLocalISO}
                        setPedidoSeleccionadoDetalle={setPedidoSeleccionadoDetalle}
                        obtenerEtiquetaUI={obtenerEtiquetaUI}
                        ESTADOS_PEDIDO={ESTADOS_PEDIDO}
                        avanzarEstado={avanzarEstado}
                        actualizarFechaPedido={actualizarFechaPedido}
                    />
                </>
            ) : (
                <VistaLista 
                    pedidosFiltradosLista={pedidosFiltradosLista}
                    busqueda={busqueda}
                    setBusqueda={setBusqueda}
                    setPedidoSeleccionadoDetalle={setPedidoSeleccionadoDetalle}
                    ESTADOS_PEDIDO={ESTADOS_PEDIDO}
                    avanzarEstado={avanzarEstado}
                    marcarComoEntregado={marcarComoEntregado}
                    eliminarPedido={eliminarPedido}
                />
            )}

            {/* RENDERIZADO DE MODALES */}
            {mostrarModalAlta && (
                <ModalAltaManual 
                    cerrar={() => setMostrarModalAlta(false)} 
                    onSuccess={obtenerDatosIniciales} 
                />
            )}

            {pedidoParaIniciar && (
                <ModalSeleccionOperario 
                    pedido={pedidoParaIniciar} 
                    operarios={operarios} 
                    onConfirmar={confirmarInicioConOperario} 
                    onCancelar={() => setPedidoParaIniciar(null)} 
                />
            )}

            {pedidoSeleccionadoDetalle && (
                <ModalDetallePedido 
                    pedido={pedidoSeleccionadoDetalle} 
                    cerrar={() => setPedidoSeleccionadoDetalle(null)} 
                />
            )}
        </div>
    );
};