import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { 
  X, CheckCircle2, XCircle, Clock, Wifi, Activity, Globe,
  ChevronDown, Monitor, MapPin, Calendar, Smartphone, Download
} from 'lucide-react';
import api from '../services/api';

const ReportDetailModal = ({ isOpen, onClose, reportId }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});

  useEffect(() => {
    if (isOpen && reportId) {
      fetchDetail();
    }
  }, [isOpen, reportId]);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/reports/${reportId}`);
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch report details:', err);
      setError('Gagal memuat detail laporan.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStep = (stepId) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const exportDetailToExcel = () => {
    if (!data || !data.breakdown) return;
    
    const exportData = [];
    
    data.breakdown.forEach((step, sIdx) => {
      exportData.push({
        'Step': sIdx + 1,
        'Type': 'Sub Journey',
        'Name': step.name,
        'Status': step.success ? 'Success' : 'Failed',
        'Response Time (s)': step.response_time,
        'Duration (s)': '-',
        'Network': step.network_type,
        'Ping (ms)': step.ping_latency,
        'Signal (dBm)': step.signal_level || '-',
      });
      
      if (step.tasks && step.tasks.length > 0) {
        step.tasks.forEach((task, tIdx) => {
          exportData.push({
            'Step': `${sIdx + 1}.${tIdx + 1}`,
            'Type': 'Task',
            'Name': task.task_name,
            'Status': task.success ? 'Success' : 'Failed',
            'Response Time (s)': task.response_time !== undefined ? task.response_time : '-',
            'Duration (s)': task.duration_seconds !== undefined ? task.duration_seconds : '-',
            'Network': '-',
            'Ping (ms)': '-',
            'Signal (dBm)': '-',
          });
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report Details");
    
    XLSX.writeFile(workbook, `Detail_${data.journey_id}_${data.execution_id}.xlsx`);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-canvas w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-hairline overflow-hidden flex flex-col relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-hairline flex items-center justify-between bg-surface-soft/50 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-normal tracking-tight text-ink">
                {data ? `Report: ${data.journey_id}` : 'Loading Report...'}
              </h2>
              {data && (
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 
                  ${data.success ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                  {data.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {data.success ? 'Success' : 'Failed'}
                </div>
              )}
            </div>
            {data && (
              <p className="text-xs text-muted mt-1 font-mono uppercase tracking-widest font-semibold">
                Execution ID: {data.execution_id}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <button
                onClick={exportDetailToExcel}
                className="px-4 py-2 bg-primary/10 text-primary rounded-full hover:bg-primary hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                title="Export this detail to Excel"
              >
                <Download size={14} />
                Export
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-surface-strong rounded-full text-muted hover:text-ink transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 space-y-10">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-muted animate-pulse font-semibold">Menarik data detail...</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center space-y-4">
              <div className="p-4 bg-rose-50 text-semantic-down rounded-full inline-block">
                <XCircle size={40} />
              </div>
              <p className="text-ink font-semibold">{error}</p>
              <button onClick={fetchDetail} className="text-primary font-bold hover:underline">Coba lagi</button>
            </div>
          ) : data && (
            <>
              {/* Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-surface-soft p-5 rounded-2xl border border-hairline">
                  <div className="text-muted mb-2 flex items-center gap-2">
                    <Smartphone size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Device</span>
                  </div>
                  <div className="text-sm font-semibold text-ink truncate" title={data.device}>
                    {data.device}
                  </div>
                </div>
                <div className="bg-surface-soft p-5 rounded-2xl border border-hairline">
                  <div className="text-muted mb-2 flex items-center gap-2">
                    <Wifi size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Network</span>
                  </div>
                  <div className="text-sm font-semibold text-ink">
                    {data.network_type} <span className="text-xs text-muted font-medium ml-1">({data.signal_level})</span>
                  </div>
                </div>
                <div className="bg-surface-soft p-5 rounded-2xl border border-hairline">
                  <div className="text-muted mb-2 flex items-center gap-2">
                    <Activity size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Performance</span>
                  </div>
                  <div className="text-sm font-semibold text-ink">
                    {data.ping_latency}ms <span className="text-xs text-muted font-medium ml-1">({data.packet_loss}%)</span>
                  </div>
                </div>
                <div className="bg-surface-soft p-5 rounded-2xl border border-hairline">
                  <div className="text-muted mb-2 flex items-center gap-2">
                    <Clock size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Time</span>
                  </div>
                  <div className="text-sm font-semibold text-ink">
                    {data.total_response_time}s <span className="text-xs text-muted font-medium ml-1">Total</span>
                  </div>
                </div>
                <div className="bg-surface-soft p-5 rounded-2xl border border-hairline">
                  <div className="text-muted mb-2 flex items-center gap-2">
                    <Globe size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">API Test</span>
                  </div>
                  <div className="text-sm font-semibold text-ink">
                    {data.nvt_measurements?.test_api?.response_time !== undefined && data.nvt_measurements?.test_api?.response_time !== "-1" ? `${data.nvt_measurements.test_api.response_time}s` : '-'} 
                    <span className="text-xs font-medium ml-1 flex items-center gap-1 inline-flex">
                      Status: <span className={String(data.nvt_measurements?.test_api?.status) === "200" || data.nvt_measurements?.test_api?.status === 200 ? 'text-emerald-500' : 'text-rose-500'}>{data.nvt_measurements?.test_api?.status || '-'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Screenshots Gallery */}
              {data.screenshots && data.screenshots.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-muted uppercase tracking-widest px-1">Failure Screenshots</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {data.screenshots.map((filename, idx) => (
                      <div key={idx} className="border border-hairline rounded-2xl overflow-hidden bg-canvas shadow-sm hover:shadow-md transition-shadow group relative">
                        <div className="aspect-[9/16] bg-surface-soft relative">
                          <img 
                            src={`http://localhost:5000/api/reports/${data.id}/screenshots/${filename}`}
                            alt="Screenshot"
                            className="w-full h-full object-contain bg-black/5"
                            onError={(e) => { e.target.src = 'https://placehold.co/400x800/png?text=Image+Not+Found'; }}
                          />
                        </div>
                        <div className="p-3 absolute bottom-0 left-0 right-0 bg-surface-dark/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-xs text-white truncate text-center font-mono font-medium">{filename}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Breakdown Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-muted uppercase tracking-widest px-1">Execution Breakdown</h3>
                <div className="space-y-3">
                  {data.breakdown.map((step, idx) => (
                    <div 
                      key={step.id || idx} 
                      className="border border-hairline rounded-2xl overflow-hidden bg-canvas hover:border-primary/50 transition-colors"
                    >
                      <div 
                        className="p-5 flex items-center justify-between cursor-pointer group hover:bg-surface-soft/50"
                        onClick={() => toggleStep(step.id || idx)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl ${step.success ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                            {step.success ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-ink transition-colors">
                              {step.name}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted mt-1 font-medium">
                              <span className="flex items-center gap-1.5"><Wifi size={12} /> {step.network_type}</span>
                              <span className="flex items-center gap-1.5"><Activity size={12} /> {step.ping_latency}ms</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm font-mono font-bold text-ink">{step.response_time}s</div>
                            <div className="text-[10px] text-muted uppercase font-bold tracking-widest mt-0.5">Response Time</div>
                          </div>
                          <div className={`p-1.5 rounded-full transition-transform duration-200 ${expandedSteps[step.id || idx] ? 'rotate-180 bg-surface-strong' : 'bg-transparent text-muted group-hover:text-ink group-hover:bg-hairline-soft'}`}>
                            <ChevronDown size={20} />
                          </div>
                        </div>
                      </div>

                      {/* Tasks List (Expanded) */}
                      {expandedSteps[step.id || idx] && step.tasks && (
                        <div className="bg-surface-soft/30 border-t border-hairline px-6 py-4 divide-y divide-hairline">
                          {step.tasks.map((task, tidx) => (
                            <div key={tidx} className="py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${task.success ? 'bg-emerald-400' : 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`} />
                                <span className="text-sm font-semibold text-ink">{task.task_name}</span>
                              </div>
                              <div className="flex items-center gap-6 text-xs font-mono font-medium">
                                <div className="text-muted">
                                  Dur: <span className="text-ink font-bold">{task.duration_seconds}s</span>
                                </div>
                                {task.measured && (
                                  <div className="text-muted">
                                    Resp: <span className="text-primary font-bold">{task.response_time}s</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Info */}
        {data && (
          <div className="p-5 bg-surface-soft/50 border-t border-hairline flex items-center justify-between text-[11px] font-semibold text-muted px-8 shrink-0">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2"><Calendar size={14} /> Created: {new Date(data.created_at).toLocaleString()}</span>
              <span className="flex items-center gap-2"><MapPin size={14} /> {data.location?.lat || '-'}, {data.location?.long || '-'}</span>
            </div>
            <div className="font-mono tracking-widest uppercase">
              ID: {data.id}
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ReportDetailModal;

