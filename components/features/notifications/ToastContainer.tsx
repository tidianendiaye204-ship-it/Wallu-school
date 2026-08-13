import React from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useNotifications, Toast } from '../../contexts/NotificationContext';

export function ToastContainer() {
  const { toasts, removeToast } = useNotifications();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full md:w-auto px-4 md:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  let bgColor = 'bg-white';
  let borderColor = 'border-gray-200';
  let Icon = Info;
  let iconColor = 'text-gray-500';

  if (toast.type === 'success') {
    bgColor = 'bg-[#0d3320]';
    borderColor = 'border-[#4CAF50]';
    Icon = CheckCircle;
    iconColor = 'text-[#4CAF50]';
  } else if (toast.type === 'error') {
    bgColor = 'bg-[#3a1c1c]';
    borderColor = 'border-[#E57373]';
    Icon = AlertCircle;
    iconColor = 'text-[#E57373]';
  } else if (toast.type === 'warning') {
    bgColor = 'bg-[#332e12]';
    borderColor = 'border-[#FFD54F]';
    Icon = AlertTriangle;
    iconColor = 'text-[#FFD54F]';
  } else {
    bgColor = 'bg-[#1e2a3b]';
    borderColor = 'border-[#64B5F6]';
    Icon = Info;
    iconColor = 'text-[#64B5F6]';
  }

  return (
    <div className={`relative flex items-start gap-3 p-4 rounded-lg shadow-lg border ${bgColor} ${borderColor} transition-all animate-in slide-in-from-right-8 duration-300`}>
      <Icon size={20} className={`shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 pr-4">
        {toast.title && <h4 className="text-sm font-semibold text-white mb-1">{toast.title}</h4>}
        <p className="text-sm text-gray-200">{toast.message}</p>
      </div>
      <button onClick={onRemove} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
        <X size={16} />
      </button>
    </div>
  );
}
