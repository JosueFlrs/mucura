import { useState } from 'react';

export const VistaAgenda = ({
    diasSemana, 
    pedidosAgenda, 
    obtenerFechaLocalISO, 
    setPedidoSeleccionadoDetalle, 
    obtenerEtiquetaUI, 
    ESTADOS_PEDIDO, 
    avanzarEstado, 
    actualizarFechaPedido // Esta función viene del padre
}) => {
    // El estado del arrastre ahora vive solo acá adentro
    const [columnaDestino, setColumnaDestino] = useState(null);

    const manejarDragStart = (evento, pedidoId) => { 
        evento.dataTransfer.setData('pedidoId', pedidoId); 
        evento.target.style.opacity = '0.5'; 
    };
    
    const manejarDragEnd = (evento) => { 
        evento.target.style.opacity = '1'; 
        setColumnaDestino(null); 
    };
    
    const manejarDragOver = (evento, fechaISO) => { 
        evento.preventDefault(); 
        if (columnaDestino !== fechaISO) setColumnaDestino(fechaISO); 
    };
    
    const manejarDrop = (evento, nuevaFechaISO) => {
        evento.preventDefault();
        setColumnaDestino(null);
        const pedidoId = evento.dataTransfer.getData('pedidoId');
        actualizarFechaPedido(pedidoId, nuevaFechaISO);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
            {diasSemana.map(dia => {
                const pedidosDelDia = pedidosAgenda.filter(p => p.fechaEntrega === dia.fechaISO);
                const esHoy = dia.fechaISO === obtenerFechaLocalISO(); 
                const esDestino = columnaDestino === dia.fechaISO;

                return (
                    <div 
                        key={dia.fechaISO}
                        onDragOver={(evento) => manejarDragOver(evento, dia.fechaISO)}
                        onDragLeave={() => setColumnaDestino(null)}
                        onDrop={(evento) => manejarDrop(evento, dia.fechaISO)}
                        className={`flex flex-col min-h-[500px] rounded-3xl border-2 transition-all duration-300 ${esDestino ? 'border-empresa bg-empresa/5 scale-[1.02] shadow-lg' : esHoy ? 'border-empresa/50 bg-white dark:bg-gray-800 shadow-md' : 'border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50'}`}
                    >
                        <div className={`p-4 text-center border-b ${esHoy ? 'border-empresa/30 bg-empresa/10 rounded-t-3xl' : 'border-gray-100 dark:border-gray-700'}`}>
                            <p className={`text-xs font-bold uppercase tracking-widest ${esHoy ? 'text-empresa' : 'text-gray-400'}`}>{dia.nombreDia}</p>
                            <p className={`text-2xl font-black ${esHoy ? 'text-empresa' : 'text-gray-800 dark:text-white'}`}>{dia.numeroDia}</p>
                            <div className="mt-2 text-[10px] font-bold bg-gray-100 dark:bg-gray-900 text-gray-500 rounded-full w-max mx-auto px-3 py-1">
                                {pedidosDelDia.length} Trabajos
                            </div>
                        </div>

                        <div className="p-3 flex flex-col gap-3 flex-grow overflow-y-auto hide-scrollbar">
                            {pedidosDelDia.map(pedido => {
                                const esIniciado = pedido.estado === 'iniciado';
                                const bgColorTarjeta = esIniciado ? 'bg-yellow-50/80 dark:bg-yellow-900/20' : 'bg-gray-50 dark:bg-gray-800/60';
                                const borderColorTarjeta = esIniciado ? 'border-yellow-300 dark:border-yellow-700' : 'border-gray-300 dark:border-gray-600';
                                
                                return (
                                    <div key={pedido.id} draggable onDragStart={(evento) => manejarDragStart(evento, pedido.id)} onDragEnd={manejarDragEnd} onDoubleClick={() => setPedidoSeleccionadoDetalle(pedido)} className={`${bgColorTarjeta} p-3 rounded-2xl shadow-sm border-2 ${borderColorTarjeta} flex flex-col gap-2 cursor-grab active:cursor-grabbing hover:border-empresa transition-all`}>
                                        <div className="flex justify-between items-start">
                                            <div><p className="text-[10px] font-bold text-gray-500 uppercase truncate max-w-[100px]">{pedido.nombreCliente}</p><p className="text-lg font-black text-gray-900 dark:text-white leading-none">#{pedido.codigoCliente}</p></div>
                                            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase flex items-center gap-1 ${ESTADOS_PEDIDO[pedido.estado].color}`}>{ESTADOS_PEDIDO[pedido.estado].titulo}</span>
                                        </div>
                                        <div className="flex gap-1 mt-0.5">{obtenerEtiquetaUI(pedido)}</div>
                                        {pedido.operario && pedido.estado !== 'sin_iniciar' && (
                                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                <svg className="w-3 h-3 text-yellow-600 dark:text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                {pedido.operario}
                                            </p>
                                        )}
                                        <div className="flex gap-2 mt-2">
                                            {pedido.estado === 'sin_iniciar' && <button onClick={(evento) => avanzarEstado(pedido, evento)} className="flex-1 py-1.5 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-[10px] font-black uppercase rounded-lg border border-yellow-200 dark:border-yellow-800 transition-colors shadow-sm">▶ Iniciar</button>}
                                            {pedido.estado === 'iniciado' && <button onClick={(evento) => avanzarEstado(pedido, evento)} className="flex-1 py-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[10px] font-black uppercase rounded-lg border border-green-200 dark:border-green-800 transition-colors shadow-sm">✔ Terminar</button>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};