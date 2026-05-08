import React, { useState, useEffect } from 'react';
import { Plus, Save, Code, AlertCircle, Search } from 'lucide-react';
import api from '../../services/api';
import DetailCard from './DetailCard';
import JsonPreviewModal from './JsonPreviewModal';
import PackageSelectionModal from './PackageSelectionModal';
import ConfirmModal from '../ui/ConfirmModal';

const JourneyForm = ({ initialData, onSubmit, onCancel, isEditMode = false }) => {
  const [journey, setJourney] = useState({
    name: '',
    journey_key: '',
    package: '',
    platform: 'android',
    details: [],
    ...initialData
  });
  const [commonPackages, setCommonPackages] = useState([]);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Auto-generate journey_key from name if key is empty
  useEffect(() => {
    if (journey.name && !journey.journey_key && !initialData?.journey_key) {
      setJourney(prev => ({
        ...prev,
        journey_key: prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      }));
    }
  }, [journey.name, journey.journey_key, initialData]);

  // Fetch common app packages from DB
  useEffect(() => {
    const fetchAppPackages = async () => {
      try {
        const response = await api.get('/app-packages');
        setCommonPackages(response.data);
      } catch (err) {
        console.error('Failed to fetch app packages:', err);
      }
    };
    fetchAppPackages();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJourney(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddStep = () => {
    const newStep = {
      id: `step_${crypto.randomUUID()}`,
      name: `Step ${journey.details.length + 1}`,
      measure_response_time: true,
      tasks: []
    };
    setJourney(prev => ({
      ...prev,
      details: [...prev.details, newStep]
    }));
  };

  const handleUpdateStep = (index, updatedStep) => {
    const newDetails = [...journey.details];
    newDetails[index] = updatedStep;
    setJourney(prev => ({
      ...prev,
      details: newDetails
    }));
  };

  const handleDeleteStep = (index) => {
    const newDetails = journey.details.filter((_, i) => i !== index);
    setJourney(prev => ({
      ...prev,
      details: newDetails
    }));
  };

  const handleMoveStepUp = (index) => {
    if (index === 0) return;
    const newDetails = [...journey.details];
    const temp = newDetails[index];
    newDetails[index] = newDetails[index - 1];
    newDetails[index - 1] = temp;
    setJourney(prev => ({
      ...prev,
      details: newDetails
    }));
  };

  const handleMoveStepDown = (index) => {
    if (index === journey.details.length - 1) return;
    const newDetails = [...journey.details];
    const temp = newDetails[index];
    newDetails[index] = newDetails[index + 1];
    newDetails[index + 1] = temp;
    setJourney(prev => ({
      ...prev,
      details: newDetails
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate
    if (!journey.name || !journey.journey_key || !journey.package) {
      alert("Please fill in all required fields (Name, Key, Package)");
      return;
    }
    
    setIsConfirmOpen(true);
  };

  const handleConfirmedSubmit = () => {
    // Generate final JSON
    const finalData = {
      id: journey.id || crypto.randomUUID(),
      journey_key: journey.journey_key,
      name: journey.name,
      package: journey.package,
      platform: journey.platform,
      details: journey.details,
      created_at: journey.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSubmit(finalData);
  };

  const getFinalJson = () => {
    return {
      id: journey.id || "00000000-0000-0000-0000-000000000000",
      journey_key: journey.journey_key,
      name: journey.name,
      package: journey.package,
      platform: journey.platform,
      details: journey.details,
      created_at: journey.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  // Removed filteredPackages since it's now handled inside the modal

  return (
    <div className="space-y-8">
      {/* Journey Info Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800">Journey Information</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Journey Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={journey.name}
                onChange={handleChange}
                placeholder="e.g., Generic App Journey"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="journey_key" className="block text-sm font-medium text-slate-700 mb-1">
                Journey Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="journey_key"
                name="journey_key"
                value={journey.journey_key}
                onChange={handleChange}
                placeholder="e.g., example_journey"
                disabled={isEditMode}
                className={`w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${isEditMode ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50'}`}
                required
              />
            </div>
            
            <div className="">
              <label htmlFor="package" className="block text-sm font-medium text-slate-700 mb-1">
                Package Name <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="package"
                  name="package"
                  value={journey.package}
                  onChange={handleChange}
                  placeholder="e.g., com.whatsapp"
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  required
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  title="Browse Packages"
                >
                  <Search size={16} />
                  <span>Browse</span>
                </button>
              </div>
            </div>
            
            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-slate-700 mb-1">
                Platform
              </label>
              <select
                id="platform"
                name="platform"
                value={journey.platform}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="android">Android</option>
                <option value="ios">iOS</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Steps/Details Builder */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Steps ({journey.details.length})</h2>
          <button
            type="button"
            onClick={handleAddStep}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Step
          </button>
        </div>

        {journey.details.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">No Steps Added</h3>
            <p className="text-slate-500 max-w-md mb-6">
              A journey consists of multiple steps, each containing one or more automation tasks. Add your first step to start building.
            </p>
            <button
              type="button"
              onClick={handleAddStep}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-500/20"
            >
              <Plus size={20} />
              Add First Step
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {journey.details.map((detail, index) => (
              <DetailCard
                key={detail.id || index}
                detail={detail}
                index={index}
                isFirst={index === 0}
                isLast={index === journey.details.length - 1}
                onUpdate={(updatedStep) => handleUpdateStep(index, updatedStep)}
                onDelete={() => handleDeleteStep(index)}
                onMoveUp={() => handleMoveStepUp(index)}
                onMoveDown={() => handleMoveStepDown(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-all shadow-sm"
        >
          <Code size={18} />
          Preview JSON
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-500/20"
          >
            <Save size={18} />
            {isEditMode ? 'Save Changes' : 'Create Journey'}
          </button>
        </div>
      </div>

      {/* JSON Preview Modal */}
      <JsonPreviewModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        data={getFinalJson()} 
      />

      {/* Package Selection Modal */}
      <PackageSelectionModal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        onSelect={(pkg) => setJourney(prev => ({ ...prev, package: pkg }))}
        packages={commonPackages}
        currentValue={journey.package}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmedSubmit}
        title={isEditMode ? "Save Changes" : "Create Journey"}
        message={isEditMode 
          ? "Are you sure you want to update this journey definition? This will affect future executions."
          : "Are you sure you want to create this new automation journey?"
        }
        confirmText={isEditMode ? "Update Journey" : "Create Journey"}
        type="info"
      />
    </div>
  );
};

export default JourneyForm;
