import { useState, useEffect, useMemo } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';

export const CalculadoraCotizaciones = () => {
    const [tarifas, setTarifas] = useState({});
    const [cargandoTarifas, setCargandoTarifas] = useState(true);
    
    const [modoAutomatico, setModoAutomatico] = useState(() => {
        const modoGuardado = window.localStorage.getItem('preferenciaModoAutomatico');
        if (modoGuardado !== null) {
            return JSON.parse(modoGuardado);
        }
        return false;
    });

    const [listaArchivos, setListaArchivos] = useState([
        { id: Date.now(), paginas: '', tipoServicio: 'a4Color', esDobleFaz: false, anillado: false }
    ]);

    const [resultadoManual, setResultadoManual] = useState(null);

    useEffect(() => {
        window.localStorage.setItem('preferenciaModoAutomatico', JSON.stringify(modoAutomatico));
    }, [modoAutomatico]);

    useEffect(() => {
        const obtenerTarifas = async () => {
            try {
                const { data, error } = await clienteSupabase.from('tarifasImpresion').select('*');
                if (error) throw error;
                const tarifasMapeadas = data.reduce((acumulador, tarifa) => ({ ...acumulador, [tarifa.tipoImpresion]: tarifa }), {});
                setTarifas(tarifasMapeadas);
            } catch (error) {
                console.error("error al obtener tarifas:", error);
            } finally {
                setCargandoTarifas(false);
            }
        };
        obtenerTarifas();
    }, []);

    const realizarCalculos = (archivos, tablaTarifas) => {
        let acumuladoMayorista = 0;
        const agrupacionPorVolumen = {};
        
        const resumenDetallado = {
            cantidadArchivosImpresos: 0,
            cantidadAnillados: 0,
            paginas: {
                a4ColorSimple: 0,
                a4ColorDobleFaz: 0,
                a4BlancoYNegroSimple: 0,
                a4BlancoYNegroDobleFaz: 0
            }
        };

        archivos.forEach(archivo => {
            const cantidad = parseInt(archivo.paginas) || 0;
            
            if (cantidad > 0) {
                resumenDetallado.cantidadArchivosImpresos++;
                
                const claveGrupo = `${archivo.tipoServicio}-${archivo.esDobleFaz}`;
                agrupacionPorVolumen[claveGrupo] = (agrupacionPorVolumen[claveGrupo] || 0) + cantidad;

                if (archivo.tipoServicio === 'a4Color') {
                    if (archivo.esDobleFaz) resumenDetallado.paginas.a4ColorDobleFaz += cantidad;
                    else resumenDetallado.paginas.a4ColorSimple += cantidad;
                } else if (archivo.tipoServicio === 'a4BlancoYNegro') {
                    if (archivo.esDobleFaz) resumenDetallado.paginas.a4BlancoYNegroDobleFaz += cantidad;
                    else resumenDetallado.paginas.a4BlancoYNegroSimple += cantidad;
                }
            }

            if (archivo.anillado) {
                resumenDetallado.cantidadAnillados++;
            }
        });

        const detallesPorArchivo = archivos.map(archivo => {
            const cantidad = parseInt(archivo.paginas) || 0;
            const tieneAnillado = archivo.anillado;

            if (cantidad <= 0 && !tieneAnillado) return null;

            let subtotalImpresionMayorista = 0;
            let subtotalImpresionMinorista = 0;
            let precioUnitarioMayorista = 0;

            if (cantidad > 0) {
                let claveTarifa = archivo.tipoServicio + (archivo.esDobleFaz ? 'DobleFaz' : '');
                const escala = tablaTarifas[claveTarifa];

                if (escala) {
                    const claveGrupo = `${archivo.tipoServicio}-${archivo.esDobleFaz}`;
                    const totalPaginasDelGrupo = agrupacionPorVolumen[claveGrupo];

                    const obtenerCostoUnitario = (cantidadAEstimar) => {
                        if (cantidadAEstimar <= 50) return escala.precioHasta50;
                        if (cantidadAEstimar <= 100) return escala.precioHasta100;
                        if (cantidadAEstimar <= 200) return escala.precioHasta200;
                        return escala.precioMasDe200;
                    };

                    const costoUnitarioMinorista = obtenerCostoUnitario(cantidad);
                    precioUnitarioMayorista = obtenerCostoUnitario(totalPaginasDelGrupo);
                    
                    subtotalImpresionMinorista = cantidad * costoUnitarioMinorista;
                    subtotalImpresionMayorista = cantidad * precioUnitarioMayorista;
                }
            }

            const costoAnillado = tieneAnillado ? 1500 : 0;
            const totalMinorista = subtotalImpresionMinorista + costoAnillado;
            const totalMayorista = subtotalImpresionMayorista + costoAnillado;

            acumuladoMayorista += totalMayorista;

            return {
                precioUnitarioMayorista,
                subtotalImpresion: subtotalImpresionMayorista,
                costoAnillado,
                totalMinorista,
                totalMayorista
            };
        });

        return {
            detalles: detallesPorArchivo,
            resumen: resumenDetallado,
            totalSinRedondear: acumuladoMayorista
        };
    };

    const resultadoAutomatico = useMemo(() => {
        return realizarCalculos(listaArchivos, tarifas);
    }, [listaArchivos, tarifas]);

    const datosEnPantalla = modoAutomatico ? resultadoAutomatico : resultadoManual;

    // --- CÁLCULOS DE LOS DOS PRECIOS ---
    const totalBase = datosEnPantalla?.totalSinRedondear || 0;
    
    // Digital
    const totalDigitalExacto = totalBase;
    const totalDigitalRedondeado = Math.ceil(totalDigitalExacto / 100) * 100;
    
    // Efectivo
    const montoDescuentoEfectivo = totalBase * 0.13;
    const totalEfectivoExacto = totalBase - montoDescuentoEfectivo;
    const totalEfectivoRedondeado = Math.ceil(totalEfectivoExacto / 100) * 100;

    const manejarCambioArchivo = (id, campo, valor) => {
        if (!modoAutomatico) setResultadoManual(null);

        let valorFinal = valor;
        if (campo === 'paginas' && valor < 0) {
            valorFinal = 0;
        }

        setListaArchivos(listaActual => {
            const nuevaLista = listaActual.map(archivo =>
                archivo.id === id ? { ...archivo, [campo]: valorFinal } : archivo
            );

            const archivoEditado = nuevaLista.find(a => a.id === id);
            const esUltimo = nuevaLista[nuevaLista.length - 1].id === id;

            if (esUltimo && (archivoEditado.paginas !== '' || archivoEditado.anillado)) {
                nuevaLista.push({ id: Date.now() + Math.random(), paginas: '', tipoServicio: 'a4Color', esDobleFaz: false, anillado: false });
            } else {
                while (
                    nuevaLista.length > 1 &&
                    nuevaLista[nuevaLista.length - 2].paginas === '' && !nuevaLista[nuevaLista.length - 2].anillado &&
                    nuevaLista[nuevaLista.length - 1].paginas === '' && !nuevaLista[nuevaLista.length - 1].anillado
                ) {
                    nuevaLista.pop();
                }
            }
            return nuevaLista;
        });
    };

    const procesarCalculoManual = () => {
        setResultadoManual(realizarCalculos(listaArchivos, tarifas));
    };

    if (cargandoTarifas) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-empresa"></div>
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-6 xl:gap-10 items-start transition-all duration-500 justify-center pb-20">

            {/* Columna Izquierda (Área de Trabajo) */}
            <div className="flex-1 min-w-fit flex flex-col gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Archivos a Imprimir</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestión de carillas y servicios adicionales</p>
                    </div>
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl flex-shrink-0">
                        <button onClick={() => setModoAutomatico(false)} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${!modoAutomatico ? 'bg-white dark:bg-gray-800 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>MANUAL</button>
                        <button onClick={() => { setModoAutomatico(true); setResultadoManual(null); }} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${modoAutomatico ? 'bg-white dark:bg-gray-800 shadow-md text-empresa' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>AUTO</button>
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    {listaArchivos.map((archivo, indice) => {
                        const detalleArchivo = datosEnPantalla?.detalles[indice];
                        const estaVacio = archivo.paginas === '' && !archivo.anillado;

                        return (
                            <div key={archivo.id} className={`bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md hover:border-empresa/30 grid grid-cols-1 md:grid-cols-12 gap-5 items-center ${estaVacio ? 'opacity-60' : ''}`}>
                                
                                <div className="md:col-span-4 grid grid-cols-2 gap-4">
                                    <div className="col-span-1 relative">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">Páginas</label>
                                        <input
                                            type="number"
                                            className="w-full h-12 px-3 bg-transparent border border-gray-200 dark:border-gray-600 rounded-2xl font-bold text-lg text-gray-800 dark:text-white outline-none focus:border-empresa transition-all text-center"
                                            value={archivo.paginas}
                                            onChange={(evento) => manejarCambioArchivo(archivo.id, 'paginas', evento.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="col-span-1 relative">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">Formato</label>
                                        <select
                                            className="w-full h-12 px-3 bg-transparent border border-gray-200 dark:border-gray-600 rounded-2xl font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-empresa appearance-none text-sm"
                                            value={archivo.tipoServicio}
                                            onChange={(evento) => manejarCambioArchivo(archivo.id, 'tipoServicio', evento.target.value)}
                                        >
                                            <option value="a4Color">A4 Color</option>
                                            <option value="a4BlancoYNegro">A4 B/N</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="md:col-span-3 flex gap-2 h-12">
                                    <label className={`flex-1 flex items-center justify-center px-1 rounded-2xl border cursor-pointer transition-all ${archivo.esDobleFaz ? 'bg-empresa/10 border-empresa text-empresa' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                        <input type="checkbox" className="hidden" checked={archivo.esDobleFaz} onChange={(evento) => manejarCambioArchivo(archivo.id, 'esDobleFaz', evento.target.checked)} />
                                        <span className="text-[10px] font-bold uppercase">Doble Faz</span>
                                    </label>
                                    <label className={`flex-1 flex items-center justify-center px-1 rounded-2xl border cursor-pointer transition-all ${archivo.anillado ? 'bg-empresa/10 border-empresa text-empresa' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                        <input type="checkbox" className="hidden" checked={archivo.anillado} onChange={(evento) => manejarCambioArchivo(archivo.id, 'anillado', evento.target.checked)} />
                                        <span className="text-[10px] font-bold uppercase">Anillado</span>
                                    </label>
                                </div>

                                <div className="md:col-span-5 w-full">
                                    {detalleArchivo ? (
                                        <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
                                            <div className="space-y-1 border-b dark:border-gray-700 pb-2 mb-2">
                                                {parseInt(archivo.paginas) > 0 && (
                                                    <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                                                        <span>Impresiones ({archivo.paginas} x ${detalleArchivo.precioUnitarioMayorista})</span>
                                                        <span className="dark:text-gray-200 font-bold">${detalleArchivo.subtotalImpresion.toLocaleString('es-AR')}</span>
                                                    </div>
                                                )}
                                                {archivo.anillado && (
                                                    <div className="flex justify-between text-[11px] text-empresa font-black">
                                                        <span>Servicio de Anillado</span>
                                                        <span>+ $1.500</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="text-left">
                                                    {detalleArchivo.totalMinorista !== detalleArchivo.totalMayorista && (
                                                        <>
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Lista</p>
                                                            <p className="text-xs font-bold text-gray-400 line-through">${detalleArchivo.totalMinorista.toLocaleString('es-AR')}</p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-bold text-green-500 uppercase italic">Subtotal</p>
                                                    <p className="text-xl font-black text-green-700 dark:text-green-400 leading-none">${detalleArchivo.totalMayorista.toLocaleString('es-AR')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-gray-300 dark:text-gray-600 italic text-xs border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-center">
                                            {estaVacio ? 'Nuevo Archivo' : 'Esperando datos'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {!modoAutomatico && (
                        <button onClick={procesarCalculoManual} className="w-full bg-gray-900 dark:bg-gray-700 text-white font-black py-5 rounded-3xl shadow-lg transition-all text-lg uppercase tracking-widest mt-4">Actualizar Precios</button>
                    )}
                </div>
            </div>

            {/* Sidebar del Total */}
            <div className="w-full lg:w-[340px] xl:w-[400px] flex-shrink-0 sticky bottom-4 lg:top-8 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col p-6 md:p-8">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <svg className="w-5 h-5 text-empresa" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Comanda de Producción
                    </h3>

                    <div className="space-y-3 mb-6 flex-grow">
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

                                {(datosEnPantalla.resumen.paginas.a4ColorSimple > 0 || datosEnPantalla.resumen.paginas.a4ColorDobleFaz > 0 || datosEnPantalla.resumen.paginas.a4BlancoYNegroSimple > 0 || datosEnPantalla.resumen.paginas.a4BlancoYNegroDobleFaz > 0) && (
                                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">Detalle de Páginas</p>
                                        
                                        {datosEnPantalla.resumen.paginas.a4ColorSimple > 0 && (
                                            <div className="flex justify-between items-center text-xs mb-2">
                                                <span className="text-gray-600 dark:text-gray-400">A4 Color <span className="text-[10px] text-gray-400">(Simple)</span></span>
                                                <span className="text-gray-800 dark:text-gray-200 font-bold">{datosEnPantalla.resumen.paginas.a4ColorSimple}</span>
                                            </div>
                                        )}
                                        {datosEnPantalla.resumen.paginas.a4ColorDobleFaz > 0 && (
                                            <div className="flex justify-between items-center text-xs mb-2">
                                                <span className="text-gray-600 dark:text-gray-400">A4 Color <span className="text-[10px] text-empresa font-bold">(Doble Faz)</span></span>
                                                <span className="text-gray-800 dark:text-gray-200 font-bold">{datosEnPantalla.resumen.paginas.a4ColorDobleFaz}</span>
                                            </div>
                                        )}
                                        {datosEnPantalla.resumen.paginas.a4BlancoYNegroSimple > 0 && (
                                            <div className="flex justify-between items-center text-xs mb-2">
                                                <span className="text-gray-600 dark:text-gray-400">A4 B/N <span className="text-[10px] text-gray-400">(Simple)</span></span>
                                                <span className="text-gray-800 dark:text-gray-200 font-bold">{datosEnPantalla.resumen.paginas.a4BlancoYNegroSimple}</span>
                                            </div>
                                        )}
                                        {datosEnPantalla.resumen.paginas.a4BlancoYNegroDobleFaz > 0 && (
                                            <div className="flex justify-between items-center text-xs mb-2">
                                                <span className="text-gray-600 dark:text-gray-400">A4 B/N <span className="text-[10px] text-empresa font-bold">(Doble Faz)</span></span>
                                                <span className="text-gray-800 dark:text-gray-200 font-bold">{datosEnPantalla.resumen.paginas.a4BlancoYNegroDobleFaz}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm italic">
                                Esperando datos para procesar el resumen...
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN DE COBRO DUAL */}
                    <div className="mt-auto pt-5 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">Opciones de Pago</p>
                        
                        {/* Tarjeta Digital / Débito */}
                        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl mb-3 flex justify-between items-center">
                            <div>
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 block">Transferencia / Débito</span>
                                {totalDigitalExacto !== totalDigitalRedondeado && (
                                    <span className="text-[10px] text-gray-400 line-through">Exacto: ${totalDigitalExacto.toLocaleString('es-AR')}</span>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-empresa">${totalBase > 0 ? totalDigitalRedondeado.toLocaleString('es-AR') : '0'}</span>
                            </div>
                        </div>

                        {/* Tarjeta Efectivo */}
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-2xl text-white shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-24 h-24 -mr-6 -mt-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                            </div>
                            
                            <div className="flex justify-between items-start relative z-10 mb-2">
                                <span className="text-[11px] uppercase tracking-widest font-bold opacity-90">Efectivo (-13%)</span>
                                {montoDescuentoEfectivo > 0 && (
                                    <span className="text-[15px] bg-white/20 px-2 py-1 rounded-lg font-bold backdrop-blur-sm">
                                        Ahorro: ${Math.round(montoDescuentoEfectivo).toLocaleString('es-AR')}
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex justify-between items-end relative z-10 mt-2">
                                <div className="pb-1">
                                    {totalEfectivoExacto !== totalEfectivoRedondeado && (
                                        <span className="text-[20px] line-through opacity-70 block">
                                            ${totalEfectivoExacto.toLocaleString('es-AR')}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold opacity-80">$</span>
                                    <span className="text-5xl lg:text-5xl xl:text-6xl font-black tracking-tighter overflow-hidden text-ellipsis">
                                        {totalBase > 0 ? totalEfectivoRedondeado.toLocaleString('es-AR') : '0'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-4 italic">Redondeo automático incluido</p>
                    </div>

                </div>
            </div>
        </div>
    );
};