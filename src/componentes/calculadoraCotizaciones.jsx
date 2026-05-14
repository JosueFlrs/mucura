import { useState, useEffect } from 'react';
import { clienteSupabase } from '../servicios/clienteSupabase';

export const CalculadoraCotizaciones = () => {
    const [tarifas, setTarifas] = useState({});
    const [cargandoTarifas, setCargandoTarifas] = useState(true);

    // renombramos un poco mentalmente: esto es cantidad de páginas del PDF
    const [cantidadA4Color, setCantidadA4Color] = useState(0);
    const [esDobleFazA4Color, setEsDobleFazA4Color] = useState(false);

    const [cantidadA4BlancoYNegro, setCantidadA4BlancoYNegro] = useState(0);
    const [esDobleFazA4BlancoYNegro, setEsDobleFazA4BlancoYNegro] = useState(false);

    const [costoEncuadernado, setCostoEncuadernado] = useState(0);
    const [costoLibreria, setCostoLibreria] = useState(0);

    const [cotizacionFinal, setCotizacionFinal] = useState(0);

    const obtenerTarifas = async () => {
        try {
            const { data, error } = await clienteSupabase
                .from('tarifasImpresion')
                .select('*');

            if (error) throw error;

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

    // simplificamos la funcion: ya no multiplica por 2
    const calcularCostoPorEscala = (cantidadPaginas, escalaDePrecios) => {
        if (!escalaDePrecios || cantidadPaginas <= 0) return 0;

        let costoUnitario = 0;
        if (cantidadPaginas <= 50) costoUnitario = escalaDePrecios.precioHasta50;
        else if (cantidadPaginas <= 100) costoUnitario = escalaDePrecios.precioHasta100;
        else if (cantidadPaginas <= 200) costoUnitario = escalaDePrecios.precioHasta200;
        else costoUnitario = escalaDePrecios.precioMasDe200;

        return cantidadPaginas * costoUnitario;
    };

    const procesarCotizacion = () => {
        // elegimos la tabla de precios correcta segun el checkbox
        const tarifaA4Color = esDobleFazA4Color ? tarifas.a4ColorDobleFaz : tarifas.a4Color;
        const tarifaA4BlancoYNegro = esDobleFazA4BlancoYNegro ? tarifas.a4BlancoYNegroDobleFaz : tarifas.a4BlancoYNegro;

        // calculamos pasando la cantidad ingresada y la tarifa elegida
        const totalA4Color = calcularCostoPorEscala(cantidadA4Color, tarifaA4Color);
        const totalA4BlancoYNegro = calcularCostoPorEscala(cantidadA4BlancoYNegro, tarifaA4BlancoYNegro);

        const subtotalImpresiones = totalA4Color + totalA4BlancoYNegro;
        const totalAdicionales = Number(costoEncuadernado) + Number(costoLibreria);

        setCotizacionFinal(subtotalImpresiones + totalAdicionales);
    };

    if (cargandoTarifas) {
        return (
            <div className="flex justify-center items-center p-10">
                <p className="text-xl text-gray-600 font-semibold animate-pulse">
                    cargando tarifas...
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">nueva cotizacion</h2>

            <div className="mb-6 grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">a4 color (paginas del pdf)</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 outline-none mb-3"
                        value={cantidadA4Color}
                        onChange={(evento) => setCantidadA4Color(evento.target.value)}
                    />
                    <label className="flex items-center space-x-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            className="rounded text-blue-600 focus:ring-blue-500"
                            checked={esDobleFazA4Color}
                            onChange={(evento) => setEsDobleFazA4Color(evento.target.checked)}
                        />
                        <span>es doble faz</span>
                    </label>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">a4 blanco y negro (paginas del pdf)</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 outline-none mb-3"
                        value={cantidadA4BlancoYNegro}
                        onChange={(evento) => setCantidadA4BlancoYNegro(evento.target.value)}
                    />
                    <label className="flex items-center space-x-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            className="rounded text-blue-600 focus:ring-blue-500"
                            checked={esDobleFazA4BlancoYNegro}
                            onChange={(evento) => setEsDobleFazA4BlancoYNegro(evento.target.checked)}
                        />
                        <span>es doble faz</span>
                    </label>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">encuadernado ($)</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 outline-none"
                        value={costoEncuadernado}
                        onChange={(evento) => setCostoEncuadernado(evento.target.value)}
                    />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">productos de libreria ($)</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 outline-none"
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
                <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                    <p className="text-sm text-green-600 font-semibold mb-1">total a cobrar</p>
                    <p className="text-4xl font-bold text-green-700">
                        ${cotizacionFinal.toLocaleString('es-AR')}
                    </p>
                </div>
            )}
        </div>
    );
};