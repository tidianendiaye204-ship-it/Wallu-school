import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, CreditCard, User, AlertCircle, Info } from 'lucide-react';
import { T } from '../../utils/theme';
import { useNotifications, AppNotification } from '../../contexts/NotificationContext';

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'system' | 'payments'>('all');
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'system') return n.category === 'system';
    if (filter === 'payments') return n.category === 'payments';
    return true;
  });

  return (
    <div className="relative" ref={popupRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-text"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow" style={{ background: T.rust }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 md:right-auto md:left-0 mt-2 w-80 sm:w-96 rounded-xl border shadow-xl z-50 overflow-hidden flex flex-col" style={{ background: T.ink, borderColor: T.inkLine, maxHeight: '80vh' }}>
          <div className="p-4 border-b flex items-center justify-between border-inkLine bg-inkSoft">
            <h3 className="font-semibold text-text">Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs hover:underline text-gold">
                  Tout marquer comme lu
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap px-4 py-3 gap-2 border-b border-inkLine">
            <FilterBtn label="Toutes" active={filter === 'all'} onClick={() => setFilter('all')} />
            <FilterBtn label="Non lues" active={filter === 'unread'} onClick={() => setFilter('unread')} />
            <FilterBtn label="Paiements" active={filter === 'payments'} onClick={() => setFilter('payments')} />
            <FilterBtn label="Système" active={filter === 'system'} onClick={() => setFilter('system')} />
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted">
                Aucune notification
              </div>
            ) : (
              filtered.map(n => (
                <NotificationItem key={n.id} notification={n} onRead={() => markAsRead(n.id)} />
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 border-t text-center border-inkLine">
              <button onClick={clearAll} className="text-xs hover:underline text-muted">
                Effacer tout l'historique
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterBtn({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
      style={{ 
        background: active ? T.gold : 'transparent',
        color: active ? T.ink : T.text,
        border: `1px solid ${active ? T.gold : T.inkLine}`
      }}
    >
      {label}
    </button>
  );
}

function NotificationItem({ notification, onRead }: { notification: AppNotification, onRead: () => void }) {
  let Icon = Info;
  let iconColor = T.gold;
  
  if (notification.category === 'payments') { Icon = CreditCard; iconColor = T.green; }
  else if (notification.type === 'error') { Icon = AlertCircle; iconColor = T.rust; }
  else if (notification.type === 'success') { Icon = Check; iconColor = T.green; }

  const date = new Date(notification.createdAt);
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  return (
    <div 
      className="relative p-3 rounded-lg border flex gap-3 transition-colors" 
      style={{ 
        borderColor: notification.read ? 'transparent' : T.inkLine,
        background: notification.read ? 'transparent' : `${T.inkSoft}50`
      }}
    >
      <div className="shrink-0 mt-1" style={{ color: iconColor }}>
        <Icon size={16} />
      </div>
      <div className="flex-1 pr-6">
        <p className="text-sm font-semibold mb-0.5 text-text">{notification.title}</p>
        <p className="text-xs mb-2 leading-relaxed text-muted">{notification.message}</p>
        <p className="text-[10px]" style={{ color: `${T.muted}80` }}>{dateStr} à {timeStr}</p>
      </div>
      {!notification.read && (
        <button 
          onClick={onRead}
          className="absolute top-3 right-3 text-gray-500 hover:text-white"
          title="Marquer comme lu"
        >
          <div className="w-2 h-2 rounded-full" style={{ background: T.gold }} />
        </button>
      )}
    </div>
  );
}
