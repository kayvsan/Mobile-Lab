import { useEffect, useState, useMemo } from 'react';
import { 
  FileText, CheckCircle2, XCircle, Clock, Wifi, Activity, 
  Search, RefreshCcw, ChevronLeft, ChevronRight, AlertCircle, Monitor,
  Eye
} from 'lucide-react';
import api from '../services/api';
import ReportDetailModal from '../components/ReportDetailModal';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination state
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/reports`, {
        params: { limit, offset }
      });
      setReports(response.data.data);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Gagal memuat laporan. Pastikan koneksi ke backend tersedia.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [offset]);

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(prev => prev + limit);
    }
  };

  const handlePrevPage = () => {
    if (offset > 0) {
      setOffset(prev => Math.max(0, prev - limit));
    }
  };

  const openDetail = (id) => {
    setSelectedReportId(id);
    setIsModalOpen(true);
  };

  const filteredReports = useMemo(() => {
    return reports.filter(report => 
      (report.journey_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.journey || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.device || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.execution_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reports, searchTerm]);

  const formatDuration = (start, end) => {
    if (!start || !end) return '-';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffInSeconds = (endTime - startTime) / 1000;
    return diffInSeconds > 0 ? `${diffInSeconds.toFixed(1)}s` : '0s';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 h-full flex flex-col animate-fade-in">
      {/* Header Section */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
            <p className="text-slate-500 text-sm mt-1">View automation execution results</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Search reports..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg text-sm transition-all outline-none"
            />
          </div>
          <button 
            onClick={fetchReports}
            className="p-2.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm active:scale-95"
            title="Refresh Data"
          >
            <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 animate-pulse font-medium">Memuat data laporan...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
            <div className="p-4 bg-red-50 text-red-500 rounded-full">
              <AlertCircle size={40} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Ups! Gagal Memuat Data</h3>
              <p className="text-slate-500 max-w-xs mx-auto text-sm">{error}</p>
            </div>
            <button 
              onClick={fetchReports}
              className="inline-flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all active:scale-95 shadow-sm"
            >
              <RefreshCcw size={16} />
              Coba Lagi
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
            <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
              <FileText size={40} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Laporan Tidak Ditemukan</h3>
              <p className="text-slate-500 text-sm">
                {searchTerm ? `Tidak ada hasil untuk "${searchTerm}"` : "Belum ada riwayat eksekusi."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-600 font-medium border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="py-4 px-6">Journey & Device</th>
                    <th className="py-4 px-6">Execution Info</th>
                    <th className="py-4 px-6">Metrics</th>
                    <th className="py-4 px-6">Network</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800">{report.journey_id}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <Monitor size={12} className="text-slate-400" />
                          <span>{report.device}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Clock size={14} className="text-slate-400" />
                          <span>{formatDuration(report.start_time, report.end_time)}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wider">
                          Exec: {report.execution_id.substring(0, 8)}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Activity size={14} className="text-purple-500" />
                            <span className="font-medium">{report.ping_latency}ms</span>
                            <span className="text-[10px] text-slate-400">Ping</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="text-slate-500">Loss: <span className={report.packet_loss > 0 ? 'text-red-500 font-bold' : 'text-slate-700'}>{report.packet_loss}%</span></span>
                            <span className="text-slate-500">Resp: <span className="text-slate-700 font-medium">{report.total_response_time}s</span></span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Wifi size={14} className="text-blue-500" />
                          <span>{report.network_type}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Signal: <span className="text-slate-700 font-medium">{report.signal_level}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {report.success ? (
                          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full w-fit">
                            <CheckCircle2 size={14} />
                            <span className="font-bold text-[11px] uppercase tracking-wider">Success</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full w-fit">
                            <XCircle size={14} />
                            <span className="font-bold text-[11px] uppercase tracking-wider">Failed</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1.5">
                          {formatDate(report.created_at)}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={() => openDetail(report.id)}
                          className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 hover:bg-white hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm active:scale-95"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - Fixed at bottom of card */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <p className="text-xs text-slate-500 font-medium">
                Showing <span className="text-slate-800">{Math.min(offset + 1, total)}</span> to <span className="text-slate-800">{Math.min(offset + limit, total)}</span> of <span className="text-slate-800">{total}</span> reports
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrevPage}
                  disabled={offset === 0 || isLoading}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-1">
                  <span className="px-3 py-1 bg-white border border-blue-500 text-blue-600 rounded-lg text-xs font-bold shadow-sm shadow-blue-100">
                    {Math.floor(offset / limit) + 1}
                  </span>
                </div>
                <button 
                  onClick={handleNextPage}
                  disabled={offset + limit >= total || isLoading}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Report Detail Modal */}
      <ReportDetailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reportId={selectedReportId}
      />
    </div>
  );
};

export default ReportsPage;


