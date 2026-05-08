import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Clock, Search, Play, Plus, Trash2, Edit, AlertCircle, RefreshCcw } from 'lucide-react';
import api from '../services/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useToast } from '../context/ToastContext';

const JourneysPage = () => {
  const [journeys, setJourneys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExecuting, setIsExecuting] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [journeyToDelete, setJourneyToDelete] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchJourneys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/journeys');
      setJourneys(response.data);
    } catch (err) {
      console.error('Failed to fetch journeys:', err);
      setError('Gagal memuat data journey. Pastikan backend berjalan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJourneys();
  }, []);

  const handleExecute = async (id) => {
    setIsExecuting(id);
    try {
      await api.post(`/executions/start/${id}`);
      toast.success('Execution started successfully!');
      navigate('/Execution');
    } catch (err) {
      console.error('Execution failed:', err);
      toast.error('Gagal memulai eksekusi: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsExecuting(null);
    }
  };

  const handleDeleteClick = (journey) => {
    setJourneyToDelete(journey);
  };

  const confirmDelete = async () => {
    if (!journeyToDelete) return;
    
    const id = journeyToDelete.id;
    setIsDeleting(id);
    try {
      await api.delete(`/journeys/${id}`);
      setJourneys(prev => prev.filter(j => j.id !== id));
      toast.success('Journey deleted successfully');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Gagal menghapus journey.');
    } finally {
      setIsDeleting(null);
      setJourneyToDelete(null);
    }
  };

  const filteredJourneys = useMemo(() => {
    return journeys.filter(journey => 
      journey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      journey.journey_key.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [journeys, searchTerm]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Map size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Journeys</h1>
            <p className="text-slate-500 text-sm mt-1">Manage and view automation journeys</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Search journeys..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg text-sm transition-all outline-none"
            />
          </div>
          <button 
            onClick={() => navigate('/journeys/create')}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={16} />
            Create Journey
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 animate-pulse">Memuat data journey...</p>
          </div>
        ) : error ? (
          <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-red-50 text-red-500 rounded-full">
              <AlertCircle size={40} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Ups! Terjadi Kesalahan</h3>
              <p className="text-slate-500 max-w-xs mx-auto">{error}</p>
            </div>
            <button 
              onClick={fetchJourneys}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
            >
              <RefreshCcw size={16} />
              Coba Lagi
            </button>
          </div>
        ) : filteredJourneys.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
              <Search size={40} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Journey Tidak Ditemukan</h3>
              <p className="text-slate-500">
                {searchTerm ? `Tidak ada hasil untuk "${searchTerm}"` : "Anda belum memiliki journey automation."}
              </p>
            </div>
            {!searchTerm && (
              <button 
                onClick={() => navigate('/journeys/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buat Journey Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6">Name & ID</th>
                  <th className="py-4 px-6">Created At</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJourneys.map((journey) => (
                  <tr key={journey.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800">{journey.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5 uppercase tracking-wider">
                        {journey.id}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock size={14} className="text-slate-400" />
                        {formatDate(journey.created_at)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/journeys/edit/${journey.id}`)}
                          title="Edit Journey"
                          className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm"
                        >
                          <Edit size={18} />
                        </button>

                        <button 
                          onClick={() => handleDeleteClick(journey)}
                          disabled={isDeleting === journey.id}
                          title="Delete Journey"
                          className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
                        >
                          {isDeleting === journey.id ? (
                            <RefreshCcw size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!journeyToDelete}
        onClose={() => setJourneyToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Journey"
        message={`Are you sure you want to delete "${journeyToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Journey"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default JourneysPage;

