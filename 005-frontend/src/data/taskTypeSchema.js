export const TASK_TYPES = {
  app_open: {
    label: 'App Open',
    icon: 'Play',
    color: 'bg-green-100 text-green-700 border-green-200',
    fields: [
      { key: 'timeout', label: 'Timeout (s)', type: 'number', default: 30 },
      { key: 'measure_response_time', label: 'Measure Response Time', type: 'checkbox', default: true },
      { key: 'critical', label: 'Critical', type: 'checkbox', default: true },
    ],
  },
  app_close: {
    label: 'App Close',
    icon: 'XCircle',
    color: 'bg-red-100 text-red-700 border-red-200',
    fields: [
      { key: 'timeout', label: 'Timeout (s)', type: 'number', default: 10 },
      { key: 'wait', label: 'Wait (s)', type: 'number', default: 1 },
      { key: 'measure_response_time', label: 'Measure Response Time', type: 'checkbox', default: true },
      { key: 'critical', label: 'Critical', type: 'checkbox', default: false },
    ],
  },
  ui: {
    label: 'UI Interaction',
    icon: 'MousePointer2',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    fields: [
      { key: 'element_name', label: 'Element Name', type: 'text', default: '' },
      { key: 'find_by', label: 'Find By', type: 'select', options: ['xpath', 'id', 'text', 'accessibility_id'], default: 'xpath' },
      { key: 'content', label: 'Locator Content', type: 'textarea', default: '' },
      { key: 'action', label: 'Action', type: 'select', options: ['tap', 'input', 'none', 'clear'], default: 'tap' },
      { key: 'input', label: 'Input Text', type: 'text', default: '', showIf: (values) => values.action === 'input' },
      { key: 'handler', label: 'Handler', type: 'select', options: ['system', 'appium'], default: 'appium', showIf: (values) => values.action === 'input' },
      { key: 'timeout', label: 'Timeout (s)', type: 'number', default: 10 },
      { key: 'measure_response_time', label: 'Measure Response Time', type: 'checkbox', default: true },
      { key: 'critical', label: 'Critical', type: 'checkbox', default: true },
    ],
  },
  within_ui: {
    label: 'Within UI Interaction',
    icon: 'Maximize2',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    fields: [
      { key: 'element_name', label: 'Element Name', type: 'text', default: '' },
      { key: 'find_by', label: 'Find By', type: 'select', options: ['xpath', 'id', 'text', 'accessibility_id'], default: 'xpath' },
      { key: 'content', label: 'Locator Content', type: 'textarea', default: '' },
      { key: 'action', label: 'Action', type: 'select', options: ['tap', 'input', 'none', 'clear'], default: 'tap' },
      { key: 'input', label: 'Input Text', type: 'text', default: '', showIf: (values) => values.action === 'input' },
      { key: 'timeout', label: 'Timeout (s)', type: 'number', default: 5 },
      { key: 'measure_response_time', label: 'Measure Response Time', type: 'checkbox', default: true },
      { key: 'critical', label: 'Critical', type: 'checkbox', default: true },
    ],
  },
  tap_coords: {
    label: 'Tap Coordinates',
    icon: 'Target',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    fields: [
      { key: 'x', label: 'X Coordinate', type: 'number', default: 0 },
      { key: 'y', label: 'Y Coordinate', type: 'number', default: 0 },
      { key: 'measure_response_time', label: 'Measure Response Time', type: 'checkbox', default: true },
      { key: 'critical', label: 'Critical', type: 'checkbox', default: true },
    ],
  },
  back_until_ui: {
    label: 'Back Until UI',
    icon: 'RotateCcw',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    fields: [
      { key: 'element_name', label: 'Element Name', type: 'text', default: '' },
      { key: 'find_by', label: 'Find By', type: 'select', options: ['xpath', 'id', 'text', 'accessibility_id'], default: 'xpath' },
      { key: 'content', label: 'Locator Content', type: 'textarea', default: '' },
      { key: 'action', label: 'Action', type: 'select', options: ['tap', 'none'], default: 'none' },
      { key: 'max_presses', label: 'Max Back Presses', type: 'number', default: 3 },
      { key: 'timeout', label: 'Timeout (s)', type: 'number', default: 20 },
      { key: 'measure_response_time', label: 'Measure Response Time', type: 'checkbox', default: true },
      { key: 'critical', label: 'Critical', type: 'checkbox', default: false },
    ],
  },
  do_if_ui: {
    label: 'Do If UI',
    icon: 'HelpCircle',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    fields: [
      { key: 'element_name', label: 'Element Name', type: 'text', default: '' },
      { key: 'find_by', label: 'Find By', type: 'select', options: ['xpath', 'id', 'text', 'accessibility_id'], default: 'xpath' },
      { key: 'content', label: 'Locator Content', type: 'textarea', default: '' },
      { key: 'action', label: 'Action', type: 'select', options: ['tap', 'none'], default: 'tap' },
      { key: 'timeout', label: 'Timeout (s)', type: 'number', default: 5 },
      { key: 'measure_response_time', label: 'Measure Response Time', type: 'checkbox', default: true },
      { key: 'critical', label: 'Critical', type: 'checkbox', default: false },
    ],
  },
  do_while_ui: {
    label: 'Do While UI',
    icon: 'RefreshCw',
    color: 'bg-pink-100 text-pink-700 border-pink-200',
    fields: [
      { key: 'element_name', label: 'Element Name', type: 'text', default: '' },
      { key: 'find_by', label: 'Find By', type: 'select', options: ['xpath', 'id', 'text', 'accessibility_id'], default: 'xpath' },
      { key: 'content', label: 'Locator Content', type: 'textarea', default: '' },
      { key: 'action', label: 'Action', type: 'select', options: ['tap', 'none'], default: 'tap' },
      { key: 'timeout', label: 'Timeout (s)', type: 'number', default: 15 },
      { key: 'measure_response_time', label: 'Measure Response Time', type: 'checkbox', default: true },
      { key: 'critical', label: 'Critical', type: 'checkbox', default: false },
    ],
  },
  scroll_with_timing: {
    label: 'Scroll With Timing',
    icon: 'ArrowUpDown',
    color: 'bg-teal-100 text-teal-700 border-teal-200',
    fields: [
      { key: 'direction', label: 'Direction', type: 'select', options: ['up', 'down', 'left', 'right'], default: 'up' },
      { key: 'scale', label: 'Scale (0-1)', type: 'number', default: 0.6 },
      { key: 'wait_after', label: 'Wait After (s)', type: 'number', default: 1.5 },
      { key: 'measure_response_time', label: 'Measure Response Time', type: 'checkbox', default: true },
      { key: 'critical', label: 'Critical', type: 'checkbox', default: false },
    ],
  },
};

export const createTaskTemplate = (type) => {
  const schema = TASK_TYPES[type];
  if (!schema) return null;

  const task = {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: schema.label,
    type: type,
  };

  schema.fields.forEach(field => {
    task[field.key] = field.default;
  });

  return task;
};
