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
                const tarifasMapeadas = data.reduce((acc, t) => ({ ...acc, [t.tipoImpresion]: t }), {});
                setTarifas(tarifasMapeadas);
            } catch (e) {
                console.error("error:", e);
            } finally {
                setCargandoTarifas(false);
            }
        };
        obtenerTarifas();
    }, []);

    const realizarCalculos = (archivos, tablaTarifas) => {
        let acumuladoMayorista = 0;
        const agrupacionPorVolumen = {};

        archivos.forEach(archivo => {
            const cantidad = parseInt(archivo.paginas) || 0;
            if (cantidad > 0) {
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

            const obtenerCostoUnitario = (cant) => {
                if (cant <= 50) return escala.precioHasta50;
                if (cant <= 100) return escala.precioHasta100;
                if (cant <= 200) return escala.precioHasta200;
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
            totalRedondeado: Math.ceil(acumuladoMayorista / 100) * 100
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

    if (cargandoTarifas) return <div className="p-10 text-center font-bold text-empresa animate-pulse">CARGANDO TARIFAS...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 transition-colors duration-300">

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b dark:border-gray-700 pb-4 gap-4">
                <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Cotización de Pedidos</h2>

                <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-xl border border-gray-200 dark:border-gray-600">
                    <button
                        onClick={() => setModoAutomatico(false)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!modoAutomatico ? 'bg-white dark:bg-gray-600 shadow-sm text-empresa' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        MODO MANUAL
                    </button>
                    <button
                        onClick={() => { setModoAutomatico(true); setResultadoManual(null); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${modoAutomatico ? 'bg-white dark:bg-gray-600 shadow-sm text-green-500' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        AUTO (EN VIVO)
                    </button>
                </div>
            </div>

            <div className="space-y-4 mb-8">
                {listaArchivos.map((archivo, indice) => {
                    const detalleArchivo = datosEnPantalla?.detalles[indice];

                    return (
                        <div key={archivo.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 items-center">

                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">PDF {indice + 1}</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-empresa transition-colors"
                                    value={archivo.paginas}
                                    onChange={(e) => manejarCambioArchivo(archivo.id, 'paginas', e.target.value)}
                                    placeholder="0"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Tipo</label>
                                <select
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded shadow-sm bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200"
                                    value={archivo.tipoServicio}
                                    onChange={(e) => manejarCambioArchivo(archivo.id, 'tipoServicio', e.target.value)}
                                >
                                    <option value="a4Color">A4 Color</option>
                                    <option value="a4BlancoYNegro">A4 B/N</option>
                                </select>
                            </div>

                            <div className="flex flex-col space-y-2 pt-1 md:col-span-1">
                                <label className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-empresa transition-colors">
                                    <input type="checkbox" className="rounded text-empresa focus:ring-empresa bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" checked={archivo.esDobleFaz} onChange={(e) => manejarCambioArchivo(archivo.id, 'esDobleFaz', e.target.checked)} />
                                    <span className="font-bold">Doble Faz</span>
                                </label>
                                <label className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-empresa transition-colors">
                                    <input type="checkbox" className="rounded text-empresa focus:ring-empresa bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" checked={archivo.anillado} onChange={(e) => manejarCambioArchivo(archivo.id, 'anillado', e.target.checked)} />
                                    <span className="font-bold">Anillado</span>
                                </label>
                            </div>

                            <div className="md:col-span-3 flex justify-end">
                                {detalleArchivo ? (
                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm w-full max-w-sm">
                                        <div className="space-y-1 border-b dark:border-gray-700 pb-2 mb-2">
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
                                        <div className="flex justify-between items-center">
                                            <div className="text-left">
                                                <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">Lista</p>
                                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 line-through">${detalleArchivo.totalMinorista.toLocaleString('es-AR')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold text-green-500 uppercase italic">Subtotal</p>
                                                <p className="text-xl font-black text-green-700 dark:text-green-400 leading-none">${detalleArchivo.totalMayorista.toLocaleString('es-AR')}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-gray-300 dark:text-gray-600 italic text-xs border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 w-full text-center">
                                        {archivo.paginas !== '' && !modoAutomatico ? 'Presione calcular' : 'Esperando datos'}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!modoAutomatico && (
                <button
                    onClick={procesarCalculoManual}
                    className="w-full bg-empresa hover:opacity-90 text-white font-black py-4 rounded-2xl shadow-xl transition-all text-lg uppercase mb-4"
                >
                    Calcular Presupuesto Final
                </button>
            )}

            {datosEnPantalla?.totalRedondeado > 0 && (
                <div className="p-8 bg-gradient-to-br from-empresa to-[#D12E9E] rounded-3xl text-center shadow-2xl text-white relative overflow-hidden transition-all duration-500">
                    <p className="text-white/80 font-bold uppercase tracking-widest text-xs mb-3">Total de la Orden</p>
                    <div className="flex flex-col items-center justify-center">
                        {datosEnPantalla.totalSinRedondear !== datosEnPantalla.totalRedondeado && (
                            <p className="text-lg text-white/60 line-through font-medium mb-1">
                                Exacto: ${datosEnPantalla.totalSinRedondear.toLocaleString('es-AR')}
                            </p>
                        )}
                        <div className="bg-white/20 px-10 py-4 rounded-2xl backdrop-blur-md border border-white/30">
                            <p className="text-7xl font-black tracking-tighter">
                                ${datosEnPantalla.totalRedondeado.toLocaleString('es-AR')}
                            </p>
                        </div>
                        <p className="text-[10px] text-white/90 font-bold mt-4 uppercase tracking-[0.2em]">
                            * Redondeado a cientos
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};