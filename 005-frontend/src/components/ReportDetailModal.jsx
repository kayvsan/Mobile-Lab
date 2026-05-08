import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, CheckCircle2, XCircle, Clock, Wifi, Activity, 
  ChevronDown, Monitor, MapPin, Calendar, Smartphone
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

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">
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
              <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-tighter">
                Execution ID: {data.execution_id}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-8">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 animate-pulse font-medium">Menarik data detail...</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center space-y-4">
              <div className="p-4 bg-red-50 text-red-500 rounded-full inline-block">
                <XCircle size={40} />
              </div>
              <p className="text-slate-600 font-medium">{error}</p>
              <button onClick={fetchDetail} className="text-purple-600 font-bold hover:underline">Coba lagi</button>
            </div>
          ) : data && (
            <>
              {/* Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-slate-400 mb-1 flex items-center gap-2">
                    <Smartphone size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Device</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800 truncate" title={data.device}>
                    {data.device}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-slate-400 mb-1 flex items-center gap-2">
                    <Wifi size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Network</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {data.network_type} <span className="text-xs text-slate-400 font-normal ml-1">({data.signal_level})</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-slate-400 mb-1 flex items-center gap-2">
                    <Activity size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Performance</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {data.ping_latency}ms <span className="text-xs text-slate-400 font-normal ml-1">({data.packet_loss}%)</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-slate-400 mb-1 flex items-center gap-2">
                    <Clock size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Time</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {data.total_response_time}s <span className="text-xs text-slate-400 font-normal ml-1">Total</span>
                  </div>
                </div>
              </div>

              {/* Screenshots Gallery */}
              {data.screenshots && data.screenshots.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Failure Screenshots</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {data.screenshots.map((filename, idx) => (
                      <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group relative">
                        <div className="aspect-[9/16] bg-slate-100 relative">
                          <img 
                            src={`http://localhost:5000/api/reports/${data.id}/screenshots/${filename}`}
                            alt="Screenshot"
                            className="w-full h-full object-contain bg-black/5"
                            onError={(e) => { e.target.src = 'https://placehold.co/400x800/png?text=Image+Not+Found'; }}
                          />
                        </div>
                        <div className="p-2 absolute bottom-0 left-0 right-0 bg-slate-900/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-white truncate text-center font-mono">{filename}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Breakdown Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Execution Breakdown</h3>
                <div className="space-y-3">
                  {data.breakdown.map((step, idx) => (
                    <div 
                      key={step.id || idx} 
                      className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div 
                        className="p-4 flex items-center justify-between cursor-pointer group hover:bg-slate-50/50"
                        onClick={() => toggleStep(step.id || idx)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${step.success ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                            {step.success ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                              {step.name}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1"><Wifi size={10} /> {step.network_type}</span>
                              <span className="flex items-center gap-1"><Activity size={10} /> {step.ping_latency}ms</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-slate-600">{step.response_time}s</div>
                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Response Time</div>
                          </div>
                          <div className={`p-1 rounded-md transition-transform duration-200 ${expandedSteps[step.id || idx] ? 'rotate-180 bg-slate-100' : 'bg-transparent'}`}>
                            <ChevronDown size={16} className="text-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* Tasks List (Expanded) */}
                      {expandedSteps[step.id || idx] && step.tasks && (
                        <div className="bg-slate-50/50 border-t border-slate-50 px-4 py-3 divide-y divide-slate-100">
                          {step.tasks.map((task, tidx) => (
                            <div key={tidx} className="py-2 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${task.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                <span className="text-xs font-medium text-slate-600">{task.task_name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-[10px] font-mono">
                                <div className="text-slate-400">
                                  Dur: <span className="text-slate-600 font-bold">{task.duration_seconds}s</span>
                                </div>
                                {task.measured && (
                                  <div className="text-slate-400">
                                    Resp: <span className="text-purple-600 font-bold">{task.response_time}s</span>
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
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium text-slate-400 px-6 shrink-0">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Calendar size={12} /> Created: {new Date(data.created_at).toLocaleString()}</span>
              <span className="flex items-center gap-1.5"><MapPin size={12} /> {data.location?.lat || '-'}, {data.location?.long || '-'}</span>
            </div>
            <div>
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

