import React from 'react';

const TaskFieldRenderer = ({ field, value, onChange, allValues }) => {
  // Check if field should be shown
  if (field.showIf && !field.showIf(allValues)) {
    return null;
  }

  const handleChange = (e) => {
    let newValue = e.target.value;
    
    if (field.type === 'number') {
      newValue = newValue === '' ? '' : Number(newValue);
    } else if (field.type === 'checkbox') {
      newValue = e.target.checked;
    }

    onChange(field.key, newValue);
  };

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            id={field.key}
            value={value || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-hairline bg-surface-soft rounded-xl focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-ink transition-all"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            id={field.key}
            value={value !== undefined ? value : ''}
            onChange={handleChange}
            step={field.key === 'scale' ? "0.1" : "1"}
            className="w-full px-4 py-2 border border-hairline bg-surface-soft rounded-xl focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-ink transition-all"
          />
        );
      case 'textarea':
        return (
          <textarea
            id={field.key}
            value={value || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-hairline bg-surface-soft rounded-xl focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm font-mono text-xs text-ink transition-all"
          />
        );
      case 'select':
        return (
          <select
            id={field.key}
            value={value || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-hairline bg-surface-soft rounded-xl focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm font-semibold text-ink transition-all appearance-none"
          >
            {field.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center h-full pt-1">
            <input
              type="checkbox"
              id={field.key}
              checked={!!value}
              onChange={handleChange}
              className="h-4 w-4 text-primary focus:ring-primary border-hairline rounded"
            />
            <label htmlFor={field.key} className="ml-2 block text-sm font-semibold text-ink">
              {field.label}
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`mb-3 ${field.type === 'checkbox' ? 'flex items-center' : ''}`}>
      {field.type !== 'checkbox' && (
        <label htmlFor={field.key} className="block text-xs font-semibold text-ink mb-1">
          {field.label}
        </label>
      )}
      {renderInput()}
    </div>
  );
};

export default TaskFieldRenderer;
