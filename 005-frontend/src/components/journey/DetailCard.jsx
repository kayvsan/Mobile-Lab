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
    <div className="bg-canvas rounded-3xl border border-hairline shadow-sm overflow-hidden mb-6 transition-all hover:border-hairline-soft">
      {/* Detail Header */}
      <div className="px-6 py-5 bg-surface-soft border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-5 flex-1">
          {/* Step Number & Drag Handle Area */}
          <div className="flex flex-col gap-1 text-slate-400">
             <button 
                type="button"
                onClick={onMoveUp} 
                disabled={isFirst}
                className={`hover:text-primary focus:outline-none ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}`}
                title="Move Journey Detail Up"
              >
                 <ChevronUp size={16} />
              </button>
              <button 
                 type="button"
                onClick={onMoveDown} 
                disabled={isLast}
                className={`hover:text-primary focus:outline-none ${isLast ? 'opacity-30 cursor-not-allowed' : ''}`}
                title="Move Journey Detail Down"
              >
                 <ChevronDown size={16} />
              </button>
          </div>
          
          <div 
            className="flex-1 cursor-pointer flex items-center gap-4"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="h-12 w-12 rounded-full bg-surface-strong text-primary flex items-center justify-center font-bold shrink-0 border border-hairline">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-primary bg-surface-strong px-2 py-1 rounded border border-hairline uppercase tracking-wider">Journey Detail {index + 1}</span>
                {/* <h3 className="font-semibold text-ink text-lg">{detail.name || `Journey Detail ${index + 1}`}</h3> */}
              </div>
              <p className="text-[11px] text-muted font-mono mt-1 tracking-wider">ID: {detail.id}</p>
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
              className="h-4 w-4 text-primary focus:ring-primary border-hairline rounded"
            />
            <label htmlFor={`measure-${detail.id}`} className="ml-2 block text-xs font-semibold text-muted whitespace-nowrap">
              Measure Time
            </label>
          </div>
          
          <div className="h-6 w-px bg-hairline mx-1 hidden sm:block"></div>
          
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-muted hover:text-primary hover:bg-surface-strong rounded-full transition-colors"
          >
            <span className="text-sm font-semibold px-2">{isExpanded ? 'Collapse' : 'Expand'}</span>
          </button>
          
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-muted hover:text-semantic-down hover:bg-surface-strong rounded-full transition-colors"
            title="Delete Sub Journey"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 animate-fade-in">
          {/* Detail Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Journey Detail Name</label>
              <input
                type="text"
                value={detail.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g., Launch Application"
                className="w-full px-4 py-3 bg-surface-soft border border-hairline rounded-xl focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-ink transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Journey Detail ID</label>
              <input
                type="text"
                value={detail.id || ''}
                onChange={(e) => handleFieldChange('id', e.target.value)}
                placeholder="e.g., launch_app"
                className="w-full px-4 py-3 bg-surface-soft border border-hairline rounded-xl focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm font-mono text-ink transition-all"
              />
            </div>
            <div className="sm:hidden flex items-center md:col-span-2">
              <input
                type="checkbox"
                id={`measure-mobile-${detail.id}`}
                checked={detail.measure_response_time || false}
                onChange={(e) => handleFieldChange('measure_response_time', e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-hairline rounded"
              />
              <label htmlFor={`measure-mobile-${detail.id}`} className="ml-2 block text-sm font-semibold text-ink">
                Measure Response Time for this Journey detail
              </label>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="bg-surface-soft/50 p-6 rounded-2xl border border-hairline">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-base font-semibold text-ink tracking-tight">Tasks ({detail.tasks?.length || 0})</h4>
              <button
                type="button"
                onClick={handleAddTaskClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-strong text-primary hover:bg-hairline-soft rounded-full text-sm font-semibold transition-colors border border-hairline"
              >
                <Plus size={16} />
                Add Task
              </button>
            </div>

            <div className="space-y-4 pl-2 sm:pl-6 border-l-2 border-hairline">
              {(!detail.tasks || detail.tasks.length === 0) ? (
                <div className="text-center py-10 text-muted bg-canvas rounded-2xl border border-hairline border-dashed">
                  <p className="text-sm font-medium">No tasks added yet.</p>
                  <button 
                    type="button"
                    onClick={handleAddTaskClick}
                    className="mt-2 text-primary hover:text-primary-active text-sm font-semibold"
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
