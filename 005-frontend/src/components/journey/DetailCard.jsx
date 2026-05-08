import React, { useState } from 'react';
import { Trash2, Plus, GripVertical, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import TaskCard from './TaskCard';
import TaskTypeModal from './TaskTypeModal';
import { createTaskTemplate } from '../../data/taskTypeSchema';

const DetailCard = ({ detail, index, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const handleFieldChange = (key, value) => {
    onUpdate({
      ...detail,
      [key]: value
    });
  };

  const handleAddTaskClick = () => {
    setIsTaskModalOpen(true);
  };

  const handleSelectTaskType = (type) => {
    const newTask = createTaskTemplate(type);
    onUpdate({
      ...detail,
      tasks: [...(detail.tasks || []), newTask]
    });
    if (!isExpanded) setIsExpanded(true);
    setIsTaskModalOpen(false);
  };

  const handleUpdateTask = (taskIndex, updatedTask) => {
    const newTasks = [...detail.tasks];
    newTasks[taskIndex] = updatedTask;
    onUpdate({
      ...detail,
      tasks: newTasks
    });
  };

  const handleDeleteTask = (taskIndex) => {
    const newTasks = detail.tasks.filter((_, i) => i !== taskIndex);
    onUpdate({
      ...detail,
      tasks: newTasks
    });
  };

  const handleMoveTaskUp = (taskIndex) => {
    if (taskIndex === 0) return;
    const newTasks = [...detail.tasks];
    const temp = newTasks[taskIndex];
    newTasks[taskIndex] = newTasks[taskIndex - 1];
    newTasks[taskIndex - 1] = temp;
    onUpdate({
      ...detail,
      tasks: newTasks
    });
  };

  const handleMoveTaskDown = (taskIndex) => {
    if (taskIndex === detail.tasks.length - 1) return;
    const newTasks = [...detail.tasks];
    const temp = newTasks[taskIndex];
    newTasks[taskIndex] = newTasks[taskIndex + 1];
    newTasks[taskIndex + 1] = temp;
    onUpdate({
      ...detail,
      tasks: newTasks
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6 transition-all hover:border-slate-300">
      {/* Detail Header */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Step Number & Drag Handle Area */}
          <div className="flex flex-col gap-1 text-slate-400">
             <button 
                type="button"
                onClick={onMoveUp} 
                disabled={isFirst}
                className={`hover:text-blue-600 focus:outline-none ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}`}
                title="Move Step Up"
              >
                 <ChevronUp size={16} />
              </button>
              <button 
                 type="button"
                onClick={onMoveDown} 
                disabled={isLast}
                className={`hover:text-blue-600 focus:outline-none ${isLast ? 'opacity-30 cursor-not-allowed' : ''}`}
                title="Move Step Down"
              >
                 <ChevronDown size={16} />
              </button>
          </div>
          
          <div 
            className="flex-1 cursor-pointer flex items-center gap-3"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm shrink-0 border border-blue-100">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-wider">Step {index + 1}</span>
                <h3 className="font-bold text-slate-800 text-base">{detail.name || `Step ${index + 1}`}</h3>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {detail.id}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-4">
          <div className="hidden sm:flex items-center">
            <input
              type="checkbox"
              id={`measure-${detail.id}`}
              checked={detail.measure_response_time || false}
              onChange={(e) => handleFieldChange('measure_response_time', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            />
            <label htmlFor={`measure-${detail.id}`} className="ml-2 block text-xs text-slate-600 whitespace-nowrap">
              Measure Time
            </label>
          </div>
          
          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium px-1">{isExpanded ? 'Collapse' : 'Expand'}</span>
          </button>
          
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Step"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 animate-fade-in">
          {/* Detail Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Step Name</label>
              <input
                type="text"
                value={detail.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g., Launch Application"
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Step ID</label>
              <input
                type="text"
                value={detail.id || ''}
                onChange={(e) => handleFieldChange('id', e.target.value)}
                placeholder="e.g., launch_app"
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
              />
            </div>
            <div className="sm:hidden flex items-center md:col-span-2">
              <input
                type="checkbox"
                id={`measure-mobile-${detail.id}`}
                checked={detail.measure_response_time || false}
                onChange={(e) => handleFieldChange('measure_response_time', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor={`measure-mobile-${detail.id}`} className="ml-2 block text-sm text-slate-600">
                Measure Response Time for this step
              </label>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-800">Tasks ({detail.tasks?.length || 0})</h4>
              <button
                type="button"
                onClick={handleAddTaskClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg text-sm font-medium transition-colors border border-blue-100"
              >
                <Plus size={16} />
                Add Task
              </button>
            </div>

            <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-slate-200">
              {(!detail.tasks || detail.tasks.length === 0) ? (
                <div className="text-center py-8 text-slate-400 bg-white rounded-lg border border-slate-200 border-dashed">
                  <p className="text-sm">No tasks added yet.</p>
                  <button 
                    type="button"
                    onClick={handleAddTaskClick}
                    className="mt-2 text-blue-600 hover:underline text-sm font-medium"
                  >
                    Add your first task
                  </button>
                </div>
              ) : (
                detail.tasks.map((task, taskIndex) => (
                  <TaskCard
                    key={task.id || taskIndex}
                    task={task}
                    isFirst={taskIndex === 0}
                    isLast={taskIndex === detail.tasks.length - 1}
                    onUpdate={(updatedTask) => handleUpdateTask(taskIndex, updatedTask)}
                    onDelete={() => handleDeleteTask(taskIndex)}
                    onMoveUp={() => handleMoveTaskUp(taskIndex)}
                    onMoveDown={() => handleMoveTaskDown(taskIndex)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Type Modal */}
      <TaskTypeModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSelect={handleSelectTaskType}
      />
    </div>
  );
};

export default DetailCard;
