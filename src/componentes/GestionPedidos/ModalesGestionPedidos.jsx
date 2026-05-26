import { useState } from 'react';
import { clienteSupabase } from '/mucura/src/servicios/clienteSupabase';
import Swal from 'sweetalert2';
import { SIN_DOBLE_FAZ } from '../CalculadoraCotizaciones';

const NOMBRES_SERVICIOS = {
    a4Color: "A4 Color", a4BlancoYNegro: "A4 B/N", a4ObraColor: "A4 Obra", a3ObraColor: "A3 Obra",
    a4Cartulina: "A4 Cartulina", a4Fotografico120: "A4 Foto 120g", a4Fotografico200: "A4 Foto 200g",
    a4Fotografico250: "A4 Foto 250g", a4FotoAdhesivo135: "A4 Foto Adhes.", sa3OppAdhesivo: "S.A3 OPP",
    a4OppAdhesivo: "A4 OPP", sa3Ilustracion115: "S.A3 Ilust. 115g", a4Ilustracion115: "A4 Ilust. 115g",
    sa3Ilustracion200: "S.A3 Ilust. 200g", a4Ilustracion200: "A4 Ilust. 200g", sa3Ilustracion300: "S.A3 Ilust. 300g",
    a4Ilustracion300: "A4 Ilust. 300g", sa3IlustracionAdhesivo: "S.A3 Ilust. Adhes.", a4IlustracionAdhesivo: "A4 Ilust. Adhes."
};

const OPCIONES_ETIQUETAS = [
    { id: 'Impresión Std', label: '🖨️ Solo Impresión' },
    { id: 'Adhesivo / OPP', label: '🏷️ Adhesivo / OPP' },
    { id: 'Fotográfico', label: '📸 Fotográfico' },
    { id: 'Ilustración', label: '🎨 Ilustración' },
    { id: 'Anillados', label: '📚 Anillados' },
    { id: 'Varios', label: '📦 Varios / Otros' }
];

const GRADIENTES_AVATARES = [
    'from-pink-500 to-rose-600', 'from-blue-500 to-cyan-600', 'from-purple-500 to-indigo-600',
    'from-amber-400 to-orange-600', 'from-emerald-400 to-teal-600', 'from-red-500 to-red-700'
];

const obtenerFechaLocalISO = (diasAdicionales = 0) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + diasAdicionales);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};

// ==========================================
// 1. MODAL ALTA MANUAL
// ==========================================
export const ModalAltaManual = ({ cerrar, onSuccess }) => {
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [nuevoDetalle, setNuevoDetalle] = useState('');
    const [nuevaFecha, setNuevaFecha] = useState(obtenerFechaLocalISO());
    const [nuevoTotal, setNuevoTotal] = useState('');
    const [nuevaSena, setNuevaSena] = useState('');
    const [nuevaEtiqueta, setNuevaEtiqueta] = useState('Impresión Std');
    const [cargando, setCargando] = useState(false);

    const totalCalculadoManual = parseInt(nuevoTotal) || 0;
    const senaCalculadaManual = parseInt(nuevaSena) || 0;
    const saldoRestanteManual = totalCalculadoManual - senaCalculadaManual;

    const crearPedido = async (evento) => {
        evento.preventDefault();
        const esModoOscuro = document.documentElement.classList.contains('dark');
        
        if (nuevoTelefono.length < 4) return;
        if (senaCalculadaManual > totalCalculadoManual) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'La seña no puede ser mayor al total.', background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937' });
            return;
        }
        
        setCargando(true);
        const codigoCliente = nuevoTelefono.slice(-4);

        try {
            if (senaCalculadaManual > 0) {
                await clienteSupabase.from('ordenesProduccion').insert([{
                    fechaCreacion: new Date().toISOString(), metodoPago: 'efectivo', totalCobrado: senaCalculadaManual,
                    resumenPedido: { notaExtra: `SEÑA PEDIDO MANUAL #${codigoCliente}`, archivosOriginales: [] }, montoLibreria: 0
                }]);
            }

            const { error } = await clienteSupabase.from('pedidosTaller').insert([{
                nombreCliente: nuevoNombre || 'Cliente S/N', telefono: nuevoTelefono, codigoCliente, 
                detalle: nuevoDetalle, fechaEntrega: nuevaFecha, estado: 'sin_iniciar', fechaCreacion: new Date().toISOString(),
                resumenPedido: { totalEfectivo: totalCalculadoManual, sena: senaCalculadaManual, restante: saldoRestanteManual, etiquetaVisual: nuevaEtiqueta } 
            }]);
            
            if (error) throw error;
            
            Swal.fire({ icon: 'success', title: `Agendado`, text: `Orden #${codigoCliente} programada.`, toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937'});
            onSuccess(); 
            cerrar(); 
        } catch (error) {
            console.error(error);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-lg flex flex-col relative animate-slide-up overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2 mb-2">Agendar Producción Manual</h3>
                        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                            <div><p className="text-[9px] text-gray-400 uppercase font-bold">Total Ingresado</p><p className="text-sm font-black text-gray-800 dark:text-white">${totalCalculadoManual.toLocaleString('es-AR')}</p></div>
                            <div className="h-6 w-px bg-gray-200 dark:bg-gray-600"></div>
                            <div><p className="text-[9px] text-gray-400 uppercase font-bold">Saldo Restante</p><p className={`text-sm font-black ${saldoRestanteManual > 0 ? 'text-red-500' : 'text-green-500'}`}>${saldoRestanteManual.toLocaleString('es-AR')}</p></div>
                        </div>
                    </div>
                    <button onClick={cerrar} className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-red-500 rounded-full transition-colors">
                        <svg className="w-4 h-4 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={crearPedido} className="p-6 flex flex-col gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Tipo de Pedido</label>
                        <div className="flex flex-wrap gap-2">
                            {OPCIONES_ETIQUETAS.map(tag => (
                                <button key={tag.id} type="button" onClick={() => setNuevaEtiqueta(tag.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${nuevaEtiqueta === tag.id ? 'bg-empresa/10 border-empresa text-empresa' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'}`}>{tag.label}</button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">WhatsApp *</label><input type="text" required className="w-full h-11 px-4 bg-gray-50 dark:bg-gray-900 border border-empresa/30 rounded-xl font-black text-gray-800 dark:text-white outline-none focus:border-empresa transition-colors" value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} placeholder="Ej: 2615555555" /></div>
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nombre (Opcional)</label><input type="text" className="w-full h-11 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-800 dark:text-white outline-none focus:border-empresa transition-colors" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej: Juan" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Costo Total ($)</label><input type="number" className="w-full h-11 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl font-black text-gray-800 dark:text-white outline-none focus:border-empresa" value={nuevoTotal} onChange={(e) => setNuevoTotal(e.target.value)} placeholder="Ej: 5000" min="0" /></div>
                        <div className="col-span-1"><label className="text-[10px] font-bold text-green-500 uppercase tracking-widest block mb-1">Seña ($)</label><input type="number" className="w-full h-11 px-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-xl font-black text-gray-800 dark:text-white outline-none focus:border-green-400" value={nuevaSena} onChange={(e) => setNuevaSena(e.target.value)} placeholder="Ej: 1500" min="0" max={totalCalculadoManual > 0 ? totalCalculadoManual : undefined} /></div>
                        <div className="col-span-1"><label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Para el Día *</label><input type="date" required className="w-full h-11 px-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-400 cursor-pointer" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} /></div>
                    </div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Detalle del Trabajo *</label><textarea required rows="2" className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-800 dark:text-white outline-none focus:border-empresa resize-none" value={nuevoDetalle} onChange={(e) => setNuevoDetalle(e.target.value)} placeholder="Ej: Imprimir 3 PDF..."></textarea></div>
                    <button type="submit" disabled={cargando} className="w-full h-12 mt-1 bg-empresa text-white font-black rounded-2xl hover:bg-pink-600 transition-colors text-sm uppercase tracking-widest shadow-xl flex justify-center items-center">
                        {cargando ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Confirmar y Agendar"}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ==========================================
// 2. MODAL SELECCIÓN OPERARIO (REFACCIÓN LIGHT)
// ==========================================

// NUEVA PALETA: Sofisticada, monocromática y ligera
// Usamos tonos que pegan con diseños claros u oscuros sin estridencias.
const PALETA_AVATARES_LIGERA = [
    { bg: 'bg-blue-100 dark:bg-blue-900/60', text: 'text-blue-800 dark:text-blue-200' },
    { bg: 'bg-gray-100 dark:bg-gray-700/60', text: 'text-gray-800 dark:text-gray-200' },
    { bg: 'bg-cyan-100 dark:bg-cyan-900/60', text: 'text-cyan-800 dark:text-cyan-200' },
    { bg: 'bg-slate-200 dark:bg-slate-700/80', text: 'text-slate-900 dark:text-slate-100' },
    { bg: 'bg-indigo-100 dark:bg-indigo-900/60', text: 'text-indigo-800 dark:text-indigo-200' },
];

export const ModalSeleccionOperario = ({ pedido, operarios, onConfirmar, onCancelar }) => {
    // Si no hay operarios, no mostramos nada
    if (!operarios || operarios.length === 0) return null;

    return (
        // --- CAMBIO DE FONDO: De bg-black/90 a transparente con blur ---
        // Usamos una capa mínima de color (bg-white/5 o bg-black/10) para el contraste.
        <div className="fixed inset-0 z-[300] bg-white/5 dark:bg-black/10 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in">
            
            {/* Contenedor principal con bordes sutiles */}
            <div className="bg-white/80 dark:bg-gray-800/80 p-10 md:p-16 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-700 text-center w-full max-w-4xl relative animate-slide-up">
                
                {/* Botón sutil para cerrar */}
                <button 
                    onClick={onCancelar} 
                    className="absolute top-6 right-6 p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-red-500 rounded-full transition-colors group"
                    title="Cancelar"
                >
                    <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {/* Título adaptable al fondo claro */}
                <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                    ¿Quién toma este trabajo?
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs mb-12">
                    Orden #{pedido.codigoCliente} • Selección de Operario
                </p>

                {/* Grilla de Perfiles */}
                <div className="flex flex-wrap justify-center gap-6 md:gap-10">
                    {operarios.map((op, index) => {
                        // Asignamos estilo monocromático sutil
                        const estilo = PALETA_AVATARES_LIGERA[index % PALETA_AVATARES_LIGERA.length];
                        
                        return (
                            <div 
                                key={op.id}
                                onClick={() => onConfirmar(op.nombre)}
                                className="flex flex-col items-center gap-4 group cursor-pointer"
                            >
                                {/* --- CAMBIO DE AVATAR: De gradiente intenso a color sólido sutil --- */}
                                <div className={`w-28 h-28 md:w-32 md:h-32 rounded-3xl ${estilo.bg} flex items-center justify-center shadow-md group-hover:scale-105 group-hover:shadow-xl group-hover:ring-4 ring-empresa/40 transition-all duration-300`}>
                                    <span className={`text-5xl md:text-6xl font-black ${estilo.text} uppercase shadow-sm`}>
                                        {op.nombre.charAt(0)}
                                    </span>
                                </div>
                                <span className="text-sm md:text-base font-black text-gray-700 dark:text-gray-300 group-hover:text-empresa transition-colors uppercase tracking-wider">
                                    {op.nombre}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 3. MODAL DETALLES PROFUNDOS
// ==========================================
export const ModalDetallePedido = ({ pedido, cerrar }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden w-full max-w-lg flex flex-col relative animate-slide-up">
                <button onClick={cerrar} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-red-500 rounded-full transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="p-8 md:p-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-3xl bg-empresa/10 flex items-center justify-center text-empresa text-3xl font-black">#{pedido.codigoCliente}</div>
                        <div>
                            <h3 className="text-xl font-black text-gray-800 dark:text-white leading-tight">{pedido.nombreCliente}</h3>
                            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-0.5">Wa: {pedido.telefono}</p>
                        </div>
                    </div>

                    {pedido.resumenPedido?.totalEfectivo !== undefined && (
                        <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-900/30 mb-4">
                            <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total</p><p className="text-sm font-black text-gray-800 dark:text-gray-200">${pedido.resumenPedido.totalEfectivo.toLocaleString('es-AR')}</p></div>
                            <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Seña</p><p className="text-sm font-black text-gray-800 dark:text-gray-200">${pedido.resumenPedido.sena.toLocaleString('es-AR')}</p></div>
                            <div className="text-right"><p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Falta</p><p className="text-lg font-black text-red-500">${pedido.resumenPedido.restante.toLocaleString('es-AR')}</p></div>
                        </div>
                    )}

                    {pedido.operario && (
                        <div className="mb-4 text-sm font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            Operario Asignado: {pedido.operario}
                        </div>
                    )}

                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                        {pedido.resumenPedido?.archivosOriginales && pedido.resumenPedido.archivosOriginales.length > 0 ? (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Breakdown de Producción</p>
                                {pedido.resumenPedido.archivosOriginales.map((archivo, idx) => {
                                    const nombreBase = NOMBRES_SERVICIOS[archivo.tipoServicio] || archivo.tipoServicio;
                                    const noAceptaDobleFaz = SIN_DOBLE_FAZ.includes(archivo.tipoServicio);
                                    return (
                                        <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-gray-800 dark:text-gray-100 font-black text-lg">{archivo.paginas || 0} págs <span className="text-empresa mx-1">x</span> {archivo.copias || 1} Juegos</span>
                                                <span className="text-xs text-gray-500 font-bold uppercase tracking-tight">{nombreBase} {!noAceptaDobleFaz && (archivo.esDobleFaz ? ' • DOBLE' : ' • SIMPLE')}</span>
                                            </div>
                                            {archivo.anillado && <div className="bg-blue-500 text-white p-2 rounded-2xl shadow-md"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>}
                                        </div>
                                    )
                                })}
                                <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Notas extra:</p>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{pedido.detalle}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 text-center">
                                <p className="text-[10px] text-gray-400 uppercase font-black mb-2">Detalle de Producción (Manual):</p>
                                <p className="text-gray-800 dark:text-white font-medium text-lg">{pedido.detalle}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};