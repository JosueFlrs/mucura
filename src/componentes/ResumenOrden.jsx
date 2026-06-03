import { useState } from 'react';
import { SIN_DOBLE_FAZ } from './CalculadoraCotizaciones';
import Swal from 'sweetalert2';

const obtenerFechaLocalISO = () => {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
};

const OPCIONES_ETIQUETAS = [
    { id: 'Impresión Std', label: '🖨️ Solo Impresión' },
    { id: 'Adhesivo / OPP', label: '🏷️ Adhesivo / OPP' },
    { id: 'Fotográfico', label: '📸 Fotográfico' },
    { id: 'Ilustración', label: '🎨 Ilustración' },
    { id: 'Anillados', label: '📚 Anillados' },
    { id: 'Varios', label: '📦 Varios / Otros' }
];

export const ResumenOrden = ({ datosEnPantalla, guardarOrdenEnBaseDeDatos }) => {
    const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState(null);
    const [procesandoCompra, setProcesandoCompra] = useState(false);

    // --- ESTADOS DEL MODAL DE AGENDA ---
    const [mostrarModalAgenda, setMostrarModalAgenda] = useState(false);
    const [agendaNombre, setAgendaNombre] = useState('');
    const [agendaTelefono, setAgendaTelefono] = useState('');
    const [agendaFecha, setAgendaFecha] = useState(obtenerFechaLocalISO());
    const [agendaSena, setAgendaSena] = useState('');
    const [agendaDetalleExtra, setAgendaDetalleExtra] = useState('');
    const [agendaEtiqueta, setAgendaEtiqueta] = useState('Impresión Std');

    // --- NUEVOS ESTADOS PARA PAGO DE SEÑA (FLUJO DIRECTO) ---
    const [tipoSeña, setTipoSeña] = useState('ninguna'); // 'ninguna', 'efectivo', 'digital', 'mixto'
    const [montoSenaEfectivo, setMontoSenaEfectivo] = useState('');
    const [montoSenaDigital, setMontoSenaDigital] = useState('');

    // --- ESTADOS PARA PAGO MIXTO ---
    const [mostrarModalMixto, setMostrarModalMixto] = useState(false);
    const [montoEfectivoMixto, setMontoEfectivoMixto] = useState('');

    const totalBase = datosEnPantalla?.totalSinRedondear || 0;
    const totalDigitalRedondeado = Math.ceil(totalBase / 100) * 100;
    const montoDescuentoEfectivo = totalBase * 0.13;
    const totalEfectivoExacto = totalBase - montoDescuentoEfectivo;
    const totalEfectivoRedondeado = Math.ceil(totalEfectivoExacto / 100) * 100;

    // Cálculo en vivo del saldo restante
    // Cálculo inteligente de la seña sumando lo que ingresan
    const senaCalculada =
        tipoSeña === 'ninguna' ? 0 :
            tipoSeña === 'efectivo' ? (parseInt(montoSenaEfectivo) || 0) :
                tipoSeña === 'digital' ? (parseInt(montoSenaDigital) || 0) :
                    (parseInt(montoSenaEfectivo) || 0) + (parseInt(montoSenaDigital) || 0);
    const saldoRestante = totalEfectivoRedondeado - senaCalculada;

    // Cálculos en vivo para el modal
    const efectivoIngresado = parseInt(montoEfectivoMixto) || 0;
    // Si el efectivo cubre la mitad del precio con descuento, se gana el descuento
    const aplicaDescuento = efectivoIngresado >= (totalEfectivoRedondeado / 2);
    const totalAplicado = aplicaDescuento ? totalEfectivoRedondeado : totalDigitalRedondeado;
    const restanteDigital = Math.max(0, totalAplicado - efectivoIngresado);

    const NOMBRES_SERVICIOS = {
        a4Color: "A4 Color", a4BlancoYNegro: "A4 B/N", a4ObraColor: "A4 Obra", a3ObraColor: "A3 Obra",
        a4Cartulina: "A4 Cartulina", a4Fotografico120: "A4 Foto 120g", a4Fotografico200: "A4 Foto 200g",
        a4Fotografico250: "A4 Foto 250g", a4FotoAdhesivo135: "A4 Foto Adhes. 135g", sa3OppAdhesivo: "S.A3 OPP Adhes.",
        a4OppAdhesivo: "A4 OPP Adhes.", sa3Ilustracion115: "S.A3 Ilust. 115g", a4Ilustracion115: "A4 Ilust. 115g",
        sa3Ilustracion200: "S.A3 Ilust. 200g", a4Ilustracion200: "A4 Ilust. 200g", sa3Ilustracion300: "S.A3 Ilust. 300g",
        a4Ilustracion300: "A4 Ilust. 300g", sa3IlustracionAdhesivo: "S.A3 Ilust. Adhes.", a4IlustracionAdhesivo: "A4 Ilust. Adhes."
    };

    const hayPaginas = datosEnPantalla && Object.keys(datosEnPantalla.resumen.paginas).length > 0;
    const tieneLibreria = datosEnPantalla && datosEnPantalla.montoLibreria > 0;
    const puedeConfirmar = totalBase > 0 && metodoPagoSeleccionado !== null;

    const manejarConfirmacion = () => {
        let totalFinal = metodoPagoSeleccionado === 'efectivo' ? totalEfectivoRedondeado : totalDigitalRedondeado;
        let desgloseMixto = null;

        if (metodoPagoSeleccionado === 'mixto') {
            totalFinal = totalAplicado;
            desgloseMixto = {
                efectivo: efectivoIngresado,
                digital: restanteDigital
            };
        }

        guardarOrdenEnBaseDeDatos(metodoPagoSeleccionado, totalFinal, null, desgloseMixto);
    };

    const abrirModalAgenda = () => {
        if (!datosEnPantalla || totalBase === 0) {
            Swal.fire({ icon: 'warning', title: 'Orden Vacía', text: 'Cotizá el trabajo antes de agendar.' });
            return;
        }
        setMostrarModalAgenda(true);
    };

    const manejarAgendarPedido = async (evento) => {
        evento.preventDefault();

        if (agendaTelefono.length < 4) {
            Swal.fire({ icon: 'warning', title: 'Faltan Datos', text: 'El WhatsApp es obligatorio.' });
            return;
        }
        if (senaCalculada > totalEfectivoRedondeado) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'La seña no puede ser mayor al total del pedido.' });
            return;
        }

        setProcesandoCompra(true);

        // Armamos el desglose exacto si la seña es mixta
        let desgloseSena = null;
        if (tipoSeña === 'mixto' && senaCalculada > 0) {
            desgloseSena = {
                efectivo: parseInt(montoSenaEfectivo) || 0,
                digital: parseInt(montoSenaDigital) || 0
            };
        }

        await guardarOrdenEnBaseDeDatos('efectivo', totalEfectivoRedondeado, {
            nombre: agendaNombre,
            telefono: agendaTelefono,
            fecha: agendaFecha,
            sena: senaCalculada,
            detalleExtra: agendaDetalleExtra,
            etiqueta: agendaEtiqueta,
            metodoPagoSena: tipoSeña === 'ninguna' ? null : tipoSeña,
            desgloseSena: desgloseSena
        });

        setProcesandoCompra(false);
        setMostrarModalAgenda(false);
        setAgendaNombre(''); setAgendaTelefono(''); setAgendaDetalleExtra('');
        setAgendaFecha(obtenerFechaLocalISO()); setAgendaEtiqueta('Impresión Std');
        setMetodoPagoSeleccionado(null);

        // Limpiamos la seña
        setTipoSeña('ninguna'); setMontoSenaEfectivo(''); setMontoSenaDigital('');
    };

    return (
        <div className="w-full lg:w-[340px] xl:w-[400px] flex-shrink-0 sticky bottom-4 lg:top-8 z-40">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col p-6 md:p-8">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-empresa" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Resumen de Orden
                </h3>

                <div className="space-y-3 flex-grow">
                    {datosEnPantalla ? (
                        <>
                            {datosEnPantalla.resumen.cantidadArchivosImpresos > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">PDFs a Imprimir</span>
                                    <span className="text-gray-800 dark:text-white font-black">{datosEnPantalla.resumen.cantidadArchivosImpresos}</span>
                                </div>
                            )}
                            {datosEnPantalla.resumen.cantidadAnillados > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Servicios de Anillado</span>
                                    <span className="text-gray-800 dark:text-white font-black">{datosEnPantalla.resumen.cantidadAnillados}</span>
                                </div>
                            )}

                            {hayPaginas && (
                                <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">Detalle de Páginas</p>
                                    {Object.entries(datosEnPantalla.resumen.paginas).map(([clave, cantidad]) => {
                                        const [tipo, dobleFazStr] = clave.split('-');
                                        const esDobleFaz = dobleFazStr === 'true';
                                        const nombreBase = NOMBRES_SERVICIOS[tipo] || tipo;
                                        const noAceptaDobleFaz = SIN_DOBLE_FAZ.includes(tipo);

                                        return (
                                            <div key={clave} className="flex justify-between items-center text-xs mb-2">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {nombreBase} {!noAceptaDobleFaz && (esDobleFaz ? <span className="text-[10px] text-empresa font-bold ml-1">(Doble)</span> : <span className="text-[10px] text-gray-400 ml-1">(Simple)</span>)}
                                                </span>
                                                <span className="text-gray-800 dark:text-gray-200 font-bold">{cantidad}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {tieneLibreria && (
                                <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400 font-medium">Librería / Extras</span>
                                    <span className="text-gray-800 dark:text-white font-black">${datosEnPantalla.montoLibreria.toLocaleString('es-AR')}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm italic">Esperando datos...</div>
                    )}
                </div>

                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">1. Seleccione Método de Pago</p>

                    <button
                        onClick={() => setMetodoPagoSeleccionado('digital')}
                        className={`w-full text-left p-4 rounded-2xl mb-3 flex justify-between items-center transition-all border-2 ${metodoPagoSeleccionado === 'digital' ? 'border-empresa bg-empresa/5 shadow-md' : 'border-transparent bg-gray-50 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'}`}
                    >
                        <div>
                            <span className={`text-xs font-bold block ${metodoPagoSeleccionado === 'digital' ? 'text-empresa' : 'text-gray-600 dark:text-gray-300'}`}>Transferencia / Débito</span>
                            {totalBase !== totalDigitalRedondeado && <span className="text-[10px] text-gray-400 line-through">Exacto: ${totalBase.toLocaleString('es-AR')}</span>}
                        </div>
                        <span className={`text-2xl font-black ${metodoPagoSeleccionado === 'digital' ? 'text-empresa' : 'text-gray-800 dark:text-white'}`}>${totalBase > 0 ? totalDigitalRedondeado.toLocaleString('es-AR') : '0'}</span>
                    </button>

                    <button
                        onClick={() => setMetodoPagoSeleccionado('efectivo')}
                        className={`w-full text-left p-5 rounded-2xl relative overflow-hidden group transition-all border-2 ${metodoPagoSeleccionado === 'efectivo' ? 'border-green-400 shadow-lg ring-4 ring-green-500/20' : 'border-transparent opacity-90 hover:opacity-100'}`}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 transition-opacity ${metodoPagoSeleccionado === 'efectivo' ? 'opacity-100' : 'opacity-80'}`}></div>
                        <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 transition-transform duration-500">
                            <svg className="w-24 h-24 -mr-6 -mt-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                        </div>
                        <div className="flex justify-between items-start relative z-10 mb-2">
                            <span className="text-[11px] uppercase tracking-widest font-bold text-white opacity-90">Efectivo (-13%)</span>
                            {montoDescuentoEfectivo > 0 && <span className="text-[15px] bg-white/20 text-white px-2 py-1 rounded-lg font-bold backdrop-blur-sm">Ahorro: ${Math.round(montoDescuentoEfectivo).toLocaleString('es-AR')}</span>}
                        </div>
                        <div className="flex justify-between items-end relative z-10 mt-2 text-white">
                            <div className="pb-1">
                                {totalEfectivoExacto !== totalEfectivoRedondeado && <span className="text-[20px] line-through opacity-70 block">${totalEfectivoExacto.toLocaleString('es-AR')}</span>}
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold opacity-80">$</span>
                                <span className="text-5xl lg:text-5xl xl:text-6xl font-black tracking-tighter overflow-hidden text-ellipsis">{totalBase > 0 ? totalEfectivoRedondeado.toLocaleString('es-AR') : '0'}</span>
                            </div>
                        </div>
                    </button>

                    {/* --- NUEVO BOTÓN MIXTO --- */}
                    <button
                        onClick={() => setMostrarModalMixto(true)}
                        className={`w-full mt-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border-2 border-dashed flex justify-center items-center gap-2 ${metodoPagoSeleccionado === 'mixto' ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 shadow-sm' : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-purple-400 hover:text-purple-500'}`}
                    >
                        Ambos (Efec + Transf)
                    </button>

                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button onClick={manejarConfirmacion} disabled={!puedeConfirmar || procesandoCompra} className={`w-full py-4 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2 ${puedeConfirmar ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[1.02]' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`}>
                            {procesandoCompra ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Confirmar Compra"}
                        </button>

                        <button onClick={abrirModalAgenda} disabled={procesandoCompra} className="w-full mt-3 py-3 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-empresa hover:text-empresa bg-transparent flex justify-center items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Agendar Pedido
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL AGENDA CON SALDO EN VIVO Y ETIQUETAS */}
            {mostrarModalAgenda && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-lg flex flex-col relative animate-slide-up overflow-hidden">

                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2 mb-2">Agendar Producción</h3>
                                {/* CAJA CALCULADORA EN VIVO */}
                                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                                    <div>
                                        <p className="text-[9px] text-gray-400 uppercase font-bold">Total Pedido</p>
                                        <p className="text-sm font-black text-gray-800 dark:text-white">${totalEfectivoRedondeado.toLocaleString('es-AR')}</p>
                                    </div>
                                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-600"></div>
                                    <div>
                                        <p className="text-[9px] text-gray-400 uppercase font-bold">Saldo Restante</p>
                                        <p className={`text-sm font-black ${saldoRestante > 0 ? 'text-red-500' : 'text-green-500'}`}>${saldoRestante.toLocaleString('es-AR')}</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setMostrarModalAgenda(false)} className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-red-500 rounded-full transition-colors">
                                <svg className="w-4 h-4 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={manejarAgendarPedido} className="p-6 flex flex-col gap-4">

                            {/* SELECTOR DE ETIQUETAS */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Tipo de Pedido</label>
                                <div className="flex flex-wrap gap-2">
                                    {OPCIONES_ETIQUETAS.map(tag => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => setAgendaEtiqueta(tag.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${agendaEtiqueta === tag.id ? 'bg-empresa/10 border-empresa text-empresa' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'}`}
                                        >
                                            {tag.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">WhatsApp *</label>
                                    <input type="text" required className="w-full h-11 px-4 bg-gray-50 dark:bg-gray-900 border border-empresa/30 rounded-xl font-black text-gray-800 dark:text-white outline-none focus:border-empresa" value={agendaTelefono} onChange={(e) => setAgendaTelefono(e.target.value)} placeholder="Ej: 2615555555" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nombre (Opcional)</label>
                                    <input type="text" className="w-full h-11 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-800 dark:text-white outline-none focus:border-empresa" value={agendaNombre} onChange={(e) => setAgendaNombre(e.target.value)} placeholder="Ej: Juan" />
                                </div>
                            </div>

                            
                            {/* FECHA */}
                            <div>
                                <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Para el Día *</label>
                                <input type="date" required className="w-full h-11 px-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-400 cursor-pointer" value={agendaFecha} onChange={(e) => setAgendaFecha(e.target.value)} />
                            </div>

                            {/* BLOQUE SEÑA INTELIGENTE */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">¿Deja Seña?</label>
                                    <span className="text-xs font-black text-gray-800 dark:text-white">Total Seña: ${senaCalculada.toLocaleString('es-AR')}</span>
                                </div>

                                <div className="flex gap-2 mb-3">
                                    <button type="button" onClick={() => { setTipoSeña('ninguna'); setMontoSenaEfectivo(''); setMontoSenaDigital(''); }} className={`flex-1 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all border ${tipoSeña === 'ninguna' ? 'bg-gray-200 border-gray-400 text-gray-700 dark:bg-gray-700 dark:border-gray-500 dark:text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'}`}>❌ No</button>
                                    <button type="button" onClick={() => { setTipoSeña('efectivo'); setMontoSenaDigital(''); }} className={`flex-1 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all border ${tipoSeña === 'efectivo' ? 'bg-green-100 border-green-400 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'}`}>💵 Efec.</button>
                                    <button type="button" onClick={() => { setTipoSeña('digital'); setMontoSenaEfectivo(''); }} className={`flex-1 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all border ${tipoSeña === 'digital' ? 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'}`}>📱 Transf.</button>
                                    <button type="button" onClick={() => setTipoSeña('mixto')} className={`flex-1 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all border ${tipoSeña === 'mixto' ? 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'}`}>⚖️ Mixto</button>
                                </div>

                                {/* INPUTS DINÁMICOS */}
                                {tipoSeña === 'efectivo' && (
                                    <div className="relative animate-fade-in">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-black">$</span>
                                        <input type="number" autoFocus className="w-full h-11 pl-8 pr-4 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-800/50 rounded-xl font-black text-gray-800 dark:text-white outline-none focus:border-green-500" value={montoSenaEfectivo} onChange={(e) => setMontoSenaEfectivo(e.target.value)} placeholder="Monto en efectivo..." />
                                    </div>
                                )}
                                {tipoSeña === 'digital' && (
                                    <div className="relative animate-fade-in">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600 font-black">$</span>
                                        <input type="number" autoFocus className="w-full h-11 pl-8 pr-4 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-800/50 rounded-xl font-black text-gray-800 dark:text-white outline-none focus:border-blue-500" value={montoSenaDigital} onChange={(e) => setMontoSenaDigital(e.target.value)} placeholder="Monto transferido..." />
                                    </div>
                                )}
                                {tipoSeña === 'mixto' && (
                                    <div className="flex gap-3 animate-fade-in">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-black">$</span>
                                            <input type="number" autoFocus className="w-full h-11 pl-8 pr-3 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-800/50 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-green-500 transition-colors" value={montoSenaEfectivo} onChange={(e) => setMontoSenaEfectivo(e.target.value)} placeholder="Efectivo..." />
                                        </div>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600 font-black">$</span>
                                            <input type="number" className="w-full h-11 pl-8 pr-3 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-800/50 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-colors" value={montoSenaDigital} onChange={(e) => setMontoSenaDigital(e.target.value)} placeholder="Transfer..." />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Detalle Extra (Opcional)</label>
                                <textarea rows="2" className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-800 dark:text-white outline-none focus:border-empresa resize-none" value={agendaDetalleExtra} onChange={(e) => setAgendaDetalleExtra(e.target.value)} placeholder="Ej: Las tapas que sean celestes..."></textarea>
                            </div>

                            <button type="submit" disabled={procesandoCompra} className="w-full h-12 mt-1 bg-empresa text-white font-black rounded-2xl hover:bg-pink-600 transition-colors text-sm uppercase tracking-widest shadow-xl flex justify-center items-center">
                                {procesandoCompra ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Confirmar y Agendar"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* --- MODAL PAGO MIXTO --- */}
            {mostrarModalMixto && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-sm p-6 relative animate-slide-up">
                        <button onClick={() => setMostrarModalMixto(false)} className="absolute top-4 right-4 w-8 h-8 flex justify-center items-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h3 className="text-xl font-black text-gray-800 dark:text-white mb-1 flex items-center gap-2">
                            Pago Mixto
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mb-5 leading-tight">
                            Si el cliente entrega en efectivo el 50% o más del valor, se aplica el precio con descuento.
                        </p>

                        <div className="relative mb-5">
                            <label className="text-[10px] font-bold text-purple-500 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1">Efectivo que entrega</label>
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-black text-lg">$</span>
                            <input
                                type="number"
                                autoFocus
                                className="w-full h-14 pl-8 pr-4 bg-transparent border-2 border-purple-200 dark:border-purple-900/50 rounded-xl font-black text-gray-800 dark:text-white outline-none focus:border-purple-500 transition-all text-xl"
                                value={montoEfectivoMixto}
                                onChange={(e) => setMontoEfectivoMixto(e.target.value)}
                                placeholder="0"
                            />
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30 mb-5 flex justify-between items-center">
                            <div>
                                <p className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Total Aplicado</p>
                                <p className={`text-sm font-black ${aplicaDescuento ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                    ${totalAplicado.toLocaleString('es-AR')} <span className="text-[10px] font-medium">{aplicaDescuento ? '(C/ Desc.)' : '(Lista)'}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">A Transferir</p>
                                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 leading-none mt-1">${restanteDigital.toLocaleString('es-AR')}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setMetodoPagoSeleccionado('mixto');
                                setMostrarModalMixto(false);
                            }}
                            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl uppercase tracking-widest text-xs transition-colors shadow-lg shadow-purple-500/30"
                        >
                            Confirmar Cobro Mixto
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};