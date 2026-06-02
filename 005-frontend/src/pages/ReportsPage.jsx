import { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileText, CheckCircle2, XCircle, Clock, Wifi, Activity, 
  Search, RefreshCcw, ChevronLeft, ChevronRight, AlertCircle, Monitor,
  Eye, PlayCircle, Filter, Download
} from 'lucide-react';
import api from '../services/api';
import ReportDetailModal from '../components/ReportDetailModal';
import VideoPlayerModal from '../components/VideoPlayerModal';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter state
  const [journeys, setJourneys] = useState([]);
  const [selectedJourney, setSelectedJourney] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  
  // Modal state
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Video player state
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [videoReportId, setVideoReportId] = useState(null);
  const [videoJourneyName, setVideoJourneyName] = useState('');

  // Pagination state
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { limit, offset };
      if (selectedJourney) params.journey_id = selectedJourney;
      if (selectedStatus !== '') params.success = selectedStatus;
      if (selectedNetwork) params.network_type = selectedNetwork;

      const response = await api.get(`/reports`, { params });
      setReports(response.data.data);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Gagal memuat laporan. Pastikan koneksi ke backend tersedia.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJourneys = async () => {
    try {
      const response = await api.get('/journeys');
      setJourneys(response.data);
    } catch (err) {
      console.error('Failed to fetch journeys:', err);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const params = { limit: 999999, offset: 0 };
      if (selectedJourney) params.journey_id = selectedJourney;
      if (selectedStatus !== '') params.success = selectedStatus;
      if (selectedNetwork) params.network_type = selectedNetwork;

      const response = await api.get(`/reports`, { params });
      const exportData = response.data.data;
      
      const formattedData = exportData.map(report => ({
        'Report ID': report.id,
        'Journey': report.journey_id,
        'Device': report.device,
        'Response Time (s)': report.total_response_time,
        'Ping (ms)': report.ping_latency,
        'Packet Loss (%)': report.packet_loss,
        'Network Type': report.network_type,
        'Signal Level': report.signal_level,
        'Status': report.success ? 'Success' : 'Failed',
        'Time': new Date(report.created_at).toLocaleString('id-ID')
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");
      
      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Reports_Export_${dateStr}.xlsx`);
    } catch (err) {
      console.error('Failed to export reports:', err);
      alert('Gagal mengekspor data. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchJourneys();
  }, []);

  useEffect(() => {
    setOffset(0);
  }, [selectedJourney, selectedStatus, selectedNetwork]);

  useEffect(() => {
    fetchReports();
  }, [offset, selectedJourney, selectedStatus, selectedNetwork]);

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

  const openVideo = (report) => {
    setVideoReportId(report.id);
    setVideoJourneyName(report.journey_id);
    setIsVideoOpen(true);
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
    <div className="max-w-[1200px] mx-auto py-12 px-2 md:px-6 space-y-12 h-full flex flex-col animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col gap-6 pb-6 border-b border-hairline shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-surface-strong text-primary rounded-full">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-[52px] font-normal tracking-tight text-ink leading-none mb-2">Reports</h1>
              <p className="text-body text-base">View automation execution results</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToExcel}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary hover:text-white transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
            >
              <Download size={18} className={isExporting ? 'animate-bounce' : ''} />
              Export Data
            </button>
          </div>
        </div>
        
        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-surface-soft/50 border border-hairline rounded-2xl">
          {/* Journey Filter */}
          <div className="relative group flex-1 min-w-[160px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Filter size={16} />
            </div>
            <select
              value={selectedJourney}
              onChange={(e) => setSelectedJourney(e.target.value)}
              className="pl-9 pr-8 py-2.5 w-full border-none bg-canvas focus:ring-1 focus:ring-primary rounded-xl text-sm transition-all outline-none appearance-none font-semibold text-ink shadow-sm"
            >
              <option value="">All Journeys</option>
              {journeys.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative group flex-1 min-w-[130px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <CheckCircle2 size={16} />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="pl-9 pr-8 py-2.5 w-full border-none bg-canvas focus:ring-1 focus:ring-primary rounded-xl text-sm transition-all outline-none appearance-none font-semibold text-ink shadow-sm"
            >
              <option value="">All Status</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>

          {/* Network Type Filter */}
          <div className="relative group flex-1 min-w-[130px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Wifi size={16} />
            </div>
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="pl-9 pr-8 py-2.5 w-full border-none bg-canvas focus:ring-1 focus:ring-primary rounded-xl text-sm transition-all outline-none appearance-none font-semibold text-ink shadow-sm"
            >
              <option value="">All Network</option>
              <option value="4G">4G</option>
              <option value="WiFi">WiFi</option>
              <option value="5G">5G</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative group flex-[2] min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Search reports..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 w-full border-none bg-canvas focus:ring-1 focus:ring-primary rounded-xl text-sm transition-all outline-none text-ink font-semibold shadow-sm"
            />
          </div>
          
          {/* Refresh Button */}
          <button 
            onClick={fetchReports}
            className="p-2.5 bg-canvas text-ink rounded-xl hover:bg-surface-strong transition-colors active:scale-95 shadow-sm shrink-0"
            title="Refresh Data"
          >
            <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-canvas rounded-3xl border border-hairline shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-muted animate-pulse font-semibold">Memuat data laporan...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
            <div className="p-4 bg-rose-50 text-semantic-down rounded-full">
              <AlertCircle size={40} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Ups! Gagal Memuat Data</h3>
              <p className="text-muted max-w-xs mx-auto text-sm">{error}</p>
            </div>
            <button 
              onClick={fetchReports}
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface-dark text-white rounded-full font-bold hover:bg-black transition-all active:scale-95 shadow-sm"
            >
              <RefreshCcw size={18} />
              Coba Lagi
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
            <div className="p-4 bg-surface-strong text-muted rounded-full">
              <FileText size={40} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Laporan Tidak Ditemukan</h3>
              <p className="text-muted text-sm font-medium">
                {searchTerm ? `Tidak ada hasil untuk "${searchTerm}"` : "Belum ada riwayat eksekusi."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-soft text-muted font-bold tracking-widest uppercase border-b border-hairline sticky top-0 z-10 backdrop-blur-sm text-[10px]">
                  <tr>
                    <th className="py-5 px-8">Journey & Device</th>
                    <th className="py-5 px-8">Response Time</th>
                    <th className="py-5 px-8">Metrics</th>
                    <th className="py-5 px-8">Network</th>
                    <th className="py-5 px-8">Status</th>
                    <th className="py-5 px-8 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-surface-soft/50 transition-colors group">
                      <td className="py-5 px-8">
                        <div className="font-semibold text-ink">{report.journey_id}</div>
                        <div className="flex items-center gap-2 text-[11px] text-muted mt-1.5 font-medium">
                          <Monitor size={14} className="text-muted" />
                          <span>{report.device}</span>
                        </div>
                      </td>
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-2 text-ink font-semibold">
                          <Clock size={16} className="text-muted" />
                          <span>{report.total_response_time !== null ? `${report.total_response_time}s` : '-'}</span>
                        </div>
                        <div className="text-[10px] font-mono text-muted mt-1.5 tracking-widest">
                          EXEC: {report.execution_id.substring(0, 8)}
                        </div>
                      </td>
                      <td className="py-5 px-8">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-ink">
                            <Activity size={16} className="text-primary" />
                            <span className="font-semibold">{report.ping_latency}ms</span>
                            <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Ping</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-medium">
                            <span className="text-muted">Loss: <span className={report.packet_loss > 0 ? 'text-semantic-down font-bold' : 'text-ink'}>{report.packet_loss}%</span></span>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-2 text-ink font-semibold">
                          <Wifi size={16} className="text-primary" />
                          <span>{report.network_type}</span>
                        </div>
                        <div className="text-xs font-medium text-muted mt-1.5">
                          Signal: <span className="text-ink">{report.signal_level}</span>
                        </div>
                      </td>
                      <td className="py-5 px-8">
                        {report.success ? (
                          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-md w-fit">
                            <CheckCircle2 size={16} />
                            <span className="font-bold text-[10px] uppercase tracking-widest">Success</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-md w-fit">
                            <XCircle size={16} />
                            <span className="font-bold text-[10px] uppercase tracking-widest">Failed</span>
                          </div>
                        )}
                        <div className="text-xs font-medium text-muted mt-2">
                          {formatDate(report.created_at)}
                        </div>
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {report.recording && (
                            <button 
                              onClick={() => openVideo(report)}
                              className="p-2.5 bg-primary/10 text-primary rounded-full hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                              title="Play Recording"
                            >
                              <PlayCircle size={20} />
                            </button>
                          )}
                          <button 
                            onClick={() => openDetail(report.id)}
                            className="p-2.5 bg-surface-strong text-ink rounded-full hover:bg-hairline-soft transition-all shadow-sm active:scale-95"
                            title="View Details"
                          >
                            <Eye size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - Fixed at bottom of card */}
            <div className="p-6 border-t border-hairline bg-surface-soft/30 flex items-center justify-between shrink-0">
              <p className="text-sm text-muted font-medium">
                Showing <span className="text-ink font-semibold">{Math.min(offset + 1, total)}</span> to <span className="text-ink font-semibold">{Math.min(offset + limit, total)}</span> of <span className="text-ink font-semibold">{total}</span> reports
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrevPage}
                  disabled={offset === 0 || isLoading}
                  className="p-2 rounded-full border border-hairline bg-canvas text-ink hover:bg-surface-strong disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-1">
                  <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold shadow-sm">
                    {Math.floor(offset / limit) + 1}
                  </span>
                </div>
                <button 
                  onClick={handleNextPage}
                  disabled={offset + limit >= total || isLoading}
                  className="p-2 rounded-full border border-hairline bg-canvas text-ink hover:bg-surface-strong disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronRight size={20} />
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

      <VideoPlayerModal 
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        reportId={videoReportId}
        journeyName={videoJourneyName}
      />
    </div>
  );
};

export default ReportsPage;


