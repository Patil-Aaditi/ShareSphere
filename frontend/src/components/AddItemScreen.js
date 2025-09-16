import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AddItemScreen = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    value: '',
    token_per_day: '',
    availability_start: '',
    availability_end: ''
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [suggestedTokens, setSuggestedTokens] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (formData.value && formData.category) {
      fetchSuggestedTokens();
    }
  }, [formData.value, formData.category]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchSuggestedTokens = async () => {
    try {
      const response = await axios.get(`${API}/suggested-tokens?value=${formData.value}&category=${formData.category}`);
      setSuggestedTokens(response.data.suggested_tokens);
      if (!formData.token_per_day) {
        setFormData(prev => ({ ...prev, token_per_day: response.data.suggested_tokens.toString() }));
      }
    } catch (error) {
      console.error('Failed to fetch suggested tokens:', error);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length < 1 || files.length > 5) {
      setError('Please select 1-5 images');
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setError('Please select only image files (JPEG, PNG, GIF)');
      return;
    }

    setSelectedImages(files);
    setError('');
    
    // Create preview URLs
    const urls = files.map(file => URL.createObjectURL(file));
    setImageUrls(urls);
  };

  const uploadImages = async () => {
    if (selectedImages.length === 0) {
      setError('Please select at least 1 image');
      return false;
    }

    try {
      const formData = new FormData();
      selectedImages.forEach((file) => {
        formData.append('files', file);
      });

      const response = await axios.post(`${API}/upload-images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadedImages(response.data.uploaded_files);
      return response.data.uploaded_files;
    } catch (error) {
      setError('Failed to upload images');
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (parseInt(formData.value) > 100000) {
      setError('Item value cannot exceed ₹1,00,000');
      setLoading(false);
      return;
    }

    if (selectedImages.length < 1 || selectedImages.length > 5) {
      setError('Please select 1-5 images for your item');
      setLoading(false);
      return;
    }

    try {
      // First upload images
      const uploadedImagePaths = await uploadImages();
      if (!uploadedImagePaths) {
        setLoading(false);
        return;
      }

      // Then create item with image paths
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('value', parseInt(formData.value));
      submitData.append('token_per_day', parseInt(formData.token_per_day));
      submitData.append('availability_start', new Date(formData.availability_start).toISOString());
      submitData.append('availability_end', new Date(formData.availability_end).toISOString());
      
      // Add each image path
      uploadedImagePaths.forEach(imagePath => {
        submitData.append('images', imagePath);
      });

      await axios.post(`${API}/items`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSuccess('Item added successfully!');
      setTimeout(() => {
        navigate('/my-items');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, value }));
    
    // Auto-suggest tokens based on value
    if (value && formData.category) {
      const baseTokens = Math.max(1, Math.floor(parseInt(value) / 1000));
      setSuggestedTokens(baseTokens);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <button onClick={() => navigate('/dashboard')} className="text-yellow-600 hover:text-yellow-800 mb-4">
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Add New Item</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Item Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Item Value (₹) *
                </label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={handleValueChange}
                  max="100000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Maximum: ₹1,00,000</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Tokens per Day *
              </label>
              <input
                type="number"
                value={formData.token_per_day}
                onChange={(e) => setFormData({...formData, token_per_day: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              {suggestedTokens > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  Suggested: {suggestedTokens} tokens/day based on value and category
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Item Images (1-5 required) *
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Select 1-5 images (JPEG, PNG, GIF)</p>
              
              {imageUrls.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md border border-gray-200"
                        />
                        <span className="absolute top-1 right-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Available From *
                </label>
                <input
                  type="date"
                  value={formData.availability_start}
                  onChange={(e) => setFormData({...formData, availability_start: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Available Until *
                </label>
                <input
                  type="date"
                  value={formData.availability_end}
                  onChange={(e) => setFormData({...formData, availability_end: e.target.value})}
                  min={formData.availability_start || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Adding Item...' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddItemScreen;