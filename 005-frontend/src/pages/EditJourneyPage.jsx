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
      <div className="max-w-[1000px] mx-auto p-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-hairline border-t-primary rounded-full animate-spin"></div>
        <p className="text-body animate-pulse">Loading journey data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1000px] mx-auto p-20 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-surface-strong text-semantic-down rounded-full">
          <AlertCircle size={40} />
        </div>
        <div>
          <h3 className="text-xl font-normal tracking-tight text-ink">Oops! Something went wrong</h3>
          <p className="text-body max-w-xs mx-auto">{error}</p>
        </div>
        <button 
          onClick={() => navigate('/Journeys')}
          className="inline-flex items-center gap-2 px-5 py-3 bg-surface-strong text-ink rounded-full font-semibold hover:bg-hairline transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Journeys
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto py-12 px-2 md:px-6 space-y-8 animate-fade-in pb-24">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-12">
        <button
          onClick={() => navigate('/Journeys')}
          className="p-3 -ml-3 text-muted hover:text-ink hover:bg-surface-soft rounded-full transition-colors"
          title="Back to Journeys"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted mb-2">
            <Map size={14} />
            <span>Journeys</span>
            <span className="text-hairline-soft">/</span>
            <span className="text-primary">Edit Journey</span>
          </div>
          <h1 className="text-[44px] font-normal tracking-tight text-ink leading-none">Edit Automation Journey</h1>
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
