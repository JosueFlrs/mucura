// src/componentes/FilaArchivo.jsx

export const FilaArchivo = ({ archivo, indice, detalleArchivo, modoAutomatico, manejarCambioArchivo }) => {
    const estaVacio = archivo.paginas === '' && !archivo.anillado;

    return (
        <div className={`bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md hover:border-empresa/30 grid grid-cols-1 md:grid-cols-12 gap-5 items-center ${estaVacio ? 'opacity-60' : ''}`}>
            
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
};