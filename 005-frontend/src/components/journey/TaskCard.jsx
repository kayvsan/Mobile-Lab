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
    <div className="bg-canvas rounded-2xl border border-hairline shadow-sm overflow-hidden mb-3 transition-all hover:border-hairline-soft group">
      {/* Task Header - Always visible */}
      <div className={`px-5 py-4 flex items-center gap-4 bg-surface-soft border-b border-hairline ${isExpanded ? '' : 'border-b-0'}`}>
        
        {/* Reorder Buttons (Simulated drag handle for simplicity) */}
        <div className="flex flex-col gap-1 text-muted">
          <button 
            type="button"
            onClick={onMoveUp} 
            disabled={isFirst}
            className={`hover:text-primary focus:outline-none ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="Move Up"
          >
             <ChevronUp size={14} />
          </button>
          <button 
             type="button"
            onClick={onMoveDown} 
            disabled={isLast}
            className={`hover:text-primary focus:outline-none ${isLast ? 'opacity-30 cursor-not-allowed' : ''}`}
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
          <div className={`p-1.5 rounded-lg ${typeSchema.color.split(' ')[0]} ${typeSchema.color.split(' ')[1]}`}>
            {IconComponent && <IconComponent size={14} />}
          </div>
          <div className="font-semibold text-ink text-sm truncate max-w-[200px] md:max-w-xs tracking-tight">
            {task.name}
          </div>
          <span className={`px-2 py-0.5 rounded uppercase tracking-wider text-[10px] font-bold border ${typeSchema.color}`}>
            {typeSchema.label}
          </span>
          {task.critical && (
             <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-semantic-down border border-rose-100 uppercase tracking-wider">
                Critical
             </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
           <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface-strong rounded-full transition-colors"
          >
            <span className="text-xs font-semibold px-2">{isExpanded ? 'Collapse' : 'Edit'}</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-muted hover:text-semantic-down hover:bg-surface-strong rounded-full transition-colors opacity-0 group-hover:opacity-100"
            title="Delete Task"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 bg-canvas animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Task Name</label>
              <input
                type="text"
                value={task.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-hairline bg-surface-soft rounded-xl focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-ink transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Task ID</label>
              <input
                type="text"
                value={task.id}
                onChange={(e) => handleFieldChange('id', e.target.value)}
                className="w-full px-4 py-2 border border-hairline bg-surface-strong text-muted rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm font-mono transition-all"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-ink mb-1">Task Type</label>
            <select
              value={task.type}
              onChange={handleTypeChange}
              className="w-full md:w-1/2 px-4 py-2 border border-hairline bg-surface-soft rounded-xl focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm font-semibold text-ink transition-all appearance-none"
            >
              {Object.entries(TASK_TYPES).map(([key, schema]) => (
                <option key={key} value={key}>{schema.label}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-hairline pt-5 mt-4">
            <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">Task Configuration</h4>
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
