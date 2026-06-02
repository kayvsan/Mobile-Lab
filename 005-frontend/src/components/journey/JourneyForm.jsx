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
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(!!initialData?.journey_key);

  // Auto-generate journey_key from name if not manually edited by the user
  useEffect(() => {
    if (!isEditMode && !isKeyManuallyEdited) {
      setJourney(prev => ({
        ...prev,
        journey_key: prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      }));
    }
  }, [journey.name, isKeyManuallyEdited, isEditMode]);

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
    if (name === 'journey_key') {
      setIsKeyManuallyEdited(value !== '');
    }
    setJourney(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddStep = () => {
    const newStep = {
      id: `step_${crypto.randomUUID()}`,
      name: `Journey Detail ${journey.details.length + 1}`,
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
      <div className="bg-canvas rounded-3xl border border-hairline shadow-sm">
        <div className="px-8 py-5 border-b border-hairline bg-surface-soft rounded-t-3xl">
          <h2 className="text-xl font-normal tracking-tight text-ink">Journey Information</h2>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-ink mb-2">
                Journey Name <span className="text-semantic-down">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={journey.name}
                onChange={handleChange}
                placeholder="e.g., Generic App Journey"
                className="w-full px-4 py-3 border border-hairline bg-surface-soft rounded-xl focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-ink"
                required
              />
            </div>
            
            <div>
              <label htmlFor="journey_key" className="block text-sm font-semibold text-ink mb-2">
                Journey Key <span className="text-semantic-down">*</span>
              </label>
              <input
                type="text"
                id="journey_key"
                name="journey_key"
                value={journey.journey_key}
                onChange={handleChange}
                placeholder="e.g., example_journey"
                disabled={isEditMode}
                className={`w-full px-4 py-3 border border-hairline rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm transition-all ${isEditMode ? 'bg-surface-strong cursor-not-allowed text-muted' : 'bg-surface-soft focus:bg-canvas text-ink'}`}
                required
              />
            </div>
            
            <div className="">
              <label htmlFor="package" className="block text-sm font-semibold text-ink mb-2">
                Package Name <span className="text-semantic-down">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="package"
                  name="package"
                  value={journey.package}
                  onChange={handleChange}
                  placeholder="e.g., com.whatsapp"
                  className="flex-1 px-4 py-3 border border-hairline bg-surface-soft rounded-xl focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm transition-all text-ink"
                  required
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(true)}
                  className="px-5 py-3 bg-surface-strong hover:bg-hairline-soft text-ink rounded-xl transition-colors flex items-center gap-2 text-sm font-semibold border border-hairline"
                  title="Browse Packages"
                >
                  <Search size={16} />
                  <span>Browse</span>
                </button>
              </div>
            </div>
            
            <div>
              <label htmlFor="platform" className="block text-sm font-semibold text-ink mb-2">
                Platform
              </label>
              <select
                id="platform"
                name="platform"
                value={journey.platform}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-hairline bg-surface-soft rounded-xl focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-ink appearance-none"
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-normal tracking-tight text-ink">Journey Details ({journey.details.length})</h2>
          <button
            type="button"
            onClick={handleAddStep}
            className="inline-flex items-center gap-2 px-5 py-3 bg-surface-strong hover:bg-hairline-soft text-ink rounded-full text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            Add Journey Detail
          </button>
        </div>

        {journey.details.length === 0 ? (
          <div className="bg-canvas border border-hairline rounded-3xl p-16 text-center flex flex-col items-center shadow-sm">
            <div className="h-20 w-20 bg-surface-strong rounded-full flex items-center justify-center text-muted mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-2xl font-normal tracking-tight text-ink mb-3">No Journey Details Added</h3>
            <p className="text-body max-w-md mb-8">
              A journey consists of multiple sub journeys, each containing one or more automation tasks. Add your first step to start building.
            </p>
            <button
              type="button"
              onClick={handleAddStep}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-active text-on-primary rounded-full font-semibold transition-all shadow-sm"
            >
              <Plus size={18} />
              Add First Journey Detail
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
      <div className="flex items-center justify-between pt-8 border-t border-hairline mt-12">
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-canvas border border-hairline hover:bg-surface-soft text-ink rounded-full font-semibold transition-all"
        >
          <Code size={18} />
          Preview JSON
        </button>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-ink hover:bg-surface-strong rounded-full font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-active text-on-primary rounded-full font-semibold transition-all shadow-sm"
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
