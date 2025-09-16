import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MyActivitiesScreen = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState({ as_borrower: [], as_owner: [] });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('borrower');
  const [error, setError] = useState('');
  const [processingPenalties, setProcessingPenalties] = useState(false);

  useEffect(() => {
    fetchActivities();
    fetchPendingRequests();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API}/my-activities`);
      setActivities(response.data);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await axios.get(`${API}/transactions/pending`);
      setPendingRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    }
  };

  const handleApproveRequest = async (transactionId) => {
    try {
      await axios.post(`${API}/transactions/${transactionId}/approve`);
      alert('Request approved successfully!');
      fetchPendingRequests();
      fetchActivities();
    } catch (error) {
      alert('Failed to approve request');
    }
  };

  const handleRejectRequest = async (transactionId) => {
    try {
      await axios.post(`${API}/transactions/${transactionId}/reject`);
      alert('Request rejected');
      fetchPendingRequests();
      fetchActivities();
    } catch (error) {
      alert('Failed to reject request');
    }
  };

  const handleConfirmDelivery = async (transactionId) => {
    try {
      await axios.post(`${API}/transactions/${transactionId}/confirm-delivery`);
      alert('Delivery confirmed!');
      fetchActivities();
    } catch (error) {
      alert('Failed to confirm delivery');
    }
  };

  const handleConfirmReturn = async (transactionId, damageSeverity = 'none') => {
    try {
      const response = await axios.post(`${API}/transactions/${transactionId}/confirm-return`, null, {
        params: { damage_severity: damageSeverity }
      });
      
      if (response.data.feedback_required && response.data.transaction_completed) {
        // Transaction completed, redirect to feedback (MANDATORY)
        navigate(`/feedback/${transactionId}`);
      } else {
        alert('Return confirmed!');
        fetchActivities();
      }
    } catch (error) {
      alert('Failed to confirm return');
    }
  };

  const handleProcessPendingPenalties = async () => {
    setProcessingPenalties(true);
    try {
      const response = await axios.post(`${API}/process-pending-penalties`);
      alert(response.data.message);
      fetchActivities(); // Refresh to show updated token balance
    } catch (error) {
      alert('Failed to process penalties');
    } finally {
      setProcessingPenalties(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      delivered: 'bg-green-100 text-green-800',
      returned: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading activities...</div>
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
            <h1 className="text-2xl font-bold text-gray-800">My Activities</h1>
            <button
              onClick={handleProcessPendingPenalties}
              disabled={processingPenalties}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
            >
              {processingPenalties ? 'Processing...' : 'Process Pending Penalties'}
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Pending Requests (As Owner)</h2>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.transaction.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{request.item?.title}</h3>
                      <p className="text-gray-600 text-sm mb-2">
                        Requested by: {request.borrower?.username}
                      </p>
                      <div className="text-sm text-gray-500">
                        <p>Duration: {request.transaction.days} days</p>
                        <p>Tokens: {request.transaction.total_tokens}</p>
                        <p>Start: {formatDate(request.transaction.start_date)}</p>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Borrower Stats: </span>
                        <span>★ {request.borrower?.stars?.toFixed(1) || '0.0'}</span>
                        <span className="ml-2">Success: {request.borrower?.success_rate?.toFixed(1) || '0'}%</span>
                        <span className="ml-2">Complaints: {request.borrower?.complaints_count || 0}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApproveRequest(request.transaction.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.transaction.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('borrower')}
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'borrower'
                    ? 'border-b-2 border-yellow-500 text-yellow-600 bg-yellow-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                As Borrower ({activities.as_borrower.length})
              </button>
              <button
                onClick={() => setActiveTab('owner')}
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'owner'
                    ? 'border-b-2 border-yellow-500 text-yellow-600 bg-yellow-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                As Owner ({activities.as_owner.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'borrower' && (
              <div className="space-y-4">
                {activities.as_borrower.length > 0 ? (
                  activities.as_borrower.map((activity) => (
                    <div key={activity.transaction.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-800">{activity.item?.title}</h3>
                          <p className="text-gray-600 text-sm">{activity.item?.category}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activity.transaction.status)}`}>
                          {activity.transaction.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Duration:</span> {activity.transaction.days} days
                        </div>
                        <div>
                          <span className="font-medium">Tokens:</span> {activity.transaction.total_tokens}
                        </div>
                        <div>
                          <span className="font-medium">Start:</span> {formatDate(activity.transaction.start_date)}
                        </div>
                        <div>
                          <span className="font-medium">End:</span> {formatDate(activity.transaction.end_date)}
                        </div>
                      </div>

                      {/* Action buttons based on status */}
                      <div className="flex space-x-2">
                        {activity.transaction.status === 'approved' && !activity.transaction.borrower_confirmed_delivery && (
                          <button
                            onClick={() => handleConfirmDelivery(activity.transaction.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                          >
                            Confirm Delivery Received
                          </button>
                        )}
                        {activity.transaction.status === 'delivered' && !activity.transaction.borrower_confirmed_return && (
                          <button
                            onClick={() => handleConfirmReturn(activity.transaction.id)}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                          >
                            Confirm Return
                          </button>
                        )}
                        {activity.transaction.status === 'approved' && (
                          <button
                            onClick={() => navigate(`/chat/${activity.transaction.id}`)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                          >
                            Chat
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No borrowing activities yet</p>
                )}
              </div>
            )}

            {activeTab === 'owner' && (
              <div className="space-y-4">
                {activities.as_owner.length > 0 ? (
                  activities.as_owner.map((activity) => (
                    <div key={activity.transaction.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-800">{activity.item?.title}</h3>
                          <p className="text-gray-600 text-sm">{activity.item?.category}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activity.transaction.status)}`}>
                          {activity.transaction.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Duration:</span> {activity.transaction.days} days
                        </div>
                        <div>
                          <span className="font-medium">Tokens:</span> {activity.transaction.total_tokens}
                        </div>
                        <div>
                          <span className="font-medium">Start:</span> {formatDate(activity.transaction.start_date)}
                        </div>
                        <div>
                          <span className="font-medium">End:</span> {formatDate(activity.transaction.end_date)}
                        </div>
                      </div>

                      {/* Action buttons based on status */}
                      <div className="flex space-x-2">
                        {activity.transaction.status === 'approved' && !activity.transaction.owner_confirmed_delivery && (
                          <button
                            onClick={() => handleConfirmDelivery(activity.transaction.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                          >
                            Confirm Delivery Made
                          </button>
                        )}
                        {activity.transaction.status === 'delivered' && !activity.transaction.owner_confirmed_return && (
                          <button
                            onClick={() => handleConfirmReturn(activity.transaction.id)}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                          >
                            Confirm Return Received
                          </button>
                        )}
                        {activity.transaction.status === 'approved' && (
                          <button
                            onClick={() => navigate(`/chat/${activity.transaction.id}`)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                          >
                            Chat
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No lending activities yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default MyActivitiesScreen;