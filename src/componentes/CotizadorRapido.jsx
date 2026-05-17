import { useState, useEffect } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';
import { PRECIOS_ESPECIALES, SIN_DOBLE_FAZ } from './CalculadoraCotizaciones';

export const CotizadorRapido = () => {
    const [tarifas, setTarifas] = useState({});
    const [cargandoTarifas, setCargandoTarifas] = useState(true);
    const [cantidadPaginas, setCantidadPaginas] = useState('');
    const [papelSeleccionado, setPapelSeleccionado] = useState('a4Color');

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

    const calcularEscenario = (esDobleFaz) => {
        const cantidad = parseInt(cantidadPaginas) || 0;
        if (cantidad <= 0 || !tarifas) return null;

        let costoUnitario = 0;

        if (PRECIOS_ESPECIALES[papelSeleccionado]) {
            const config = PRECIOS_ESPECIALES[papelSeleccionado];
            for (let escala of config.escalas) {
                if (cantidad <= escala.max) {
                    costoUnitario = escala.precio;
                    break;
                }
            }
            if (esDobleFaz) costoUnitario *= 1.5;
        } else {
            const claveTarifa = papelSeleccionado + (esDobleFaz ? 'DobleFaz' : '');
            const escala = tarifas[claveTarifa];
            if (!escala) return null;
            if (cantidad <= 50) costoUnitario = escala.precioHasta50;
            else if (cantidad <= 100) costoUnitario = escala.precioHasta100;
            else if (cantidad <= 200) costoUnitario = escala.precioHasta200;
            else costoUnitario = escala.precioMasDe200;
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

    if (cargandoTarifas) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-empresa"></div></div>;

    const permiteDobleFaz = !SIN_DOBLE_FAZ.includes(papelSeleccionado);
    
    // Generamos las tarjetas de forma dinámica
    const escenarios = [];
    if (calcularEscenario(false)) {
        escenarios.push({ id: 1, subtitulo: "Simple Faz", datos: calcularEscenario(false), color: "bg-gray-800", textoColor: "text-gray-100" });
    }
    if (permiteDobleFaz && calcularEscenario(true)) {
        escenarios.push({ id: 2, subtitulo: "Doble Faz", datos: calcularEscenario(true), color: "bg-gradient-to-br from-empresa to-[#D12E9E]", textoColor: "text-white" });
    }

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-8 animate-fade-in pb-10">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">Consulta Rápida de Precios</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Seleccione papel e ingrese la cantidad de páginas para ver las opciones al instante</p>
                
                <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <select className="w-full h-20 px-6 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 rounded-3xl font-bold text-lg text-center text-gray-800 dark:text-white outline-none focus:border-empresa cursor-pointer" value={papelSeleccionado} onChange={(e) => setPapelSeleccionado(e.target.value)}>
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
                                <option value="a4Fotografico120">A4 Fotográfico 120g</option>
                                <option value="a4Fotografico200">A4 Fotográfico 200g</option>
                                <option value="a4Fotografico250">A4 Fotográfico 250g</option>
                            </optgroup>
                            <optgroup label="Ilustración Láser Color">
                                <option value="a4Ilustracion115">A4 Ilustración 115g</option>
                                <option value="sa3Ilustracion115">S.A3 Ilustración 115g</option>
                                <option value="a4Ilustracion200">A4 Ilustración 200g</option>
                                <option value="sa3Ilustracion200">S.A3 Ilustración 200g</option>
                                <option value="a4Ilustracion300">A4 Ilustración 300g</option>
                                <option value="sa3Ilustracion300">S.A3 Ilustración 300g</option>
                            </optgroup>
                            <optgroup label="Adhesivos">
                                <option value="a4FotoAdhesivo135">A4 Foto Adhesivo 135g</option>
                                <option value="a4OppAdhesivo">A4 OPP Adhesivo</option>
                                <option value="sa3OppAdhesivo">S.A3 OPP Adhesivo</option>
                                <option value="a4IlustracionAdhesivo">A4 Ilust. Adhesivo</option>
                                <option value="sa3IlustracionAdhesivo">S.A3 Ilust. Adhesivo</option>
                            </optgroup>
                        </select>
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md">Tipo de Papel</div>
                    </div>

                    <div className="w-full sm:w-48 relative">
                        <input type="number" className="w-full h-20 px-6 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 rounded-3xl font-black text-4xl text-center text-gray-800 dark:text-white outline-none focus:border-empresa focus:ring-4 focus:ring-empresa/20 transition-all shadow-inner" value={cantidadPaginas} onChange={(e) => { const val = e.target.value; if (val === '') setCantidadPaginas(''); else setCantidadPaginas(Math.max(0, parseInt(val))); }} placeholder="0" autoFocus />
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-empresa text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md">Páginas</div>
                    </div>
                </div>
            </div>

            {parseInt(cantidadPaginas) > 0 && escenarios.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
                    {escenarios.map((escenario) => (
                        <div key={escenario.id} className={`${escenario.color} rounded-3xl shadow-xl overflow-hidden flex flex-col transform transition-transform duration-300 hover:-translate-y-2`}>
                            <div className="p-6 text-center border-b border-white/10">
                                <h3 className={`text-2xl font-black ${escenario.textoColor} tracking-tight`}>Opciones</h3>
                                <p className={`text-sm font-bold opacity-80 uppercase tracking-widest mt-1 ${escenario.textoColor}`}>{escenario.subtitulo}</p>
                                <p className="text-[10px] opacity-60 mt-3 font-medium">Costo unitario: ${escenario.datos?.costoUnitario}</p>
                            </div>
                            <div className="p-6 flex-grow bg-white dark:bg-gray-900 flex flex-col gap-4">
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Solo Impresión</p>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs text-gray-500 font-medium">Lista:</span>
                                        <span className="text-xl font-black text-gray-800 dark:text-white">${escenario.datos?.totalRedondeado.toLocaleString('es-AR')}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-green-600 dark:text-green-500 font-bold">Efectivo:</span>
                                        <span className="text-lg font-black text-green-600 dark:text-green-500">${escenario.datos?.efectivoSolo.toLocaleString('es-AR')}</span>
                                    </div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30 relative">
                                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-sm">+ ${escenario.datos?.costoAnilladoActual}</div>
                                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Impresión + Anillado</p>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs text-gray-500 font-medium">Lista:</span>
                                        <span className="text-xl font-black text-gray-800 dark:text-white">${escenario.datos?.redondeadoConAnillado.toLocaleString('es-AR')}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-green-600 dark:text-green-500 font-bold">Efectivo:</span>
                                        <span className="text-lg font-black text-green-600 dark:text-green-500">${escenario.datos?.efectivoConAnillado.toLocaleString('es-AR')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};