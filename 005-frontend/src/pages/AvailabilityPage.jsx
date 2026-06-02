import { useEffect, useState } from 'react';
import { 
  ShieldAlert, RefreshCcw, AlertCircle, Filter, Calendar,
  CheckCircle2, XCircle, Activity, Search, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import api from '../services/api';

const AvailabilityPage = () => {
  const [data, setData] = useState(null);
  const [journeys, setJourneys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [selectedJourney, setSelectedJourney] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAvailabilityData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedJourney) params.journey_id = selectedJourney;
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) {
        const endOfDate = new Date(dateTo);
        endOfDate.setHours(23, 59, 59, 999);
        params.date_to = endOfDate.toISOString();
      }
      
      const response = await api.get('/reports/availability', { params });
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch Availability data:', err);
      setError('Gagal memuat data Availability. Pastikan koneksi ke backend tersedia.');
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
    fetchAvailabilityData();
  }, [selectedJourney, dateFrom, dateTo]);

  // UI Helpers
  const getAvailabilityColor = (avail) => {
    if (avail >= 99) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (avail >= 95) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (avail >= 90) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  const getAvailabilityLabel = (avail) => {
    if (avail >= 99) return 'Excellent';
    if (avail >= 95) return 'Good';
    if (avail >= 90) return 'Warning';
    return 'Critical';
  };

  const getErrorSeverityColor = (percentage) => {
    if (percentage > 15) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (percentage > 5) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (percentage > 1) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  const getFailureTypeColor = (type) => {
    if (type === 'UI Failure') return '#f59e0b'; // Amber
    if (type === 'Network Failure') return '#3b82f6'; // Blue
    if (type === 'System Failure') return '#ef4444'; // Red
    return '#94a3b8';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-canvas p-4 rounded-2xl shadow-sm border border-hairline text-sm">
          <p className="font-semibold text-ink mb-1">{label}</p>
          <p className="text-muted font-medium">
            <span className="text-primary font-bold">{payload[0].value}%</span> of Total Failures
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-2 md:px-6 space-y-12 h-full flex flex-col animate-fade-in pb-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-hairline shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-surface-strong text-primary rounded-full">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-[52px] font-normal tracking-tight text-ink leading-none mb-2">Availability Analysis</h1>
            <p className="text-body text-base">Error tracking, stability metrics, and root cause insights</p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-canvas p-6 rounded-3xl border border-hairline shadow-sm flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3 bg-surface-soft border border-hairline rounded-xl px-4 py-3">
          <Calendar size={18} className="text-muted" />
          <input 
            type="date" 
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-transparent text-sm font-semibold text-ink outline-none w-[110px]"
          />
          <span className="text-muted font-medium mx-1">-</span>
          <input 
            type="date" 
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-transparent text-sm font-semibold text-ink outline-none w-[110px]"
          />
        </div>

        <div className="relative group flex items-center min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted">
            <Filter size={18} />
          </div>
          <select 
            value={selectedJourney}
            onChange={(e) => setSelectedJourney(e.target.value)}
            className="pl-11 pr-10 py-3 w-full border border-hairline bg-surface-soft focus:bg-canvas focus:border-primary focus:ring-2 focus:ring-primary rounded-xl text-sm transition-all outline-none appearance-none font-semibold text-ink"
          >
            <option value="">All Journeys</option>
            {journeys.map(j => (
              <option key={j.id} value={j.journey_key}>{j.name}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={fetchAvailabilityData}
          className="p-3 ml-auto bg-surface-strong text-ink rounded-full hover:bg-hairline-soft transition-colors active:scale-95 flex items-center justify-center"
          title="Refresh Data"
        >
          <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3 border border-red-100 shadow-sm">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Main Content */}
      {!error && (
        <div className="space-y-12 flex-1">
          {isLoading || !data ? (
            <div className="h-64 flex flex-col items-center justify-center bg-canvas rounded-3xl border border-hairline shadow-sm">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-muted font-medium">Analyzing availability data...</p>
            </div>
          ) : (
            <>
              {/* Section 1: KPI Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
                <div className="bg-canvas p-6 rounded-3xl border border-hairline shadow-sm">
                  <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Activity size={14} className="text-primary" /> Total Execution
                  </p>
                  <p className="text-4xl font-normal tracking-tight text-ink">{data.summary.total_execution}</p>
                </div>
                
                <div className="bg-canvas p-6 rounded-3xl border border-hairline shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                    <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Success
                    </p>
                    <p className="text-4xl font-normal tracking-tight text-ink">{data.summary.success_execution}</p>
                  </div>
                </div>

                <div className="bg-canvas p-6 rounded-3xl border border-hairline shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                    <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <XCircle size={14} className="text-semantic-down" /> Failed
                    </p>
                    <p className="text-4xl font-normal tracking-tight text-ink">{data.summary.failed_execution}</p>
                  </div>
                </div>

                <div className="bg-canvas p-6 rounded-3xl border border-hairline shadow-sm">
                  <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-primary" /> Overall Avail
                  </p>
                  <div className="flex items-baseline gap-3">
                    <p className="text-4xl font-normal tracking-tight text-ink">{data.summary.overall_availability}%</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getAvailabilityColor(data.summary.overall_availability)}`}>
                      {data.summary.grade}
                    </span>
                  </div>
                </div>

                <div className="bg-canvas p-6 rounded-3xl border border-hairline shadow-sm">
                  <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-500" /> Primary Error
                  </p>
                  <p className="text-base font-semibold text-ink line-clamp-2" title={data.summary.primary_error}>
                    {data.summary.primary_error}
                  </p>
                </div>

                <div className="bg-canvas p-6 rounded-3xl border border-hairline shadow-sm">
                  <p className="text-muted text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Search size={14} className="text-primary" /> Most Failed Page
                  </p>
                  <p className="text-base font-semibold text-ink line-clamp-2">
                    {data.summary.most_failed_page}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Column Left: Tables (span 2) */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* Section 2: Page-wise */}
                  <div className="bg-canvas rounded-3xl border border-hairline shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-hairline bg-surface-soft/50">
                      <h2 className="text-xl font-normal tracking-tight text-ink flex items-center gap-3">
                        <Activity size={22} className="text-primary" />
                        Availability Analysis - Page Wise
                      </h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-surface-soft text-muted font-bold border-b border-hairline text-[10px] uppercase tracking-widest">
                          <tr>
                            <th className="py-5 px-8">Page Name</th>
                            <th className="py-5 px-6 text-center">Availability %</th>
                            <th className="py-5 px-6 text-center">Total Tx</th>
                            <th className="py-5 px-6 text-center">Error Count</th>
                            <th className="py-5 px-6 text-center">Duration (mins)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                          {data.page_wise.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-muted font-medium">No page data available</td>
                            </tr>
                          ) : data.page_wise.map((row, idx) => (
                            <tr key={idx} className="hover:bg-surface-soft/50 transition-colors">
                              <td className="py-4 px-8 font-semibold text-ink">{row.page_name}</td>
                              <td className="py-4 px-6 text-center">
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className={`px-3 py-1 rounded-md text-xs font-bold border ${getAvailabilityColor(row.availability)}`}>
                                    {row.availability.toFixed(1)}%
                                  </span>
                                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{getAvailabilityLabel(row.availability)}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-center font-semibold text-ink">{row.total_transaction}</td>
                              <td className="py-4 px-6 text-center">
                                <span className={row.error_count > 0 ? "font-bold text-semantic-down" : "font-medium text-muted"}>
                                  {row.error_count}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center font-medium text-muted">{row.duration_mins.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3: Error-wise */}
                  <div className="bg-canvas rounded-3xl border border-hairline shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-hairline bg-surface-soft/50">
                      <h2 className="text-xl font-normal tracking-tight text-ink flex items-center gap-3">
                        <AlertTriangle size={22} className="text-amber-500" />
                        Availability Analysis - Error Wise
                      </h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-surface-soft text-muted font-bold border-b border-hairline text-[10px] uppercase tracking-widest">
                          <tr>
                            <th className="py-5 px-8 w-1/2">Error Description</th>
                            <th className="py-5 px-6 text-center">Percentage</th>
                            <th className="py-5 px-6 text-center">Total Occurrences</th>
                            <th className="py-5 px-6 text-center">Duration Impact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                          {data.error_wise.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="py-8 text-center text-muted font-medium">No errors found</td>
                            </tr>
                          ) : data.error_wise.map((row, idx) => (
                            <tr key={idx} className="hover:bg-surface-soft/50 transition-colors">
                              <td className="py-4 px-8">
                                <p className="font-semibold text-ink whitespace-normal break-words">{row.error_description}</p>
                                <p className="text-xs text-muted mt-1 truncate max-w-sm">Affects: {row.pages_affected.join(', ')}</p>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <span className={`px-3 py-1 rounded-md text-xs font-bold border ${getErrorSeverityColor(row.percentage)}`}>
                                  {row.percentage.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center font-bold text-semantic-down">{row.total_occurrence}</td>
                              <td className="py-4 px-6 text-center font-medium text-muted">{row.duration_impact_mins.toFixed(2)} m</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* Column Right: Charts & Insights (span 1) */}
                <div className="space-y-8">
                  
                  {/* Section 4: Failure Distribution */}
                  <div className="bg-canvas rounded-3xl border border-hairline shadow-sm p-8">
                    <h2 className="text-xl font-normal tracking-tight text-ink flex items-center gap-3 mb-8">
                      <BarChart size={22} className="text-primary" />
                      Failure Distribution
                    </h2>
                    
                    <div className="h-[220px] w-full">
                      {data.failure_dist.every(d => d.percentage === 0) ? (
                        <div className="h-full flex items-center justify-center text-muted font-medium">No failures recorded</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.failure_dist} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }} barSize={24}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7ea" />
                            <XAxis type="number" hide domain={[0, 100]} />
                            <YAxis dataKey="failure_type" type="category" axisLine={false} tickLine={false} tick={{fill: '#88909f', fontSize: 12, fontWeight: 600}} width={100} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} />
                            <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                              {data.failure_dist.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getFailureTypeColor(entry.failure_type)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-hairline flex gap-6 justify-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-sm bg-amber-500"></div>
                        <span className="text-xs font-semibold text-ink">UI</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-sm bg-blue-500"></div>
                        <span className="text-xs font-semibold text-ink">Network</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-sm bg-red-500"></div>
                        <span className="text-xs font-semibold text-ink">System</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Root Cause Insight */}
                  {/* <div className="bg-surface-soft/50 rounded-3xl border border-hairline shadow-sm p-8 h-full">
                    <h2 className="text-xl font-normal tracking-tight text-ink flex items-center gap-3 mb-6">
                      <Search size={22} className="text-primary" />
                      Root Cause Findings
                    </h2>

                    <div className="space-y-6">
                      <div className="bg-canvas rounded-2xl p-5 border border-hairline shadow-sm">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Automated Insights</h3>
                        <ul className="space-y-3">
                          {data.root_cause.insights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-ink font-medium">
                              <span className="text-primary mt-0.5">•</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-canvas rounded-2xl p-5 border border-hairline shadow-sm">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-semantic-down mb-3">Possible Causes</h3>
                        <ul className="space-y-3">
                          {data.root_cause.possible_causes.length > 0 ? (
                            data.root_cause.possible_causes.map((cause, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-sm text-ink font-medium">
                                <AlertTriangle size={16} className="text-semantic-down shrink-0 mt-0.5" />
                                {cause}
                              </li>
                            ))
                          ) : (
                            <li className="text-sm text-muted italic">Tidak ada masalah ditemukan.</li>
                          )}
                        </ul>
                      </div>
                    </div>

                  </div> */}

                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AvailabilityPage;
