import { SIN_DOBLE_FAZ } from './CalculadoraCotizaciones';

export const ResumenOrden = ({ datosEnPantalla, anilladosExtra, manejarAnilladoExtra }) => {
    const totalBase = datosEnPantalla?.totalSinRedondear || 0;
    const totalDigitalRedondeado = Math.ceil(totalBase / 100) * 100;
    const montoDescuentoEfectivo = totalBase * 0.13;
    const totalEfectivoExacto = totalBase - montoDescuentoEfectivo;
    const totalEfectivoRedondeado = Math.ceil(totalEfectivoExacto / 100) * 100;

    const NOMBRES_SERVICIOS = {
        a4Color: "A4 Color", a4BlancoYNegro: "A4 B/N", a4ObraColor: "A4 Obra", a3ObraColor: "A3 Obra",
        a4Cartulina: "A4 Cartulina", a4Fotografico120: "A4 Foto 120g", a4Fotografico200: "A4 Foto 200g",
        a4Fotografico250: "A4 Foto 250g", a4FotoAdhesivo135: "A4 Foto Adhes. 135g", sa3OppAdhesivo: "S.A3 OPP Adhes.",
        a4OppAdhesivo: "A4 OPP Adhes.", sa3Ilustracion115: "S.A3 Ilust. 115g", a4Ilustracion115: "A4 Ilust. 115g",
        sa3Ilustracion200: "S.A3 Ilust. 200g", a4Ilustracion200: "A4 Ilust. 200g", sa3Ilustracion300: "S.A3 Ilust. 300g",
        a4Ilustracion300: "A4 Ilust. 300g", sa3IlustracionAdhesivo: "S.A3 Ilust. Adhes.", a4IlustracionAdhesivo: "A4 Ilust. Adhes."
    };

    const hayPaginas = datosEnPantalla && Object.keys(datosEnPantalla.resumen.paginas).length > 0;

    return (
        <div className="w-full lg:w-[340px] xl:w-[400px] flex-shrink-0 sticky bottom-4 lg:top-8 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col p-6 md:p-8">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-empresa" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Comanda de Producción
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
                        </>
                    ) : (
                        <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm italic">Esperando datos...</div>
                    )}

                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2.5">Anillados Extras / Agrupados</p>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/70 rounded-2xl py-1.5 px-1">
                                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">Chico</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <button onClick={() => manejarAnilladoExtra('chico', 'restar')} className="w-5 h-5 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-red-500 hover:shadow-sm font-black text-xs transition-colors">-</button>
                                    <span className="text-xs font-black text-gray-800 dark:text-white">{anilladosExtra.chico}</span>
                                    <button onClick={() => manejarAnilladoExtra('chico', 'sumar')} className="w-5 h-5 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-green-500 hover:shadow-sm font-black text-xs transition-colors">+</button>
                                </div>
                            </div>
                            <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/70 rounded-2xl py-1.5 px-1">
                                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">Medio</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <button onClick={() => manejarAnilladoExtra('mediano', 'restar')} className="w-5 h-5 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-red-500 hover:shadow-sm font-black text-xs transition-colors">-</button>
                                    <span className="text-xs font-black text-gray-800 dark:text-white">{anilladosExtra.mediano}</span>
                                    <button onClick={() => manejarAnilladoExtra('mediano', 'sumar')} className="w-5 h-5 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-green-500 hover:shadow-sm font-black text-xs transition-colors">+</button>
                                </div>
                            </div>
                            <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/70 rounded-2xl py-1.5 px-1">
                                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">Grande</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <button onClick={() => manejarAnilladoExtra('grande', 'restar')} className="w-5 h-5 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-red-500 hover:shadow-sm font-black text-xs transition-colors">-</button>
                                    <span className="text-xs font-black text-gray-800 dark:text-white">{anilladosExtra.grande}</span>
                                    <button onClick={() => manejarAnilladoExtra('grande', 'sumar')} className="w-5 h-5 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-green-500 hover:shadow-sm font-black text-xs transition-colors">+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">Opciones de Pago</p>
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl mb-3 flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 block">Transferencia / Débito</span>
                            {totalBase !== totalDigitalRedondeado && <span className="text-[10px] text-gray-400 line-through">Exacto: ${totalBase.toLocaleString('es-AR')}</span>}
                        </div>
                        <span className="text-2xl font-black text-empresa">${totalBase > 0 ? totalDigitalRedondeado.toLocaleString('es-AR') : '0'}</span>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-2xl text-white shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 transition-transform duration-500">
                            <svg className="w-24 h-24 -mr-6 -mt-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                        </div>
                        <div className="flex justify-between items-start relative z-10 mb-2">
                            <span className="text-[11px] uppercase tracking-widest font-bold opacity-90">Efectivo (-13%)</span>
                            {montoDescuentoEfectivo > 0 && <span className="text-[15px] bg-white/20 px-2 py-1 rounded-lg font-bold backdrop-blur-sm">Ahorro: ${Math.round(montoDescuentoEfectivo).toLocaleString('es-AR')}</span>}
                        </div>
                        <div className="flex justify-between items-end relative z-10 mt-2">
                            <div className="pb-1">
                                {totalEfectivoExacto !== totalEfectivoRedondeado && <span className="text-[20px] line-through opacity-70 block">${totalEfectivoExacto.toLocaleString('es-AR')}</span>}
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold opacity-80">$</span>
                                <span className="text-5xl lg:text-5xl xl:text-6xl font-black tracking-tighter overflow-hidden text-ellipsis">{totalBase > 0 ? totalEfectivoRedondeado.toLocaleString('es-AR') : '0'}</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-4 italic">Redondeo automático incluido</p>
                </div>
            </div>
        </div>
    );
};