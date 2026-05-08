import React from 'react';
import { createPortal } from 'react-dom';
import { X, Play, XCircle, MousePointer2, Maximize2, Target, RotateCcw, HelpCircle, RefreshCw, ArrowUpDown } from 'lucide-react';
import { TASK_TYPES } from '../../data/taskTypeSchema';

const iconMap = {
  Play,
  XCircle,
  MousePointer2,
  Maximize2,
  Target,
  RotateCcw,
  HelpCircle,
  RefreshCw,
  ArrowUpDown
};

const TaskTypeModal = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Select Task Type</h2>
            <p className="text-sm text-slate-500 mt-1">Choose the action you want this task to perform</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(TASK_TYPES).map(([type, schema]) => {
              const IconComponent = iconMap[schema.icon];
              return (
                <button
                  key={type}
                  onClick={() => onSelect(type)}
                  className="flex flex-col text-left p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  <div className={`p-2 rounded-lg mb-3 w-fit ${schema.color.split(' ')[0]} ${schema.color.split(' ')[1]}`}>
                    {IconComponent && <IconComponent size={20} />}
                  </div>
                  <div className="font-bold text-sm text-slate-800 mb-1">
                    {schema.label}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 mb-3 truncate w-full" title={type}>
                    {type}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-auto pt-2 border-t border-slate-100 flex justify-between items-center w-full">
                    <span>{schema.fields.length} Config Fields</span>
                    <span className="opacity-0 group-hover:opacity-100 text-blue-600 font-medium transition-opacity">Select →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TaskTypeModal;
