import { useState, useEffect, useMemo } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';
import { FilaArchivo } from './FilaArchivo';     // IMPORTAMOS EL COMPONENTE
import { ResumenOrden } from './ResumenOrden';   // IMPORTAMOS EL COMPONENTE

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
                
                {/* Cabecera y Controles */}
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

                {/* Lista Iterada de Archivos */}
                <div className="space-y-4 mb-8">
                    {listaArchivos.map((archivo, indice) => (
                        <FilaArchivo 
                            key={archivo.id} 
                            archivo={archivo}
                            indice={indice}
                            detalleArchivo={datosEnPantalla?.detalles[indice]}
                            modoAutomatico={modoAutomatico}
                            manejarCambioArchivo={manejarCambioArchivo}
                        />
                    ))}
                    
                    {!modoAutomatico && (
                        <button onClick={procesarCalculoManual} className="w-full bg-gray-900 dark:bg-gray-700 text-white font-black py-5 rounded-3xl shadow-lg transition-all text-lg uppercase tracking-widest mt-4">Actualizar Precios</button>
                    )}
                </div>
            </div>

            {/* Sidebar Importado */}
            <ResumenOrden 
                datosEnPantalla={datosEnPantalla} 
                listaArchivos={listaArchivos} 
            />

        </div>
    );
};