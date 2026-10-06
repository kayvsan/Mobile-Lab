import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Terminal, Play, RefreshCw, Smartphone, Map, 
  Settings2, Activity, Loader, StopCircle, Save, Trash2, Edit2,
  GripVertical, X, Plus, ChevronDown, Repeat, Clock, AlertCircle,
  ChevronRight, CheckCircle2, Copy
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api, { API_BASE_URL } from '../services/api';

const LogEntry = ({ log }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(log.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMessage = (message) => {
    // structured regex: "2026-10-06 20:37:13 | INFO | apm.main | message"
    const structuredRegex = /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s+\|\s+([A-Z]+)\s*\|\s+([^|]+)\s+\|\s+(.*)$/s;
    const match = message.match(structuredRegex);
    
    if (match) {
      const [, timestamp, level, module, text] = match;
      const lvl = level.trim();
      const levelColor = {
        'INFO': 'text-sky-400 bg-sky-400/10 border-sky-400/20',
        'WARNING': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        'ERROR': 'text-rose-400 bg-rose-400/10 border-rose-400/20',
        'DEBUG': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
        'SUCCESS': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
      }[lvl] || 'text-slate-300 bg-slate-300/10 border-slate-300/20';

      return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 w-full">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-white/40 w-[140px] shrink-0 font-mono text-[11px]">{timestamp}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border w-[68px] text-center ${levelColor}`}>{lvl}</span>
          </div>
          <div className="flex gap-3 min-w-0">
            <span className="text-white/50 w-28 shrink-0 truncate text-[11px] font-mono mt-0.5" title={module.trim()}>[{module.trim()}]</span>
            <span className="text-slate-300 break-words whitespace-pre-wrap flex-1">{text}</span>
          </div>
        </div>
      );
    }

    if (message.trim().startsWith('{') && message.trim().endsWith('}')) {
      try {
        const obj = JSON.parse(message);
        const jsonStr = JSON.stringify(obj, null, 2);
        const highlighted = jsonStr.replace(
          /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
          (match) => {
            let color = 'text-[#7fb4ca]'; // number
            if (/^"/.test(match)) {
              if (/:$/.test(match)) {
                color = 'text-[#e6b450]'; // key
              } else {
                color = 'text-[#9ece6a]'; // string
              }
            } else if (/true|false/.test(match)) {
              color = 'text-[#ff9e64]'; // boolean
            } else if (/null/.test(match)) {
              color = 'text-[#565f89]'; // null
            }
            return `<span class="${color}">${match}</span>`;
          }
        );
        return (
          <div className="w-full mt-1 mb-2">
            <pre 
              className="text-[12px] font-mono bg-[#0f1115]/50 p-4 rounded-xl border border-white/5 overflow-x-auto w-full inline-block shadow-inner"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </div>
        );
      } catch(e) {}
    }

    return <span className="text-slate-300 break-words whitespace-pre-wrap flex-1">{message}</span>;
  };

  return (
    <div className={`group flex gap-3 hover:bg-white/[0.04] px-4 py-2.5 -mx-4 rounded-xl transition-all duration-200 relative border border-transparent hover:border-white/5
      ${log.type === 'error' ? 'border-l-rose-500/50 bg-rose-500/5' : 
        log.type === 'success' ? 'border-l-emerald-500/50 bg-emerald-500/5' : 
        log.type === 'system' ? 'border-l-blue-500/50 bg-blue-500/5' : 'hover:shadow-lg'}`}
    >
      <span className="text-white/30 shrink-0 w-[70px] text-[11px] font-mono mt-1 opacity-50">{log.timestamp}</span>
      <span className="text-white/20 shrink-0 mt-1"><ChevronRight size={14} /></span>
      <div className="flex-1 min-w-0 flex items-start">
        {renderMessage(log.message)}
      </div>
      <button 
        onClick={handleCopy}
        className="absolute right-3 top-3 p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 opacity-0 group-hover:opacity-100 transition-all border border-white/10 backdrop-blur-sm shadow-xl"
        title="Copy log"
      >
        {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
};

const SavedConfigsPage = () => {
  const [devices, setDevices] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [editingConfigId, setEditingConfigId] = useState(null);
  const [configName, setConfigName] = useState('');

  // Log modal state
  const [logModal, setLogModal] = useState(null); // { configName, executionId }
  const [modalLogs, setModalLogs] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const modalLogEndRef = useRef(null);
  const sseRef = useRef(null);
  
  // Form state
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedJourneys, setSelectedJourneys] = useState([]); 
  const [cycleCount, setCycleCount] = useState(5);
  const [interval, setInterval] = useState(60);
  
  // Drag-and-drop refs for journey reordering
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddJourney = useCallback((journeyId) => {
    if (!selectedJourneys.includes(journeyId)) {
      setSelectedJourneys(prev => [...prev, journeyId]);
    }
  }, [selectedJourneys]);

  const handleRemoveJourney = useCallback((journeyId) => {
    setSelectedJourneys(prev => prev.filter(id => id !== journeyId));
  }, []);

  const handleDragStart = useCallback((index) => {
    dragItem.current = index;
  }, []);

  const handleDragEnter = useCallback((index) => {
    dragOverItem.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const reordered = [...selectedJourneys];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    setSelectedJourneys(reordered);
    dragItem.current = null;
    dragOverItem.current = null;
  }, [selectedJourneys]);

  const toast = useToast();

  // Auto-scroll modal logs
  useEffect(() => {
    modalLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [modalLogs]);

  const addModalLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setModalLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const openLogModal = (cfg) => {
    if (!cfg.active_execution_id) {
      toast.error('Tidak ada execution aktif untuk config ini.');
      return;
    }

    // Close any existing stream
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    setModalLogs([]);
    setLogModal({ configName: cfg.name, executionId: cfg.active_execution_id });
    setIsStreaming(true);

    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    const token = tokens.access_token || '';
    const sse = new EventSource(`${API_BASE_URL}/executions/${cfg.active_execution_id}/stream?token=${encodeURIComponent(token)}`);
    sseRef.current = sse;

    const handleLog = (e) => {
      try {
        const data = JSON.parse(e.data);
        addModalLog(data.message || JSON.stringify(data), 'info');
      } catch {
        addModalLog(e.data, 'info');
      }
    };

    const handleCompleted = (e) => {
      try {
        const data = JSON.parse(e.data);
        addModalLog(data.message || 'Eksekusi selesai.', 'success');
      } catch {
        addModalLog('Eksekusi selesai.', 'success');
      }
      setIsStreaming(false);
      sse.close();
      sseRef.current = null;
    };

    const handleFailed = (e) => {
      try {
        const data = JSON.parse(e.data);
        addModalLog(data.error || 'Eksekusi gagal.', 'error');
      } catch {
        addModalLog('Eksekusi gagal.', 'error');
      }
      setIsStreaming(false);
      sse.close();
      sseRef.current = null;
    };

    const handleClose = () => {
      setIsStreaming(false);
      sse.close();
      sseRef.current = null;
    };

    sse.addEventListener('log', handleLog);
    sse.addEventListener('running', handleLog);
    sse.addEventListener('queued', handleLog);
    sse.addEventListener('completed', handleCompleted);
    sse.addEventListener('failed', handleFailed);
    sse.addEventListener('close', handleClose);

    sse.onerror = () => {
      addModalLog('Koneksi log terputus.', 'error');
      setIsStreaming(false);
      sse.close();
      sseRef.current = null;
    };
  };

  const closeLogModal = () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    setLogModal(null);
    setModalLogs([]);
    setIsStreaming(false);
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [devicesRes, journeysRes] = await Promise.all([
        api.get('/devices'),
        api.get('/journeys')
      ]);
      setDevices(devicesRes.data);
      setJourneys(journeysRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Gagal memuat data. Pastikan backend berjalan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Poll saved configs every 5 seconds
  useEffect(() => {
    let timeoutId;
    let isCancelled = false;
    const pollConfigs = async () => {
      if (isCancelled) return;
      try {
        const res = await api.get('/execution-configs');
        if (!isCancelled) {
          setSavedConfigs(res.data || []);
        }
      } catch (e) {
        // silently ignore polling errors
      }
      if (!isCancelled) {
        timeoutId = window.setTimeout(pollConfigs, 5000);
      }
    };
    pollConfigs();
    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const getElapsedTime = (startedAt) => {
    if (!startedAt) return '—';
    const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  const resetForm = () => {
    setConfigName('');
    setSelectedDevice('');
    setSelectedJourneys([]);
    setCycleCount(5);
    setInterval(60);
    setEditingConfigId(null);
  };

  const handleEditClick = (config) => {
    setEditingConfigId(config.id);
    setConfigName(config.name);
    setSelectedDevice(config.device_id);
    setSelectedJourneys(config.journey_ids || []);
    setCycleCount(config.cycles === 0 ? 0 : config.cycles);
    setInterval(config.interval);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveConfig = async () => {
    if (!configName.trim()) {
      toast.error('Masukkan nama config.');
      return;
    }
    if (!selectedDevice) {
      toast.error('Pilih device terlebih dahulu.');
      return;
    }
    if (selectedJourneys.length === 0) {
      toast.error('Pilih minimal satu journey.');
      return;
    }
    try {
      const payload = {
        name: configName.trim(),
        device_id: selectedDevice,
        journey_ids: selectedJourneys,
        cycles: parseInt(cycleCount, 10) >= 0 ? parseInt(cycleCount, 10) : 1,
        interval: parseInt(interval) || 0,
      };

      if (editingConfigId) {
        const res = await api.put(`/execution-configs/${editingConfigId}`, payload);
        setSavedConfigs(prev => prev.map(c => c.id === editingConfigId ? res.data : c));
        toast.success('Config updated!');
      } else {
        const res = await api.post('/execution-configs', payload);
        setSavedConfigs(prev => [res.data, ...prev]);
        toast.success('Config saved!');
      }
      resetForm();
    } catch (err) {
      toast.error(`Gagal simpan: ${err?.response?.data?.error || err.message}`);
    }
  };

  const handleRunConfig = async (configId) => {
    const config = savedConfigs.find(c => c.id === configId);
    if (config) {
      const device = devices.find(d => d.id === config.device_id);
      if (device && device.status !== 'online') {
        toast.error('Device sedang offline, tidak dapat menjalankan config.');
        return;
      }
    }

    try {
      await api.post(`/execution-configs/${configId}/run`);
      toast.success('Execution started!');
      // Immediate refresh
      const res = await api.get('/execution-configs');
      setSavedConfigs(res.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Gagal menjalankan config.');
    }
  };

  const handleStopConfig = async (configId) => {
    try {
      await api.post(`/execution-configs/${configId}/stop`);
      toast.success('Execution stopped.');
      const res = await api.get('/execution-configs');
      setSavedConfigs(res.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Gagal stop.');
    }
  };

  const handleDeleteConfig = async (configId) => {
    try {
      await api.delete(`/execution-configs/${configId}`);
      setSavedConfigs(prev => prev.filter(c => c.id !== configId));
      toast.success('Config deleted.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Gagal hapus.');
    }
  };

  return (
    <>
    <div className="max-w-[1200px] mx-auto py-6 md:py-8 px-2 md:px-6 space-y-6 animate-fade-in flex flex-col h-[calc(100vh-6rem)] min-h-[700px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-secondary text-primary rounded-full">
            <Settings2 size={24} />
          </div>
          <div>
            <h1 className="text-[52px] font-normal tracking-tight text-foreground leading-none mb-2">Saved Configs</h1>
            <p className="text-muted-foreground text-base">Manage and run automation configurations</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData}
            className="p-3 bg-secondary text-foreground rounded-full hover:bg-hairline-soft transition-colors active:scale-95"
            title="Refresh Devices and Journeys"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* CREATE CONFIG FORM */}
        <div className="lg:col-span-1 min-h-0">
          <div className="bg-background rounded-3xl border border-border flex flex-col h-full overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border bg-muted/50">
              <h2 className="font-semibold text-foreground">Create Configuration</h2>
              <p className="text-xs text-muted-foreground mt-1">Define device, journeys, and cycles to save</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-rose-600">{error}</p>
                </div>
              )}

              {/* Device Selection */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">
                  Target Device
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground transition-colors">
                    <Smartphone size={18} />
                  </div>
                  <select 
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-11 pr-4 py-3 bg-muted border border-border rounded-xl text-sm focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary transition-all outline-none appearance-none font-semibold text-foreground"
                  >
                    <option value="">Choose a device...</option>
                    {devices.filter(device => device.status === 'online').map(device => (
                      <option key={device.id} value={device.id}>
                        {device.name} ({device.status || 'Offline'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Journey Selection */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">
                  Select Journeys
                </label>
                
                <div className="space-y-3">
                  {/* Add Journey Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-muted border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:border-primary/40 hover:bg-background transition-all outline-none disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2">
                        <Plus size={16} />
                        Add Journey
                      </span>
                      <ChevronDown size={16} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg max-h-[200px] overflow-auto">
                        {journeys.filter(j => !selectedJourneys.includes(j.id)).length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground text-center">Semua journey sudah dipilih</div>
                        ) : (
                          journeys.filter(j => !selectedJourneys.includes(j.id)).map(journey => (
                            <button
                              key={journey.id}
                              type="button"
                              onClick={() => {
                                handleAddJourney(journey.id);
                                setDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                            >
                              <Map size={14} className="text-muted-foreground shrink-0" />
                              {journey.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ordered Journey List */}
                  {selectedJourneys.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Execution Order</p>
                      <div className="space-y-1">
                        {selectedJourneys.map((jId, index) => {
                          const journey = journeys.find(j => j.id === jId);
                          if (!journey) return null;
                          return (
                            <div
                              key={jId}
                              draggable
                              onDragStart={() => handleDragStart(index)}
                              onDragEnter={() => handleDragEnter(index)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => e.preventDefault()}
                              className="group flex items-center gap-3 p-2 bg-background border border-border rounded-xl hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing"
                            >
                              <div className="text-muted-foreground group-hover:text-foreground cursor-grab px-1">
                                <GripVertical size={14} />
                              </div>
                              <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                                {index + 1}
                              </div>
                              <span className="flex-1 text-sm font-semibold text-foreground truncate">
                                {journey.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveJourney(jId)}
                                className="p-1 text-muted-foreground hover:text-semantic-down hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cycle Specific Fields */}
              <div className="grid grid-cols-2 gap-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    Cycles
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground transition-colors">
                      <Repeat size={16} />
                    </div>
                    <input 
                      type="number" 
                      min="0"
                      value={cycleCount}
                      onChange={(e) => setCycleCount(e.target.value)}
                      placeholder="Ex: 10 (0 for infinite)"
                      className="w-full pl-11 pr-4 py-3 bg-muted border border-border rounded-xl text-sm focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary transition-all outline-none font-semibold text-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    Interval (s)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground transition-colors">
                      <Clock size={16} />
                    </div>
                    <input 
                      type="number" 
                      min="0"
                      value={interval}
                      onChange={(e) => setInterval(e.target.value)}
                      placeholder="Ex: 60"
                      className="w-full pl-11 pr-4 py-3 bg-muted border border-border rounded-xl text-sm focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary transition-all outline-none font-semibold text-foreground"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-border bg-muted/30 space-y-3">
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Config name..."
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary transition-all outline-none font-semibold text-foreground"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveConfig}
                  className="flex-1 bg-primary hover:bg-primary-active text-on-primary py-3 px-4 rounded-xl font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Save size={18} />
                  {editingConfigId ? 'Update Config' : 'Save Config'}
                </button>
                {editingConfigId && (
                  <button 
                    onClick={resetForm}
                    className="flex-none bg-muted hover:bg-secondary text-muted-foreground hover:text-foreground py-3 px-4 rounded-xl font-semibold transition-all active:scale-95 border border-border whitespace-nowrap"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SAVED CONFIGS TABLE */}
        <div className="lg:col-span-2 min-h-0 flex flex-col">
          <div className="bg-background rounded-3xl border border-border flex flex-col h-full overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              <h2 className="font-semibold text-foreground">Saved Configurations ({savedConfigs.length})</h2>
            </div>
            
            <div className="flex-1 overflow-auto bg-muted/20">
              {savedConfigs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Save size={24} />
                  </div>
                  <p className="text-sm">Belum ada config yang tersimpan.<br/>Buat konfigurasi baru di panel sebelah kiri.</p>
                </div>
              ) : (
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="sticky top-0 bg-muted border-b border-border z-10">
                    <tr>
                      <th className="text-left px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Name</th>
                      <th className="text-left px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Device</th>
                      <th className="text-left px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Journeys</th>
                      <th className="text-center px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Cycles</th>
                      <th className="text-center px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Interval</th>
                      <th className="text-center px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Status</th>
                      <th className="text-center px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap w-[1%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {savedConfigs.map(cfg => {
                      const isActive = cfg.execution_status === 'running' || cfg.execution_status === 'queued';
                      const isRunning = cfg.execution_status === 'running';
                      return (
                        <tr key={cfg.id} className={`transition-colors hover:bg-muted/50 ${isActive ? 'bg-emerald-50/20' : ''}`}>
                          <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">{cfg.name}</td>
                          <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <Smartphone size={14} className="text-muted-foreground" />
                              {cfg.device_name || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                              {(cfg.journey_names || []).map((name, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-secondary border border-border rounded-lg text-foreground">
                                  <span className="text-[10px] text-muted-foreground font-bold">{i + 1}.</span>
                                  {name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-mono font-semibold text-foreground">
                            {cfg.cycles === 0 ? '∞' : cfg.cycles}
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-muted-foreground">
                            {cfg.interval}s
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                  isRunning
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  {isRunning && <Loader size={10} className="inline animate-spin mr-1" />}
                                  {cfg.execution_status}
                                </span>
                                {isRunning && cfg.execution_started_at && (
                                  <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                                    {getElapsedTime(cfg.execution_started_at)}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                                Idle
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap w-[1%]">
                            <div className="flex items-center justify-center gap-2">
                              {isActive ? (
                                <>
                                  <button
                                    onClick={() => openLogModal(cfg)}
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Logs"
                                  >
                                    <Terminal size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleStopConfig(cfg.id)}
                                    className="p-2 text-semantic-down hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Stop"
                                  >
                                    <StopCircle size={18} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleRunConfig(cfg.id)}
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="Run"
                                  >
                                    <Play size={18} fill="currentColor" />
                                  </button>
                                  <button
                                    onClick={() => handleEditClick(cfg)}
                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteConfig(cfg.id)}
                                    className="p-2 text-muted-foreground hover:text-semantic-down hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Log Modal */}
      {logModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) closeLogModal(); }}
        >
          <div className="w-full max-w-[95vw] lg:max-w-5xl xl:max-w-7xl flex flex-col rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-[#2b2d31] bg-[#0f1115] backdrop-blur-xl h-full max-h-[90vh]">
            {/* Terminal Header */}
            <div className="bg-[#181a1f] px-6 py-4 flex items-center justify-between border-b border-white/5 shrink-0 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-50 pointer-events-none"></div>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="flex gap-2 group cursor-pointer">
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-500/90 shadow-[0_0_10px_rgba(244,63,94,0.3)] group-hover:opacity-80 transition-opacity"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-500/90 shadow-[0_0_10px_rgba(245,158,11,0.3)] group-hover:opacity-80 transition-opacity"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/90 shadow-[0_0_10px_rgba(16,185,129,0.3)] group-hover:opacity-80 transition-opacity"></div>
                </div>
                <div className="flex items-center gap-2 text-white/50 ml-3">
                  <Terminal size={14} className="text-white/40" />
                  <span className="text-xs font-mono font-medium tracking-wide truncate max-w-[200px]">&gt;_ {logModal.configName}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 relative z-10">
                {isStreaming ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    LIVE
                  </div>
                ) : modalLogs.length > 0 ? (
                  <div className="flex items-center gap-1.5 text-white/40 text-[11px] font-mono px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <CheckCircle2 size={14} />
                    SELESAI
                  </div>
                ) : null}
                <button
                  onClick={closeLogModal}
                  className="text-white/30 hover:text-white/80 transition-colors ml-2"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Terminal Content */}
            <div className="flex-1 overflow-y-auto p-6 font-mono text-[13px] leading-relaxed custom-scrollbar bg-[#0a0c10]">
              {modalLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-6 animate-pulse py-12">
                  <div className="p-6 bg-white/5 rounded-full shadow-inner shadow-white/5">
                    <Loader size={32} className="animate-spin opacity-30" />
                  </div>
                  <p className="font-mono text-sm opacity-60">Menghubungkan ke log stream...</p>
                </div>
              ) : (
                <div className="space-y-1 pb-4">
                  {modalLogs.map((log, i) => (
                    <LogEntry key={i} log={log} />
                  ))}
                  
                  {isStreaming && (
                    <div className="flex gap-3 px-4 py-2.5 -mx-4 animate-pulse opacity-70">
                      <span className="text-white/30 shrink-0 w-[70px] text-[11px] font-mono mt-1 opacity-50">{new Date().toLocaleTimeString()}</span>
                      <span className="text-white/20 shrink-0 mt-1"><ChevronRight size={14} /></span>
                      <span className="flex-1 text-slate-300 flex items-center gap-2 mt-1">
                        <span className="w-1.5 h-3.5 bg-white/40 animate-ping rounded-sm" />
                      </span>
                    </div>
                  )}
                  <div ref={modalLogEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SavedConfigsPage;
