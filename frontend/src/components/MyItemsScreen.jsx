import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = "https://sharesphere-in.onrender.com";
const API = `${BACKEND_URL}/api`;

const MyItemsScreen = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    value: '',
    token_per_day: '',
    availability_start: '',
    availability_end: ''
  });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchMyItems();
    fetchCategories();
  }, []);

  const fetchMyItems = async () => {
    try {
      const response = await axios.get(`${API}/my-items`);
      setItems(response.data);
    } catch (error) {
      setError('Failed to fetch your items');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setEditForm({
      title: item.title,
      description: item.description,
      category: item.category,
      value: item.value.toString(),
      token_per_day: item.token_per_day.toString(),
      availability_start: item.availability_start ? item.availability_start.split('T')[0] : '',
      availability_end: item.availability_end ? item.availability_end.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const formData = new FormData();
      formData.append('title', editForm.title);
      formData.append('description', editForm.description);
      formData.append('category', editForm.category);
      formData.append('value', parseInt(editForm.value));
      formData.append('token_per_day', parseInt(editForm.token_per_day));
      formData.append('availability_start', new Date(editForm.availability_start).toISOString());
      formData.append('availability_end', new Date(editForm.availability_end).toISOString());

      const response = await axios.put(`${API}/items/${selectedItem.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update local state with backend response
      const updatedItems = items.map(item => 
        item.id === selectedItem.id ? response.data : item
      );
      setItems(updatedItems);
      setShowEditModal(false);
      alert('Item updated successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to update item';
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        setError('');
        await axios.delete(`${API}/items/${itemId}`);
        
        // Remove from local state
        const updatedItems = items.filter(item => item.id !== itemId);
        setItems(updatedItems);
        alert('Item deleted successfully!');
      } catch (error) {
        const errorMessage = error.response?.data?.detail || 'Failed to delete item';
        setError(errorMessage);
        alert(errorMessage);
      }
    }
  };

  const toggleItemAvailability = async (itemId) => {
    try {
      setError('');
      const response = await axios.patch(`${API}/items/${itemId}/toggle-availability`);
      
      // Update local state with new availability status
      const updatedItems = items.map(item => 
        item.id === itemId 
          ? { ...item, is_available: response.data.is_available }
          : item
      );
      setItems(updatedItems);
      alert(response.data.message);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to update item availability';
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading your items...</div>
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
            <h1 className="text-2xl font-bold text-gray-800">My Items</h1>
            <button
              onClick={() => navigate('/add-item')}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md font-semibold transition-colors"
            >
              Add New Item
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

        {items.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-48 bg-gray-200 overflow-hidden">
                  {item.images && item.images.length > 0 ? (
                    <img
                      src={`${BACKEND_URL}${item.images[0]}`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-500">No Image</span>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800 text-lg">{item.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{item.category}</p>
                  <p className="text-sm text-gray-500 mb-3">{item.description.substring(0, 100)}...</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Value:</span>
                      <p className="text-gray-600">₹{item.value.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tokens/Day:</span>
                      <p className="text-yellow-600 font-semibold">{item.token_per_day}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4 text-sm">
                    <span className="font-medium text-gray-700">Available:</span>
                    <p className="text-gray-600">
                      {formatDate(item.availability_start)} - {formatDate(item.availability_end)}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-md text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleItemAvailability(item.id)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
                        item.is_available 
                          ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {item.is_available ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-md text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl text-gray-300 mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No items yet</h3>
            <p className="text-gray-500 mb-6">Start sharing your items with the community!</p>
            <button
              onClick={() => navigate('/add-item')}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Add Your First Item
            </button>
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Item</h3>
            <form onSubmit={handleUpdateItem}>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Value (₹)</label>
                  <input
                    type="number"
                    value={editForm.value}
                    onChange={(e) => setEditForm({...editForm, value: e.target.value})}
                    max="100000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Tokens/Day</label>
                  <input
                    type="number"
                    value={editForm.token_per_day}
                    onChange={(e) => setEditForm({...editForm, token_per_day: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Available From</label>
                  <input
                    type="date"
                    value={editForm.availability_start}
                    onChange={(e) => setEditForm({...editForm, availability_start: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Available Until</label>
                  <input
                    type="date"
                    value={editForm.availability_end}
                    onChange={(e) => setEditForm({...editForm, availability_end: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyItemsScreen;
