import { useState, useEffect } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';
import Swal from 'sweetalert2';

// DICCIONARIO ESTRUCTURAL: Agregamos la propiedad 'autoCalculado' a los papeles menores
const papelesConfig = [
    { id: 'a4Color', nombre: 'A4 Color', tab: 'clasicas', tipo: 'escala4' },
    { id: 'a4BlancoYNegro', nombre: 'A4 B/N', tab: 'clasicas', tipo: 'escala4' },
    { id: 'a3ObraColor', nombre: 'A3 Obra Láser', tab: 'obra', tipo: 'escala4_baja' },
    { id: 'a4ObraColor', nombre: 'A4 Obra Láser', tab: 'obra', tipo: 'escala4_baja', autoCalculado: true },
    { id: 'sa3Ilustracion115', nombre: 'S.A3 Ilust. 115g', tab: 'ilustracion', tipo: 'escala4_baja' },
    { id: 'a4Ilustracion115', nombre: 'A4 Ilust. 115g', tab: 'ilustracion', tipo: 'escala4_baja', autoCalculado: true },
    { id: 'sa3Ilustracion200', nombre: 'S.A3 Ilust. 200g', tab: 'ilustracion', tipo: 'escala4_baja' },
    { id: 'a4Ilustracion200', nombre: 'A4 Ilust. 200g', tab: 'ilustracion', tipo: 'escala4_baja', autoCalculado: true },
    { id: 'sa3Ilustracion300', nombre: 'S.A3 Ilust. 300g', tab: 'ilustracion', tipo: 'escala4_baja' },
    { id: 'a4Ilustracion300', nombre: 'A4 Ilust. 300g', tab: 'ilustracion', tipo: 'escala4_baja', autoCalculado: true },
    { id: 'a4Cartulina', nombre: 'A4 Cartulina Color', tab: 'foto', tipo: 'unico' },
    { id: 'a4Fotografico120', nombre: 'A4 Foto 120g', tab: 'foto', tipo: 'unico' },
    { id: 'a4Fotografico200', nombre: 'A4 Foto 200g', tab: 'foto', tipo: 'unico' },
    { id: 'a4Fotografico250', nombre: 'A4 Foto 250g', tab: 'foto', tipo: 'unico' },
    { id: 'a4FotoAdhesivo135', nombre: 'A4 Foto Adhes. 135g', tab: 'adhesivos', tipo: 'unico' },
    { id: 'sa3OppAdhesivo', nombre: 'S.A3 OPP Adhesivo', tab: 'adhesivos', tipo: 'escala4_baja' },
    { id: 'a4OppAdhesivo', nombre: 'A4 OPP Adhesivo', tab: 'adhesivos', tipo: 'escala4_baja', autoCalculado: true },
    { id: 'sa3IlustracionAdhesivo', nombre: 'S.A3 Ilust. Adhesivo', tab: 'adhesivos', tipo: 'escala4_baja' },
    { id: 'a4IlustracionAdhesivo', nombre: 'A4 Ilust. Adhesivo', tab: 'adhesivos', tipo: 'escala4_baja', autoCalculado: true }
];

const tabsConfig = [
    { id: 'clasicas', nombre: 'Clásicas' },
    { id: 'obra', nombre: 'Obra Láser' },
    { id: 'ilustracion', nombre: 'Ilustración' },
    { id: 'foto', nombre: 'Cartulinas & Fotos' },
    { id: 'adhesivos', nombre: 'Adhesivos' }
];

// DICCIONARIO DE VÍNCULOS: Padre (Grande) -> Hijo (Chico)
const relacionesTamanos = {
    'sa3Ilustracion115': 'a4Ilustracion115',
    'sa3Ilustracion200': 'a4Ilustracion200',
    'sa3Ilustracion300': 'a4Ilustracion300',
    'sa3OppAdhesivo': 'a4OppAdhesivo',
    'sa3IlustracionAdhesivo': 'a4IlustracionAdhesivo',
    'a3ObraColor': 'a4ObraColor' // Incluido también por lógica matemática
};

export const Configuracion = () => {
    const [listaTarifas, setListaTarifas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [tabActivo, setTabActivo] = useState('clasicas');

    useEffect(() => {
        obtenerTarifasBase();
    }, []);

    const obtenerTarifasBase = async () => {
        try {
            setCargando(true);
            const { data, error } = await clienteSupabase.from('tarifasImpresion').select('*');
            if (error) throw error;

            const tarifasCompletas = papelesConfig.map(config => {
                const existeEnBd = data.find(d => d.tipoImpresion === config.id);
                if (existeEnBd) return existeEnBd;
                return {
                    tipoImpresion: config.id,
                    precioHasta50: 0, precioHasta100: 0, precioHasta200: 0, precioMasDe200: 0,
                    esNuevoRegistro: true 
                };
            });

            setListaTarifas(tarifasCompletas);
        } catch (error) {
            console.error("error al cargar tarifas:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las tarifas de la base de datos.' });
        } finally {
            setCargando(false);
        }
    };

    const manejarCambioPrecio = (idPapel, campo, valor, tipoUI) => {
        setListaTarifas(listaActual => {
            const numeroLimpio = parseInt(valor) || 0;
            
            // 1. Actualizamos el papel que el usuario editó
            let nuevaLista = listaActual.map(tarifa => {
                if (tarifa.tipoImpresion === idPapel) {
                    if (tipoUI === 'unico') {
                        return { ...tarifa, precioHasta50: numeroLimpio, precioHasta100: numeroLimpio, precioHasta200: numeroLimpio, precioMasDe200: numeroLimpio };
                    }
                    return { ...tarifa, [campo]: numeroLimpio };
                }
                return tarifa;
            });

            // 2. MAGIA: Si el papel que se editó es un formato grande, actualizamos su A4 a la mitad
            if (relacionesTamanos[idPapel]) {
                const idPapelMenor = relacionesTamanos[idPapel];
                nuevaLista = nuevaLista.map(tarifa => {
                    if (tarifa.tipoImpresion === idPapelMenor) {
                        const valorMitad = Math.round(numeroLimpio / 2);
                        if (tipoUI === 'unico') {
                            return { ...tarifa, precioHasta50: valorMitad, precioHasta100: valorMitad, precioHasta200: valorMitad, precioMasDe200: valorMitad };
                        }
                        return { ...tarifa, [campo]: valorMitad };
                    }
                    return tarifa;
                });
            }

            return nuevaLista;
        });
    };

    const guardarCambiosBd = async () => {
        const esModoOscuro = document.documentElement.classList.contains('dark');
        try {
            setGuardando(true);
            
            const filasParaInsertar = listaTarifas.filter(t => t.esNuevoRegistro).map(t => ({
                tipoImpresion: t.tipoImpresion,
                precioHasta50: t.precioHasta50, precioHasta100: t.precioHasta100, 
                precioHasta200: t.precioHasta200, precioMasDe200: t.precioMasDe200
            }));

            const filasParaActualizar = listaTarifas.filter(t => !t.esNuevoRegistro);

            if (filasParaInsertar.length > 0) {
                const { error: errInsert } = await clienteSupabase.from('tarifasImpresion').insert(filasParaInsertar);
                if (errInsert) throw errInsert;
            }

            const promesasActualizacion = filasParaActualizar.map(tarifa => 
                clienteSupabase.from('tarifasImpresion').update({
                    precioHasta50: tarifa.precioHasta50, precioHasta100: tarifa.precioHasta100,
                    precioHasta200: tarifa.precioHasta200, precioMasDe200: tarifa.precioMasDe200
                }).eq('id', tarifa.id)
            );

            await Promise.all(promesasActualizacion);
            await obtenerTarifasBase();

            Swal.fire({
                icon: 'success', title: '¡Precios Actualizados!',
                toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000,
                background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937',
                customClass: { popup: 'rounded-2xl shadow-xl' }
            });
        } catch (error) {
            console.error("error al guardar cambios:", error);
            Swal.fire({
                icon: 'error', title: 'Error', text: 'Hubo un problema al intentar guardar los precios.',
                background: esModoOscuro ? '#1f2937' : '#ffffff', color: esModoOscuro ? '#ffffff' : '#1f2937'
            });
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-empresa"></div></div>;

    const papelesDelTabActual = papelesConfig.filter(p => p.tab === tabActivo);

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in pb-10">
            
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Panel de Configuración</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestione todas las tarifas de impresión y papelería especial</p>
                </div>
                <button
                    onClick={guardarCambiosBd}
                    disabled={guardando}
                    className={`px-8 py-3.5 rounded-2xl font-black text-white shadow-lg transition-all text-sm uppercase tracking-widest flex items-center gap-2 ${guardando ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:scale-[1.02]'}`}
                >
                    {guardando ? 'Guardando...' : 'Guardar Precios'}
                </button>
            </div>

            <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 mb-2">
                {tabsConfig.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setTabActivo(tab.id)} 
                        className={`px-6 py-3 rounded-2xl whitespace-nowrap font-black text-sm transition-all border-2 ${tabActivo === tab.id ? 'bg-empresa/10 border-empresa text-empresa shadow-sm' : 'bg-white dark:bg-gray-800 border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        {tab.nombre}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {papelesDelTabActual.map((configPapel) => {
                    const tarifa = listaTarifas.find(t => t.tipoImpresion === configPapel.id) || {};
                    const estaBloqueado = configPapel.autoCalculado;
                    
                    const claseInputFijo = `w-full h-12 px-3 pt-1 border rounded-xl font-bold text-gray-800 dark:text-white outline-none transition-all ${
                        estaBloqueado 
                            ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70' 
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-600 focus:border-empresa'
                    }`;

                    return (
                        <div key={configPapel.id} className={`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all ${estaBloqueado ? 'opacity-80' : 'hover:shadow-md'}`}>
                            
                            <div className="border-b border-dashed dark:border-gray-700 pb-3 mb-5 flex justify-between items-center">
                                <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight flex items-center gap-3">
                                    {configPapel.nombre}
                                </h3>
                                {estaBloqueado && (
                                    <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-md uppercase tracking-widest font-bold">
                                        Auto (50%)
                                    </span>
                                )}
                            </div>

                            {configPapel.tipo === 'unico' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="text-[10px] font-bold text-empresa uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">Precio Único</label>
                                        <input
                                            type="number"
                                            className={claseInputFijo}
                                            value={tarifa.precioHasta50 === 0 ? '' : tarifa.precioHasta50}
                                            onChange={(e) => manejarCambioPrecio(configPapel.id, 'precioHasta50', e.target.value, 'unico')}
                                            readOnly={estaBloqueado}
                                            tabIndex={estaBloqueado ? -1 : 0}
                                        />
                                    </div>
                                    <div className="flex items-center text-xs text-gray-400 italic px-2">
                                        * Este precio se aplica sin importar la cantidad.
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="relative">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">
                                            {configPapel.tipo === 'escala4' ? 'Hasta 50' : '1 Unid.'}
                                        </label>
                                        <input type="number" className={claseInputFijo} value={tarifa.precioHasta50 === 0 ? '' : tarifa.precioHasta50} onChange={(e) => manejarCambioPrecio(configPapel.id, 'precioHasta50', e.target.value, 'escala')} readOnly={estaBloqueado} tabIndex={estaBloqueado ? -1 : 0} />
                                    </div>
                                    <div className="relative">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">
                                            {configPapel.tipo === 'escala4' ? 'Hasta 100' : '2 a 5'}
                                        </label>
                                        <input type="number" className={claseInputFijo} value={tarifa.precioHasta100 === 0 ? '' : tarifa.precioHasta100} onChange={(e) => manejarCambioPrecio(configPapel.id, 'precioHasta100', e.target.value, 'escala')} readOnly={estaBloqueado} tabIndex={estaBloqueado ? -1 : 0} />
                                    </div>
                                    <div className="relative">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">
                                            {configPapel.tipo === 'escala4' ? 'Hasta 200' : '6 a 10'}
                                        </label>
                                        <input type="number" className={claseInputFijo} value={tarifa.precioHasta200 === 0 ? '' : tarifa.precioHasta200} onChange={(e) => manejarCambioPrecio(configPapel.id, 'precioHasta200', e.target.value, 'escala')} readOnly={estaBloqueado} tabIndex={estaBloqueado ? -1 : 0} />
                                    </div>
                                    <div className="relative">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase absolute -top-2 left-3 bg-white dark:bg-gray-800 px-1 z-10">
                                            {configPapel.tipo === 'escala4' ? 'Más de 200' : '+ 10'}
                                        </label>
                                        <input type="number" className={claseInputFijo} value={tarifa.precioMasDe200 === 0 ? '' : tarifa.precioMasDe200} onChange={(e) => manejarCambioPrecio(configPapel.id, 'precioMasDe200', e.target.value, 'escala')} readOnly={estaBloqueado} tabIndex={estaBloqueado ? -1 : 0} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};