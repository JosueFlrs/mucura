import { useState, useEffect } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';

export const CalculadoraCotizaciones = () => {
    const [tarifas, setTarifas] = useState({});
    const [cargandoTarifas, setCargandoTarifas] = useState(true);

    // estados para las cantidades ingresadas
    const [cantidadA4Color, setCantidadA4Color] = useState(0);
    const [cantidadA4BlancoYNegro, setCantidadA4BlancoYNegro] = useState(0);

    // estados para los servicios adicionales
    const [costoEncuadernado, setCostoEncuadernado] = useState(0);
    const [costoLibreria, setCostoLibreria] = useState(0);

    // estado para el resultado
    const [cotizacionFinal, setCotizacionFinal] = useState(0);

    const obtenerTarifas = async () => {
        try {
            const { data, error } = await clienteSupabase
                .from('tarifasImpresion')
                .select('*');

            if (error) throw error;

            // mapeamos el array a un objeto para buscar por tipo de impresion mas facil
            const tarifasMapeadas = data.reduce((acumulador, tarifa) => {
                acumulador[tarifa.tipoImpresion] = tarifa;
                return acumulador;
            }, {});

            setTarifas(tarifasMapeadas);
        } catch (error) {
            console.error("error al obtener las tarifas: ", error);
        } finally {
            setCargandoTarifas(false);
        }
    };

    useEffect(() => {
        obtenerTarifas();
    }, []);

    const calcularCostoPorEscala = (cantidad, escalaDePrecios) => {
        if (!escalaDePrecios || cantidad <= 0) return 0;

        // usamos los nombres exactos de las columnas de nuestra base de datos
        if (cantidad <= 50) return cantidad * escalaDePrecios.precioHasta50;
        if (cantidad <= 100) return cantidad * escalaDePrecios.precioHasta100;
        if (cantidad <= 200) return cantidad * escalaDePrecios.precioHasta200;

        return cantidad * escalaDePrecios.precioMasDe200;
    };

    const procesarCotizacion = () => {
        const totalA4Color = calcularCostoPorEscala(cantidadA4Color, tarifas.a4Color);
        const totalA4BlancoYNegro = calcularCostoPorEscala(cantidadA4BlancoYNegro, tarifas.a4BlancoYNegro);

        const subtotalImpresiones = totalA4Color + totalA4BlancoYNegro;
        const totalAdicionales = Number(costoEncuadernado) + Number(costoLibreria);

        setCotizacionFinal(subtotalImpresiones + totalAdicionales);
    };

    if (cargandoTarifas) {
        return (
            <div className="flex justify-center items-center p-10">
                <p className="text-xl text-gray-600 font-semibold animate-pulse">
                    cargando tarifas desde la base de datos...
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">nueva cotizacion</h2>

            <div className="mb-6 grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">a4 color (cantidad)</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        value={cantidadA4Color}
                        onChange={(evento) => setCantidadA4Color(evento.target.value)}
                    />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">a4 blanco y negro (cantidad)</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        value={cantidadA4BlancoYNegro}
                        onChange={(evento) => setCantidadA4BlancoYNegro(evento.target.value)}
                    />
                </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">encuadernado ($)</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        value={costoEncuadernado}
                        onChange={(evento) => setCostoEncuadernado(evento.target.value)}
                    />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">productos de libreria ($)</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        value={costoLibreria}
                        onChange={(evento) => setCostoLibreria(evento.target.value)}
                    />
                </div>
            </div>

            <button
                onClick={procesarCotizacion}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors"
            >
                calcular total
            </button>

            {cotizacionFinal > 0 && (
                <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center animate-fade-in-up">
                    <p className="text-sm text-green-600 font-semibold mb-1">total a cobrar</p>
                    <p className="text-4xl font-bold text-green-700">
                        ${cotizacionFinal.toLocaleString('es-AR')}
                    </p>
                </div>
            )}
        </div>
    );
};