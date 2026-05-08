import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: <CheckCircle className="text-green-500" size={20} />,
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: <XCircle className="text-red-500" size={20} />,
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: <AlertCircle className="text-yellow-500" size={20} />,
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: <Info className="text-blue-500" size={20} />,
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg pointer-events-auto
        transition-all duration-300 transform
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
        ${styles.bg} ${styles.border} ${styles.text}
      `}
    >
      <div className="flex-shrink-0">{styles.icon}</div>
      <p className="text-sm font-medium pr-4">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="flex-shrink-0 ml-auto p-1 hover:bg-black/5 rounded-lg transition-colors"
      >
        <X size={16} className="opacity-50" />
      </button>
    </div>
  );
};

export default Toast;
