import { useEffect, useState, useRef } from 'react';
import { 
  Terminal, Play, RefreshCw, Smartphone, Map, 
  AlertCircle, CheckCircle2, ChevronRight, Square,
  Repeat, Clock, Settings2, Monitor
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  FormControl,
  Select as MuiSelect,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Box,
  Chip
} from '@mui/material';
import api, { API_BASE_URL } from '../services/api';

const ExecutionPage = () => {
  const [devices, setDevices] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'cycle'

  // Form state
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedJourney, setSelectedJourney] = useState('');
  const [selectedJourneys, setSelectedJourneys] = useState([]); // For cycle mode
  const [cycleCount, setCycleCount] = useState(5);
  const [interval, setInterval] = useState(60);
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const toast = useToast();

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
      const journeyNames = selectedJourneys.map(id => journeys.find(j => j.id === id)?.name).join(', ');
      addLog(`Journeys: ${journeyNames}`, 'info');
      addLog(`Cycles: ${cycleCount} | Interval: ${interval}s`, 'system');
    }

    try {
      let executionId;

      if (activeTab === 'single') {
        const payload = {
          device_id: selectedDevice
        };
        const response = await api.post(`/execute/${selectedJourney}`, payload);
        executionId = response.data.execution?.id;
      } else {
        const payload = {
          device_id: selectedDevice,
          journey_ids: selectedJourneys,
          cycles: parseInt(cycleCount),
          interval: parseInt(interval)
        };
        // Menggunakan endpoint /execute/cycle untuk mode cycle (sesuaikan jika endpoint berbeda di backend)
        const response = await api.post(`/execute/cycle`, payload);
        executionId = response.data.execution?.id;
      }

      addLog('Eksekusi berhasil dimulai.', 'success');
      addLog(`Execution ID: ${executionId || 'N/A'}`, 'info');

      if (!executionId) {
        addLog('Warning: Tidak mendapat execution ID, stream tidak bisa dimulai.', 'error');
        setIsExecuting(false);
        return;
      }
      
      // Abort previous stream if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Connect to SSE stream using EventSource-compatible fetch
      const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
      const streamResponse = await fetch(`${API_BASE_URL}/executions/${executionId}/stream`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        },
        signal: abortControllerRef.current.signal
      });

      if (!streamResponse.ok) {
        throw new Error('Failed to connect to log stream');
      }

      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              setIsExecuting(false);
              addLog('Stream selesai.', 'success');
              break;
            }
            
            buffer += decoder.decode(value, { stream: true });
            
            // SSE format: "event: <type>\ndata: <json>\n\n"
            // Split on double newline to get complete SSE blocks
            const blocks = buffer.split('\n\n');
            // Keep the last incomplete block in buffer
            buffer = blocks.pop() || '';
            
            for (const block of blocks) {
              if (!block.trim()) continue;
              
              const lines = block.split('\n');
              let eventType = 'message';
              let dataStr = '';
              
              for (const line of lines) {
                if (line.startsWith('event:')) {
                  eventType = line.replace(/^event:\s*/, '').trim();
                } else if (line.startsWith('data:')) {
                  dataStr = line.replace(/^data:\s*/, '').trim();
                }
              }
              
              if (!dataStr) continue;
              
              try {
                const data = JSON.parse(dataStr);
                
                // Map backend event types to log display
                if (eventType === 'queued') {
                  addLog(`Queued — Journey: ${data.journey_id}, Device: ${data.device_id}`, 'system');
                } else if (eventType === 'running') {
                  addLog(data.message || 'Automation running...', 'info');
                } else if (eventType === 'log') {
                  addLog(data.message || '', 'info');
                } else if (eventType === 'completed') {
                  const detail = data.report_id 
                    ? `Report ID: ${data.report_id} | Success: ${data.success}`
                    : (data.message || 'Completed');
                  addLog(`✅ ${detail}`, 'success');
                  setIsExecuting(false);
                } else if (eventType === 'failed') {
                  addLog(`❌ ${data.error || 'Execution failed'}`, 'error');
                  setIsExecuting(false);
                } else if (eventType === 'close') {
                  addLog(`Stream closed: ${data.reason}`, 'system');
                  setIsExecuting(false);
                } else {
                  // Fallback for unknown event types
                  addLog(data.message || JSON.stringify(data), 'info');
                }
              } catch (e) {
                // Non-JSON data line, show as-is
                addLog(dataStr, 'info');
              }
            }
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
            addLog(`Stream error: ${err.message}`, 'error');
            setIsExecuting(false);
          }
        }
      };

      readStream();

    } catch (err) {
      console.error('Execution start failed:', err);
      addLog(`Error: ${err.response?.data?.error || err.message}`, 'error');
      setIsExecuting(false);
    }
  };

  const handleStop = () => {
    setIsExecuting(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    addLog('Eksekusi dihentikan oleh user.', 'error');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in flex flex-col h-full">
      {/* Header */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Terminal size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Execution</h1>
            <p className="text-slate-500 text-sm mt-1">Real-time automation monitoring</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData}
            className="p-2.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm active:scale-95"
            title="Refresh Options"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Control Panel */}
        <div className="lg:col-span-1 min-h-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-100 p-1 bg-slate-50/50">
              <button 
                onClick={() => setActiveTab('single')}
                disabled={isExecuting}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all rounded-xl ${activeTab === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Play size={16} fill={activeTab === 'single' ? 'currentColor' : 'none'} />
                Execution
              </button>
              <button 
                onClick={() => setActiveTab('cycle')}
                disabled={isExecuting}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all rounded-xl ${activeTab === 'cycle' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Repeat size={16} />
                Cycle
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  Configuration
                </h3>
                <Settings2 size={16} className="text-slate-300" />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-start gap-2 border border-red-100">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Device Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    Select Device
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <Smartphone size={18} />
                    </div>
                    <select 
                      value={selectedDevice}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      disabled={isExecuting || isLoading}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none appearance-none font-medium text-slate-700"
                    >
                      <option value="">Choose a device...</option>
                      {devices.map(device => (
                        <option key={device.id} value={device.id}>
                          {device.name} ({device.status || 'Offline'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Journey Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    Select Journey{activeTab === 'cycle' && 's'}
                  </label>
                  
                  {activeTab === 'single' ? (
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <Map size={18} />
                      </div>
                      <select 
                        value={selectedJourney}
                        onChange={(e) => setSelectedJourney(e.target.value)}
                        disabled={isExecuting || isLoading}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none appearance-none font-medium text-slate-700"
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
                    <FormControl fullWidth>
                      <MuiSelect
                        multiple
                        displayEmpty
                        value={selectedJourneys}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSelectedJourneys(typeof value === 'string' ? value.split(',') : value);
                        }}
                        input={<OutlinedInput />}
                        renderValue={(selected) => {
                          if (selected.length === 0) {
                            return <span className="text-slate-400 text-sm font-medium">Choose journeys...</span>;
                          }
                          return (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip 
                                  key={value} 
                                  label={journeys.find(j => j.id === value)?.name} 
                                  size="small" 
                                  sx={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 600, border: '1px solid #bfdbfe' }}
                                />
                              ))}
                            </Box>
                          );
                        }}
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 250,
                            },
                          },
                        }}
                        disabled={isExecuting || isLoading}
                        sx={{
                          backgroundColor: '#f8fafc', // slate-50
                          borderRadius: '0.75rem', // xl
                          '.MuiOutlinedInput-notchedOutline': {
                            borderColor: '#e2e8f0', // slate-200
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#cbd5e1', // slate-300
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#3b82f6', // blue-500
                            borderWidth: '2px',
                          },
                          '&.Mui-focused': {
                            backgroundColor: '#ffffff',
                          },
                          '.MuiSelect-select': {
                            padding: '11px 14px',
                          }
                        }}
                      >
                        {journeys.map((journey) => (
                          <MenuItem key={journey.id} value={journey.id}>
                            <Checkbox checked={selectedJourneys.indexOf(journey.id) > -1} size="small" />
                            <ListItemText primary={journey.name} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />
                          </MenuItem>
                        ))}
                      </MuiSelect>
                    </FormControl>
                  )}
                </div>

                {/* Cycle Specific Fields */}
                {activeTab === 'cycle' && (
                  <div className="grid grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                        Cycles
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                          <Repeat size={16} />
                        </div>
                        <input 
                          type="number" 
                          min="1"
                          value={cycleCount}
                          onChange={(e) => setCycleCount(e.target.value)}
                          disabled={isExecuting}
                          placeholder="Ex: 10"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                        Interval (s)
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                          <Clock size={16} />
                        </div>
                        <input 
                          type="number" 
                          min="0"
                          value={interval}
                          onChange={(e) => setInterval(e.target.value)}
                          disabled={isExecuting}
                          placeholder="Ex: 60"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/30 space-y-3">
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
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 px-6 rounded-2xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 group"
                >
                  <Monitor size={18} className="group-hover:animate-pulse" />
                  Live Monitoring
                </button>
              )}

              {!isExecuting ? (
                <button 
                  onClick={handleStart}
                  disabled={isLoading || !selectedDevice || (activeTab === 'single' ? !selectedJourney : selectedJourneys.length === 0)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                >
                  <Play size={20} fill="currentColor" />
                  Start {activeTab === 'single' ? 'Execution' : 'Cycle Loop'}
                </button>
              ) : (
                <button 
                  onClick={handleStop}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
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
          <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col flex-1 border border-slate-800">
            {/* Terminal Header */}
            <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4">Terminal Logs</span>
              </div>
              {isExecuting && (
                <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">Active Process</span>
                </div>
              )}
            </div>

            {/* Terminal Content */}
            <div className="flex-1 overflow-auto p-5 font-mono text-[13px] space-y-1.5 bg-slate-900 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-3 opacity-40">
                  <Terminal size={40} strokeWidth={1.5} />
                  <p className="text-xs font-bold uppercase tracking-widest">Ready for deployment</p>
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex gap-4 animate-slide-in-right group">
                    <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={`
                      flex-1 break-all
                      ${log.type === 'error' ? 'text-rose-400' : ''}
                      ${log.type === 'success' ? 'text-emerald-400' : ''}
                      ${log.type === 'system' ? 'text-blue-400 font-bold' : ''}
                      ${log.type === 'info' ? 'text-slate-300' : ''}
                    `}>
                      <span className="mr-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        {log.type === 'error' ? '✖' : ''}
                        {log.type === 'success' ? '✔' : ''}
                        {log.type === 'system' ? '➜' : ''}
                        {log.type === 'info' ? '•' : ''}
                      </span>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionPage;


