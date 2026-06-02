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
    <div className="max-w-[1200px] mx-auto py-12 px-2 md:px-6 space-y-12 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-hairline">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-surface-strong text-primary rounded-full">
            <Map size={24} />
          </div>
          <div>
            <h1 className="text-[52px] font-normal tracking-tight text-ink flex items-center gap-2 leading-none mb-2">Journeys</h1>
            <p className="text-body text-base">Manage and view automation journeys</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted">
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Search journeys..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 w-full sm:w-64 border border-hairline bg-surface-soft focus:bg-canvas focus:border-primary rounded-xl text-sm transition-all outline-none text-ink"
            />
          </div>
          <button 
            onClick={() => navigate('/journeys/create')}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-3 rounded-full text-sm font-semibold hover:bg-primary-active transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={16} />
            Create Journey
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-canvas rounded-3xl border border-hairline overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-hairline border-t-primary rounded-full animate-spin"></div>
            <p className="text-body animate-pulse">Loading journey data...</p>
          </div>
        ) : error ? (
          <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-surface-strong text-semantic-down rounded-full">
              <AlertCircle size={40} />
            </div>
            <div>
              <h3 className="text-xl font-normal tracking-tight text-ink">Oops! Something went wrong</h3>
              <p className="text-body max-w-xs mx-auto">{error}</p>
            </div>
            <button 
              onClick={fetchJourneys}
              className="inline-flex items-center gap-2 px-5 py-3 bg-surface-strong text-ink rounded-full font-semibold hover:bg-hairline transition-colors"
            >
              <RefreshCcw size={16} />
              Try Again
            </button>
          </div>
        ) : filteredJourneys.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-surface-strong text-muted rounded-full">
              <Search size={40} />
            </div>
            <div>
              <h3 className="text-xl font-normal tracking-tight text-ink">No Journeys Found</h3>
              <p className="text-body">
                {searchTerm ? `No results for "${searchTerm}"` : "You haven't created any automation journeys yet."}
              </p>
            </div>
            {!searchTerm && (
              <button 
                onClick={() => navigate('/journeys/create')}
                className="px-5 py-3 bg-primary text-on-primary font-semibold rounded-full hover:bg-primary-active transition-colors"
              >
                Create First Journey
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-soft text-muted font-bold border-b border-hairline text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="py-5 px-8">Name & ID</th>
                  <th className="py-5 px-8">Created At</th>
                  <th className="py-5 px-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredJourneys.map((journey) => (
                  <tr key={journey.id} className="hover:bg-surface-soft/50 transition-colors group">
                    <td className="py-5 px-8">
                      <div className="font-semibold text-ink">{journey.name}</div>
                      <div className="text-[12px] font-mono text-muted mt-1 uppercase tracking-widest">
                        {journey.id}
                      </div>
                    </td>
                    <td className="py-5 px-8 text-body">
                      <div className="flex items-center gap-2 text-sm font-mono text-muted">
                        <Clock size={16} className="text-muted" />
                        {formatDate(journey.created_at)}
                      </div>
                    </td>
                    <td className="py-5 px-8">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/journeys/edit/${journey.id}`)}
                          title="Edit Journey"
                          className="p-3 bg-canvas border border-hairline text-ink rounded-full hover:bg-surface-strong transition-all"
                        >
                          <Edit size={16} />
                        </button>

                        <button 
                          onClick={() => handleDeleteClick(journey)}
                          disabled={isDeleting === journey.id}
                          title="Delete Journey"
                          className="p-3 bg-canvas border border-hairline text-ink rounded-full hover:bg-surface-strong hover:text-semantic-down transition-all"
                        >
                          {isDeleting === journey.id ? (
                            <RefreshCcw size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
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

