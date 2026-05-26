import { useState, useEffect, useMemo } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';
import Swal from 'sweetalert2';
import { SIN_DOBLE_FAZ } from './CalculadoraCotizaciones';

const NOMBRES_SERVICIOS = {
    a4Color: "A4 Color", a4BlancoYNegro: "A4 B/N", a4ObraColor: "A4 Obra", a3ObraColor: "A3 Obra",
    a4Cartulina: "A4 Cartulina", a4Fotografico120: "A4 Foto 120g", a4Fotografico200: "A4 Foto 200g",
    a4Fotografico250: "A4 Foto 250g", a4FotoAdhesivo135: "A4 Foto Adhes.", sa3OppAdhesivo: "S.A3 OPP",
    a4OppAdhesivo: "A4 OPP", sa3Ilustracion115: "S.A3 Ilust. 115g", a4Ilustracion115: "A4 Ilust. 115g",
    sa3Ilustracion200: "S.A3 Ilust. 200g", a4Ilustracion200: "A4 Ilust. 200g", sa3Ilustracion300: "S.A3 Ilust. 300g",
    a4Ilustracion300: "A4 Ilust. 300g", sa3IlustracionAdhesivo: "S.A3 Ilust. Adhes.", a4IlustracionAdhesivo: "A4 Ilust. Adhes."
};

const ESTADOS_PEDIDO = {
    'sin_iniciar': { titulo: 'Pendiente', color: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    'iniciado': { titulo: 'En Producción', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-400', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
    'finalizado': { titulo: 'Listo p/ Retirar', color: 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-400', icon: 'M5 13l4 4L19 7' },
    'entregado': { titulo: 'Entregado', color: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500', icon: 'M5 13l4 4L19 7' }
};

const OPCIONES_ETIQUETAS = [
    { id: 'Impresión Std', label: '🖨️ Solo Impresión' },
    { id: 'Adhesivo / OPP', label: '🏷️ Adhesivo / OPP' },
    { id: 'Fotográfico', label: '📸 Fotográfico' },
    { id: 'Ilustración', label: '🎨 Ilustración' },
    { id: 'Anillados', label: '📚 Anillados' },
    { id: 'Varios', label: '📦 Varios / Otros' }
];

// Paleta de colores para los avatares estilo Netflix
const GRADIENTES_AVATARES = [
    'from-pink-500 to-rose-600',
    'from-blue-500 to-cyan-600',
    'from-purple-500 to-indigo-600',
    'from-amber-400 to-orange-600',
    'from-emerald-400 to-teal-600',
    'from-red-500 to-red-700'
];

const obtenerFechaLocalISO = (diasAdicionales = 0, fechaBase = new Date()) => {
    const fecha = new Date(fechaBase);
    fecha.setDate(fecha.getDate() + diasAdicionales);
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
};

export const GestionPedidos = () => {
    const [pedidos, setPedidos] = useState([]);
    const [operarios, setOperarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    
    const [vistaActiva, setVistaActiva] = useState('agenda'); 
    const [fechaReferencia, setFechaReferencia] = useState(new Date()); 
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos'); 
    const [columnaDestino, setColumnaDestino] = useState(null);
    const [pedidoSeleccionadoDetalle, setPedidoSeleccionadoDetalle] = useState(null);
    
    // --- ESTADO PARA EL MODAL ESTILO NETFLIX ---
    const [pedidoParaIniciar, setPedidoParaIniciar] = useState(null);

    const [mostrarModalAlta, setMostrarModalAlta] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [nuevoDetalle, setNuevoDetalle] = useState('');
    const [nuevaFecha, setNuevaFecha] = useState(obtenerFechaLocalISO());
    const [nuevoTotal, setNuevoTotal] = useState('');
    const [nuevaSena, setNuevaSena] = useState('');
    const [nuevaEtiqueta, setNuevaEtiqueta] = useState('Impresión Std');

    const totalCalculadoManual = parseInt(nuevoTotal) || 0;
    const senaCalculadaManual = parseInt(nuevaSena) || 0;
    const saldoRestanteManual = totalCalculadoManual - senaCalculadaManual;

    useEffect(() => {
        obtenerDatosIniciales();
    }, []);

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
        } catch (error) {
            console.error("error al cargar datos:", error);
        } finally {
            setCargando(false);
        }
    };

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

    const enviarMensajeWhatsApp = async (telefono, codigoCliente, nuevoEstado) => {
        if (!telefono) return;
        const numeroFinal = telefono.replace(/\D/g, ''); 
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
            Swal.fire({ icon: 'warning', title: 'WhatsApp Web', text: 'Se abrirá WhatsApp Web para el aviso.', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937'});
            setTimeout(() => { window.open(`https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`, '_blank'); }, 1500);
        }
    };

    const crearPedido = async (evento) => {
        evento.preventDefault();
        const esModoOscuro = document.documentElement.classList.contains('dark');
        if (nuevoTelefono.length < 4) return;
        if (senaCalculadaManual > totalCalculadoManual) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'La seña no puede ser mayor al total.', background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937' });
            return;
        }
        
        const codigoCliente = nuevoTelefono.slice(-4);

        try {
            if (senaCalculadaManual > 0) {
                const ordenSena = {
                    fechaCreacion: new Date().toISOString(), 
                    metodoPago: 'efectivo', 
                    totalCobrado: senaCalculadaManual,
                    resumenPedido: { notaExtra: `SEÑA PEDIDO MANUAL #${codigoCliente}`, archivosOriginales: [] }, 
                    montoLibreria: 0
                };
                await clienteSupabase.from('ordenesProduccion').insert([ordenSena]);
            }

            const { error } = await clienteSupabase.from('pedidosTaller').insert([{
                nombreCliente: nuevoNombre || 'Cliente S/N',
                telefono: nuevoTelefono,
                codigoCliente, 
                detalle: nuevoDetalle,
                fechaEntrega: nuevaFecha,
                estado: 'sin_iniciar',
                fechaCreacion: new Date().toISOString(),
                resumenPedido: { 
                    totalEfectivo: totalCalculadoManual,
                    sena: senaCalculadaManual,
                    restante: saldoRestanteManual,
                    etiquetaVisual: nuevaEtiqueta
                } 
            }]);
            
            if (error) throw error;
            
            setNuevoNombre(''); setNuevoTelefono(''); setNuevoDetalle(''); 
            setNuevaFecha(obtenerFechaLocalISO()); setNuevoTotal(''); setNuevaSena(''); setNuevaEtiqueta('Impresión Std');
            setMostrarModalAlta(false);
            obtenerDatosIniciales();
            
            Swal.fire({ icon: 'success', title: `Agendado`, text: `Orden #${codigoCliente} programada.`, toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937'});
        } catch (error) {
            console.error(error);
        }
    };

    // --- LÓGICA REFACTORIZADA DE CAMBIO DE ESTADO ---
    const ejecutarCambioEstadoBaseDatos = async (pedido, nuevoEstado, nombreOperario) => {
        setPedidos(actuales => actuales.map(p => p.id === pedido.id ? { ...p, estado: nuevoEstado, operario: nombreOperario } : p));
        try {
            await clienteSupabase.from('pedidosTaller').update({ estado: nuevoEstado, operario: nombreOperario }).eq('id', pedido.id);
            enviarMensajeWhatsApp(pedido.telefono, pedido.codigoCliente, nuevoEstado);
        } catch (error) {
            obtenerDatosIniciales(); 
        }
    };

    const avanzarEstado = async (pedido, eventoStr = null) => {
        if(eventoStr) eventoStr.stopPropagation();

        if (pedido.estado === 'sin_iniciar') {
            if (operarios.length > 0) {
                // En vez de abrir un select feo, abrimos nuestro modal estilo Netflix
                setPedidoParaIniciar(pedido); 
            } else {
                // Si no hay operarios cargados en configuración, lo iniciamos directo
                ejecutarCambioEstadoBaseDatos(pedido, 'iniciado', 'Sin Asignar');
            }
        } else if (pedido.estado === 'iniciado') {
            // Si ya estaba iniciado, simplemente lo finalizamos manteniendo el operario
            ejecutarCambioEstadoBaseDatos(pedido, 'finalizado', pedido.operario);
        }
    };

    // Función que se dispara cuando hacés clic en un Avatar de Netflix
    const confirmarInicioConOperario = (nombreOperario) => {
        if (!pedidoParaIniciar) return;
        ejecutarCambioEstadoBaseDatos(pedidoParaIniciar, 'iniciado', nombreOperario);
        setPedidoParaIniciar(null); // Cerramos el modal
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
                icon: 'info',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: `Efectivo ($${saldoRestante.toLocaleString('es-AR')})`,
                denyButtonText: `Digital ($${saldoConRecargo.toLocaleString('es-AR')})`,
                cancelButtonText: 'Cancelar Entrega',
                background: esModoOscuro ? '#1f2937' : '#ffffff',
                color: esModoOscuro ? '#ffffff' : '#1f2937',
                customClass: {
                    popup: 'rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700',
                    confirmButton: 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl m-1',
                    denyButton: 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl m-1',
                    cancelButton: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-xl m-1'
                }
            });

            if (confirmacionPago.isDismissed || (!confirmacionPago.isConfirmed && !confirmacionPago.isDenied)) return;

            const montoFinalCobrado = confirmacionPago.isConfirmed ? saldoRestante : saldoConRecargo;
            const metodoFinal = confirmacionPago.isConfirmed ? 'efectivo' : 'digital';

            await clienteSupabase.from('ordenesProduccion').insert([{
                fechaCreacion: new Date().toISOString(),
                metodoPago: metodoFinal,
                totalCobrado: montoFinalCobrado,
                resumenPedido: { notaExtra: `SALDO CANCELADO - Pedido #${pedido.codigoCliente}` },
                montoLibreria: 0
            }]);
        }

        try {
            await clienteSupabase.from('pedidosTaller').update({ estado: 'entregado' }).eq('id', pedidoId);
            setPedidos(actuales => actuales.map(p => p.id === pedidoId ? { ...p, estado: 'entregado' } : p));
            Swal.fire({ icon: 'success', title: 'Entregado', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937'});
        } catch (error) { 
            console.error(error); 
        }
    };

    const eliminarPedido = async (pedidoId, evento) => {
        evento.stopPropagation();
        const esModoOscuro = document.documentElement.classList.contains('dark');
        
        const confirmacion = await Swal.fire({
            title: '¿Eliminar pedido?',
            text: "Esta acción lo borrará del historial.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            background: esModoOscuro ? '#1f2937' : '#ffffff',
            color: esModoOscuro ? '#ffffff' : '#1f2937',
            customClass: {
                popup: 'rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700',
                confirmButton: 'bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl mx-2',
                cancelButton: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-xl mx-2'
            }
        });

        if(confirmacion.isConfirmed) {
            try {
                await clienteSupabase.from('pedidosTaller').delete().eq('id', pedidoId);
                setPedidos(actuales => actuales.filter(p => p.id !== pedidoId));
                Swal.fire({ icon: 'success', title: 'Eliminado', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000, background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937'});
            } catch (error) {
                console.error(error);
            }
        }
    };

    const manejarDragStart = (evento, pedidoId) => { evento.dataTransfer.setData('pedidoId', pedidoId); evento.target.style.opacity = '0.5'; };
    const manejarDragEnd = (evento) => { evento.target.style.opacity = '1'; setColumnaDestino(null); };
    const manejarDragOver = (evento, fechaISO) => { evento.preventDefault(); if (columnaDestino !== fechaISO) setColumnaDestino(fechaISO); };
    const manejarDrop = async (evento, nuevaFechaISO) => {
        evento.preventDefault();
        setColumnaDestino(null);
        const pedidoId = evento.dataTransfer.getData('pedidoId');
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (!pedido || pedido.fechaEntrega === nuevaFechaISO) return;

        setPedidos(actuales => actuales.map(p => p.id === pedidoId ? { ...p, fechaEntrega: nuevaFechaISO } : p));
        try { await clienteSupabase.from('pedidosTaller').update({ fechaEntrega: nuevaFechaISO }).eq('id', pedidoId); } 
        catch (error) { obtenerDatosIniciales(); }
    };

    const obtenerEtiquetaUI = (pedido) => {
        const etiquetaGuardada = pedido.resumenPedido?.etiquetaVisual;
        let color = 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300';
        let texto = etiquetaGuardada || 'Impresión Std';

        if (texto.includes('Adhesivo') || texto.includes('OPP')) color = 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400';
        else if (texto.includes('Fotográfico')) color = 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/40 dark:text-pink-400';
        else if (texto.includes('Ilustración')) color = 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-400';
        else if (texto.includes('Anillados')) color = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400';

        return <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${color}`}>{texto}</span>;
    };

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

    if (cargando) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-empresa"></div></div>;

    return (
        <div className="max-w-[1400px] mx-auto flex flex-col gap-6 animate-fade-in pb-10">
            
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-5">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col lg:flex-row items-center gap-6 w-full">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight text-center lg:text-left">Gestión de Pedidos</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center lg:text-left">Planificación diaria e historial</p>
                        </div>
                        
                        <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl w-max border border-gray-200 dark:border-gray-700 mx-auto lg:mx-0">
                            <button onClick={() => setVistaActiva('agenda')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${vistaActiva === 'agenda' ? 'bg-white dark:bg-gray-800 shadow-sm text-empresa' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Agenda
                            </button>
                            <button onClick={() => setVistaActiva('lista')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${vistaActiva === 'lista' ? 'bg-white dark:bg-gray-800 shadow-sm text-empresa' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> Listado General
                            </button>
                        </div>

                        <div className="relative mx-auto lg:mx-0">
                            <select 
                                value={filtroEstado} 
                                onChange={(e) => setFiltroEstado(e.target.value)}
                                className="h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-empresa appearance-none pr-8 cursor-pointer"
                            >
                                <option value="todos">Todos los Estados</option>
                                <option value="sin_iniciar">⏱️ Pendientes</option>
                                <option value="iniciado">⚙️ En Producción</option>
                                {vistaActiva === 'lista' && <option value="finalizado">✅ Listos p/ Retirar</option>}
                                {vistaActiva === 'lista' && <option value="entregado">📦 Entregados</option>}
                            </select>
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setMostrarModalAlta(true)} 
                        className="w-full lg:w-auto h-12 px-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl hover:scale-105 transition-transform text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 flex-shrink-0"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nuevo Manual
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-empresa/80"></span>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Para Hoy</span>
                        <span className="text-sm font-black text-gray-800 dark:text-white">{resumenEstadisticas.pendientesHoy}</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                    <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">En Máquina</span>
                        <span className="text-sm font-black text-gray-800 dark:text-white">{resumenEstadisticas.enProduccion}</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                    <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">A Retirar</span>
                        <span className="text-sm font-black text-gray-800 dark:text-white">{resumenEstadisticas.listos}</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                    <div className="flex items-center gap-2.5">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Señas Acumuladas</span>
                        <span className="text-sm font-black text-green-600 dark:text-green-400">${resumenEstadisticas.totalSenaAcumulada.toLocaleString('es-AR')}</span>
                    </div>
                </div>
            </div>

            {vistaActiva === 'agenda' ? (
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <button onClick={() => cambiarSemana('ant')} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-600 dark:text-gray-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={volverAHoy} className="text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-empresa transition-colors">
                            Ir a esta semana
                        </button>
                        <button onClick={() => cambiarSemana('sig')} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-600 dark:text-gray-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
                        {diasSemana.map(dia => {
                            const pedidosDelDia = pedidosAgenda.filter(p => p.fechaEntrega === dia.fechaISO);
                            const esHoy = dia.fechaISO === obtenerFechaLocalISO(); 
                            const esDestino = columnaDestino === dia.fechaISO;

                            return (
                                <div 
                                    key={dia.fechaISO}
                                    onDragOver={(evento) => manejarDragOver(evento, dia.fechaISO)}
                                    onDragLeave={() => setColumnaDestino(null)}
                                    onDrop={(evento) => manejarDrop(evento, dia.fechaISO)}
                                    className={`flex flex-col min-h-[500px] rounded-3xl border-2 transition-all duration-300 ${esDestino ? 'border-empresa bg-empresa/5 scale-[1.02] shadow-lg' : esHoy ? 'border-empresa/50 bg-white dark:bg-gray-800 shadow-md' : 'border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50'}`}
                                >
                                    <div className={`p-4 text-center border-b ${esHoy ? 'border-empresa/30 bg-empresa/10 rounded-t-3xl' : 'border-gray-100 dark:border-gray-700'}`}>
                                        <p className={`text-xs font-bold uppercase tracking-widest ${esHoy ? 'text-empresa' : 'text-gray-400'}`}>{dia.nombreDia}</p>
                                        <p className={`text-2xl font-black ${esHoy ? 'text-empresa' : 'text-gray-800 dark:text-white'}`}>{dia.numeroDia}</p>
                                        <div className="mt-2 text-[10px] font-bold bg-gray-100 dark:bg-gray-900 text-gray-500 rounded-full w-max mx-auto px-3 py-1">
                                            {pedidosDelDia.length} Trabajos
                                        </div>
                                    </div>

                                    <div className="p-3 flex flex-col gap-3 flex-grow overflow-y-auto hide-scrollbar">
                                        {pedidosDelDia.map(pedido => {
                                            const esIniciado = pedido.estado === 'iniciado';
                                            const bgColorTarjeta = esIniciado ? 'bg-yellow-50/80 dark:bg-yellow-900/20' : 'bg-gray-50 dark:bg-gray-800/60';
                                            const borderColorTarjeta = esIniciado ? 'border-yellow-300 dark:border-yellow-700' : 'border-gray-300 dark:border-gray-600';
                                            
                                            return (
                                                <div 
                                                    key={pedido.id} 
                                                    draggable
                                                    onDragStart={(evento) => manejarDragStart(evento, pedido.id)}
                                                    onDragEnd={manejarDragEnd}
                                                    onDoubleClick={() => setPedidoSeleccionadoDetalle(pedido)}
                                                    className={`${bgColorTarjeta} p-3 rounded-2xl shadow-sm border-2 ${borderColorTarjeta} flex flex-col gap-2 cursor-grab active:cursor-grabbing hover:border-empresa transition-all`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-500 uppercase truncate max-w-[100px]">{pedido.nombreCliente}</p>
                                                            <p className="text-lg font-black text-gray-900 dark:text-white leading-none">#{pedido.codigoCliente}</p>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase flex items-center gap-1 ${ESTADOS_PEDIDO[pedido.estado].color}`}>
                                                            {ESTADOS_PEDIDO[pedido.estado].titulo}
                                                        </span>
                                                    </div>

                                                    <div className="flex gap-1 mt-0.5">
                                                        {obtenerEtiquetaUI(pedido)}
                                                    </div>

                                                    {pedido.operario && pedido.estado !== 'sin_iniciar' && (
                                                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                            <svg className="w-3 h-3 text-yellow-600 dark:text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                            {pedido.operario}
                                                        </p>
                                                    )}

                                                    <div className="flex gap-2 mt-2">
                                                        {pedido.estado === 'sin_iniciar' && (
                                                            <button onClick={(evento) => avanzarEstado(pedido, evento)} className="flex-1 py-1.5 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-[10px] font-black uppercase rounded-lg border border-yellow-200 dark:border-yellow-800 transition-colors shadow-sm">▶ Iniciar</button>
                                                        )}
                                                        {pedido.estado === 'iniciado' && (
                                                            <button onClick={(evento) => avanzarEstado(pedido, evento)} className="flex-1 py-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[10px] font-black uppercase rounded-lg border border-green-200 dark:border-green-800 transition-colors shadow-sm">✔ Terminar</button>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                        <div className="relative w-full max-w-md">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </span>
                            <input 
                                type="text" 
                                placeholder="Buscar por cliente, teléfono, detalle u operario..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-empresa text-gray-800 dark:text-white"
                                value={busqueda}
                                onChange={(evento) => setBusqueda(evento.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs uppercase tracking-widest text-gray-400 font-bold border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                                    <th className="p-4">Entrega</th>
                                    <th className="p-4">Cliente / Orden</th>
                                    <th className="p-4">Detalle</th>
                                    <th className="p-4">Operario</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-center">Acción</th>
                                    <th className="p-4 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {pedidosFiltradosLista.map(pedido => (
                                    <tr key={pedido.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group" onDoubleClick={() => setPedidoSeleccionadoDetalle(pedido)}>
                                        <td className="p-4 text-sm font-bold text-gray-700 dark:text-gray-300">
                                            {new Date(pedido.fechaEntrega).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                            <p className="text-[10px] text-gray-400 font-normal">{new Date(pedido.fechaCreacion).toLocaleDateString('es-AR')}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-xs text-gray-500 font-bold">{pedido.nombreCliente}</p>
                                            <p className="text-sm font-black text-gray-900 dark:text-white">#{pedido.codigoCliente}</p>
                                            <p className="text-[10px] text-gray-400">{pedido.telefono}</p>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{pedido.detalle}</td>
                                        <td className="p-4 text-xs font-bold text-gray-600 dark:text-gray-400">
                                            {pedido.operario || '-'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 w-max ${ESTADOS_PEDIDO[pedido.estado].color}`}>
                                                {ESTADOS_PEDIDO[pedido.estado].titulo}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {pedido.estado === 'sin_iniciar' && <button onClick={(evento) => avanzarEstado(pedido, evento)} className="px-4 py-1.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs font-bold hover:bg-yellow-200 transition">Iniciar</button>}
                                            {pedido.estado === 'iniciado' && <button onClick={(evento) => avanzarEstado(pedido, evento)} className="px-4 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold hover:bg-green-200 transition">Finalizar</button>}
                                            {pedido.estado === 'finalizado' && <button onClick={(evento) => marcarComoEntregado(pedido.id, evento)} className="px-4 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-200 transition">Entregar</button>}
                                            {pedido.estado === 'entregado' && <span className="text-xs font-bold text-gray-400">✔️ Archiv.</span>}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={(evento) => eliminarPedido(pedido.id, evento)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Eliminar registro"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {pedidosFiltradosLista.length === 0 && (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-400 italic">No se encontraron pedidos.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MODAL PARA PEDIDO MANUAL --- */}
            {mostrarModalAlta && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-lg flex flex-col relative animate-slide-up overflow-hidden">
                        
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2 mb-2">Agendar Producción Manual</h3>
                                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                                    <div>
                                        <p className="text-[9px] text-gray-400 uppercase font-bold">Total Ingresado</p>
                                        <p className="text-sm font-black text-gray-800 dark:text-white">${totalCalculadoManual.toLocaleString('es-AR')}</p>
                                    </div>
                                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-600"></div>
                                    <div>
                                        <p className="text-[9px] text-gray-400 uppercase font-bold">Saldo Restante</p>
                                        <p className={`text-sm font-black ${saldoRestanteManual > 0 ? 'text-red-500' : 'text-green-500'}`}>${saldoRestanteManual.toLocaleString('es-AR')}</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setMostrarModalAlta(false)} className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-red-500 rounded-full transition-colors">
                                <svg className="w-4 h-4 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={crearPedido} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Tipo de Pedido</label>
                                <div className="flex flex-wrap gap-2">
                                    {OPCIONES_ETIQUETAS.map(tag => (
                                        <button 
                                            key={tag.id} 
                                            type="button"
                                            onClick={() => setNuevaEtiqueta(tag.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${nuevaEtiqueta === tag.id ? 'bg-empresa/10 border-empresa text-empresa' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'}`}
                                        >
                                            {tag.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">WhatsApp *</label>
                                    <input type="text" required className="w-full h-11 px-4 bg-gray-50 dark:bg-gray-900 border border-empresa/30 rounded-xl font-black text-gray-800 dark:text-white outline-none focus:border-empresa transition-colors" value={nuevoTelefono} onChange={(evento) => setNuevoTelefono(evento.target.value)} placeholder="Ej: 2615555555" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nombre (Opcional)</label>
                                    <input type="text" className="w-full h-11 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-800 dark:text-white outline-none focus:border-empresa transition-colors" value={nuevoNombre} onChange={(evento) => setNuevoNombre(evento.target.value)} placeholder="Ej: Juan" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Costo Total ($)</label>
                                    <input type="number" className="w-full h-11 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl font-black text-gray-800 dark:text-white outline-none focus:border-empresa" value={nuevoTotal} onChange={(evento) => setNuevoTotal(evento.target.value)} placeholder="Ej: 5000" min="0" />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest block mb-1">Seña ($)</label>
                                    <input type="number" className="w-full h-11 px-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-xl font-black text-gray-800 dark:text-white outline-none focus:border-green-400" value={nuevaSena} onChange={(evento) => setNuevaSena(evento.target.value)} placeholder="Ej: 1500" min="0" max={totalCalculadoManual > 0 ? totalCalculadoManual : undefined} />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Para el Día *</label>
                                    <input type="date" required className="w-full h-11 px-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-400 cursor-pointer" value={nuevaFecha} onChange={(evento) => setNuevaFecha(evento.target.value)} />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Detalle del Trabajo *</label>
                                <textarea required rows="2" className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-800 dark:text-white outline-none focus:border-empresa resize-none" value={nuevoDetalle} onChange={(evento) => setNuevoDetalle(evento.target.value)} placeholder="Ej: Imprimir 3 PDF doble faz..."></textarea>
                            </div>

                            <button type="submit" className="w-full h-12 mt-1 bg-empresa text-white font-black rounded-2xl hover:bg-pink-600 transition-colors text-sm uppercase tracking-widest shadow-xl flex justify-center items-center">
                                Confirmar y Agendar
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL ESTILO NETFLIX PARA SELECCIONAR OPERARIO --- */}
            {pedidoParaIniciar && (
                <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="text-center w-full max-w-4xl relative">
                        {/* Botón sutil para cerrar */}
                        <button 
                            onClick={() => setPedidoParaIniciar(null)} 
                            className="absolute -top-12 right-0 text-gray-400 hover:text-white flex items-center gap-2 font-bold uppercase tracking-widest text-xs transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            Cancelar
                        </button>

                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">¿Quién toma este trabajo?</h2>
                        <p className="text-gray-400 font-medium mb-12">Orden #{pedidoParaIniciar.codigoCliente}</p>

                        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
                            {operarios.map((op, index) => {
                                // Asignamos un degradado consistente basado en el índice
                                const gradiente = GRADIENTES_AVATARES[index % GRADIENTES_AVATARES.length];
                                
                                return (
                                    <div 
                                        key={op.id}
                                        onClick={() => confirmarInicioConOperario(op.nombre)}
                                        className="flex flex-col items-center gap-4 group cursor-pointer"
                                    >
                                        <div className={`w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-gradient-to-br ${gradiente} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:ring-4 ring-white/50 transition-all duration-300`}>
                                            <span className="text-4xl md:text-6xl font-black text-white uppercase shadow-sm">
                                                {op.nombre.charAt(0)}
                                            </span>
                                        </div>
                                        <span className="text-lg md:text-xl font-bold text-gray-400 group-hover:text-white transition-colors">
                                            {op.nombre}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETALLES PROFUNDOS (DOBLE CLIC) */}
            {pedidoSeleccionadoDetalle && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden w-full max-w-lg flex flex-col relative animate-slide-up">
                        <button onClick={() => setPedidoSeleccionadoDetalle(null)} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-red-500 rounded-full transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="p-8 md:p-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-3xl bg-empresa/10 flex items-center justify-center text-empresa text-3xl font-black">#{pedidoSeleccionadoDetalle.codigoCliente}</div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-800 dark:text-white leading-tight">{pedidoSeleccionadoDetalle.nombreCliente}</h3>
                                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-0.5">Wa: {pedidoSeleccionadoDetalle.telefono}</p>
                                </div>
                            </div>

                            {pedidoSeleccionadoDetalle.resumenPedido?.totalEfectivo !== undefined && (
                                <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-900/30 mb-4">
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total</p>
                                        <p className="text-sm font-black text-gray-800 dark:text-gray-200">${pedidoSeleccionadoDetalle.resumenPedido.totalEfectivo.toLocaleString('es-AR')}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Seña</p>
                                        <p className="text-sm font-black text-gray-800 dark:text-gray-200">${pedidoSeleccionadoDetalle.resumenPedido.sena.toLocaleString('es-AR')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Falta</p>
                                        <p className="text-lg font-black text-red-500">${pedidoSeleccionadoDetalle.resumenPedido.restante.toLocaleString('es-AR')}</p>
                                    </div>
                                </div>
                            )}

                            {pedidoSeleccionadoDetalle.operario && (
                                <div className="mb-4 text-sm font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    Operario Asignado: {pedidoSeleccionadoDetalle.operario}
                                </div>
                            )}

                            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {pedidoSeleccionadoDetalle.resumenPedido?.archivosOriginales && pedidoSeleccionadoDetalle.resumenPedido.archivosOriginales.length > 0 ? (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Breakdown de Producción</p>
                                        {pedidoSeleccionadoDetalle.resumenPedido.archivosOriginales.map((archivo, idx) => {
                                            const nombreBase = NOMBRES_SERVICIOS[archivo.tipoServicio] || archivo.tipoServicio;
                                            const noAceptaDobleFaz = SIN_DOBLE_FAZ.includes(archivo.tipoServicio);
                                            return (
                                                <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-800 dark:text-gray-100 font-black text-lg">
                                                            {archivo.paginas || 0} págs <span className="text-empresa mx-1">x</span> {archivo.copias || 1} Juegos
                                                        </span>
                                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-tight">
                                                            {nombreBase} {!noAceptaDobleFaz && (archivo.esDobleFaz ? ' • DOBLE' : ' • SIMPLE')}
                                                        </span>
                                                    </div>
                                                    {archivo.anillado && (
                                                        <div className="bg-blue-500 text-white p-2 rounded-2xl shadow-md"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Notas extra:</p>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{pedidoSeleccionadoDetalle.detalle}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 text-center">
                                        <p className="text-[10px] text-gray-400 uppercase font-black mb-2">Detalle de Producción (Manual):</p>
                                        <p className="text-gray-800 dark:text-white font-medium text-lg">{pedidoSeleccionadoDetalle.detalle}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};