import { MonitorPlay, Smartphone, TerminalSquare } from 'lucide-react';

const DeviceCard = ({ device }) => {
  // Mengecek apakah statusnya 'online' dari string
  const isOnline = device.status === 'online';
  const statusColor = isOnline ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100';
  const statusDot = isOnline ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div className="bg-canvas rounded-3xl p-8 border border-hairline hover:shadow-sm transition-all duration-300 group flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone size={16} className="text-muted flex-shrink-0" />
            <h3 className="font-normal text-ink text-xl truncate tracking-tight" title={device.brand}>
              {device.brand}
            </h3>
          </div>
          <div className="text-sm text-body font-mono truncate">{device.udid}</div>
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
      <div className="flex-1 mb-6 bg-surface-soft rounded-2xl p-4 border border-hairline">
        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
          <div>
            <span className="block text-muted text-xs mb-1">OS Version</span>
            <span className="font-medium text-ink capitalize">
              {device.type_os} {device.platform_version}
            </span>
          </div>
          <div>
            <span className="block text-muted text-xs mb-1">Brand</span>
            <span className="font-medium text-ink">{device.manufacturer}</span>
          </div>
          <div>
            <span className="block text-muted text-xs mb-1">Model</span>
            <span className="font-medium text-ink truncate block" title={device.model}>
              {device.model}
            </span>
          </div>
          <div>
            <span className="block text-muted text-xs mb-1">Status Detail</span>
            <span className="font-medium text-ink capitalize">{device.status}</span>
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
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-semibold transition-all bg-primary text-on-primary hover:bg-primary-active"
          >
            <span>Stream</span>
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-semibold bg-surface-strong text-muted cursor-not-allowed">
            <span>Stream</span>
          </div>
        )}

        {device.inspect_url ? (
          <a 
            href={device.inspect_url} 
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-semibold transition-all bg-surface-strong text-ink hover:bg-hairline-soft"
          >
            <span>Inspect</span>
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-semibold bg-surface-strong text-muted cursor-not-allowed border border-hairline">
            <span>Inspect</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceCard;