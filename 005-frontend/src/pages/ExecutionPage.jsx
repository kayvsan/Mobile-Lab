import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Terminal, Play, RefreshCw, Smartphone, Map, 
  AlertCircle, CheckCircle2, ChevronRight, Square,
  Repeat, Clock, Settings2, Monitor,
  GripVertical, X, Plus, ChevronDown,
  Activity, Loader, StopCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api, { API_BASE_URL } from '../services/api';

const ExecutionPage = () => {
  const [devices, setDevices] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeExecutions, setActiveExecutions] = useState([]);

  // Tabs state
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'cycle'

  // Form state
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedJourney, setSelectedJourney] = useState('');
  const [selectedJourneys, setSelectedJourneys] = useState([]); // For cycle mode
  const [cycleCount, setCycleCount] = useState(5);
  const [interval, setInterval] = useState(60);
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState(null);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const toast = useToast();

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
      setError('Gagal memuat daftar device atau journey. Pastikan backend berjalan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Poll active executions every 5 seconds
  useEffect(() => {
    let timeoutId;
    let isCancelled = false;
    const pollActive = async () => {
      if (isCancelled) return;
      try {
        const res = await api.get('/executions?status=running,queued&limit=20');
        if (!isCancelled) {
          setActiveExecutions(res.data.data || []);
        }
      } catch (e) {
        // silently ignore polling errors
      }
      if (!isCancelled) {
        timeoutId = window.setTimeout(pollActive, 5000);
      }
    };
    pollActive();
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

  const handleStopExecution = async (execId) => {
    try {
      await api.post(`/executions/${execId}/stop`);
      setActiveExecutions(prev => prev.filter(e => e.id !== execId));
      toast.success('Execution stopped.');
    } catch (err) {
      toast.error(`Gagal stop: ${err?.response?.data?.error || err.message}`);
    }
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleStart = async () => {
    if (!selectedDevice) {
      toast.error('Pilih Device terlebih dahulu.');
      return;
    }
    if (activeTab === 'single' && !selectedJourney) {
      toast.error('Pilih Journey terlebih dahulu.');
      return;
    }
    if (activeTab === 'cycle' && selectedJourneys.length === 0) {
      toast.error('Pilih minimal satu Journey terlebih dahulu.');
      return;
    }

    setIsExecuting(true);
    setLogs([]);
    const deviceName = devices.find(d => d.id === selectedDevice)?.name;

    addLog(`Mode: ${activeTab === 'single' ? 'Single Execution' : 'Cycle Execution'}`, 'system');
    addLog(`Device: ${deviceName}`, 'info');
    
    if (activeTab === 'single') {
      const journeyName = journeys.find(j => j.id === selectedJourney)?.name;
      addLog(`Journey: ${journeyName}`, 'info');
    } else {
      addLog(`Journeys: ${selectedJourneys.length} dipilih`, 'info');
      addLog(`Cycles: ${cycleCount || 'Infinite'}, Interval: ${interval}s`, 'info');
    }
    
    addLog('Mempersiapkan execution...', 'system');

    abortControllerRef.current = new AbortController();

    try {
      // Create Execution
      const endpoint = activeTab === 'single' ? '/executions' : '/executions/cycle';
      const payload = activeTab === 'single' ? {
        device_id: selectedDevice,
        journey_id: selectedJourney
      } : {
        device_id: selectedDevice,
        journey_ids: selectedJourneys,
        cycles: parseInt(cycleCount, 10) >= 0 ? parseInt(cycleCount, 10) : 1,
        interval: parseInt(interval) || 0
      };

      const res = await api.post(endpoint, payload);
      const execId = res.data.id;
      setCurrentExecutionId(execId);
      addLog('Execution berhasil dibuat, menyambung ke log stream...', 'success');

      // Start SSE stream
      const sse = new EventSource(`${API_BASE_URL}/executions/${execId}/logs`);
      
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'END') {
            sse.close();
            setIsExecuting(false);
            setCurrentExecutionId(null);
            
            if (data.status === 'completed') {
              addLog('Eksekusi Selesai!', 'success');
              toast.success('Execution completed successfully!');
            } else if (data.status === 'failed') {
              addLog(`Eksekusi Gagal: ${data.message || 'Unknown error'}`, 'error');
              toast.error('Execution failed!');
            }
          } else {
            addLog(data.message, data.type === 'error' ? 'error' : 'info');
          }
        } catch (err) {
          addLog(event.data, 'info');
        }
      };

      sse.onerror = () => {
        sse.close();
        setIsExecuting(false);
        setCurrentExecutionId(null);
        addLog('Koneksi log terputus.', 'error');
      };

      // Listen to abort to close SSE early if user stops
      abortControllerRef.current.signal.addEventListener('abort', () => {
        sse.close();
        setIsExecuting(false);
      });

    } catch (err) {
      console.error(err);
      addLog(`Error: ${err?.response?.data?.error || err.message}`, 'error');
      setIsExecuting(false);
      toast.error('Gagal memulai execution');
    }
  };

  const handleStop = async () => {
    if (currentExecutionId) {
      try {
        await api.post(`/executions/${currentExecutionId}/stop`);
        addLog('Perintah berhenti dikirim ke backend.', 'system');
      } catch (err) {
        addLog(`Gagal mengirim perintah berhenti: ${err?.response?.data?.error || err.message}`, 'error');
      }
      setCurrentExecutionId(null);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    addLog('Eksekusi dihentikan oleh user.', 'error');
  };

  return (
    <div className="max-w-[1200px] mx-auto py-12 px-2 md:px-6 space-y-12 animate-fade-in flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-hairline shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-surface-strong text-primary rounded-full">
            <Terminal size={24} />
          </div>
          <div>
            <h1 className="text-[52px] font-normal tracking-tight text-ink leading-none mb-2">Execution</h1>
            <p className="text-body text-base">Real-time automation monitoring</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData}
            className="p-3 bg-surface-strong text-ink rounded-full hover:bg-hairline-soft transition-colors active:scale-95"
            title="Refresh Options"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Active Executions */}
      {activeExecutions.length > 0 && (
        <div className="shrink-0 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-primary" />
            <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest">
              Active Executions ({activeExecutions.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeExecutions.map(exec => {
              const device = devices.find(d => d.id === exec.device_id);
              const journey = journeys.find(j => j.id === exec.journey_id);
              const isRunning = exec.status === 'running';
              return (
                <div
                  key={exec.id}
                  className="bg-canvas border border-hairline rounded-2xl p-4 flex items-start gap-3 group hover:border-primary/20 transition-all"
                >
                  <div className={`mt-0.5 shrink-0 ${ isRunning ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {isRunning ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <Clock size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isRunning
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {exec.status}
                      </span>
                      {exec.is_cycle && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                          Cycle
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-ink truncate">
                      {device?.name || exec.device_id?.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {exec.is_cycle
                        ? `${exec.cycle_params?.journey_ids?.length || '?'} journeys · ${exec.cycle_params?.cycles || '∞'} cycles`
                        : (journey?.name || 'Unknown journey')
                      }
                    </p>
                    {isRunning && (
                      <p className="text-[10px] text-muted mt-1 font-mono">
                        ⏱ {getElapsedTime(exec.started_at)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleStopExecution(exec.id)}
                    className="p-1.5 text-muted hover:text-semantic-down hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Stop execution"
                  >
                    <StopCircle size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        {/* Control Panel */}
        <div className="lg:col-span-1 min-h-0">
          <div className="bg-canvas rounded-3xl border border-hairline flex flex-col h-full overflow-hidden shadow-sm">
            {/* Tabs Navigation */}
            <div className="flex border-b border-hairline p-2 bg-surface-soft/50">
              <button 
                onClick={() => setActiveTab('single')}
                disabled={isExecuting}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all rounded-2xl ${activeTab === 'single' ? 'bg-canvas text-primary shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                Single
              </button>
              <button 
                onClick={() => setActiveTab('cycle')}
                disabled={isExecuting}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all rounded-2xl ${activeTab === 'cycle' ? 'bg-canvas text-primary shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                Cycle
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-rose-600">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                {/* Device Selection */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-2">
                    Target Device
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted transition-colors">
                      <Smartphone size={18} />
                    </div>
                    <select 
                      value={selectedDevice}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      disabled={isExecuting || isLoading}
                      className="w-full pl-11 pr-4 py-3 bg-surface-soft border border-hairline rounded-xl text-sm focus:bg-canvas focus:border-primary focus:ring-2 focus:ring-primary transition-all outline-none appearance-none font-semibold text-ink"
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
                  <label className="block text-xs font-semibold text-ink mb-2">
                    Select Journey{activeTab === 'cycle' && 's'}
                  </label>
                  
                  {activeTab === 'single' ? (
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted transition-colors">
                        <Map size={18} />
                      </div>
                      <select 
                        value={selectedJourney}
                        onChange={(e) => setSelectedJourney(e.target.value)}
                        disabled={isExecuting || isLoading}
                        className="w-full pl-11 pr-4 py-3 bg-surface-soft border border-hairline rounded-xl text-sm focus:bg-canvas focus:border-primary focus:ring-2 focus:ring-primary transition-all outline-none appearance-none font-semibold text-ink"
                      >
                        <option value="">Choose a journey...</option>
                        {journeys.map(journey => (
                          <option key={journey.id} value={journey.id}>
                            {journey.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Add Journey Dropdown */}
                      <div className="relative" ref={dropdownRef}>
                        <button
                          type="button"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          disabled={isExecuting || isLoading}
                          className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-surface-soft border border-hairline rounded-xl text-sm font-semibold text-muted hover:border-primary/40 hover:bg-canvas transition-all outline-none disabled:opacity-50"
                        >
                          <span className="flex items-center gap-2">
                            <Plus size={16} />
                            Add Journey
                          </span>
                          <ChevronDown size={16} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {dropdownOpen && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-canvas border border-hairline rounded-xl shadow-lg max-h-[200px] overflow-auto">
                            {journeys.filter(j => !selectedJourneys.includes(j.id)).length === 0 ? (
                              <div className="px-4 py-3 text-sm text-muted text-center">Semua journey sudah dipilih</div>
                            ) : (
                              journeys.filter(j => !selectedJourneys.includes(j.id)).map(journey => (
                                <button
                                  key={journey.id}
                                  type="button"
                                  onClick={() => {
                                    handleAddJourney(journey.id);
                                    setDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-soft transition-colors flex items-center gap-2"
                                >
                                  <Map size={14} className="text-muted shrink-0" />
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
                          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Execution Order</p>
                          <div className="space-y-1">
                            {selectedJourneys.map((jId, index) => {
                              const journey = journeys.find(j => j.id === jId);
                              if (!journey) return null;
                              return (
                                <div
                                  key={jId}
                                  draggable={!isExecuting}
                                  onDragStart={() => handleDragStart(index)}
                                  onDragEnter={() => handleDragEnter(index)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={(e) => e.preventDefault()}
                                  className={`group flex items-center gap-3 p-2 bg-canvas border border-hairline rounded-xl transition-all ${isExecuting ? 'opacity-70' : 'hover:border-primary/30 cursor-grab active:cursor-grabbing'}`}
                                >
                                  <div className={`text-muted px-1 ${isExecuting ? '' : 'group-hover:text-ink cursor-grab'}`}>
                                    <GripVertical size={14} />
                                  </div>
                                  <div className="w-5 h-5 rounded bg-surface-soft flex items-center justify-center text-[10px] font-bold text-muted shrink-0">
                                    {index + 1}
                                  </div>
                                  <span className="flex-1 text-sm font-semibold text-ink truncate">
                                    {journey.name}
                                  </span>
                                  {!isExecuting && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveJourney(jId)}
                                      className="p-1 text-muted hover:text-semantic-down hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cycle Specific Fields */}
                {activeTab === 'cycle' && (
                  <div className="grid grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-2">
                        Cycles
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted transition-colors">
                          <Repeat size={16} />
                        </div>
                        <input 
                          type="number" 
                          min="0"
                          value={cycleCount}
                          onChange={(e) => setCycleCount(e.target.value)}
                          disabled={isExecuting}
                          placeholder="Ex: 10 (0 for infinite)"
                          className="w-full pl-11 pr-4 py-3 bg-surface-soft border border-hairline rounded-xl text-sm focus:bg-canvas focus:border-primary focus:ring-2 focus:ring-primary transition-all outline-none font-semibold text-ink"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-2">
                        Interval (s)
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted transition-colors">
                          <Clock size={16} />
                        </div>
                        <input 
                          type="number" 
                          min="0"
                          value={interval}
                          onChange={(e) => setInterval(e.target.value)}
                          disabled={isExecuting}
                          placeholder="Ex: 60"
                          className="w-full pl-11 pr-4 py-3 bg-surface-soft border border-hairline rounded-xl text-sm focus:bg-canvas focus:border-primary focus:ring-2 focus:ring-primary transition-all outline-none font-semibold text-ink"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 border-t border-hairline bg-surface-soft/30 space-y-4">
              {selectedDevice && (
                <button 
                  onClick={() => {
                    const device = devices.find(d => d.id === selectedDevice);
                    if (device?.stream_url) {
                      window.open(device.stream_url, '_blank');
                    } else {
                      toast.error('Monitoring stream tidak tersedia untuk device ini.');
                    }
                  }}
                  className="w-full bg-surface-dark hover:bg-black text-white py-4 px-6 rounded-full font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 group"
                >
                  <Monitor size={18} className="group-hover:animate-pulse" />
                  Live Monitoring
                </button>
              )}

              {!isExecuting ? (
                <button 
                  onClick={handleStart}
                  disabled={isLoading || !selectedDevice || (activeTab === 'single' ? !selectedJourney : selectedJourneys.length === 0)}
                  className="w-full bg-primary hover:bg-primary-active text-on-primary py-4 px-6 rounded-full font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                >
                  <Play size={20} fill="currentColor" />
                  Start {activeTab === 'single' ? 'Execution' : 'Cycle Loop'}
                </button>
              ) : (
                <button 
                  onClick={handleStop}
                  className="w-full bg-semantic-down hover:opacity-90 text-white py-4 px-6 rounded-full font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                >
                  <Square size={20} fill="currentColor" />
                  Stop Execution
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Log Viewer */}
        <div className="lg:col-span-2 min-h-0 flex flex-col">
          <div className="bg-[#0a0b0d] rounded-3xl overflow-hidden flex flex-col flex-1 border border-hairline shadow-2xl">
            {/* Terminal Header */}
            <div className="bg-[#111214] px-6 py-4 flex items-center justify-between border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="flex items-center gap-2 text-white/40 ml-2">
                  <Terminal size={14} />
                  <span className="text-xs font-mono">execution_log.sh</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isExecuting && (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono bg-emerald-500/10 px-3 py-1 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    RUNNING
                  </div>
                )}
                {!isExecuting && logs.length > 0 && (
                  <div className="flex items-center gap-1.5 text-white/40 text-xs font-mono">
                    <CheckCircle2 size={14} />
                    COMPLETED
                  </div>
                )}
              </div>
            </div>

            {/* Terminal Content */}
            <div className="flex-1 overflow-y-auto p-6 font-mono text-[13px] leading-relaxed custom-scrollbar">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4">
                  <Terminal size={48} className="opacity-20" />
                  <p>Menunggu eksekusi dimulai...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className={`flex gap-3 hover:bg-white/[0.02] px-2 py-1 -mx-2 rounded transition-colors
                      ${log.type === 'error' ? 'text-rose-400' : 
                        log.type === 'success' ? 'text-emerald-400' : 
                        log.type === 'system' ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}
                    >
                      <span className="text-white/30 shrink-0 w-20">{log.timestamp}</span>
                      <span className="text-white/30 shrink-0"><ChevronRight size={14} /></span>
                      <span className="flex-1 break-words whitespace-pre-wrap">{log.message}</span>
                    </div>
                  ))}
                  {isExecuting && (
                    <div className="flex gap-3 px-2 py-1 -mx-2 animate-pulse">
                      <span className="text-white/30 shrink-0 w-20">{new Date().toLocaleTimeString()}</span>
                      <span className="text-white/30 shrink-0"><ChevronRight size={14} /></span>
                      <span className="flex-1 text-slate-300 flex items-center gap-2">
                        <span className="w-1.5 h-3 bg-white/40 animate-ping"></span>
                      </span>
                    </div>
                  )}
                  <div ref={logEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionPage;
