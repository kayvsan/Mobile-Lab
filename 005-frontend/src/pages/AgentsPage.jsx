import { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw, Smartphone, CheckCircle2, XCircle, Key, Copy, Check } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const AgentsPage = () => {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [registeredApiKey, setRegisteredApiKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/agents');
      setAgents(response.data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      toast.error('Gagal memuat daftar agent.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;

    setIsRegistering(true);
    try {
      const response = await api.post('/agents/register', { name: newAgentName });
      setRegisteredApiKey(response.data.api_key);
      toast.success('Agent berhasil didaftarkan!');
      fetchAgents();
      setNewAgentName('');
    } catch (err) {
      console.error('Failed to register agent:', err);
      toast.error(err.response?.data?.error || 'Gagal mendaftarkan agent.');
    } finally {
      setIsRegistering(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Agent Management</h1>
            <p className="text-slate-500 text-sm mt-1">Manage remote automation agents</p>
          </div>
        </div>
        <button 
          onClick={fetchAgents}
          className="p-2.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm active:scale-95"
        >
          <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Register Section */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Plus size={20} className="text-blue-600" />
              Register New Agent
            </h2>
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Agent Name
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Laptop Kams"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isRegistering || !newAgentName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isRegistering ? 'Registering...' : 'Register Agent'}
              </button>
            </form>

            {registeredApiKey && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <Key size={16} />
                  Agent API Key
                </div>
                <p className="text-[10px] text-emerald-600 font-medium">
                  SIMPAN KEY INI! Key ini hanya muncul sekali dan diperlukan untuk setup agent di laptop.
                </p>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-200">
                  <code className="text-xs font-mono text-emerald-800 flex-1 truncate">{registeredApiKey}</code>
                  <button 
                    onClick={() => copyToClipboard(registeredApiKey)}
                    className="p-1.5 hover:bg-emerald-50 rounded text-emerald-600 transition-colors"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Agents List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Agent Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Devices</th>
                  <th className="px-6 py-4">Last Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="4" className="px-6 py-8"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                    </tr>
                  ))
                ) : agents.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                      <Users size={40} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">Belum ada agent terdaftar.</p>
                    </td>
                  </tr>
                ) : (
                  agents.map(agent => (
                    <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{agent.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{agent.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          agent.status === 'online' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                          {agent.status}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                          <Smartphone size={14} className="text-slate-400" />
                          {agent.device_count} Devices
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {agent.last_heartbeat ? new Date(agent.last_heartbeat).toLocaleString() : 'Never'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentsPage;
