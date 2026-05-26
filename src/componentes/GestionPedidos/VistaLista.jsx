export const VistaLista = ({
    pedidosFiltradosLista,
    busqueda,
    setBusqueda,
    setPedidoSeleccionadoDetalle,
    ESTADOS_PEDIDO,
    avanzarEstado,
    marcarComoEntregado,
    eliminarPedido
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <div className="relative w-full max-w-md">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </span>
                    <input 
                        type="text" 
                        placeholder="Buscar por cliente, teléfono, detalle u operario..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-empresa text-gray-800 dark:text-white"
                        value={busqueda} 
                        onChange={(evento) => setBusqueda(evento.target.value)} 
                    />
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-xs uppercase tracking-widest text-gray-400 font-bold border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                            <th className="p-4">Entrega</th><th className="p-4">Cliente / Orden</th><th className="p-4">Detalle</th><th className="p-4">Operario</th><th className="p-4">Estado</th><th className="p-4 text-center">Acción</th><th className="p-4 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {pedidosFiltradosLista.map(pedido => (
                            <tr key={pedido.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group" onDoubleClick={() => setPedidoSeleccionadoDetalle(pedido)}>
                                <td className="p-4 text-sm font-bold text-gray-700 dark:text-gray-300">{new Date(pedido.fechaEntrega).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}<p className="text-[10px] text-gray-400 font-normal">{new Date(pedido.fechaCreacion).toLocaleDateString('es-AR')}</p></td>
                                <td className="p-4"><p className="text-xs text-gray-500 font-bold">{pedido.nombreCliente}</p><p className="text-sm font-black text-gray-900 dark:text-white">#{pedido.codigoCliente}</p><p className="text-[10px] text-gray-400">{pedido.telefono}</p></td>
                                <td className="p-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{pedido.detalle}</td>
                                <td className="p-4 text-xs font-bold text-gray-600 dark:text-gray-400">{pedido.operario || '-'}</td>
                                <td className="p-4"><span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 w-max ${ESTADOS_PEDIDO[pedido.estado].color}`}>{ESTADOS_PEDIDO[pedido.estado].titulo}</span></td>
                                <td className="p-4 text-center">
                                    {pedido.estado === 'sin_iniciar' && <button onClick={(evento) => avanzarEstado(pedido, evento)} className="px-4 py-1.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs font-bold hover:bg-yellow-200 transition">Iniciar</button>}
                                    {pedido.estado === 'iniciado' && <button onClick={(evento) => avanzarEstado(pedido, evento)} className="px-4 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold hover:bg-green-200 transition">Finalizar</button>}
                                    {pedido.estado === 'finalizado' && <button onClick={(evento) => marcarComoEntregado(pedido.id, evento)} className="px-4 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-200 transition">Entregar</button>}
                                    {pedido.estado === 'entregado' && <span className="text-xs font-bold text-gray-400">✔️ Archiv.</span>}
                                </td>
                                <td className="p-4 text-center"><button onClick={(evento) => eliminarPedido(pedido.id, evento)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                            </tr>
                        ))}
                        {pedidosFiltradosLista.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-gray-400 italic">No se encontraron pedidos.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};