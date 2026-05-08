import { useState, useEffect } from 'react';
import { dummyDevices } from '../data/dummyDevices';
import DeviceCard from '../components/DeviceCard';
import { RefreshCw, Filter, Smartphone, AlertCircle } from 'lucide-react';
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
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Device Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage and monitor connected devices</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All ({devices.length})
            </button>
            <button 
              onClick={() => setFilter('online')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'online' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Online ({onlineCount})
            </button>
            <button 
              onClick={() => setFilter('offline')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'offline' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Offline ({devices.length - onlineCount})
            </button>
          </div>
          
          <button 
            onClick={handleRefresh}
            className="p-2 rounded-lg text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 group"
            title="Refresh Devices"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin text-blue-600' : 'group-hover:rotate-180 transition-transform duration-500'} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 text-red-600 animate-fade-in">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Error Loading Devices</h3>
            <p className="text-xs opacity-90">{error}</p>
          </div>
          <button 
            onClick={fetchDevices}
            className="text-xs font-bold uppercase tracking-wider bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm h-[200px] flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="w-2/3 h-5 bg-slate-200 rounded animate-pulse"></div>
                <div className="w-16 h-5 bg-slate-200 rounded-full animate-pulse"></div>
              </div>
              <div className="w-1/2 h-3 bg-slate-200 rounded mb-6 animate-pulse"></div>
              <div className="flex-1 bg-slate-50 rounded-lg p-3 animate-pulse"></div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="h-9 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-9 bg-slate-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 border-dashed text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
            <Smartphone size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-1">Tidak ada device</h3>
          <p className="text-slate-500 max-w-sm">
            {filter === 'all' 
              ? 'Belum ada device yang terhubung ke server saat ini.' 
              : `Tidak ada device dengan status ${filter} saat ini.`}
          </p>
          {filter !== 'all' && (
            <button 
              onClick={() => setFilter('all')}
              className="mt-4 text-blue-600 font-medium hover:text-blue-700 text-sm"
            >
              Lihat semua device
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDevices.map(device => (
            <DeviceCard key={device.id} device={device} />
          ))}
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
