import { useEffect, useState, useMemo } from 'react';
import {
  Radio, RefreshCcw, AlertCircle, Filter, Search,
  Wifi, Signal, Activity, Zap, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock
} from 'lucide-react';
import api from '../services/api';

const NvtPage = () => {
  const [nvtData, setNvtData] = useState([]);
  const [summary, setSummary] = useState({});
  const [journeys, setJourneys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [selectedJourney, setSelectedJourney] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');

  // Pagination
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchNvtData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { limit, offset };
      if (selectedJourney) params.journey_id = selectedJourney;
      if (selectedNetwork) params.network_type = selectedNetwork;

      const response = await api.get('/reports/nvt', { params });
      setNvtData(response.data.data);
      setSummary(response.data.summary);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch NVT data:', err);
      setError('Gagal memuat data NVT. Pastikan koneksi ke backend tersedia.');
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

  useEffect(() => {
    fetchJourneys();
  }, []);

  useEffect(() => {
    setOffset(0);
  }, [selectedJourney, selectedNetwork]);

  useEffect(() => {
    fetchNvtData();
  }, [offset, selectedJourney, selectedNetwork]);

  const handleNextPage = () => {
    if (offset + limit < total) setOffset(prev => prev + limit);
  };

  const handlePrevPage = () => {
    if (offset > 0) setOffset(prev => Math.max(0, prev - limit));
  };

  const filteredData = useMemo(() => {
    return nvtData.filter(row =>
      (row.journey || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.device || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.network_type || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [nvtData, searchTerm]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSignalColor = (val) => {
    if (val === null || val === undefined) return 'text-muted';
    if (val >= -85 || val >= 50) return 'text-emerald-600';
    if (val >= -100) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getSignalBg = (val) => {
    if (val === null || val === undefined) return 'bg-surface-soft text-muted';
    if (val >= -85 || val >= 50) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (val >= -100) return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-rose-50 text-rose-700 border-rose-100';
  };

  const getPingColor = (val) => {
    if (val === null || val === undefined) return 'text-muted';
    if (val < 50) return 'text-emerald-600';
    if (val <= 100) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getPingBg = (val) => {
    if (val === null || val === undefined) return 'bg-surface-soft text-muted';
    if (val < 50) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (val <= 100) return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-rose-50 text-rose-700 border-rose-100';
  };

  const getApiResultBadge = (result, rt) => {
    if (result === 'timeout') return { bg: 'bg-rose-50 text-rose-700 border-rose-100', label: 'Timeout' };
    if (result === 'skipped') return { bg: 'bg-slate-50 text-slate-500 border-slate-200', label: 'Skipped' };
    if (rt !== null && rt >= 0) return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'OK' };
    return { bg: 'bg-slate-50 text-slate-500 border-slate-200', label: result || '-' };
  };

  // Summary stat cards
  const statCards = [
    {
      label: 'Avg Signal',
      value: summary.avg_signal !== null && summary.avg_signal !== undefined ? `${summary.avg_signal} dBm` : '-',
      icon: <Signal size={20} />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      sub: summary.signal_good_count !== undefined
        ? `${summary.signal_good_count}/${summary.signal_total_count} ≥ -85 dBm`
        : null,
    },
    {
      label: 'Avg Ping',
      value: summary.avg_ping !== null && summary.avg_ping !== undefined ? `${summary.avg_ping} ms` : '-',
      icon: <Activity size={20} />,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      sub: null,
    },
    {
      label: 'Avg Packet Loss',
      value: summary.avg_packet_loss !== null && summary.avg_packet_loss !== undefined ? `${summary.avg_packet_loss}%` : '-',
      icon: <Zap size={20} />,
      color: summary.avg_packet_loss > 0 ? 'text-rose-600' : 'text-emerald-600',
      bg: summary.avg_packet_loss > 0 ? 'bg-rose-50' : 'bg-emerald-50',
      sub: null,
    },
    {
      label: 'API Success',
      value: summary.api_success_rate !== null && summary.api_success_rate !== undefined ? `${summary.api_success_rate}%` : '-',
      icon: <Wifi size={20} />,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      sub: null,
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-2 md:px-6 space-y-10 h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-hairline shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-surface-strong text-primary rounded-full">
            <Radio size={24} />
          </div>
          <div>
            <h1 className="text-[52px] font-normal tracking-tight text-ink leading-none mb-2">NVT</h1>
            <p className="text-body text-base">Network Verification Test per Sub Journey</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Journey Filter */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Filter size={16} />
            </div>
            <select
              value={selectedJourney}
              onChange={(e) => setSelectedJourney(e.target.value)}
              className="pl-9 pr-8 py-3 w-44 border border-hairline bg-surface-soft focus:bg-canvas focus:border-primary focus:ring-2 focus:ring-primary rounded-xl text-sm transition-all outline-none appearance-none font-semibold text-ink"
            >
              <option value="">All Journeys</option>
              {journeys.map(j => (
                <option key={j.id} value={j.journey_key}>{j.name}</option>
              ))}
            </select>
          </div>

          {/* Network Type Filter */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Wifi size={16} />
            </div>
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="pl-9 pr-8 py-3 w-36 border border-hairline bg-surface-soft focus:bg-canvas focus:border-primary focus:ring-2 focus:ring-primary rounded-xl text-sm transition-all outline-none appearance-none font-semibold text-ink"
            >
              <option value="">All Network</option>
              <option value="4G">4G</option>
              <option value="WiFi">WiFi</option>
              <option value="5G">5G</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-3 w-44 border border-hairline bg-surface-soft focus:bg-canvas focus:border-primary focus:ring-2 focus:ring-primary rounded-xl text-sm transition-all outline-none text-ink font-semibold"
            />
          </div>

          <button
            onClick={fetchNvtData}
            className="p-3 bg-surface-strong text-ink rounded-full hover:bg-hairline-soft transition-colors active:scale-95"
            title="Refresh Data"
          >
            <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!error && !isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          {statCards.map((card, idx) => (
            <div key={idx} className="bg-canvas rounded-2xl border border-hairline p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{card.label}</span>
                <div className={`p-2 rounded-full ${card.bg} ${card.color}`}>
                  {card.icon}
                </div>
              </div>
              <p className={`text-2xl font-bold tracking-tight ${card.color}`}>{card.value}</p>
              {card.sub && (
                <p className="text-[11px] text-muted font-medium">{card.sub}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Data Table Card */}
      <div className="bg-canvas rounded-3xl border border-hairline shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-muted animate-pulse font-semibold">Memuat data NVT...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
            <div className="p-4 bg-rose-50 text-semantic-down rounded-full">
              <AlertCircle size={40} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Gagal Memuat Data</h3>
              <p className="text-muted max-w-xs mx-auto text-sm">{error}</p>
            </div>
            <button
              onClick={fetchNvtData}
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface-dark text-white rounded-full font-bold hover:bg-black transition-all active:scale-95 shadow-sm"
            >
              <RefreshCcw size={18} />
              Coba Lagi
            </button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
            <div className="p-4 bg-surface-strong text-muted rounded-full">
              <Radio size={40} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Data NVT Tidak Ditemukan</h3>
              <p className="text-muted text-sm font-medium">
                {searchTerm ? `Tidak ada hasil untuk "${searchTerm}"` : "Belum ada data NVT yang tersedia."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[1200px]">
                <thead className="bg-surface-soft text-muted font-bold tracking-widest uppercase border-b border-hairline sticky top-0 z-10 backdrop-blur-sm text-[10px]">
                  <tr>
                    <th className="py-4 px-5 border-r border-hairline">Journey & Device</th>
                    <th className="py-4 px-5 border-r border-hairline">Sub Journey</th>
                    <th className="py-4 px-5 border-r border-hairline text-center">Network</th>
                    <th className="py-4 px-5 border-r border-hairline text-center">Signal<br/>(dBm)</th>
                    <th className="py-4 px-5 border-r border-hairline text-center">Signal<br/>Quality</th>
                    <th className="py-4 px-5 border-r border-hairline text-center">BER</th>
                    <th className="py-4 px-5 border-r border-hairline text-center">Cell ID</th>
                    <th className="py-4 px-5 border-r border-hairline text-center">Ping<br/>(ms)</th>
                    <th className="py-4 px-5 border-r border-hairline text-center">Packet<br/>Loss (%)</th>
                    <th className="py-4 px-5 border-r border-hairline text-center">API<br/>Status</th>
                    <th className="py-4 px-5 border-r border-hairline text-center">API RT<br/>(sec)</th>
                    <th className="py-4 px-5 border-r border-hairline text-center">API<br/>Result</th>
                    <th className="py-4 px-5 border-r border-hairline text-center">Status</th>
                    <th className="py-4 px-5 text-center">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filteredData.map((row) => {
                    const apiBadge = getApiResultBadge(row.api_result, row.api_response_time);
                    return (
                      <tr key={row.report_id} className="hover:bg-surface-soft/50 transition-colors group">
                        {/* Journey & Device */}
                        <td className="py-4 px-5 border-r border-hairline">
                          <div className="font-semibold text-ink text-xs">{row.journey}</div>
                          <div className="text-[11px] text-muted mt-1 font-medium">{row.device}</div>
                        </td>

                        {/* Sub Journey */}
                        <td className="py-4 px-5 border-r border-hairline">
                          <div className="font-semibold text-ink text-xs">{row.sub_journey_name || '-'}</div>
                        </td>

                        {/* Network Type Badge */}
                        <td className="py-4 px-5 border-r border-hairline text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                            row.network_type === '4G' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            row.network_type === '5G' ? 'bg-violet-50 text-violet-700 border-violet-100' :
                            'bg-teal-50 text-teal-700 border-teal-100'
                          }`}>
                            <Wifi size={12} />
                            {row.network_type}
                          </span>
                        </td>

                        {/* Signal Level */}
                        <td className="py-4 px-5 border-r border-hairline text-center">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getSignalBg(row.signal_level)}`}>
                            {row.signal_level !== null ? row.signal_level : '-'}
                          </span>
                        </td>

                        {/* Signal Quality */}
                        <td className="py-4 px-5 border-r border-hairline text-center font-semibold text-ink">
                          {row.signal_quality !== null ? row.signal_quality : '-'}
                        </td>

                        {/* BER */}
                        <td className="py-4 px-5 border-r border-hairline text-center font-medium text-muted">
                          {row.ber !== null ? row.ber : '-'}
                        </td>

                        {/* Cell ID */}
                        <td className="py-4 px-5 border-r border-hairline text-center">
                          <span className="font-mono text-xs text-ink">{row.cell_id !== null ? row.cell_id : '-'}</span>
                          {row.cell_network_type && (
                            <div className="text-[10px] text-muted mt-0.5">{row.cell_network_type}</div>
                          )}
                        </td>

                        {/* Ping Latency */}
                        <td className="py-4 px-5 border-r border-hairline text-center">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getPingBg(row.ping_latency)}`}>
                            {row.ping_latency !== null ? row.ping_latency.toFixed(1) : '-'}
                          </span>
                        </td>

                        {/* Packet Loss */}
                        <td className="py-4 px-5 border-r border-hairline text-center">
                          <span className={`font-bold text-xs ${row.packet_loss > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {row.packet_loss !== null ? row.packet_loss : '-'}
                          </span>
                        </td>

                        {/* API Status */}
                        <td className="py-4 px-5 border-r border-hairline text-center">
                          {row.api_status !== null ? (
                            <span className={`font-bold text-xs ${String(row.api_status) === '1' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {String(row.api_status) === '1' ? 'OK' : 'Fail'}
                            </span>
                          ) : '-'}
                        </td>

                        {/* API Response Time */}
                        <td className="py-4 px-5 border-r border-hairline text-center font-semibold text-ink text-xs">
                          {row.api_response_time !== null ? (
                            row.api_response_time < 0
                              ? <span className="text-rose-500 font-bold">timeout</span>
                              : `${row.api_response_time.toFixed(3)}`
                          ) : '-'}
                        </td>

                        {/* API Result */}
                        <td className="py-4 px-5 border-r border-hairline text-center">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${apiBadge.bg}`}>
                            {apiBadge.label}
                          </span>
                        </td>

                        {/* Report Success */}
                        <td className="py-4 px-5 border-r border-hairline text-center">
                          {row.success ? (
                            <div className="flex items-center justify-center gap-1 text-emerald-600">
                              <CheckCircle2 size={14} />
                              <span className="font-bold text-[10px] uppercase tracking-widest">Pass</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-rose-600">
                              <XCircle size={14} />
                              <span className="font-bold text-[10px] uppercase tracking-widest">Fail</span>
                            </div>
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-muted">
                            <Clock size={13} />
                            <span className="text-[11px] font-medium">{formatDate(row.created_at)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-6 border-t border-hairline bg-surface-soft/30 flex items-center justify-between shrink-0">
              <p className="text-sm text-muted font-medium">
                Showing <span className="text-ink font-semibold">{Math.min(offset + 1, total)}</span> to <span className="text-ink font-semibold">{Math.min(offset + limit, total)}</span> of <span className="text-ink font-semibold">{total}</span> records
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
    </div>
  );
};

export default NvtPage;
