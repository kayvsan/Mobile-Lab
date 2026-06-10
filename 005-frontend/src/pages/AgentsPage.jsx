import { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw, Smartphone, CheckCircle2, XCircle, Key, Copy, Check } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { copyToClipboard as copyToClipboardHelper } from '../utils/clipboard';

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
    copyToClipboardHelper(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-[1200px] mx-auto py-12 px-2 md:px-6 space-y-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-hairline">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-surface-strong text-primary rounded-full">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-[52px] font-normal tracking-tight text-ink leading-none mb-2">Agent Management</h1>
            <p className="text-body text-base">Manage remote automation agents</p>
          </div>
        </div>
        <button 
          onClick={fetchAgents}
          className="p-3 bg-surface-strong text-ink rounded-full hover:bg-hairline-soft transition-colors active:scale-95"
        >
          <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Agents List */}
        <div className="lg:col-span-2">
          <div className="bg-canvas rounded-3xl border border-hairline shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-soft text-muted text-[10px] font-bold uppercase tracking-widest border-b border-hairline">
                  <th className="px-8 py-5">Agent Name</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Devices</th>
                  <th className="px-8 py-5">Last Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="4" className="px-8 py-8"><div className="h-4 bg-surface-strong rounded w-full"></div></td>
                    </tr>
                  ))
                ) : agents.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-16 text-center text-muted">
                      <Users size={40} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-semibold">Belum ada agent terdaftar.</p>
                    </td>
                  </tr>
                ) : (
                  agents.map(agent => (
                    <tr key={agent.id} className="hover:bg-surface-soft transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-semibold text-ink">{agent.name}</div>
                        <div className="text-[11px] text-muted font-mono mt-1 tracking-widest">{agent.id}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          agent.status === 'online' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-surface-strong text-muted border border-hairline'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`}></div>
                          {agent.status}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-ink font-semibold">
                          <Smartphone size={16} className="text-muted" />
                          {agent.device_count} Devices
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm text-muted font-medium">
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
