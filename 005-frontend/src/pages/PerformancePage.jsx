import { useEffect, useState } from 'react';
import { 
  TrendingUp, RefreshCcw, AlertCircle, Filter, 
  Calendar
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList
} from 'recharts';
import api from '../services/api';

const PerformancePage = () => {
  const [data, setData] = useState({ daily_rt: [], frequency_dist: [], hourly_rt: [] });
  const [journeys, setJourneys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [selectedJourney, setSelectedJourney] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedJourney) params.journey_id = selectedJourney;
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      // Set date to end of day for proper filtering
      if (dateTo) {
        const endOfDate = new Date(dateTo);
        endOfDate.setHours(23, 59, 59, 999);
        params.date_to = endOfDate.toISOString();
      }
      
      const response = await api.get('/reports/performance', { params });
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch Performance data:', err);
      setError('Gagal memuat data Performance. Pastikan koneksi ke backend tersedia.');
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
    fetchPerformanceData();
  }, [selectedJourney, dateFrom, dateTo]);

  // Format tooltip
  const CustomTooltip = ({ active, payload, label, unit = "secs" }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-canvas p-4 border border-hairline rounded-2xl shadow-sm">
          <p className="font-semibold text-ink mb-1">{label}</p>
          <p className="text-primary font-bold">
            {payload[0].value} {unit}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom Tick for Frequency Dist (wrapping text)
  const renderCustomAxisTick = ({ x, y, payload }) => {
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#88909f" fontSize="12" fontWeight="600">
          {payload.value.split(' ')[0]} {payload.value.split(' ')[1]} {payload.value.split(' ')[2]}
        </text>
        <text x={0} y={0} dy={32} textAnchor="middle" fill="#5c667b" fontSize="11" fontWeight="700" className="italic">
          {payload.value.split(' ').slice(3).join(' ')}
        </text>
      </g>
    );
  };

  const getBarColor = (index) => {
    const colors = ['#0052ff', '#0052ff', '#0052ff']; 
    return colors[index % colors.length];
  };

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-2 md:px-6 space-y-12 h-full flex flex-col animate-fade-in pb-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-hairline shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-surface-strong text-primary rounded-full">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-[52px] font-normal tracking-tight text-ink leading-none mb-2">Performance Analysis</h1>
            <p className="text-body text-base">Response time distribution and trends</p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-canvas p-6 rounded-3xl border border-hairline shadow-sm flex flex-wrap items-center gap-6">
        {/* Date Range */}
        <div className="flex items-center gap-3 bg-surface-soft border border-hairline rounded-xl px-4 py-3">
          <Calendar size={18} className="text-muted" />
          <input 
            type="date" 
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-transparent text-sm font-semibold text-ink outline-none"
          />
          <span className="text-muted text-sm font-medium mx-1">to</span>
          <input 
            type="date" 
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-transparent text-sm font-semibold text-ink outline-none"
          />
        </div>

        {/* Journey Filter */}
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
          onClick={fetchPerformanceData}
          className="p-3 ml-auto bg-surface-strong text-ink rounded-full hover:bg-hairline-soft transition-colors active:scale-95"
          title="Refresh Data"
        >
          <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-semantic-down rounded-2xl flex items-start gap-3 border border-rose-100">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {/* Charts Section */}
      {!error && (
        <div className="space-y-12 flex-1 bg-canvas p-8 rounded-3xl border border-hairline shadow-sm">
          
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-16">
              
              {/* Chart 1: Response Times - Daily */}
              <div className="h-[340px] w-full pt-4">
                <h3 className="text-center font-normal tracking-tight text-ink mb-8 text-xl">Response Times - Daily</h3>
                {data.daily_rt.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.daily_rt} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7ea" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#88909f', fontSize: 12, fontWeight: 600 }}
                        angle={-45}
                        textAnchor="end"
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#88909f', fontSize: 12, fontWeight: 600 }}
                        label={{ value: 'Secs', angle: -90, position: 'insideLeft', offset: -10, fill: '#0a0b0d', fontWeight: 'bold' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="linear" 
                        dataKey="avg_rt" 
                        stroke="#0052ff" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#0052ff', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#0052ff' }}
                      >
                        <LabelList dataKey="avg_rt" position="top" offset={10} fill="#0052ff" fontSize={12} fontWeight="bold" />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted font-medium">No data available for selected filters</div>
                )}
              </div>

              {/* Chart 2: Frequency Distribution */}
              <div className="h-[340px] w-full pt-10">
                <h3 className="text-center font-normal tracking-tight text-ink mb-8 text-xl">Frequency Distribution - Response Times</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.frequency_dist} margin={{ top: 30, right: 30, left: 20, bottom: 40 }} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7ea" />
                    <XAxis 
                      dataKey="bucket" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={renderCustomAxisTick}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#88909f', fontSize: 12, fontWeight: 600 }}
                      label={{ value: '%', angle: -90, position: 'insideLeft', offset: -10, fill: '#0a0b0d', fontWeight: 'bold' }}
                    />
                    <Tooltip content={<CustomTooltip unit="%" />} />
                    <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                      {data.frequency_dist.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                      ))}
                      <LabelList dataKey="percentage" position="top" fill="#0052ff" fontSize={12} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 3: Average Response Time - Hourly */}
              <div className="h-[340px] w-full pt-10">
                <h3 className="text-center font-normal tracking-tight text-ink mb-8 text-xl">Average Response Time - Hourly</h3>
                {data.hourly_rt.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.hourly_rt} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7ea" />
                      <XAxis 
                        dataKey="hour" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#88909f', fontSize: 12, fontWeight: 600 }}
                        label={{ value: 'Hour', position: 'insideBottom', offset: -10, fill: '#0a0b0d', fontWeight: 'bold' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#88909f', fontSize: 12, fontWeight: 600 }}
                        label={{ value: 'Secs', angle: -90, position: 'insideLeft', offset: -10, fill: '#0a0b0d', fontWeight: 'bold' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="linear" 
                        dataKey="avg_rt" 
                        stroke="#0052ff" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#0052ff', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#0052ff' }}
                      >
                        <LabelList dataKey="avg_rt" position="top" offset={10} fill="#0052ff" fontSize={12} fontWeight="bold" />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted font-medium">No data available for selected filters</div>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformancePage;
