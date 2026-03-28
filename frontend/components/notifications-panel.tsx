'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useNotifications, Notification } from '@/hooks/use-notifications';
import { 
  BellIcon, 
  XIcon, 
  CheckIcon, 
  ClockIcon, 
  AlertTriangleIcon,
  FileTextIcon,
  VoteIcon,
  TrendingUpIcon,
  ExternalLinkIcon
} from 'lucide-react';

export function NotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification 
  } = useNotifications();

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'proposal_status':
        return <TrendingUpIcon className="w-4 h-4" />;
      case 'voting_deadline':
        return <ClockIcon className="w-4 h-4" />;
      case 'transaction_success':
        return <CheckIcon className="w-4 h-4" />;
      case 'transaction_failed':
        return <AlertTriangleIcon className="w-4 h-4" />;
      case 'new_proposal':
        return <FileTextIcon className="w-4 h-4" />;
      default:
        return <BellIcon className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'high') return 'text-red-400 bg-red-500/20';
    if (type === 'transaction_success') return 'text-green-400 bg-green-500/20';
    if (type === 'transaction_failed') return 'text-red-400 bg-red-500/20';
    if (type === 'voting_deadline') return 'text-yellow-400 bg-yellow-500/20';
    return 'text-blue-400 bg-blue-500/20';
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) markAsRead(notification.id);
    setIsOpen(false);
    if (notification.proposalId) {
      router.push(`/proposal/${notification.proposalId}`);
    } else if (notification.txId) {
      window.open(`https://lora.algokit.io/testnet/transaction/${notification.txId}`, '_blank');
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notifications Panel */}
          <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden bg-slate-900/95 backdrop-blur-xl border-white/10 shadow-2xl z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-blue-400 hover:text-blue-300 h-6 px-2"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-white/70 hover:text-white"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                      !notification.read ? 'bg-blue-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getNotificationColor(notification.type, notification.priority)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-white truncate">
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-2 ml-2">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-400 rounded-full" />
                            )}
                            <span className="text-xs text-white/40">
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-xs text-white/60 mt-1 leading-relaxed">
                          {notification.message}
                        </p>
                        
                        {notification.proposalId && (
                          <div className="flex items-center gap-1 mt-2">
                            <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/50">
                              Proposal #{notification.proposalId}
                            </Badge>
                          </div>
                        )}
                        
                        {notification.txId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://lora.algokit.io/testnet/transaction/${notification.txId}`, '_blank');
                            }}
                          >
                            <ExternalLinkIcon className="w-3 h-3 mr-1" />
                            View TX
                          </Button>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className="p-1 text-white/40 hover:text-white/70"
                      >
                        <XIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <BellIcon className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60 text-sm">No notifications yet</p>
                  <p className="text-white/40 text-xs mt-1">
                    You'll be notified about proposal updates, voting deadlines, and transaction status
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}