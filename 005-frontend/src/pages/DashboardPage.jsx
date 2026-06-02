import { useState, useEffect } from 'react';
import { dummyDevices } from '../data/dummyDevices';
import DeviceCard from '../components/DeviceCard';
import { RefreshCw, Filter, Smartphone, AlertCircle, Monitor } from 'lucide-react';
import api from '../services/api';

const DashboardPage = () => {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, online, offline

  const fetchDevices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/devices');
      setDevices(response.data);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
      setError('Gagal memuat data device. Pastikan backend berjalan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRefresh = () => {
    fetchDevices();
  };

  const filteredDevices = devices.filter(device => {
    if (filter === 'online') return device.status == 'online';
    if (filter === 'offline') return device.status == 'offline';
    return true;
  });

  const onlineCount = devices.filter(d => d.status == 'online').length;

  return (
    <div className="max-w-[1200px] mx-auto py-12 px-2 md:px-6 space-y-12 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-hairline">
        <div>
          <h1 className="text-[52px] font-normal tracking-tight text-ink flex items-center gap-2 leading-none mb-4">
            Device Dashboard
          </h1>
          <p className="text-body text-base">Manage and monitor connected devices</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-surface-soft p-1.5 rounded-full border border-hairline">
            <button 
              onClick={() => setFilter('all')}
              className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-all ${filter === 'all' ? 'bg-canvas text-ink shadow-sm' : 'text-muted hover:text-ink hover:bg-surface-strong'}`}
            >
              All ({devices.length})
            </button>
            <button 
              onClick={() => setFilter('online')}
              className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-all ${filter === 'online' ? 'bg-canvas text-emerald-600 shadow-sm' : 'text-muted hover:text-ink hover:bg-surface-strong'}`}
            >
              Online ({onlineCount})
            </button>
            <button 
              onClick={() => setFilter('offline')}
              className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-all ${filter === 'offline' ? 'bg-canvas text-rose-600 shadow-sm' : 'text-muted hover:text-ink hover:bg-surface-strong'}`}
            >
              Offline ({devices.length - onlineCount})
            </button>
          </div>
          
          <button 
            onClick={handleRefresh}
            className="p-3.5 rounded-full text-ink bg-surface-strong hover:bg-hairline-soft transition-all focus:outline-none focus:ring-2 focus:ring-primary group shadow-sm active:scale-95"
            title="Refresh Devices"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin text-primary' : 'group-hover:rotate-180 transition-transform duration-500'} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex items-start gap-4 text-semantic-down animate-fade-in">
          <AlertCircle size={24} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-sm tracking-wide">Error Loading Devices</h3>
            <p className="text-sm font-medium opacity-90 mt-1">{error}</p>
          </div>
          <button 
            onClick={fetchDevices}
            className="text-xs font-bold uppercase tracking-widest bg-semantic-down text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-canvas rounded-3xl p-6 border border-hairline shadow-sm h-[220px] animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Local Devices */}
          {devices.filter(d => !d.agent_id).length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6 text-muted">
                <div className="w-8 h-8 rounded-full bg-surface-strong text-ink flex items-center justify-center"><Monitor size={16} /></div>
                <h2 className="text-base font-semibold tracking-wide text-ink">Server (Local Devices)</h2>
                <div className="h-px bg-hairline flex-1 ml-4"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {devices.filter(d => !d.agent_id && (filter === 'all' || d.status === filter)).map(device => (
                  <DeviceCard key={device.id} device={device} />
                ))}
              </div>
            </section>
          )}

          {/* Agents and their devices */}
          {Array.from(new Set(devices.filter(d => d.agent_id).map(d => d.agent_id))).map(agentId => {
            const agentName = devices.find(d => d.agent_id === agentId)?.agent_name;
            const agentDevices = devices.filter(d => d.agent_id === agentId && (filter === 'all' || d.status === filter));
            
            if (agentDevices.length === 0 && filter !== 'all') return null;

            return (
              <section key={agentId}>
                <div className="flex items-center gap-3 mb-6 text-muted">
                  <div className="w-8 h-8 rounded-full bg-surface-strong text-primary flex items-center justify-center"><Smartphone size={16} /></div>
                  <h2 className="text-base font-semibold tracking-wide text-ink">{agentName || 'Remote Agent'}</h2>
                  <div className="h-px bg-hairline flex-1 ml-4"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {agentDevices.map(device => (
                    <DeviceCard key={device.id} device={device} />
                  ))}
                </div>
              </section>
            );
          })}

          {devices.length === 0 && (
            <div className="flex flex-col items-center justify-center p-16 bg-canvas rounded-3xl border border-hairline border-dashed text-center">
              <div className="w-20 h-20 bg-surface-soft rounded-full flex items-center justify-center text-muted mb-6">
                <Smartphone size={40} />
              </div>
              <h3 className="text-xl font-normal tracking-tight text-ink mb-2">Tidak ada device</h3>
              <p className="text-muted max-w-sm font-medium text-base">Belum ada device yang terhubung ke server atau agent.</p>
            </div>
          )}
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}} />
    </div>
  );
};

export default DashboardPage;
