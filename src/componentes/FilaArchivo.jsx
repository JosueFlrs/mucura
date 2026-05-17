import { SIN_DOBLE_FAZ } from './CalculadoraCotizaciones';

export const FilaArchivo = ({ archivo, detalleArchivo, manejarCambioArchivo, resetearArchivo }) => {
    const estaVacio = archivo.paginas === '' && !archivo.anillado;
    const permiteDobleFaz = !SIN_DOBLE_FAZ.includes(archivo.tipoServicio);

    return (
        <div className={`relative bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md hover:border-empresa/30 grid grid-cols-1 xl:grid-cols-12 gap-5 items-center ${estaVacio ? 'opacity-60' : ''}`}>
            
            {!estaVacio && (
                <button onClick={() => resetearArchivo(archivo.id)} title="Limpiar fila" className="absolute -top-3 -right-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-red-500 p-2 rounded-full shadow-md z-20 transition-all group">
                    <svg className="w-4 h-4 transform group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            )}

            <div className="xl:col-span-4 grid grid-cols-2 gap-4">
                <div className="col-span-1 relative">
                    <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">Páginas</label>
                    <input type="number" className="w-full h-12 px-3 bg-transparent border border-gray-200 dark:border-gray-600 rounded-2xl font-bold text-lg text-gray-800 dark:text-white outline-none focus:border-empresa text-center" value={archivo.paginas} onChange={(e) => manejarCambioArchivo(archivo.id, 'paginas', e.target.value)} placeholder="0" />
                </div>
                
                <div className="col-span-1 relative">
                    <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">Formato</label>
                    <select className="w-full h-12 px-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-empresa appearance-none text-[13px] cursor-pointer" value={archivo.tipoServicio} onChange={(e) => manejarCambioArchivo(archivo.id, 'tipoServicio', e.target.value)}>
                        <optgroup label="Impresiones Clásicas">
                            <option value="a4Color">A4 Color</option>
                            <option value="a4BlancoYNegro">A4 B/N</option>
                        </optgroup>
                        <optgroup label="Láser Color Común">
                            <option value="a4ObraColor">A4 Obra Láser</option>
                            <option value="a3ObraColor">A3 Obra Láser</option>
                        </optgroup>
                        <optgroup label="Cartulinas y Fotográficos">
                            <option value="a4Cartulina">A4 Cartulina Color</option>
                            <option value="a4Fotografico120">A4 Foto 120g</option>
                            <option value="a4Fotografico200">A4 Foto 200g</option>
                            <option value="a4Fotografico250">A4 Foto 250g</option>
                        </optgroup>
                        <optgroup label="Ilustración Láser Color">
                            <option value="a4Ilustracion115">A4 Ilust. 115g</option>
                            <option value="sa3Ilustracion115">S.A3 Ilust. 115g</option>
                            <option value="a4Ilustracion200">A4 Ilust. 200g</option>
                            <option value="sa3Ilustracion200">S.A3 Ilust. 200g</option>
                            <option value="a4Ilustracion300">A4 Ilust. 300g</option>
                            <option value="sa3Ilustracion300">S.A3 Ilust. 300g</option>
                        </optgroup>
                        <optgroup label="Adhesivos">
                            <option value="a4FotoAdhesivo135">A4 Foto Adhes. 135g</option>
                            <option value="a4OppAdhesivo">A4 OPP Adhes.</option>
                            <option value="sa3OppAdhesivo">S.A3 OPP Adhes.</option>
                            <option value="a4IlustracionAdhesivo">A4 Ilust. Adhes.</option>
                            <option value="sa3IlustracionAdhesivo">S.A3 Ilust. Adhes.</option>
                        </optgroup>
                    </select>
                </div>
            </div>

            <div className="xl:col-span-3 flex gap-2 h-12">
                <label className={`flex-1 flex items-center justify-center px-1 rounded-2xl border transition-all ${!permiteDobleFaz ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : archivo.esDobleFaz ? 'bg-empresa/10 border-empresa text-empresa cursor-pointer' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 cursor-pointer'}`}>
                    <input type="checkbox" className="hidden" disabled={!permiteDobleFaz} checked={archivo.esDobleFaz} onChange={(e) => manejarCambioArchivo(archivo.id, 'esDobleFaz', e.target.checked)} />
                    <span className="text-[10px] font-bold uppercase">Doble Faz</span>
                </label>
                <label className={`flex-1 flex items-center justify-center px-1 rounded-2xl border cursor-pointer transition-all ${archivo.anillado ? 'bg-empresa/10 border-empresa text-empresa' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                    <input type="checkbox" className="hidden" checked={archivo.anillado} onChange={(e) => manejarCambioArchivo(archivo.id, 'anillado', e.target.checked)} />
                    <span className="text-[10px] font-bold uppercase">Anillado</span>
                </label>
            </div>

            <div className="xl:col-span-5 w-full">
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
                                    <span>+ ${detalleArchivo.costoAnillado.toLocaleString('es-AR')}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="text-left">
                                {detalleArchivo.totalMinorista !== detalleArchivo.totalMayorista && (
                                    <><p className="text-[9px] font-bold text-gray-400 uppercase">Lista</p><p className="text-xs font-bold text-gray-400 line-through">${detalleArchivo.totalMinorista.toLocaleString('es-AR')}</p></>
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