import { useState, useEffect } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';

export const CalculadoraCotizaciones = () => {
    const [tarifas, setTarifas] = useState({});
    const [cargandoTarifas, setCargandoTarifas] = useState(true);

    // Iniciamos la lista con un solo archivo vacío por default
    const [listaArchivos, setListaArchivos] = useState([
        { id: Date.now(), paginas: '', tipoServicio: 'a4Color', esDobleFaz: false, anillado: false }
    ]);

    const [cotizacionFinal, setCotizacionFinal] = useState(0);

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
        // 1. Actualizamos el archivo que el usuario está modificando
        const nuevaLista = listaArchivos.map(archivo =>
            archivo.id === id ? { ...archivo, [campo]: valor } : archivo
        );

        // 2. Lógica inteligente para agregar o quitar el último input
        if (campo === 'paginas') {
            const ultimoArchivo = nuevaLista[nuevaLista.length - 1];

            // Si el último input de la lista se acaba de llenar, agregamos uno nuevo vacío abajo
            if (ultimoArchivo.paginas !== '') {
                nuevaLista.push({
                    id: Date.now() + Math.random(),
                    paginas: '',
                    tipoServicio: 'a4Color',
                    esDobleFaz: false,
                    anillado: false
                });
            }
            // Si el usuario borró contenido, revisamos si sobraron inputs vacíos al final
            else {
                // Mientras haya más de un elemento y los últimos dos estén vacíos, borramos el que sobra
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
        let acumulado = 0;

        listaArchivos.forEach(archivo => {
            const cantidad = parseInt(archivo.paginas) || 0;

            if (cantidad <= 0) return;

            let claveTarifa = archivo.tipoServicio;
            if (archivo.esDobleFaz) {
                claveTarifa += 'DobleFaz';
            }

            const escala = tarifas[claveTarifa];

            if (!escala) return;

            let costoUnitario = 0;

            if (cantidad <= 50) costoUnitario = escala.precioHasta50;
            else if (cantidad <= 100) costoUnitario = escala.precioHasta100;
            else if (cantidad <= 200) costoUnitario = escala.precioHasta200;
            else costoUnitario = escala.precioMasDe200;

            let subtotalArchivo = cantidad * costoUnitario;

            if (archivo.anillado) {
                subtotalArchivo += 1500;
            }

            acumulado += subtotalArchivo;
        });

        setCotizacionFinal(acumulado);
    };

    if (cargandoTarifas) {
        return (
            <div className="flex justify-center items-center p-10">
                <p className="text-xl text-gray-600 font-semibold animate-pulse">
                    cargando tarifas de impresion...
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">cotizacion por archivos</h2>

            <div className="space-y-4 mb-8">
                {listaArchivos.map((archivo, indice) => (
                    <div key={archivo.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 items-center transition-all duration-300 ease-in-out">

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">pdf {indice + 1} (paginas)</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                                value={archivo.paginas}
                                onChange={(evento) => manejarCambioArchivo(archivo.id, 'paginas', evento.target.value)}
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">tipo de impresion</label>
                            <select
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={archivo.tipoServicio}
                                onChange={(evento) => manejarCambioArchivo(archivo.id, 'tipoServicio', evento.target.value)}
                            >
                                <option value="a4Color">a4 color</option>
                                <option value="a4BlancoYNegro">a4 blanco y negro</option>
                            </select>
                        </div>

                        <div className="flex flex-col space-y-2 pt-2 md:col-span-2">
                            <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer w-max">
                                <input
                                    type="checkbox"
                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                    checked={archivo.esDobleFaz}
                                    onChange={(evento) => manejarCambioArchivo(archivo.id, 'esDobleFaz', evento.target.checked)}
                                />
                                <span className="font-medium">es doble faz</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer w-max">
                                <input
                                    type="checkbox"
                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                    checked={archivo.anillado}
                                    onChange={(evento) => manejarCambioArchivo(archivo.id, 'anillado', evento.target.checked)}
                                />
                                <span className="font-medium">incluye anillado ($1500)</span>
                            </label>
                        </div>

                        <div className="text-right italic text-gray-400 text-sm md:col-span-1">
                            {archivo.paginas === '' ? 'nuevo archivo...' : `archivo ${indice + 1}`}
                        </div>

                    </div>
                ))}
            </div>

            <button
                onClick={calcularTotalGeneral}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-md transition-all text-lg"
            >
                calcular presupuesto total
            </button>

            {cotizacionFinal > 0 && (
                <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl text-center shadow-inner animate-fade-in-up">
                    <p className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-1">total a cobrar</p>
                    <p className="text-5xl font-black text-blue-900">
                        ${cotizacionFinal.toLocaleString('es-AR')}
                    </p>
                </div>
            )}
        </div>
    );
};