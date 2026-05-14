import { useState, useEffect, useMemo } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';

export const CalculadoraCotizaciones = () => {
    const [tarifas, setTarifas] = useState({});
    const [cargandoTarifas, setCargandoTarifas] = useState(true);
    const [modoAutomatico, setModoAutomatico] = useState(false);

    const [listaArchivos, setListaArchivos] = useState([
        { id: Date.now(), paginas: '', tipoServicio: 'a4Color', esDobleFaz: false, anillado: false }
    ]);

    const [resultadoManual, setResultadoManual] = useState(null);

    useEffect(() => {
        const obtenerTarifas = async () => {
            try {
                const { data, error } = await clienteSupabase.from('tarifasImpresion').select('*');
                if (error) throw error;
                const tarifasMapeadas = data.reduce((acumulador, tarifa) => ({ ...acumulador, [tarifa.tipoImpresion]: tarifa }), {});
                setTarifas(tarifasMapeadas);
            } catch (error) {
                console.error("error:", error);
            } finally {
                setCargandoTarifas(false);
            }
        };
        obtenerTarifas();
    }, []);

    const realizarCalculos = (archivos, tablaTarifas) => {
        let acumuladoMayorista = 0;
        const agrupacionPorVolumen = {};
        let totalPaginasGlobal = 0;

        archivos.forEach(archivo => {
            const cantidad = parseInt(archivo.paginas) || 0;
            if (cantidad > 0) {
                totalPaginasGlobal += cantidad;
                const claveGrupo = `${archivo.tipoServicio}-${archivo.esDobleFaz}`;
                agrupacionPorVolumen[claveGrupo] = (agrupacionPorVolumen[claveGrupo] || 0) + cantidad;
            }
        });

        const detallesPorArchivo = archivos.map(archivo => {
            const cantidad = parseInt(archivo.paginas) || 0;
            if (cantidad <= 0) return null;

            const claveGrupo = `${archivo.tipoServicio}-${archivo.esDobleFaz}`;
            const totalPaginasDelGrupo = agrupacionPorVolumen[claveGrupo];
            let claveTarifa = archivo.tipoServicio + (archivo.esDobleFaz ? 'DobleFaz' : '');
            const escala = tablaTarifas[claveTarifa];

            if (!escala) return null;

            const obtenerCostoUnitario = (cantidadAEstimar) => {
                if (cantidadAEstimar <= 50) return escala.precioHasta50;
                if (cantidadAEstimar <= 100) return escala.precioHasta100;
                if (cantidadAEstimar <= 200) return escala.precioHasta200;
                return escala.precioMasDe200;
            };

            const costoUnitarioMinorista = obtenerCostoUnitario(cantidad);
            const costoUnitarioMayorista = obtenerCostoUnitario(totalPaginasDelGrupo);
            const subtotalImpresion = cantidad * costoUnitarioMayorista;
            const costoAnillado = archivo.anillado ? 1500 : 0;

            const totalMinorista = (cantidad * costoUnitarioMinorista) + costoAnillado;
            const totalMayorista = subtotalImpresion + costoAnillado;

            acumuladoMayorista += totalMayorista;

            return {
                precioUnitarioMayorista: costoUnitarioMayorista,
                subtotalImpresion,
                costoAnillado,
                totalMinorista,
                totalMayorista
            };
        });

        return {
            detalles: detallesPorArchivo,
            totalSinRedondear: acumuladoMayorista,
            totalRedondeado: Math.ceil(acumuladoMayorista / 100) * 100,
            totalPaginas: totalPaginasGlobal
        };
    };

    const resultadoAutomatico = useMemo(() => {
        return realizarCalculos(listaArchivos, tarifas);
    }, [listaArchivos, tarifas]);

    const datosEnPantalla = modoAutomatico ? resultadoAutomatico : resultadoManual;

    const manejarCambioArchivo = (id, campo, valor) => {
        if (!modoAutomatico) setResultadoManual(null);

        setListaArchivos(listaActual => {
            const nuevaLista = listaActual.map(archivo =>
                archivo.id === id ? { ...archivo, [campo]: valor } : archivo
            );

            if (campo === 'paginas') {
                const ultimoArchivo = nuevaLista[nuevaLista.length - 1];
                if (ultimoArchivo.paginas !== '') {
                    nuevaLista.push({ id: Date.now() + Math.random(), paginas: '', tipoServicio: 'a4Color', esDobleFaz: false, anillado: false });
                } else {
                    while (nuevaLista.length > 1 && nuevaLista[nuevaLista.length - 2].paginas === '' && nuevaLista[nuevaLista.length - 1].paginas === '') {
                        nuevaLista.pop();
                    }
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
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-6 xl:gap-10 items-start transition-all duration-500 justify-center">

            {/* Columna Izquierda: Área de Trabajo fluida */}
            <div className="flex-1 min-w-fit flex flex-col gap-6">

                {/* Cabecera y Controles */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Archivos a Imprimir</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure cada documento individualmente</p>
                    </div>

                    <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl flex-shrink-0">
                        <button
                            onClick={() => setModoAutomatico(false)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${!modoAutomatico ? 'bg-white dark:bg-gray-800 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            MODO MANUAL
                        </button>
                        <button
                            onClick={() => { setModoAutomatico(true); setResultadoManual(null); }}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${modoAutomatico ? 'bg-white dark:bg-gray-800 shadow-md text-empresa' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            AUTO (EN VIVO)
                        </button>
                    </div>
                </div>

                {/* Lista de Archivos */}
                <div className="space-y-4 mb-24 lg:mb-8">
                    {listaArchivos.map((archivo, indice) => {
                        const detalleArchivo = datosEnPantalla?.detalles[indice];
                        const estaVacio = archivo.paginas === '';

                        return (
                            <div key={archivo.id} className={`bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md hover:border-empresa/30 grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-4 items-center ${estaVacio ? 'opacity-60 hover:opacity-100' : ''}`}>

                                {/* Inputs (Páginas y Formato = 4/12) */}
                                <div className="md:col-span-4 grid grid-cols-2 gap-4">
                                    <div className="col-span-1 relative">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">Páginas</label>
                                        <input
                                            type="number"
                                            className="w-full h-12 px-3 bg-transparent border border-gray-200 dark:border-gray-600 rounded-2xl font-bold text-lg text-gray-800 dark:text-white outline-none focus:border-empresa focus:ring-1 focus:ring-empresa transition-all text-center relative"
                                            value={archivo.paginas}
                                            onChange={(evento) => manejarCambioArchivo(archivo.id, 'paginas', evento.target.value)}
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="col-span-1 relative">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">Formato</label>
                                        <select
                                            className="w-full h-12 px-3 bg-transparent border border-gray-200 dark:border-gray-600 rounded-2xl font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-empresa focus:ring-1 focus:ring-empresa appearance-none relative text-sm"
                                            value={archivo.tipoServicio}
                                            onChange={(evento) => manejarCambioArchivo(archivo.id, 'tipoServicio', evento.target.value)}
                                        >
                                            <option value="a4Color">A4 Color</option>
                                            <option value="a4BlancoYNegro">A4 B/N</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Toggles (Checkboxes) (3/12) */}
                                <div className="md:col-span-3 flex gap-2 h-12">
                                    <label className={`flex-1 flex flex-col xl:flex-row items-center justify-center px-1 xl:px-2 rounded-2xl border cursor-pointer transition-all h-full ${archivo.esDobleFaz ? 'bg-empresa/10 border-empresa text-empresa' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                        <input type="checkbox" className="hidden" checked={archivo.esDobleFaz} onChange={(evento) => manejarCambioArchivo(archivo.id, 'esDobleFaz', evento.target.checked)} />
                                        <span className="text-[10px] xl:text-xs font-bold uppercase tracking-wide text-center">Doble Faz</span>
                                    </label>
                                    <label className={`flex-1 flex flex-col xl:flex-row items-center justify-center px-1 xl:px-2 rounded-2xl border cursor-pointer transition-all h-full ${archivo.anillado ? 'bg-empresa/10 border-empresa text-empresa' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                        <input type="checkbox" className="hidden" checked={archivo.anillado} onChange={(evento) => manejarCambioArchivo(archivo.id, 'anillado', evento.target.checked)} />
                                        <span className="text-[10px] xl:text-xs font-bold uppercase tracking-wide text-center">Anillado</span>
                                    </label>
                                </div>

                                {/* Detalle del Archivo "El Ticket" (5/12) */}
                                <div className="md:col-span-5 w-full">
                                    {detalleArchivo ? (
                                        <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm w-full">

                                            {/* Desglose Superior */}
                                            <div className="space-y-1 border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
                                                <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                    <span>Impresiones ({archivo.paginas} x ${detalleArchivo.precioUnitarioMayorista})</span>
                                                    <span className="dark:text-gray-200">${detalleArchivo.subtotalImpresion.toLocaleString('es-AR')}</span>
                                                </div>
                                                {archivo.anillado && (
                                                    <div className="flex justify-between text-[11px] text-empresa font-black">
                                                        <span>Anillado</span>
                                                        <span>+ $1.500</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Totales Inferiores */}
                                            <div className="flex justify-between items-center">
                                                <div className="text-left">
                                                    <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">Lista</p>
                                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 line-through">
                                                        ${detalleArchivo.totalMinorista.toLocaleString('es-AR')}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-bold text-green-500 uppercase italic">Subtotal</p>
                                                    <p className="text-xl font-black text-green-700 dark:text-green-400 leading-none">
                                                        ${detalleArchivo.totalMayorista.toLocaleString('es-AR')}
                                                    </p>
                                                </div>
                                            </div>

                                        </div>
                                    ) : (
                                        <div className="text-gray-300 dark:text-gray-600 italic text-xs border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4 w-full h-full text-center flex items-center justify-center">
                                            {estaVacio ? 'Nuevo PDF' : (!modoAutomatico ? 'Presione actualizar precios' : 'Esperando datos')}
                                        </div>
                                    )}
                                </div>

                            </div>
                        );
                    })}

                    {/* Botón manual integrado al final de la lista */}
                    {!modoAutomatico && (
                        <button
                            onClick={procesarCalculoManual}
                            className="w-full bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white font-black py-5 rounded-3xl shadow-lg transition-all text-lg uppercase tracking-widest mt-4"
                        >
                            Actualizar Precios
                        </button>
                    )}
                </div>
            </div>

            {/* Columna Derecha: Tarjeta de Resumen */}
            <div className="w-full lg:w-[340px] xl:w-[400px] flex-shrink-0 sticky bottom-4 lg:top-8 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">

                    <div className="p-6 md:p-8">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-empresa" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Resumen de Orden
                        </h3>

                        {/* Desglose de información */}
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Total de Archivos</span>
                                <span className="text-gray-800 dark:text-white font-bold">{listaArchivos.filter(a => a.paginas !== '').length}</span>
                            </div>

                            {datosEnPantalla?.totalPaginas > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400 font-medium">Total de Páginas</span>
                                    <span className="text-gray-800 dark:text-white font-bold">{datosEnPantalla.totalPaginas}</span>
                                </div>
                            )}

                            {datosEnPantalla && datosEnPantalla.totalSinRedondear !== datosEnPantalla.totalRedondeado && (
                                <div className="flex justify-between items-center text-sm pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <span className="text-gray-500 dark:text-gray-400 font-medium">Subtotal exacto</span>
                                    <span className="text-gray-500 dark:text-gray-400 line-through whitespace-nowrap">${datosEnPantalla.totalSinRedondear.toLocaleString('es-AR')}</span>
                                </div>
                            )}
                        </div>

                        {/* Bloque gigante del Total */}
                        <div className="bg-gradient-to-br from-empresa to-[#D12E9E] p-6 rounded-2xl text-white text-center shadow-inner relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-24 h-24 -mr-6 -mt-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                            </div>

                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-90 block mb-2 whitespace-nowrap">Total a Cobrar</span>

                            <div className="flex justify-center items-baseline gap-1">
                                <span className="text-3xl font-bold opacity-80">$</span>
                                <span className="text-5xl lg:text-5xl xl:text-6xl font-black tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">
                                    {datosEnPantalla?.totalRedondeado ? datosEnPantalla.totalRedondeado.toLocaleString('es-AR') : '0'}
                                </span>
                            </div>
                        </div>

                        {/* Aviso de interfaz */}
                        {datosEnPantalla?.totalRedondeado > 0 && (
                            <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-4">
                                Listo para procesar
                            </p>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};