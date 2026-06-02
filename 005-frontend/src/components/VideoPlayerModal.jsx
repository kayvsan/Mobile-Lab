import { createPortal } from 'react-dom';
import { X, PlayCircle } from 'lucide-react';

const VideoPlayerModal = ({ isOpen, onClose, reportId, journeyName }) => {
  if (!isOpen || !reportId) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-canvas w-full max-w-4xl rounded-3xl shadow-2xl border border-hairline overflow-hidden flex flex-col relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-hairline flex items-center justify-between bg-surface-soft/50 shrink-0">
          <div className="flex items-center gap-3 text-ink">
            <PlayCircle size={20} className="text-primary" />
            <h2 className="font-semibold text-sm truncate max-w-[600px]">
              Recording: {journeyName || reportId}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-strong rounded-full text-muted hover:text-ink transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Content */}
        <div className="bg-black flex items-center justify-center overflow-hidden">
          <video 
            autoPlay
            controls 
            className="max-h-[80vh] w-full"
          >
            <source src={`http://localhost:5000/api/reports/${reportId}/recording`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface-soft/50 border-t border-hairline text-center">
          <p className="text-[11px] text-muted font-semibold tracking-widest uppercase">
            HTML5 Video Player • {reportId}
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default VideoPlayerModal;
