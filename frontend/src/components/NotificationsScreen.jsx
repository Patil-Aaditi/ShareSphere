import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = "https://sharesphere-in.onrender.com";
const API = `${BACKEND_URL}/api`;

const NotificationsScreen = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      setError('Failed to fetch notifications');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/${notificationId}/read`);
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, is_read: true }
          : notification
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API}/notifications/${notificationId}`);
      setNotifications(notifications.filter(notification => notification.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(notification => 
          axios.post(`${API}/notifications/${notification.id}/read`)
        )
      );
      setNotifications(notifications.map(notification => ({ ...notification, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      request: '📩',
      approval: '✅',
      rejection: '❌',
      delivery: '🚚',
      return: '📦',
      message: '💬',
      penalty: '⚠️',
      partial_payment: '💰',
      complaint: '🚨',
      review: '⭐',
      default: '🔔'
    };
    return icons[type] || icons.default;
  };

  const getNotificationColor = (type) => {
    const colors = {
      request: 'border-blue-200 bg-blue-50',
      approval: 'border-green-200 bg-green-50',
      rejection: 'border-red-200 bg-red-50',
      delivery: 'border-purple-200 bg-purple-50',
      return: 'border-indigo-200 bg-indigo-50',
      message: 'border-yellow-200 bg-yellow-50',
      penalty: 'border-orange-200 bg-orange-50',
      partial_payment: 'border-emerald-200 bg-emerald-50',
      complaint: 'border-red-300 bg-red-100',
      review: 'border-yellow-300 bg-yellow-100',
      default: 'border-gray-200 bg-gray-50'
    };
    return colors[type] || colors.default;
  };

  const handleNotificationClick = (notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type and related_id
    if (notification.related_id) {
      switch (notification.type) {
        case 'request':
        case 'approval':
        case 'rejection':
        case 'delivery':
        case 'return':
          navigate('/my-activities');
          break;
        case 'message':
          navigate(`/chat/${notification.related_id}`);
          break;
        case 'penalty':
        case 'partial_payment':
          navigate('/profile');
          break;
        default:
          // Do nothing for other types
          break;
      }
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !notification.is_read;
    if (filterType === 'read') return notification.is_read;
    return notification.type === filterType;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <button onClick={() => navigate('/dashboard')} className="text-yellow-600 hover:text-yellow-800 mb-4">
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={markAllAsRead}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                Mark All as Read
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { key: 'all', label: 'All', count: notifications.length },
                { key: 'unread', label: 'Unread', count: notifications.filter(n => !n.is_read).length },
                { key: 'read', label: 'Read', count: notifications.filter(n => n.is_read).length }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterType(filter.key)}
                  className={`py-4 px-6 text-center font-medium ${
                    filterType === filter.key
                      ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  getNotificationColor(notification.type)
                } ${!notification.is_read ? 'border-l-4 border-l-blue-500' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      <p className={`text-sm mt-1 ${!notification.is_read ? 'text-gray-700' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {!notification.is_read && (
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      title="Delete notification"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">🔔</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {filterType === 'all' ? 'No notifications' : `No ${filterType} notifications`}
              </h3>
              <p className="text-gray-500">
                {filterType === 'all' 
                  ? "You're all caught up! New notifications will appear here." 
                  : `No ${filterType} notifications at the moment.`}
              </p>
            </div>
          )}
        </div>

        {/* Notification Types Legend */}
        {notifications.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Notification Types</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {[
                { type: 'request', label: 'Borrow Requests', description: 'New item borrow requests' },
                { type: 'approval', label: 'Approvals', description: 'Request approvals and rejections' },
                { type: 'delivery', label: 'Deliveries', description: 'Delivery confirmations' },
                { type: 'return', label: 'Returns', description: 'Return confirmations' },
                { type: 'message', label: 'Messages', description: 'New chat messages' },
                { type: 'penalty', label: 'Penalties', description: 'Damage or late return penalties' },
                { type: 'complaint', label: 'Complaints', description: 'Filed complaints' },
                { type: 'review', label: 'Reviews', description: 'New reviews received' }
              ].map((item) => (
                <div key={item.type} className="flex items-center space-x-2">
                  <span className="text-lg">{getNotificationIcon(item.type)}</span>
                  <div>
                    <p className="font-medium text-gray-700">{item.label}</p>
                    <p className="text-gray-500 text-xs">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsScreen;
