import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info" 
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          buttonBg: 'bg-red-600 hover:bg-red-700 shadow-red-200',
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          buttonBg: 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-200',
        };
      default:
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          buttonBg: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
        };
    }
  };

  const styles = getTypeStyles();

  const modalContent = (
    <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${styles.iconBg} ${styles.iconColor} shrink-0`}>
              <AlertTriangle size={24} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                <button 
                  onClick={onClose}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-slate-500 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-6 py-2.5 text-white rounded-xl font-bold transition-all shadow-lg ${styles.buttonBg}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmModal;
