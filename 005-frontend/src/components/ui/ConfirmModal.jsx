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
          iconBg: 'bg-rose-50',
          iconColor: 'text-semantic-down',
          buttonBg: 'bg-semantic-down text-white hover:opacity-90',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50',
          iconColor: 'text-accent-yellow',
          buttonBg: 'bg-accent-yellow text-ink hover:opacity-90',
        };
      default:
        return {
          iconBg: 'bg-surface-strong',
          iconColor: 'text-primary',
          buttonBg: 'bg-primary text-on-primary hover:bg-primary-active',
        };
    }
  };

  const styles = getTypeStyles();

  const modalContent = (
    <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-dark/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-canvas rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 border border-hairline">
        <div className="p-8">
          <div className="flex items-start gap-4">
            <div className={`p-4 rounded-full ${styles.iconBg} ${styles.iconColor} shrink-0`}>
              <AlertTriangle size={24} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-normal tracking-tight text-ink">{title}</h3>
                <button 
                  onClick={onClose}
                  className="p-1 hover:bg-surface-soft rounded-full text-muted transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-body text-sm leading-relaxed">
                {message}
              </p>
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-ink bg-surface-strong hover:bg-hairline-soft rounded-full font-semibold transition-colors text-sm"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-6 py-3 rounded-full font-semibold transition-all text-sm ${styles.buttonBg}`}
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
