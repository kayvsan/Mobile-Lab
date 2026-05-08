import React, { useState } from 'react';
import { Search, X, Package, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

const PackageSelectionModal = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  packages = [], 
  currentValue = '' 
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredPackages = packages.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    app.package.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const modalContent = (
    <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Select App Package</h3>
            <p className="text-sm text-slate-500">Choose from common applications or search by name/ID</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Area */}
        <div className="p-6 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              autoFocus
              placeholder="Search apps by name or package ID (e.g. WhatsApp, com.google.android.youtube)..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List Area */}
        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {filteredPackages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredPackages.map((app) => (
                <button
                  key={app.id || app.package}
                  onClick={() => {
                    onSelect(app.package);
                    onClose();
                  }}
                  className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all group ${
                    currentValue === app.package 
                    ? 'border-blue-500 bg-blue-50/50' 
                    : 'border-slate-100 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${
                    currentValue === app.package ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                  }`}>
                    <Package size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 truncate">
                        {app.name}
                      </span>
                      {currentValue === app.package && (
                        <Check size={16} className="text-blue-600 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs font-mono text-slate-500 truncate mt-0.5">
                      {app.package}
                    </div>
                    {app.region && (
                      <div className="inline-flex mt-2 px-1.5 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded uppercase">
                        {app.region}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Search size={40} className="mb-3 opacity-20" />
              <p className="text-sm font-medium">No applications found matching your search</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-2 text-blue-600 text-sm font-bold hover:underline"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-400 italic">
            Can't find your app? You can still type the package name manually in the form.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PackageSelectionModal;
