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
  const [currentExecutionId, setCurrentExecutionId] = useState(null);
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

      setCurrentExecutionId(executionId);
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
              setCurrentExecutionId(null);
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
                  if (data.message) {
                    addLog(`Queued — ${data.message}`, 'system');
                  } else {
                    addLog(`Queued — Journey: ${data.journey_id}, Device: ${data.device_id}`, 'system');
                  }
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
                  setCurrentExecutionId(null);
                } else if (eventType === 'failed') {
                  addLog(`❌ ${data.error || 'Execution failed'}`, 'error');
                  setIsExecuting(false);
                  setCurrentExecutionId(null);
                } else if (eventType === 'close') {
                  addLog(`Stream closed: ${data.reason}`, 'system');
                  setIsExecuting(false);
                  setCurrentExecutionId(null);
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

  const handleStop = async () => {
    setIsExecuting(false);
    
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
                <Play size={16} fill={activeTab === 'single' ? 'currentColor' : 'none'} />
                Execution
              </button>
              <button 
                onClick={() => setActiveTab('cycle')}
                disabled={isExecuting}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all rounded-2xl ${activeTab === 'cycle' ? 'bg-canvas text-primary shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                <Repeat size={16} />
                Cycle
              </button>
            </div>

            <div className="p-8 flex-1 overflow-auto space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest">
                  Configuration
                </h3>
                <Settings2 size={16} className="text-muted" />
              </div>

              {error && (
                <div className="p-4 bg-rose-50 text-semantic-down rounded-2xl text-sm flex items-start gap-3 border border-rose-100">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                {/* Device Selection */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-2">
                    Select Device
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
                          backgroundColor: '#f8f9fa',
                          borderRadius: '0.75rem',
                          fontFamily: 'Inter, sans-serif',
                          color: '#0a0b0d',
                          fontWeight: 600,
                          '.MuiOutlinedInput-notchedOutline': {
                            borderColor: '#e5e7ea',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#d1d5db',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#0052ff',
                            borderWidth: '2px',
                          },
                          '&.Mui-focused': {
                            backgroundColor: '#ffffff',
                          },
                          '.MuiSelect-select': {
                            padding: '11px 16px',
                          }
                        }}
                      >
                        {journeys.map((journey) => (
                          <MenuItem key={journey.id} value={journey.id}>
                            <Checkbox checked={selectedJourneys.indexOf(journey.id) > -1} size="small" />
                            <ListItemText primary={journey.name} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'Inter' }} />
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
                      <label className="block text-xs font-semibold text-ink mb-2">
                        Cycles
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted transition-colors">
                          <Repeat size={16} />
                        </div>
                        <input 
                          type="number" 
                          min="1"
                          value={cycleCount}
                          onChange={(e) => setCycleCount(e.target.value)}
                          disabled={isExecuting}
                          placeholder="Ex: 10"
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
                  <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                </div>
                <span className="text-xs font-semibold text-slate-400 tracking-wide ml-4">Terminal Logs</span>
              </div>
              {isExecuting && (
                <div className="flex items-center gap-2 px-3 py-1 bg-[#0052ff]/10 rounded-full border border-[#0052ff]/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Active Process</span>
                </div>
              )}
            </div>

            {/* Terminal Content */}
            <div className="flex-1 overflow-auto p-6 font-mono text-[14px] space-y-2 bg-[#0a0b0d] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-40">
                  <Terminal size={48} strokeWidth={1} />
                  <p className="text-sm font-semibold tracking-wider">Ready for deployment</p>
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex gap-4 animate-slide-in-right group">
                    <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={`
                      flex-1 break-all
                      ${log.type === 'error' ? 'text-rose-400' : ''}
                      ${log.type === 'success' ? 'text-emerald-400' : ''}
                      ${log.type === 'system' ? 'text-primary font-bold' : ''}
                      ${log.type === 'info' ? 'text-slate-300' : ''}
                    `}>
                      <span className="mr-3 opacity-40 group-hover:opacity-100 transition-opacity inline-block w-4 text-center">
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


