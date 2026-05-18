import { MonitorPlay, Smartphone, TerminalSquare } from 'lucide-react';

const DeviceCard = ({ device }) => {
  // Mengecek apakah statusnya 'online' dari string
  const isOnline = device.status === 'online';
  const statusColor = isOnline ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100';
  const statusDot = isOnline ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone size={16} className="text-slate-400 flex-shrink-0" />
            <h3 className="font-semibold text-slate-800 text-lg truncate" title={device.brand}>
              {device.brand}
            </h3>
          </div>
          <div className="text-xs text-slate-500 font-mono truncate">{device.udid}</div>
        </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium uppercase tracking-wider flex-shrink-0 ${statusColor}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusDot} ${isOnline ? 'animate-pulse' : ''}`}></div>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
        {device.agent_name && (
          <div className="mb-4 flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-tight w-fit">
            via {device.agent_name}
          </div>
        )}

      {/* Info Body */}
      <div className="flex-1 mb-5 bg-slate-50 rounded-lg p-3 border border-slate-100">
        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
          <div>
            <span className="block text-slate-400 text-xs mb-0.5">OS Version</span>
            <span className="font-medium text-slate-700 capitalize">
              {device.type_os} {device.platform_version}
            </span>
          </div>
          <div>
            <span className="block text-slate-400 text-xs mb-0.5">Brand</span>
            <span className="font-medium text-slate-700">{device.manufacturer}</span>
          </div>
          <div>
            <span className="block text-slate-400 text-xs mb-0.5">Model</span>
            <span className="font-medium text-slate-700 truncate block" title={device.model}>
              {device.model}
            </span>
          </div>
          <div>
            <span className="block text-slate-400 text-xs mb-0.5">Status Detail</span>
            <span className="font-medium text-slate-700 capitalize">{device.status}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mt-auto">
        {device.stream_url ? (
          <a 
            href={device.stream_url} 
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-blue-500/20"
          >
            <MonitorPlay size={16} />
            <span>Stream</span>
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium bg-slate-100 text-slate-400 cursor-not-allowed">
            <MonitorPlay size={16} />
            <span>Stream</span>
          </div>
        )}

        {device.inspect_url ? (
          <a 
            href={device.inspect_url} 
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-blue-600"
          >
            <TerminalSquare size={16} />
            <span>Inspect</span>
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium bg-slate-100 text-slate-400 border border-slate-100 cursor-not-allowed">
            <TerminalSquare size={16} />
            <span>Inspect</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceCard;