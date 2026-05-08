import React, { useState } from 'react';
import { Trash2, GripVertical, ChevronDown, ChevronUp, Play, XCircle, MousePointer2, Maximize2, Target, RotateCcw, HelpCircle, RefreshCw, ArrowUpDown } from 'lucide-react';
import { TASK_TYPES, createTaskTemplate } from '../../data/taskTypeSchema';
import TaskFieldRenderer from './TaskFieldRenderer';

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

const TaskCard = ({ task, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const typeSchema = TASK_TYPES[task.type];

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    // When changing type, generate a completely new task template but keep the same ID and Name if possible
    const newTaskTemplate = createTaskTemplate(newType);
    if (newTaskTemplate) {
      onUpdate({
        ...newTaskTemplate,
        id: task.id,
        name: task.name !== TASK_TYPES[task.type].label ? task.name : newTaskTemplate.name
      });
    }
  };

  const handleFieldChange = (key, value) => {
    onUpdate({
      ...task,
      [key]: value
    });
  };

  if (!typeSchema) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">Unknown task type: {task.type}</div>;
  }

  const IconComponent = iconMap[typeSchema.icon];

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-3 transition-all hover:border-blue-300 group">
      {/* Task Header - Always visible */}
      <div className={`px-4 py-3 flex items-center gap-3 bg-slate-50 border-b border-slate-100 ${isExpanded ? '' : 'border-b-0'}`}>
        
        {/* Reorder Buttons (Simulated drag handle for simplicity) */}
        <div className="flex flex-col gap-1 text-slate-300">
          <button 
            type="button"
            onClick={onMoveUp} 
            disabled={isFirst}
            className={`hover:text-blue-600 focus:outline-none ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="Move Up"
          >
             <ChevronUp size={14} />
          </button>
          <button 
             type="button"
            onClick={onMoveDown} 
            disabled={isLast}
            className={`hover:text-blue-600 focus:outline-none ${isLast ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="Move Down"
          >
             <ChevronDown size={14} />
          </button>
        </div>

        {/* Task Title & Type Badge */}
        <div 
          className="flex-1 cursor-pointer flex items-center gap-3"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className={`p-1.5 rounded-md ${typeSchema.color.split(' ')[0]} ${typeSchema.color.split(' ')[1]}`}>
            {IconComponent && <IconComponent size={14} />}
          </div>
          <div className="font-medium text-slate-800 text-sm truncate max-w-[200px] md:max-w-xs">
            {task.name}
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${typeSchema.color}`}>
            {typeSchema.label}
          </span>
          {task.critical && (
             <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase">
                Critical
             </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
           <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <span className="text-xs font-medium px-1">{isExpanded ? 'Collapse' : 'Edit'}</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
            title="Delete Task"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-white animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Task Name</label>
              <input
                type="text"
                value={task.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Task ID</label>
              <input
                type="text"
                value={task.id}
                onChange={(e) => handleFieldChange('id', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 bg-slate-50 text-slate-500 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">Task Type</label>
            <select
              value={task.type}
              onChange={handleTypeChange}
              className="w-full md:w-1/2 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-medium"
            >
              {Object.entries(TASK_TYPES).map(([key, schema]) => (
                <option key={key} value={key}>{schema.label}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Task Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {typeSchema.fields.map(field => (
                <TaskFieldRenderer
                  key={field.key}
                  field={field}
                  value={task[field.key]}
                  onChange={handleFieldChange}
                  allValues={task}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
