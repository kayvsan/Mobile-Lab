import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Map, RefreshCcw, AlertCircle } from 'lucide-react';
import JourneyForm from '../components/journey/JourneyForm';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const EditJourneyPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [journey, setJourney] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJourney = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/journeys/${id}`);
        setJourney(response.data);
      } catch (err) {
        console.error('Failed to fetch journey:', err);
        setError('Gagal memuat data journey. Pastikan ID benar dan backend berjalan.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJourney();
  }, [id]);

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate('/Journeys');
    }
  };

  const handleSubmit = async (journeyData) => {
    try {
      await api.put(`/journeys/${id}`, journeyData);
      toast.success('Journey updated successfully!');
      navigate('/Journeys');
    } catch (err) {
      console.error('Failed to update journey:', err);
      toast.error('Gagal memperbarui journey: ' + (err.response?.data?.error || err.message));
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 animate-pulse">Memuat data journey...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-20 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-500 rounded-full">
          <AlertCircle size={40} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Ups! Terjadi Kesalahan</h3>
          <p className="text-slate-500 max-w-xs mx-auto">{error}</p>
        </div>
        <button 
          onClick={() => navigate('/Journeys')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
        >
          <ChevronLeft size={16} />
          Kembali ke Journeys
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/Journeys')}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          title="Back to Journeys"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-1">
            <Map size={14} />
            <span>Journeys</span>
            <span className="text-slate-300">/</span>
            <span className="text-blue-600">Edit Journey</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Edit Automation Journey</h1>
        </div>
      </div>

      {/* Main Form Content */}
      <JourneyForm 
        initialData={journey} 
        onSubmit={handleSubmit} 
        onCancel={handleCancel} 
        isEditMode={true}
      />

    </div>
  );
};

export default EditJourneyPage;
