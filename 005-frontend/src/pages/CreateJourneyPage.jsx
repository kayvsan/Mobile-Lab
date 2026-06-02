import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Map, RefreshCcw } from 'lucide-react';
import JourneyForm from '../components/journey/JourneyForm';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const CreateJourneyPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate('/Journeys');
    }
  };

  const handleSubmit = async (journeyData) => {
    try {
      await api.post('/journeys', journeyData);
      toast.success('Journey created successfully!');
      navigate('/Journeys');
    } catch (err) {
      console.error('Failed to create journey:', err);
      toast.error('Gagal membuat journey: ' + (err.response?.data?.error || err.message));
    }
  };

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
            <span className="text-primary">Create New</span>
          </div>
          <h1 className="text-[44px] font-normal tracking-tight text-ink leading-none">Create Automation Journey</h1>
        </div>
      </div>

      {/* Main Form Content */}
      <JourneyForm onSubmit={handleSubmit} onCancel={handleCancel} />

    </div>
  );
};

export default CreateJourneyPage;
