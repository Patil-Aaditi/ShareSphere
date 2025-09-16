import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ItemDetailScreen = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestData, setRequestData] = useState({
    days: 1,
    start_date: '',
    end_date: ''
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchItemDetails();
    fetchUserProfile();
  }, [itemId]);

  useEffect(() => {
    if (requestData.start_date && requestData.days > 0) {
      const startDate = new Date(requestData.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + parseInt(requestData.days) - 1);
      setRequestData(prev => ({
        ...prev,
        end_date: endDate.toISOString().split('T')[0]
      }));
    }
  }, [requestData.start_date, requestData.days]);

  const fetchItemDetails = async () => {
    try {
      const response = await axios.get(`${API}/items/${itemId}`);
      setItem(response.data);
      
      // Fetch owner details
      const users = await axios.get(`${API}/auth/me`);
      // For now, we'll mock owner data since we don't have a user lookup endpoint
      setOwner({
        id: response.data.owner_id,
        username: 'Item Owner',
        stars: 4.5,
        success_rate: 95.0,
        complaints_count: 0
      });
    } catch (error) {
      setError('Failed to fetch item details');
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const calculateTotalTokens = () => {
    if (!item || !requestData.days) return 0;
    return item.token_per_day * parseInt(requestData.days);
  };

  const handleRequestSubmit = async () => {
    if (!user || !item) return;

    const totalTokens = calculateTotalTokens();
    if (user.tokens < totalTokens) {
      setError('Insufficient tokens for this request');
      return;
    }

    try {
      await axios.post(`${API}/transactions/request`, {
        item_id: itemId,
        days: parseInt(requestData.days),
        start_date: new Date(requestData.start_date).toISOString(),
        end_date: new Date(requestData.end_date).toISOString()
      });

      setShowRequestModal(false);
      alert('Request sent successfully!');
      navigate('/my-activities');
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to send request');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading item details...</div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <button onClick={() => navigate('/browse-items')} className="text-yellow-600 hover:text-yellow-800 mb-4">
            ← Back to Browse
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Item Details</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-4xl mx-auto">
            {error}
          </div>
        )}

        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="md:flex">
            {/* Item Images */}
            <div className="md:w-1/2">
              {item?.images && item.images.length > 0 ? (
                <div className="space-y-2">
                  <div className="h-72 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={`${BACKEND_URL}${item.images[0]}`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {item.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {item.images.slice(1).map((image, index) => (
                        <div key={index} className="h-16 bg-gray-200 rounded overflow-hidden">
                          <img
                            src={`${BACKEND_URL}${image}`}
                            alt={`${item.title} ${index + 2}`}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-75"
                            onClick={() => {
                              // Switch main image
                              const newImages = [...item.images];
                              [newImages[0], newImages[index + 1]] = [newImages[index + 1], newImages[0]];
                              setItem({...item, images: newImages});
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-96 bg-gray-200 flex items-center justify-center rounded-lg">
                  <span className="text-gray-500 text-lg">No Images Available</span>
                </div>
              )}
            </div>

            {/* Item Details */}
            <div className="md:w-1/2 p-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">{item?.title}</h2>
              
              <div className="mb-6">
                <span className="inline-block bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                  {item?.category}
                </span>
              </div>

              <p className="text-gray-600 mb-6">{item?.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800">Item Value</h4>
                  <p className="text-xl font-bold text-gray-600">₹{item?.value?.toLocaleString()}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800">Tokens/Day</h4>
                  <p className="text-xl font-bold text-yellow-600">{item?.token_per_day}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">Availability</h4>
                <p className="text-gray-600">
                  {item?.availability_start && formatDate(item.availability_start)} - {item?.availability_end && formatDate(item.availability_end)}
                </p>
              </div>

              {user?.id !== item?.owner_id && (
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Request to Borrow
                </button>
              )}

              {user?.id === item?.owner_id && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800 font-semibold">This is your item</p>
                </div>
              )}
            </div>
          </div>

          {/* Owner Information */}
          {owner && user?.id !== item?.owner_id && (
            <div className="border-t border-gray-200 p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Owner Information</h3>
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-bold text-xl">
                    {owner.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{owner.username}</h4>
                  <div className="flex space-x-4 text-sm text-gray-600">
                    <span>★ {owner.stars}</span>
                    <span>Success Rate: {owner.success_rate}%</span>
                    <span>Complaints: {owner.complaints_count}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Request Item</h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Number of Days
              </label>
              <input
                type="number"
                min="1"
                value={requestData.days}
                onChange={(e) => setRequestData({...requestData, days: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={requestData.start_date}
                onChange={(e) => setRequestData({...requestData, start_date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                End Date
              </label>
              <input
                type="date"
                value={requestData.end_date}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>

            <div className="mb-6">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">Token Calculation</h4>
                <p className="text-gray-600">
                  {item?.token_per_day} tokens/day × {requestData.days} days = <span className="font-bold text-yellow-600">{calculateTotalTokens()} tokens</span>
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Your balance: {user?.tokens} tokens
                </p>
                {user && calculateTotalTokens() > user.tokens && (
                  <p className="text-red-600 text-sm mt-1">Insufficient tokens!</p>
                )}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestSubmit}
                disabled={!user || calculateTotalTokens() > user.tokens || !requestData.start_date}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetailScreen;