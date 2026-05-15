// src/componentes/FilaArchivo.jsx
export const FilaArchivo = ({ archivo, indice, detalleArchivo, modoAutomatico, manejarCambioArchivo, resetearArchivo }) => {
    const estaVacio = archivo.paginas === '' && !archivo.anillado;

    return (
        <div className={`relative bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md hover:border-empresa/30 grid grid-cols-1 xl:grid-cols-12 gap-5 items-center ${estaVacio ? 'opacity-60' : ''}`}>
            
            {/* BOTÓN DE RESETEO FLOTANTE (Solo si tiene datos) */}
            {!estaVacio && (
                <button 
                    onClick={() => resetearArchivo(archivo.id)}
                    className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-red-500 p-2 rounded-full shadow-md z-10 transition-colors"
                    title="Limpiar fila"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            )}

            {/* Inputs (Páginas y Formato) */}
            <div className="xl:col-span-4 grid grid-cols-2 gap-4">
                <div className="relative">
                    <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">Páginas</label>
                    <input
                        type="number"
                        className="w-full h-12 px-3 bg-transparent border border-gray-200 dark:border-gray-600 rounded-2xl font-bold text-lg text-gray-800 dark:text-white outline-none focus:border-empresa transition-all text-center"
                        value={archivo.paginas}
                        onChange={(evento) => manejarCambioArchivo(archivo.id, 'paginas', evento.target.value)}
                        placeholder="0"
                    />
                </div>
                <div className="relative">
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

            {/* Toggles (Checkboxes) */}
            <div className="xl:col-span-3 flex gap-2 h-12">
                <label className={`flex-1 flex items-center justify-center px-1 rounded-2xl border cursor-pointer transition-all ${archivo.esDobleFaz ? 'bg-empresa/10 border-empresa text-empresa' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                    <input type="checkbox" className="hidden" checked={archivo.esDobleFaz} onChange={(evento) => manejarCambioArchivo(archivo.id, 'esDobleFaz', evento.target.checked)} />
                    <span className="text-[10px] font-bold uppercase">Doble Faz</span>
                </label>
                <label className={`flex-1 flex items-center justify-center px-1 rounded-2xl border cursor-pointer transition-all ${archivo.anillado ? 'bg-empresa/10 border-empresa text-empresa' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                    <input type="checkbox" className="hidden" checked={archivo.anillado} onChange={(evento) => manejarCambioArchivo(archivo.id, 'anillado', evento.target.checked)} />
                    <span className="text-[10px] font-bold uppercase">Anillado</span>
                </label>
            </div>

            {/* Detalle del Archivo "El Ticket" */}
            <div className="xl:col-span-5 w-full">
                {detalleArchivo ? (
                    <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <div className="space-y-1 border-b dark:border-gray-700 pb-2 mb-2">
                            {parseInt(archivo.paginas) > 0 && (
                                <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                                    <span className="truncate mr-2">Impresiones ({archivo.paginas} x ${detalleArchivo.precioUnitarioMayorista})</span>
                                    <span className="dark:text-gray-200 font-bold whitespace-nowrap">${detalleArchivo.subtotalImpresion.toLocaleString('es-AR')}</span>
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
                                <p className="text-[9px] font-bold text-green-500 uppercase italic leading-none">Subtotal</p>
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
};