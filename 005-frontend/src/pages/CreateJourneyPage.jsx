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
            <span className="text-blue-600">Create New</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Create Automation Journey</h1>
        </div>
      </div>

      {/* Main Form Content */}
      <JourneyForm onSubmit={handleSubmit} onCancel={handleCancel} />

    </div>
  );
};

export default CreateJourneyPage;
