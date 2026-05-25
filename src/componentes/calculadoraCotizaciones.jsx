import { useState, useEffect, useMemo } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';
import { FilaArchivo } from './FilaArchivo';
import { ResumenOrden } from './ResumenOrden';
import Swal from 'sweetalert2';

export const SIN_DOBLE_FAZ = ['a4Fotografico120', 'a4Fotografico200', 'a4Fotografico250', 'a4FotoAdhesivo135', 'sa3OppAdhesivo', 'a4OppAdhesivo', 'sa3IlustracionAdhesivo', 'a4IlustracionAdhesivo'];
export const CON_ANILLADO = ['a4Color', 'a4BlancoYNegro', 'a4ObraColor'];
export const USA_ESCALA_BAJA = ['a4ObraColor', 'a3ObraColor', 'a4Ilustracion115', 'sa3Ilustracion115', 'a4Ilustracion200', 'sa3Ilustracion200', 'a4Ilustracion300', 'sa3Ilustracion300', 'a4OppAdhesivo', 'sa3OppAdhesivo', 'a4IlustracionAdhesivo', 'sa3IlustracionAdhesivo'];

export const CalculadoraCotizaciones = ({ datosPrecargados, setDatosPrecargados }) => {
    const [tarifas, setTarifas] = useState({});
    const [cargandoTarifas, setCargandoTarifas] = useState(true);

    const [modoAutomatico, setModoAutomatico] = useState(() => {
        const modoGuardado = window.localStorage.getItem('preferenciaModoAutomatico');
        if (modoGuardado !== null) return JSON.parse(modoGuardado);
        return false;
    });

    const [listaArchivos, setListaArchivos] = useState([{ id: Date.now(), paginas: '', copias: 1, tipoServicio: 'a4Color', esDobleFaz: false, anillado: false }]);
    const [montoLibreria, setMontoLibreria] = useState('');
    const [resultadoManual, setResultadoManual] = useState(null);

    useEffect(() => {
        if (datosPrecargados) {
            const listaConVacia = [...datosPrecargados, {
                id: Date.now() + Math.random(), paginas: '', copias: 1, tipoServicio: 'a4Color', esDobleFaz: false, anillado: false
            }];
            setListaArchivos(listaConVacia);
            setModoAutomatico(true);
            setDatosPrecargados(null);
        }
    }, [datosPrecargados, setDatosPrecargados]);

    useEffect(() => { window.localStorage.setItem('preferenciaModoAutomatico', JSON.stringify(modoAutomatico)); }, [modoAutomatico]);

    useEffect(() => {
        const obtenerTarifas = async () => {
            try {
                const { data, error } = await clienteSupabase.from('tarifasImpresion').select('*');
                if (error) throw error;
                const tarifasMapeadas = data.reduce((acumulador, tarifa) => ({ ...acumulador, [tarifa.tipoImpresion]: tarifa }), {});
                setTarifas(tarifasMapeadas);
            } catch (error) { console.error("error al obtener tarifas:", error); } finally { setCargandoTarifas(false); }
        };
        obtenerTarifas();
    }, []);

    const realizarCalculos = (archivos, tablaTarifas, adicionalLibreria) => {
        let acumuladoMayorista = 0;
        const agrupacionPorVolumen = {};
        const resumenDetallado = { cantidadArchivosImpresos: 0, cantidadAnillados: 0, paginas: {} };

        const obtenerCostoAnillado = (cantidadPaginas) => {
            if (cantidadPaginas === 0) return 1500;
            if (cantidadPaginas <= 100) return 1500;
            if (cantidadPaginas <= 300) return 1700;
            return 1900;
        };

        archivos.forEach(archivo => {
            const copias = parseInt(archivo.copias) || 1;
            const paginasUnidad = parseInt(archivo.paginas) || 0;
            const totalPaginas = paginasUnidad * copias;

            if (totalPaginas > 0) {
                resumenDetallado.cantidadArchivosImpresos += copias;
                const claveGrupo = `${archivo.tipoServicio}-${archivo.esDobleFaz}`;
                agrupacionPorVolumen[claveGrupo] = (agrupacionPorVolumen[claveGrupo] || 0) + totalPaginas;
                resumenDetallado.paginas[claveGrupo] = (resumenDetallado.paginas[claveGrupo] || 0) + totalPaginas;
            }
            if (archivo.anillado) resumenDetallado.cantidadAnillados += copias;
        });

        const detallesPorArchivo = archivos.map(archivo => {
            const copias = parseInt(archivo.copias) || 1;
            const paginasUnidad = parseInt(archivo.paginas) || 0;
            const totalPaginas = paginasUnidad * copias;
            const tieneAnillado = archivo.anillado;

            if (totalPaginas <= 0 && !tieneAnillado) return null;

            let subtotalImpresionMayorista = 0, subtotalImpresionMinorista = 0;
            let precioUnitarioMayorista = 0, costoImpresionUnJuegoMinorista = 0, costoImpresionUnJuegoMayorista = 0;

            if (totalPaginas > 0) {
                const totalPaginasDelGrupo = agrupacionPorVolumen[`${archivo.tipoServicio}-${archivo.esDobleFaz}`];

                let tarifaBase = tablaTarifas[archivo.tipoServicio];
                let tarifaDobleFaz = tablaTarifas[archivo.tipoServicio + 'DobleFaz'];
                let escalaUsar = (archivo.esDobleFaz && tarifaDobleFaz) ? tarifaDobleFaz : tarifaBase;

                if (escalaUsar) {
                    const obtenerCostoUnitario = (cant) => {
                        if (USA_ESCALA_BAJA.includes(archivo.tipoServicio)) {
                            if (cant <= 1) return escalaUsar.precioHasta50;
                            if (cant <= 5) return escalaUsar.precioHasta100;
                            if (cant <= 10) return escalaUsar.precioHasta200;
                            return escalaUsar.precioMasDe200;
                        } else {
                            if (cant <= 50) return escalaUsar.precioHasta50;
                            if (cant <= 100) return escalaUsar.precioHasta100;
                            if (cant <= 200) return escalaUsar.precioHasta200;
                            return escalaUsar.precioMasDe200;
                        }
                    };

                    let unitarioMinorista = obtenerCostoUnitario(paginasUnidad);
                    precioUnitarioMayorista = obtenerCostoUnitario(totalPaginasDelGrupo);

                    if (archivo.esDobleFaz && !tarifaDobleFaz) {
                        unitarioMinorista *= 1.5;
                        precioUnitarioMayorista *= 1.5;
                    }

                    costoImpresionUnJuegoMinorista = paginasUnidad * unitarioMinorista;
                    costoImpresionUnJuegoMayorista = paginasUnidad * precioUnitarioMayorista;

                    subtotalImpresionMinorista = costoImpresionUnJuegoMinorista * copias;
                    subtotalImpresionMayorista = costoImpresionUnJuegoMayorista * copias;
                }
            }

            const costoAnilladoUnitario = tieneAnillado ? obtenerCostoAnillado(paginasUnidad) : 0;
            const costoAnilladoTotal = costoAnilladoUnitario * copias;

            const totalMinoristaUnJuego = costoImpresionUnJuegoMinorista + costoAnilladoUnitario;
            const totalMayoristaUnJuego = costoImpresionUnJuegoMayorista + costoAnilladoUnitario;

            const totalMinorista = subtotalImpresionMinorista + costoAnilladoTotal;
            const totalMayorista = subtotalImpresionMayorista + costoAnilladoTotal;
            acumuladoMayorista += totalMayorista;

            return {
                precioUnitarioMayorista, subtotalImpresion: subtotalImpresionMayorista,
                costoAnillado: costoAnilladoTotal, totalMinorista, totalMayorista,
                copias, paginasUnidad, totalPaginas, totalMinoristaUnJuego, totalMayoristaUnJuego
            };
        });

        const valorLibreria = parseInt(adicionalLibreria) || 0;
        acumuladoMayorista += valorLibreria;

        return { detalles: detallesPorArchivo, resumen: resumenDetallado, totalSinRedondear: acumuladoMayorista, montoLibreria: valorLibreria };
    };

    const resultadoAutomatico = useMemo(() => realizarCalculos(listaArchivos, tarifas, montoLibreria), [listaArchivos, tarifas, montoLibreria]);
    const datosEnPantalla = modoAutomatico ? resultadoAutomatico : resultadoManual;

    // EL PUENTE SE CONSTRUYE AQUÍ
    const guardarOrdenEnBaseDeDatos = async (metodoPago, totalCobrado, datosAgenda = null) => {
        const esModoOscuro = document.documentElement.classList.contains('dark');
        try {
            const archivosValidos = listaArchivos.filter(a => parseInt(a.paginas) > 0 || a.anillado);
            const totalEfectivoBase = Math.ceil((datosEnPantalla.totalSinRedondear * 0.87) / 100) * 100;
            
            if (datosAgenda) {
                const montoSena = datosAgenda.sena > 0 ? datosAgenda.sena : 0;
                if (montoSena > 0) {
                    const ordenSena = {
                        fechaCreacion: new Date().toISOString(), 
                        metodoPago: 'efectivo', 
                        totalCobrado: montoSena,
                        resumenPedido: { ...datosEnPantalla.resumen, notaExtra: 'SEÑA PEDIDO', archivosOriginales: archivosValidos }, 
                        montoLibreria: 0
                    };
                    await clienteSupabase.from('ordenesProduccion').insert([ordenSena]);
                }

                const saldoRestante = totalEfectivoBase - montoSena;
                const detalleFinal = `${archivosValidos.length} Archivo(s). ${datosAgenda.detalleExtra ? 'Extra: ' + datosAgenda.detalleExtra : ''}`;
                const codigoCliente = datosAgenda.telefono.slice(-4);

                const { error: errorTaller } = await clienteSupabase.from('pedidosTaller').insert([{
                    nombreCliente: datosAgenda.nombre || 'Cliente S/N',
                    telefono: datosAgenda.telefono,
                    codigoCliente: codigoCliente,
                    detalle: detalleFinal,
                    fechaEntrega: datosAgenda.fecha,
                    estado: 'sin_iniciar',
                    fechaCreacion: new Date().toISOString(),
                    resumenPedido: { 
                        archivosOriginales: archivosValidos,
                        totalEfectivo: totalEfectivoBase,
                        sena: montoSena,
                        restante: saldoRestante,
                        etiquetaVisual: datosAgenda.etiqueta // ACÁ INYECTAMOS LA ETIQUETA
                    } 
                }]);
                
                if (errorTaller) throw errorTaller;
                Swal.fire({ icon: 'success', title: 'Agendado', text: `Orden #${codigoCliente} enviada al Taller`, toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, background: esModoOscuro ? '#1F2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1F2937' });
            
            } else {
                const nuevaOrdenVenta = {
                    fechaCreacion: new Date().toISOString(), 
                    metodoPago, 
                    totalCobrado,
                    resumenPedido: { ...datosEnPantalla.resumen, archivosOriginales: archivosValidos }, 
                    montoLibreria: datosEnPantalla.montoLibreria
                };
                const { error: errorVenta } = await clienteSupabase.from('ordenesProduccion').insert([nuevaOrdenVenta]);
                if (errorVenta) throw errorVenta;
                Swal.fire({ icon: 'success', title: '¡Venta Registrada!', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000, background: esModoOscuro ? '#1F2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1F2937' });
            }

            setListaArchivos([{ id: Date.now(), paginas: '', copias: 1, tipoServicio: 'a4Color', esDobleFaz: false, anillado: false }]);
            setMontoLibreria('');
            setResultadoManual(null);
            
        } catch (error) {
            console.error("Error:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar.', background: esModoOscuro ? '#1F2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1F2937' });
        }
    };

    const manejarCambioArchivo = (id, campo, valor) => {
        if (!modoAutomatico) setResultadoManual(null);
        let valorFinal = valor;
        if (campo === 'paginas' && valor < 0) valorFinal = 0;
        if (campo === 'copias') valorFinal = valor === '' ? '' : Math.max(1, parseInt(valor));

        setListaArchivos(listaActual => {
            const nuevaLista = listaActual.map(archivo => {
                if (archivo.id === id) {
                    let nuevoArchivo = { ...archivo, [campo]: valorFinal };
                    if (campo === 'tipoServicio') {
                        if (SIN_DOBLE_FAZ.includes(valorFinal)) nuevoArchivo.esDobleFaz = false;
                        if (!CON_ANILLADO.includes(valorFinal)) nuevoArchivo.anillado = false;
                    }
                    return nuevoArchivo;
                }
                return archivo;
            });

            const archivoEditado = nuevaLista.find(a => a.id === id);
            if (nuevaLista[nuevaLista.length - 1].id === id && (archivoEditado.paginas !== '' || archivoEditado.anillado)) {
                nuevaLista.push({ id: Date.now() + Math.random(), paginas: '', copias: 1, tipoServicio: 'a4Color', esDobleFaz: false, anillado: false });
            } else {
                while (nuevaLista.length > 1 && nuevaLista[nuevaLista.length - 2].paginas === '' && !nuevaLista[nuevaLista.length - 2].anillado &&
                    nuevaLista[nuevaLista.length - 1].paginas === '' && !nuevaLista[nuevaLista.length - 1].anillado) {
                    nuevaLista.pop();
                }
            }
            return nuevaLista;
        });
    };

    const manejarCambioLibreria = (valor) => {
        if (!modoAutomatico) setResultadoManual(null);
        setMontoLibreria(valor === '' ? '' : Math.max(0, parseInt(valor)));
    };

    const resetearArchivo = (id) => {
        if (!modoAutomatico) setResultadoManual(null);
        setListaArchivos(listaActual => {
            const nuevaLista = listaActual.map(archivo => archivo.id === id ? { ...archivo, paginas: '', copias: 1, tipoServicio: 'a4Color', esDobleFaz: false, anillado: false } : archivo);
            while (nuevaLista.length > 1 && nuevaLista[nuevaLista.length - 2].paginas === '' && !nuevaLista[nuevaLista.length - 2].anillado &&
                nuevaLista[nuevaLista.length - 1].paginas === '' && !nuevaLista[nuevaLista.length - 1].anillado) {
                nuevaLista.pop();
            }
            return nuevaLista;
        });
    };

    const procesarCalculoManual = () => setResultadoManual(realizarCalculos(listaArchivos, tarifas, montoLibreria));

    if (cargandoTarifas) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-empresa"></div></div>;

    return (
        <div className="w-full max-w-[1270px] mx-auto flex flex-col lg:flex-row gap-6 items-start transition-all duration-500 pb-20">
            <div className="flex-1 min-w-0 flex flex-col gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Archivos a Imprimir</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestión de carillas y servicios adicionales</p>
                    </div>
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl flex-shrink-0">
                        <button onClick={() => setModoAutomatico(false)} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${!modoAutomatico ? 'bg-white dark:bg-gray-800 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>MANUAL</button>
                        <button onClick={() => { setModoAutomatico(true); setResultadoManual(null); }} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${modoAutomatico ? 'bg-white dark:bg-gray-800 shadow-md text-empresa' : 'text-gray-500 hover:text-gray-700'}`}>AUTO</button>
                    </div>
                </div>

                <div className="space-y-4 mb-2">
                    {listaArchivos.map((archivo, indice) => (
                        <FilaArchivo key={archivo.id} archivo={archivo} detalleArchivo={datosEnPantalla?.detalles[indice]} manejarCambioArchivo={manejarCambioArchivo} resetearArchivo={resetearArchivo} />
                    ))}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center gap-4 transition-all hover:border-empresa/30 mb-2 mt-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-empresa/10 flex items-center justify-center text-empresa"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg></div>
                        <div><h3 className="text-sm font-black text-gray-800 dark:text-white">Librería / Otros</h3><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Anillados extra, útiles, etc.</p></div>
                    </div>
                    <div className="relative w-32 md:w-40">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-black">$</span>
                        <input type="number" className="w-full h-12 pl-8 pr-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-2xl font-black text-lg text-gray-800 dark:text-white outline-none focus:border-empresa text-right transition-all" value={montoLibreria} onChange={(e) => manejarCambioLibreria(e.target.value)} placeholder="0" />
                    </div>
                </div>

                {!modoAutomatico && <button onClick={procesarCalculoManual} className="w-full bg-gray-900 dark:bg-gray-700 text-white font-black py-5 rounded-3xl shadow-lg transition-all text-lg uppercase tracking-widest mt-2">Actualizar Precios</button>}
            </div>

            <ResumenOrden datosEnPantalla={datosEnPantalla} guardarOrdenEnBaseDeDatos={guardarOrdenEnBaseDeDatos} />
        </div>
    );
};