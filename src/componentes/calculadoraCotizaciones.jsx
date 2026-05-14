import { useState, useEffect } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';

export const CalculadoraCotizaciones = () => {
    const [tarifas, setTarifas] = useState({});
    const [cargandoTarifas, setCargandoTarifas] = useState(true);

    const [listaArchivos, setListaArchivos] = useState([
        { id: Date.now(), paginas: '', tipoServicio: 'a4Color', esDobleFaz: false, anillado: false }
    ]);

    const [totalSinRedondear, setTotalSinRedondear] = useState(0);
    const [totalRedondeado, setTotalRedondeado] = useState(0);

    useEffect(() => {
        const obtenerTarifas = async () => {
            try {
                const { data, error } = await clienteSupabase
                    .from('tarifasImpresion')
                    .select('*');

                if (error) throw error;

                const tarifasMapeadas = data.reduce((acumulador, tarifa) => {
                    return { ...acumulador, [tarifa.tipoImpresion]: tarifa };
                }, {});

                setTarifas(tarifasMapeadas);
            } catch (error) {
                console.error("error al cargar las tarifas:", error);
            } finally {
                setCargandoTarifas(false);
            }
        };
        obtenerTarifas();
    }, []);

    const manejarCambioArchivo = (id, campo, valor) => {
        setTotalSinRedondear(0);
        setTotalRedondeado(0);

        const nuevaLista = listaArchivos.map(archivo =>
            archivo.id === id
                ? { ...archivo, [campo]: valor, detalle: null }
                : { ...archivo, detalle: null }
        );

        if (campo === 'paginas') {
            const ultimoArchivo = nuevaLista[nuevaLista.length - 1];
            if (ultimoArchivo.paginas !== '') {
                nuevaLista.push({
                    id: Date.now() + Math.random(),
                    paginas: '',
                    tipoServicio: 'a4Color',
                    esDobleFaz: false,
                    anillado: false
                });
            } else {
                while (
                    nuevaLista.length > 1 &&
                    nuevaLista[nuevaLista.length - 2].paginas === '' &&
                    nuevaLista[nuevaLista.length - 1].paginas === ''
                ) {
                    nuevaLista.pop();
                }
            }
        }
        setListaArchivos(nuevaLista);
    };

    const calcularTotalGeneral = () => {
        let acumuladoMayorista = 0;
        const agrupacionPorVolumen = {};

        listaArchivos.forEach(archivo => {
            const cantidad = parseInt(archivo.paginas) || 0;
            if (cantidad > 0) {
                const claveGrupo = `${archivo.tipoServicio}-${archivo.esDobleFaz}`;
                agrupacionPorVolumen[claveGrupo] = (agrupacionPorVolumen[claveGrupo] || 0) + cantidad;
            }
        });

        const listaConResultados = listaArchivos.map(archivo => {
            const cantidad = parseInt(archivo.paginas) || 0;
            if (cantidad <= 0) return { ...archivo, detalle: null };

            const claveGrupo = `${archivo.tipoServicio}-${archivo.esDobleFaz}`;
            const totalPaginasDelGrupo = agrupacionPorVolumen[claveGrupo];
            let claveTarifa = archivo.tipoServicio + (archivo.esDobleFaz ? 'DobleFaz' : '');
            const escala = tarifas[claveTarifa];

            if (!escala) return { ...archivo, detalle: null };

            const obtenerCostoUnitario = (cant) => {
                if (cant <= 50) return escala.precioHasta50;
                if (cant <= 100) return escala.precioHasta100;
                if (cant <= 200) return escala.precioHasta200;
                return escala.precioMasDe200;
            };

            const costoUnitarioMinorista = obtenerCostoUnitario(cantidad);
            const costoUnitarioMayorista = obtenerCostoUnitario(totalPaginasDelGrupo);

            const subtotalImpresionMayorista = cantidad * costoUnitarioMayorista;
            const subtotalImpresionMinorista = cantidad * costoUnitarioMinorista;
            const costoAnillado = archivo.anillado ? 1500 : 0;

            const totalMinorista = subtotalImpresionMinorista + costoAnillado;
            const totalMayorista = subtotalImpresionMayorista + costoAnillado;

            acumuladoMayorista += totalMayorista;

            return {
                ...archivo,
                detalle: {
                    precioUnitarioMayorista: costoUnitarioMayorista,
                    subtotalImpresion: subtotalImpresionMayorista,
                    costoAnillado: costoAnillado,
                    totalMinorista: totalMinorista,
                    totalMayorista: totalMayorista,
                    ahorroDetectado: totalMinorista > totalMayorista
                }
            };
        });

        setListaArchivos(listaConResultados);
        setTotalSinRedondear(acumuladoMayorista);
        setTotalRedondeado(Math.ceil(acumuladoMayorista / 100) * 100);
    };

    if (cargandoTarifas) return <div className="p-10 text-center animate-pulse text-gray-500 font-bold">CARGANDO TARIFAS...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">cotización de pedidos</h2>

            <div className="space-y-4 mb-8">
                {listaArchivos.map((archivo, indice) => (
                    <div key={archivo.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 items-center transition-all">

                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">pdf {indice + 1}</label>
                            <input
                                type="number"
                                className="w-full p-2 border border-gray-300 rounded shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700"
                                value={archivo.paginas}
                                onChange={(e) => manejarCambioArchivo(archivo.id, 'paginas', e.target.value)}
                                placeholder="págs"
                            />
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">tipo</label>
                            <select
                                className="w-full p-2 border border-gray-300 rounded shadow-sm bg-white text-sm font-medium"
                                value={archivo.tipoServicio}
                                onChange={(e) => manejarCambioArchivo(archivo.id, 'tipoServicio', e.target.value)}
                            >
                                <option value="a4Color">a4 color</option>
                                <option value="a4BlancoYNegro">a4 b/n</option>
                            </select>
                        </div>

                        <div className="flex flex-col space-y-2 pt-1 md:col-span-1">
                            <label className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer hover:text-blue-600 transition-colors">
                                <input type="checkbox" className="rounded" checked={archivo.esDobleFaz} onChange={(e) => manejarCambioArchivo(archivo.id, 'esDobleFaz', e.target.checked)} />
                                <span className="font-semibold">doble faz</span>
                            </label>
                            <label className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer hover:text-blue-600 transition-colors">
                                <input type="checkbox" className="rounded" checked={archivo.anillado} onChange={(e) => manejarCambioArchivo(archivo.id, 'anillado', e.target.checked)} />
                                <span className="font-semibold">anillado</span>
                            </label>
                        </div>

                        <div className="md:col-span-3 flex justify-end">
                            {archivo.detalle ? (
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm w-full max-w-sm">
                                    {/* Desglose de costos */}
                                    <div className="space-y-1 border-b border-gray-100 pb-2 mb-2">
                                        <div className="flex justify-between text-[11px] text-gray-600">
                                            <span>Impresiones ({archivo.paginas} x ${archivo.detalle.precioUnitarioMayorista})</span>
                                            <span className="font-bold">${archivo.detalle.subtotalImpresion.toLocaleString('es-AR')}</span>
                                        </div>
                                        {archivo.anillado && (
                                            <div className="flex justify-between text-[11px] text-blue-600 font-bold">
                                                <span>Servicio de Anillado</span>
                                                <span>+ $1.500</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Totales y Ahorro */}
                                    <div className="flex justify-between items-center">
                                        <div className="text-left">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Precio Normal</p>
                                            <p className="text-sm font-bold text-gray-400 line-through">${archivo.detalle.totalMinorista.toLocaleString('es-AR')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-green-500 uppercase italic">Subtotal Archivo</p>
                                            <p className="text-xl font-black text-green-700 leading-none">${archivo.detalle.totalMayorista.toLocaleString('es-AR')}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-300 italic text-sm border-2 border-dashed border-gray-100 rounded-lg p-4 w-full text-center">
                                    {archivo.paginas !== '' ? 'calculando detalle...' : 'esperando datos del archivo'}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={calcularTotalGeneral} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all text-xl uppercase tracking-wider mb-2">
                Calcular Presupuesto Final
            </button>

            {totalRedondeado > 0 && (
                <div className="mt-6 p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-center shadow-2xl relative overflow-hidden text-white">
                    <p className="text-blue-100 font-bold uppercase tracking-widest text-xs mb-3 opacity-80">Total final de la orden de trabajo</p>

                    <div className="flex flex-col items-center justify-center">
                        {totalSinRedondear !== totalRedondeado && (
                            <p className="text-lg text-blue-200 line-through font-medium mb-1 opacity-60">
                                Exacto: ${totalSinRedondear.toLocaleString('es-AR')}
                            </p>
                        )}
                        <div className="bg-white/10 px-8 py-4 rounded-2xl backdrop-blur-sm border border-white/20">
                            <p className="text-7xl font-black drop-shadow-lg">
                                ${totalRedondeado.toLocaleString('es-AR')}
                            </p>
                        </div>
                        <p className="text-[11px] text-blue-200 font-bold mt-4 uppercase tracking-widest bg-blue-800/40 px-3 py-1 rounded-full">
                            * Redondeado a cientos para cobro en mostrador
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};