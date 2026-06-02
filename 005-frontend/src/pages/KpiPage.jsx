import { useEffect, useState, useMemo } from 'react';
import { 
  BarChart3, RefreshCcw, AlertCircle, Filter, 
  ArrowRight, Search, Activity, Clock
} from 'lucide-react';
import api from '../services/api';

const KpiPage = () => {
  const [data, setData] = useState({ journey_summary: [], page_details: [] });
  const [journeys, setJourneys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [selectedJourney, setSelectedJourney] = useState('');

  const fetchKpiData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedJourney) {
        params.journey_id = selectedJourney;
      }
      const response = await api.get('/reports/kpi', { params });
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch KPI data:', err);
      setError('Gagal memuat data KPI. Pastikan koneksi ke backend tersedia.');
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
    fetchKpiData();
  }, [selectedJourney]);

  // Helpers
  const getJourneyName = (journeyId) => {
    const journey = journeys.find(j => j.id === journeyId || j.journey_key === journeyId);
    return journey ? journey.name : journeyId;
  };

  const getSuccessColorClass = (rate) => {
    if (rate >= 95) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (rate >= 75) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-rose-100 text-rose-700 border-rose-200';
  };

  const getApdexColorClass = (rate) => {
    if (rate >= 75) return 'bg-emerald-500 text-white';
    if (rate >= 50) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
  };

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-2 md:px-6 space-y-12 h-full flex flex-col animate-fade-in pb-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-hairline shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-surface-strong text-primary rounded-full">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-[52px] font-normal tracking-tight text-ink leading-none mb-2">KPI Dashboard</h1>
            <p className="text-body text-base">Journey & Page-wise Performance Metrics</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group flex items-center">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted">
              <Filter size={18} />
            </div>
            <select 
              value={selectedJourney}
              onChange={(e) => setSelectedJourney(e.target.value)}
              className="pl-11 pr-10 py-3 w-full sm:w-64 border border-hairline bg-surface-soft focus:bg-canvas focus:border-primary focus:ring-2 focus:ring-primary rounded-xl text-sm transition-all outline-none appearance-none font-semibold text-ink"
            >
              <option value="">All Journeys</option>
              {journeys.map(j => (
                <option key={j.id} value={j.journey_key}>{j.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          <button 
            onClick={fetchKpiData}
            className="p-3 bg-surface-strong text-ink rounded-full hover:bg-hairline-soft transition-colors active:scale-95"
            title="Refresh Data"
          >
            <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-semantic-down rounded-2xl flex items-start gap-3 border border-rose-100">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {/* Tables Section */}
      {!error && (
        <div className="space-y-12 flex-1">
          {/* Table 1: Journey Wise */}
          <div className="bg-canvas rounded-3xl border border-hairline shadow-sm overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-hairline bg-surface-soft/50">
              <h2 className="text-xl font-normal tracking-tight text-ink flex items-center gap-3">
                <Activity size={20} className="text-primary" />
                Journey Wise - Cumulative of Page's RT
              </h2>
            </div>
            
            <div className="overflow-x-auto relative">
              {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : data.journey_summary.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <BarChart3 size={32} className="opacity-50" />
                  <p>No journey data available</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
                  <thead className="bg-surface-soft text-muted font-bold tracking-widest uppercase border-b border-hairline text-[10px]">
                    {/* Top Header Row */}
                    <tr>
                      <th className="py-4 px-6 border-r border-hairline" rowSpan="2">Journey</th>
                      <th className="py-4 px-4 text-center border-r border-hairline" rowSpan="2">No of<br/>Pages</th>
                      <th className="py-4 px-4 text-center border-r border-hairline" rowSpan="2">Total<br/>Cycles</th>
                      <th className="py-4 px-4 text-center border-r border-hairline" rowSpan="2">Journey<br/>Success</th>
                      <th className="py-4 px-4 text-center border-r border-hairline" rowSpan="2">Journey<br/>Error</th>
                      <th className="py-3 px-4 text-center border-r border-hairline border-b border-hairline" colSpan="5">Journey Duration (secs)</th>
                      <th className="py-4 px-4 text-center border-r border-hairline" rowSpan="2">Journey<br/>Success<br/>Rate<br/>(System)</th>
                      <th className="py-4 px-4 text-center" rowSpan="2">Journey<br/>Success<br/>Rate<br/>(End<br/>User)</th>
                    </tr>
                    {/* Sub Header Row */}
                    <tr>
                      <th className="py-3 px-4 text-center border-r border-hairline bg-surface-strong/80">Min</th>
                      <th className="py-3 px-4 text-center border-r border-hairline bg-surface-strong/80">Median</th>
                      <th className="py-3 px-4 text-center border-r border-hairline bg-surface-strong/80">Average</th>
                      <th className="py-3 px-4 text-center border-r border-hairline bg-surface-strong/80">90th<br/>Percentile</th>
                      <th className="py-3 px-4 text-center border-r border-hairline bg-surface-strong/80">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {data.journey_summary.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-soft transition-colors">
                        <td className="py-5 px-6 border-r border-hairline">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${row.success_rate_system >= 95 ? 'bg-primary' : 'bg-muted'}`}></div>
                            <span className="font-semibold text-ink">{getJourneyName(row.journey)}</span>
                          </div>
                        </td>
                        <td className="py-5 px-4 text-center border-r border-hairline font-semibold text-ink">{row.no_of_pages}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline font-semibold text-ink">{row.total_cycles}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline font-semibold text-emerald-600">{row.journey_success}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline font-semibold text-semantic-down">{row.journey_error}</td>
                        
                        <td className="py-5 px-4 text-center border-r border-hairline text-muted font-medium">{row.duration.min.toFixed(2)}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline font-bold text-ink">{row.duration.median.toFixed(2)}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline text-muted font-medium">{row.duration.average.toFixed(2)}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline font-bold text-ink">{row.duration.p90.toFixed(2)}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline text-muted font-medium">{row.duration.max.toFixed(2)}</td>
                        
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getSuccessColorClass(row.success_rate_system)}`}>
                            {row.success_rate_system.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getSuccessColorClass(row.success_rate_end_user)}`}>
                            {row.success_rate_end_user.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Table 2: Page-wise KPI Details */}
          <div className="bg-canvas rounded-3xl border border-hairline shadow-sm overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-hairline bg-surface-soft/50">
              <h2 className="text-xl font-normal tracking-tight text-ink flex items-center gap-3">
                <Clock size={20} className="text-primary" />
                Page-wise KPI Details
              </h2>
            </div>
            
            <div className="overflow-x-auto relative">
              {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : data.page_details.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <BarChart3 size={32} className="opacity-50" />
                  <p>No page data available</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[1200px]">
                  <thead className="bg-surface-soft text-muted font-bold tracking-widest uppercase border-b border-hairline text-[10px]">
                    {/* Top Header Row */}
                    <tr>
                      <th className="py-4 px-4 border-r border-hairline" rowSpan="2">No</th>
                      <th className="py-4 px-6 border-r border-hairline" rowSpan="2">Page Name</th>
                      <th className="py-4 px-4 text-center border-r border-hairline" rowSpan="2">Total<br/>Cycles</th>
                      <th className="py-4 px-4 text-center border-r border-hairline" rowSpan="2">Page<br/>Success</th>
                      <th className="py-4 px-4 text-center border-r border-hairline" rowSpan="2">Page<br/>Error</th>
                      <th className="py-3 px-4 text-center border-r border-hairline border-b border-hairline" colSpan="5">Response Time (secs)</th>
                      <th className="py-4 px-4 text-center border-r border-hairline" rowSpan="2">Application<br/>Performance<br/>Index</th>
                      <th className="py-4 px-4 text-center border-r border-hairline" rowSpan="2">Journey<br/>Success<br/>Rate<br/>(System)</th>
                      <th className="py-4 px-4 text-center border-r border-hairline" rowSpan="2">Journey<br/>Success<br/>Rate<br/>(End<br/>User)</th>
                      <th className="py-3 px-4 text-center border-b border-hairline" colSpan="3">NVT (%)</th>
                    </tr>
                    {/* Sub Header Row */}
                    <tr>
                      <th className="py-3 px-4 text-center border-r border-hairline bg-surface-strong/80">Min</th>
                      <th className="py-3 px-4 text-center border-r border-hairline bg-surface-strong/80">Median</th>
                      <th className="py-3 px-4 text-center border-r border-hairline bg-surface-strong/80">Average</th>
                      <th className="py-3 px-4 text-center border-r border-hairline bg-surface-strong/80">90th<br/>Percentile</th>
                      <th className="py-3 px-4 text-center border-r border-hairline bg-surface-strong/80">Max</th>
                      
                      <th className="py-3 px-4 text-center border-r border-hairline bg-surface-strong/80">Sig&gt;=<br/>-85dBm</th>
                      <th className="py-3 px-4 text-center border-r border-hairline bg-surface-strong/80">Ping<br/>Success</th>
                      <th className="py-3 px-4 text-center bg-surface-strong/80">API<br/>RT&lt;200 ms</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {data.page_details.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-soft transition-colors">
                        <td className="py-5 px-4 text-muted font-bold border-r border-hairline">{idx + 1}</td>
                        <td className="py-5 px-6 border-r border-hairline font-semibold text-ink">{row.page_name}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline font-semibold text-ink">{row.total_cycles}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline font-semibold text-emerald-600">{row.page_success}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline font-semibold text-semantic-down">{row.page_error}</td>
                        
                        <td className="py-5 px-4 text-center border-r border-hairline text-muted font-medium">{row.response_time.min.toFixed(2)}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline font-bold text-ink">{row.response_time.median.toFixed(2)}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline text-muted font-medium">{row.response_time.average.toFixed(2)}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline font-bold text-ink">{row.response_time.p90.toFixed(2)}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline text-muted font-medium">{row.response_time.max.toFixed(2)}</td>
                        
                        <td className="py-5 px-4 text-center border-r border-hairline">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${getApdexColorClass(row.apdex)}`}>
                            {row.apdex.toFixed(2)}%
                          </span>
                        </td>
                        
                        <td className="py-5 px-4 text-center border-r border-hairline">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getSuccessColorClass(row.success_rate_system)}`}>
                            {row.success_rate_system.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-5 px-4 text-center border-r border-hairline">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getSuccessColorClass(row.success_rate_end_user)}`}>
                            {row.success_rate_end_user.toFixed(2)}%
                          </span>
                        </td>
                        
                        <td className="py-5 px-4 text-center border-r border-hairline text-muted font-medium">{row.nvt_sig.toFixed(2)}</td>
                        <td className="py-5 px-4 text-center border-r border-hairline text-muted font-medium">{row.nvt_ping.toFixed(2)}</td>
                        <td className="py-5 px-4 text-center text-muted font-medium">{row.nvt_api !== undefined ? row.nvt_api.toFixed(2) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiPage;
