import { useState, useEffect } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';
import { SIN_DOBLE_FAZ, CON_ANILLADO, USA_ESCALA_BAJA } from './CalculadoraCotizaciones';

const NOMBRES_SERVICIOS = {
    a4Color: "A4 Color", a4BlancoYNegro: "A4 B/N", a4ObraColor: "A4 Obra", a3ObraColor: "A3 Obra",
    a4Cartulina: "A4 Cartulina", a4Fotografico120: "A4 Foto 120g", a4Fotografico200: "A4 Foto 200g",
    a4Fotografico250: "A4 Foto 250g", a4FotoAdhesivo135: "A4 Foto Adhes.", sa3OppAdhesivo: "S.A3 OPP",
    a4OppAdhesivo: "A4 OPP", sa3Ilustracion115: "S.A3 Ilust. 115g", a4Ilustracion115: "A4 Ilust. 115g",
    sa3Ilustracion200: "S.A3 Ilust. 200g", a4Ilustracion200: "A4 Ilust. 200g", sa3Ilustracion300: "S.A3 Ilust. 300g",
    a4Ilustracion300: "A4 Ilust. 300g", sa3IlustracionAdhesivo: "S.A3 Ilust. Adhes.", a4IlustracionAdhesivo: "A4 Ilust. Adhes."
};

const GRUPOS_PAPELES = {
    clasicosA4: { nombre: "Clásicos A4 (Color y B/N)", papeles: ['a4Color', 'a4BlancoYNegro'] },
    obraLaser: { nombre: "Papel Obra Láser (A4 y A3)", papeles: ['a4ObraColor', 'a3ObraColor'] },
    fotograficos: { nombre: "Cartulina y Fotográficos A4", papeles: ['a4Cartulina', 'a4Fotografico120', 'a4Fotografico200', 'a4Fotografico250'] },
    ilustracionA4: { nombre: "Ilustración Láser A4", papeles: ['a4Ilustracion115', 'a4Ilustracion200', 'a4Ilustracion300'] },
    ilustracionSA3: { nombre: "Ilustración Láser Super A3", papeles: ['sa3Ilustracion115', 'sa3Ilustracion200', 'sa3Ilustracion300'] },
    adhesivos: { nombre: "Adhesivos (OPP, Foto, Ilust.)", papeles: ['a4FotoAdhesivo135', 'a4OppAdhesivo', 'sa3OppAdhesivo', 'a4IlustracionAdhesivo', 'sa3IlustracionAdhesivo'] }
};

export const CotizadorRapido = ({ setPantallaActiva, setDatosPrecargados }) => {
    const [tarifas, setTarifas] = useState({});
    const [cargandoTarifas, setCargandoTarifas] = useState(true);
    const [cantidadPaginas, setCantidadPaginas] = useState('');
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('clasicosA4');

    useEffect(() => {
        const obtenerTarifas = async () => {
            try {
                const { data, error } = await clienteSupabase.from('tarifasImpresion').select('*');
                if (error) throw error;
                const tarifasMapeadas = data.reduce((acumulador, tarifa) => ({ ...acumulador, [tarifa.tipoImpresion]: tarifa }), {});
                setTarifas(tarifasMapeadas);
            } catch (error) { console.error("error:", error); } finally { setCargandoTarifas(false); }
        };
        obtenerTarifas();
    }, []);

    const calcularEscenario = (papel, esDobleFaz) => {
        const cantidad = parseInt(cantidadPaginas) || 0;
        if (cantidad <= 0 || !tarifas) return null;

        let costoUnitario = 0;
        let tarifaBase = tarifas[papel];
        let tarifaDobleFaz = tarifas[papel + 'DobleFaz'];
        let escalaUsar = (esDobleFaz && tarifaDobleFaz) ? tarifaDobleFaz : tarifaBase;

        if (!escalaUsar) return null;

        if (USA_ESCALA_BAJA.includes(papel)) {
            if (cantidad <= 1) costoUnitario = escalaUsar.precioHasta50;
            else if (cantidad <= 5) costoUnitario = escalaUsar.precioHasta100;
            else if (cantidad <= 10) costoUnitario = escalaUsar.precioHasta200;
            else costoUnitario = escalaUsar.precioMasDe200;
        } else {
            if (cantidad <= 50) costoUnitario = escalaUsar.precioHasta50;
            else if (cantidad <= 100) costoUnitario = escalaUsar.precioHasta100;
            else if (cantidad <= 200) costoUnitario = escalaUsar.precioHasta200;
            else costoUnitario = escalaUsar.precioMasDe200;
        }

        if (esDobleFaz && !tarifaDobleFaz) {
            costoUnitario *= 1.5;
        }

        const obtenerCostoAnillado = (cant) => {
            if (cant <= 100) return 1500;
            if (cant <= 300) return 1700;
            return 1900;
        };

        const subtotalExacto = cantidad * costoUnitario;
        const totalRedondeado = Math.ceil(subtotalExacto / 100) * 100;
        
        const costoAnilladoActual = obtenerCostoAnillado(cantidad);
        const exactoConAnillado = subtotalExacto + costoAnilladoActual;
        const redondeadoConAnillado = Math.ceil(exactoConAnillado / 100) * 100;

        const efectivoSolo = Math.ceil((subtotalExacto * 0.87) / 100) * 100;
        const efectivoConAnillado = Math.ceil((exactoConAnillado * 0.87) / 100) * 100;

        return { costoUnitario, totalRedondeado, redondeadoConAnillado, efectivoSolo, efectivoConAnillado, costoAnilladoActual };
    };

    const cobrarOpcion = (papelId, esDobleFaz, llevaAnillado) => {
        setDatosPrecargados([{
            id: Date.now(),
            paginas: parseInt(cantidadPaginas),
            copias: 1,
            tipoServicio: papelId,
            esDobleFaz: esDobleFaz,
            anillado: llevaAnillado
        }]);
        setPantallaActiva('calculadora');
    };

    if (cargandoTarifas) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-empresa"></div></div>;

    const escenarios = [];
    if (parseInt(cantidadPaginas) > 0) {
        const papelesDelGrupo = GRUPOS_PAPELES[categoriaSeleccionada].papeles;

        papelesDelGrupo.forEach((papel) => {
            const permiteDobleFaz = !SIN_DOBLE_FAZ.includes(papel);
            const permiteAnillado = CON_ANILLADO.includes(papel);
            const nombreMostrar = NOMBRES_SERVICIOS[papel] || papel;
            const esBlancoYNegro = papel === 'a4BlancoYNegro';

            const colorSimple = esBlancoYNegro ? "bg-gray-600 dark:bg-gray-700" : "bg-pink-500 dark:bg-pink-600";
            const colorDoble = esBlancoYNegro ? "bg-gradient-to-br from-gray-800 to-black dark:from-gray-900 dark:to-black" : "bg-gradient-to-br from-empresa to-[#80185e]";

            const datosSimple = calcularEscenario(papel, false);
            if (datosSimple) {
                escenarios.push({
                    id: `${papel}-simple`, papelId: papel, titulo: nombreMostrar, tipo: "simple",
                    esBlancoYNegro, datos: datosSimple, colorContenedor: colorSimple, permiteAnillado
                });
            }

            if (permiteDobleFaz) {
                const datosDoble = calcularEscenario(papel, true);
                if (datosDoble) {
                    escenarios.push({
                        id: `${papel}-doble`, papelId: papel, titulo: nombreMostrar, tipo: "doble",
                        esBlancoYNegro, datos: datosDoble, colorContenedor: colorDoble, permiteAnillado
                    });
                }
            }
        });
    }

    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pb-10">
            {/* TARJETA SUPERIOR MÁS COMPACTA */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">Cotizador Comparativo</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Compare opciones y haga clic en un precio para facturarlo inmediatamente.</p>
                
                <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <select className="w-full h-14 px-5 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 rounded-2xl font-bold text-base text-center text-gray-800 dark:text-white outline-none focus:border-empresa cursor-pointer appearance-none transition-all" value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)}>
                            {Object.entries(GRUPOS_PAPELES).map(([clave, grupo]) => (
                                <option key={clave} value={clave} className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold">{grupo.nombre}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                        <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-gray-600 text-white px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-md">Grupo de Papeles</div>
                    </div>

                    <div className="w-full sm:w-40 relative">
                        <input type="number" className="w-full h-14 px-5 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 rounded-2xl font-black text-2xl text-center text-gray-800 dark:text-white outline-none focus:border-empresa focus:ring-4 focus:ring-empresa/20 transition-all shadow-inner" value={cantidadPaginas} onChange={(e) => { const val = e.target.value; if (val === '') setCantidadPaginas(''); else setCantidadPaginas(Math.max(0, parseInt(val))); }} placeholder="0" autoFocus />
                        <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-empresa text-white px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-md">Páginas</div>
                    </div>
                </div>
            </div>

            {escenarios.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
                    {escenarios.map((escenario) => (
                        <div key={escenario.id} className={`${escenario.colorContenedor} text-white rounded-3xl shadow-xl overflow-hidden flex flex-col transform transition-transform duration-300 hover:-translate-y-2 relative`}>
                            
                            <div className="p-5 text-center border-b border-white/20 relative overflow-hidden min-h-[140px] flex flex-col justify-center">
                                <div className="absolute -right-4 -top-2 opacity-10 pointer-events-none">
                                    {escenario.tipo === 'doble' ? (
                                        <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                    ) : (
                                        <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    )}
                                </div>
                                <h3 className="text-xl font-black tracking-tight relative z-10">{escenario.titulo}</h3>
                                
                                <div className="flex justify-center items-center gap-2 mt-2 relative z-10">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${escenario.esBlancoYNegro ? 'bg-gray-800 text-gray-200' : 'bg-pink-900/40 text-pink-50'}`}>
                                        <div className={`w-2 h-2 rounded-full ${escenario.esBlancoYNegro ? 'bg-gray-400' : 'bg-pink-300'}`}></div>
                                        {escenario.esBlancoYNegro ? 'B/N' : 'Color'}
                                    </span>
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${escenario.tipo === 'doble' ? 'bg-black/40 text-white' : 'bg-white/20 text-white'}`}>
                                        {escenario.tipo === 'doble' ? (
                                            <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg> Doble Faz</>
                                        ) : (
                                            <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Simple Faz</>
                                        )}
                                    </span>
                                </div>
                                <p className="text-[10px] font-bold text-white bg-black/20 border border-white/10 mx-auto w-max px-3 py-1 rounded-full relative z-10 shadow-inner mt-4">Unitario: ${escenario.datos?.costoUnitario}</p>
                            </div>

                            <div className="p-4 flex-grow bg-white dark:bg-gray-900 flex flex-col gap-3 text-gray-900 dark:text-gray-100">
                                
                                {/* BOTÓN SOLO IMPRESIÓN LIMPIO */}
                                <button 
                                    onClick={() => cobrarOpcion(escenario.papelId, escenario.tipo === 'doble', false)}
                                    className="w-full text-left bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-empresa dark:hover:border-empresa hover:bg-white dark:hover:bg-gray-700 transition-all cursor-pointer"
                                >
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 transition-colors">Solo Impresión</p>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs text-gray-500 font-medium">Lista:</span>
                                        <span className="text-xl font-black text-gray-800 dark:text-white">${escenario.datos?.totalRedondeado.toLocaleString('es-AR')}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-green-600 dark:text-green-500 font-bold">Efectivo:</span>
                                        <span className="text-lg font-black text-green-600 dark:text-green-500">${escenario.datos?.efectivoSolo.toLocaleString('es-AR')}</span>
                                    </div>
                                </button>
                                
                                {/* BOTÓN CON ANILLADO LIMPIO */}
                                {escenario.permiteAnillado && (
                                    <button 
                                        onClick={() => cobrarOpcion(escenario.papelId, escenario.tipo === 'doble', true)}
                                        className="w-full text-left bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all cursor-pointer relative"
                                    >
                                        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-sm">+ ${escenario.datos?.costoAnilladoActual}</div>
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1 transition-colors">Impresión + Anillado</p>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-xs text-gray-500 font-medium">Lista:</span>
                                            <span className="text-xl font-black text-gray-800 dark:text-white">${escenario.datos?.redondeadoConAnillado.toLocaleString('es-AR')}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs text-green-600 dark:text-green-500 font-bold">Efectivo:</span>
                                            <span className="text-lg font-black text-green-600 dark:text-green-500">${escenario.datos?.efectivoConAnillado.toLocaleString('es-AR')}</span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};