import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfileScreen = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    location: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    fetchUserProfile();
    fetchUserReviews();
    fetchUserComplaints();
    fetchUserPenalties();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
      setEditForm({
        username: response.data.username,
        location: response.data.location,
        phone: response.data.phone,
        password: ''
      });
    } catch (error) {
      setError('Failed to fetch user profile');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReviews = async () => {
    try {
      const userResponse = await axios.get(`${API}/auth/me`);
      const response = await axios.get(`${API}/reviews/${userResponse.data.id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const fetchUserComplaints = async () => {
    try {
      const userResponse = await axios.get(`${API}/auth/me`);
      const response = await axios.get(`${API}/complaints/${userResponse.data.id}`);
      setComplaints(response.data);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    }
  };

  const fetchUserPenalties = async () => {
    try {
      const response = await axios.get(`${API}/penalties`);
      setPenalties(response.data);
    } catch (error) {
      console.error('Failed to fetch penalties:', error);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const formData = new FormData();
      formData.append('username', editForm.username);
      formData.append('location', editForm.location);
      formData.append('phone', editForm.phone);
      if (editForm.password.trim()) {
        formData.append('password', editForm.password);
      }

      const response = await axios.put(`${API}/auth/profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update local user state with backend response
      setUser(response.data);
      setIsEditing(false);
      alert('Profile updated successfully!');
      
      // Refresh user profile to sync with other components
      fetchUserProfile();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to update profile';
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone and you will lose all your data.')) {
      if (window.confirm('This will permanently delete your account and all associated data. Are you absolutely sure?')) {
        try {
          setError('');
          await axios.delete(`${API}/auth/account`);
          
          // Clear local storage and redirect to home
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          
          alert('Account deleted successfully. You will now be logged out.');
          
          // Navigate to home and reload to clear app state
          navigate('/');
          window.location.reload();
        } catch (error) {
          const errorMessage = error.response?.data?.detail || 'Failed to delete account';
          setError(errorMessage);
          alert(errorMessage);
        }
      }
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ★
      </span>
    ));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading profile...</div>
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
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-bold text-3xl">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-800">{user?.username}</h2>
                <p className="text-gray-600 mb-2">{user?.email}</p>
                <p className="text-gray-600 mb-2">📍 {user?.location}</p>
                <p className="text-gray-600 mb-4">📞 {user?.phone}</p>
                
                <div className="flex space-x-6 text-sm">
                  <div className="text-center">
                    <div className="flex items-center">
                      {renderStars(Math.floor(user?.stars || 0))}
                      <span className="ml-2 text-gray-600">({user?.stars?.toFixed(1) || '0.0'})</span>
                    </div>
                    <p className="text-gray-500 text-xs">Rating</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-green-600">{user?.success_rate?.toFixed(1) || '0'}%</p>
                    <p className="text-gray-500 text-xs">Success Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-yellow-600">{user?.tokens || 0}</p>
                    <p className="text-gray-500 text-xs">Tokens</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-red-600">{user?.complaints_count || 0}</p>
                    <p className="text-gray-500 text-xs">Complaints</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Edit Profile Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Profile</h3>
              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2">New Password (optional)</label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave blank to keep current password"
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
                <div className="mt-4 border-t pt-4">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                  >
                    Delete Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Profile Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'reviews'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Reviews ({reviews.length})
              </button>
              <button
                onClick={() => setActiveTab('complaints')}
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'complaints'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Complaints ({complaints.length})
              </button>
              <button
                onClick={() => setActiveTab('penalties')}
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === 'penalties'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Penalties ({penalties.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Account Information</h4>
                    <p className="text-sm text-gray-600">Member since: {formatDate(user?.created_at)}</p>
                    <p className="text-sm text-gray-600">Account Status: {user?.is_banned ? 'Banned' : 'Active'}</p>
                    <p className="text-sm text-gray-600">Total Reviews: {reviews.length}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Community Standing</h4>
                    <p className="text-sm text-gray-600">Star Rating: {user?.stars?.toFixed(1) || '0.0'}/5.0</p>
                    <p className="text-sm text-gray-600">Success Rate: {user?.success_rate?.toFixed(1) || '0'}%</p>
                    <p className="text-sm text-gray-600">Complaint Count: {user?.complaints_count || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          {renderStars(review.stars)}
                          <span className="ml-2 text-gray-600">({review.stars}/5)</span>
                        </div>
                        <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700">{review.comment}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No reviews yet</p>
                )}
              </div>
            )}

            {activeTab === 'complaints' && (
              <div className="space-y-4">
                {complaints.length > 0 ? (
                  complaints.map((complaint) => (
                    <div key={complaint.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="inline-block bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                            {complaint.type.toUpperCase()}
                          </span>
                          <span className={`ml-2 inline-block px-2 py-1 rounded text-xs font-semibold ${
                            complaint.is_valid ? 'bg-red-500 text-white' : 'bg-yellow-200 text-yellow-800'
                          }`}>
                            {complaint.is_valid ? 'Valid' : 'Under Review'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">{formatDate(complaint.created_at)}</span>
                      </div>
                      <p className="text-gray-700">{complaint.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No complaints filed against you</p>
                )}
              </div>
            )}

            {activeTab === 'penalties' && (
              <div className="space-y-4">
                {penalties.length > 0 ? (
                  penalties.map((penalty) => (
                    <div key={penalty.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-lg font-bold text-orange-800">{penalty.amount} tokens</span>
                          <span className={`ml-2 inline-block px-2 py-1 rounded text-xs font-semibold ${
                            penalty.is_paid ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {penalty.is_paid ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">{formatDate(penalty.created_at)}</span>
                      </div>
                      <p className="text-gray-700 text-sm">{penalty.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No penalties</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfileScreen;