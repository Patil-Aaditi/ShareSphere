import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Context for user authentication
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const BACKEND_URL = "https://sharesphere-in.onrender.com";
const API = `${BACKEND_URL}/api`;

// Configure axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token and get user info
      fetchUserProfile();
    } else {
      setLoading(false); // No token, stop loading
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    
      // Clear invalid token and stop loading
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const login = async (credentials) => {
    try {
      const response = await axios.post(`${API}/auth/login`, credentials);
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { access_token, user: newUser } = response.data;
      
      setToken(access_token);
      setUser(newUser);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setLoading(false);
  };
   // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-500"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, updateUser, fetchUserProfile, login, register, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Home Page Component
const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-800 mb-6">ShareSphere</h1>
          <p className="text-xl text-gray-600 mb-8">
            Community Resource Sharing Made Easy, Fair, and Trustworthy
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/login')}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Guidelines Section */}
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Token System */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-3xl font-semibold text-gray-800 mb-6">Token System</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-yellow-600 mb-3">How Tokens Work</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Everyone starts with 100 tokens</li>
                  <li>• Earn tokens by lending your items</li>
                  <li>• Spend tokens to borrow items</li>
                  <li>• Token value suggested based on item value and category</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-yellow-600 mb-3">Token Calculation</h3>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2"><strong>Formula:</strong></p>
                  <p className="text-sm text-gray-700">Total Tokens = 1-day Token Value * Days</p>
                  <p className="text-sm text-gray-700 mt-2"><strong>Example:</strong> 3 tokens/day for 4 days = 12 tokens total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Penalty System */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-3xl font-semibold text-gray-800 mb-6">Penalty System</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-red-600 mb-3">Late Return Penalties</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Penalty = 1-day token value × extra days</li>
                  <li>• Pending penalties tracked until paid</li>
                  <li>• Overdue notifications to both parties</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-red-600 mb-3">Damage Penalties</h3>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="space-y-1 text-sm text-gray-700">
                    <p><strong>Light:</strong> ¼ of token value</p>
                    <p><strong>Medium:</strong> ⅓ of token value</p>
                    <p><strong>High:</strong> ½ of token value</p>
                    <p><strong>Severe:</strong> Full token value</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lending & Borrowing Process */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-3xl font-semibold text-gray-800 mb-6">Lending & Borrowing Process</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-blue-600 mb-3">Step 1: Request</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Browse available items</li>
                  <li>• Select days and dates</li>
                  <li>• Check token calculation</li>
                  <li>• Send request to owner</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-blue-600 mb-3">Step 2: Approval</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Owner reviews requester profile</li>
                  <li>• Approve or reject request</li>
                  <li>• Private chat opens on approval</li>
                  <li>• Coordinate delivery details</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-blue-600 mb-3">Step 3: Exchange</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Both confirm delivery</li>
                  <li>• Tokens transferred</li>
                  <li>• Both confirm return</li>
                  <li>• Leave reviews and feedback</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Insurance & Damage Coverage */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-3xl font-semibold text-gray-800 mb-6">Insurance & Damage Coverage</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-green-600 mb-3">Protection Features</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Owner uploads before/after photos</li>
                  <li>• Automatic damage assessment</li>
                  <li>• Fair compensation system</li>
                  <li>• Dispute resolution via proof images</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-600 mb-3">Community Trust</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Star rating system (1-5 stars)</li>
                  <li>• Success rate percentage</li>
                  <li>• Complaint tracking system</li>
                  <li>• Auto-ban after 20 valid complaints</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Item Value Limits */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-3xl font-semibold text-gray-800 mb-6">Item & Safety Guidelines</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-purple-600 mb-3">Item Requirements</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Maximum item value: ₹1,00,000</li>
                  <li>• 1-5 images required per item</li>
                  <li>• Fixed categories available</li>
                  <li>• Set availability dates</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-purple-600 mb-3">Available Categories</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>• Tools</div>
                  <div>• Electronics</div>
                  <div>• Outdoor</div>
                  <div>• Home & Kitchen</div>
                  <div>• Books & Stationery</div>
                  <div>• Sports & Fitness</div>
                  <div>• Event Gear</div>
                  <div>• Miscellaneous</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Login Component
const LoginScreen = () => {
  const [formData, setFormData] = useState({
    email_or_username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Sign In</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email or Username
            </label>
            <input
              type="text"
              value={formData.email_or_username}
              onChange={(e) => setFormData({...formData, email_or_username: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-yellow-600 hover:text-yellow-800 font-semibold"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Registration Component
const RegistrationScreen = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    location: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await register(formData);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Sign Up</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-yellow-600 hover:text-yellow-800 font-semibold"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const DashboardScreen = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data.slice(0, 5)); // Show only recent 5
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-800">ShareSphere</h1>
            <div className="hidden md:flex space-x-6">
              <button onClick={() => navigate('/browse-items')} className="text-gray-600 hover:text-gray-800">Browse</button>
              <button onClick={() => navigate('/my-items')} className="text-gray-600 hover:text-gray-800">My Items</button>
              <button onClick={() => navigate('/chat-list')} className="text-gray-600 hover:text-gray-800">Messages</button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Tokens: {user?.tokens || 0}</span>
            <button onClick={() => navigate('/profile')} className="text-gray-600 hover:text-gray-800">Profile</button>
            <button onClick={logout} className="text-red-600 hover:text-red-800">Logout</button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome, {user?.username}!</h2>
          <div className="flex space-x-8 text-sm text-gray-600">
            <span>★ {user?.stars?.toFixed(1) || '0.0'}</span>
            <span>Success Rate: {user?.success_rate?.toFixed(1) || '0'}%</span>
            <span>Complaints: {user?.complaints_count || 0}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => navigate('/add-item')}
            className="bg-yellow-500 hover:bg-yellow-600 text-white p-6 rounded-lg font-semibold transition-colors"
          >
            <div className="text-2xl mb-2">+</div>
            Add Item
          </button>
          <button
            onClick={() => navigate('/browse-items')}
            className="bg-gray-800 hover:bg-gray-900 text-white p-6 rounded-lg font-semibold transition-colors"
          >
            <div className="text-2xl mb-2">📋</div>
            Browse Items
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-lg font-semibold transition-colors"
          >
            <div className="text-2xl mb-2">🔔</div>
            Notifications
          </button>
          <button
            onClick={() => navigate('/my-activities')}
            className="bg-green-500 hover:bg-green-600 text-white p-6 rounded-lg font-semibold transition-colors"
          >
            <div className="text-2xl mb-2">📊</div>
            My Activities
          </button>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Notifications</h3>
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="border-l-4 border-yellow-500 pl-4 py-2">
                  <h4 className="font-semibold text-gray-800">{notification.title}</h4>
                  <p className="text-gray-600 text-sm">{notification.message}</p>
                  <span className="text-xs text-gray-400">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No notifications yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Browse Items Screen
const BrowseItemsScreen = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    search: ''
  });

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [filters]);

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.location) params.append('location', filters.location);
      if (filters.search) params.append('search', filters.search);
      
      const response = await axios.get(`${API}/items?${params}`);
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <button onClick={() => navigate('/dashboard')} className="text-yellow-600 hover:text-yellow-800 mb-4">
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Browse Items</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => setFilters({...filters, location: e.target.value})}
                placeholder="Enter location"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                placeholder="Search items"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200 overflow-hidden">
                {item.images && item.images.length > 0 ? (
                  <img
                    src={item.images[0]}
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
                <h3 className="font-semibold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{item.category}</p>
                <p className="text-sm text-gray-500 mb-3">{item.description.substring(0, 100)}...</p>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-bold text-yellow-600">{item.token_per_day} tokens/day</span>
                  <span className="text-sm text-gray-500">₹{item.value.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-md transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No items found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Import additional screens
import AddItemScreen from './components/AddItemScreen';
import ItemDetailScreen from './components/ItemDetailScreen';
import MyActivitiesScreen from './components/MyActivitiesScreen';
import FeedbackScreen from './components/FeedbackScreen';
import ProfileScreen from './components/ProfileScreen';
import MyItemsScreen from './components/MyItemsScreen';
import NotificationsScreen from './components/NotificationsScreen';
import { set } from 'date-fns';

// Basic placeholder components for remaining screens
const ChatListScreen = () => <div className="p-8"><h1 className="text-2xl font-bold">Chat List - Coming Soon</h1></div>;

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/register" element={<RegistrationScreen />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardScreen />
              </ProtectedRoute>
            } />
            <Route path="/browse-items" element={
              <ProtectedRoute>
                <BrowseItemsScreen />
              </ProtectedRoute>
            } />
            <Route path="/add-item" element={
              <ProtectedRoute>
                <AddItemScreen />
              </ProtectedRoute>
            } />
            <Route path="/item/:itemId" element={
              <ProtectedRoute>
                <ItemDetailScreen />
              </ProtectedRoute>
            } />
            <Route path="/my-activities" element={
              <ProtectedRoute>
                <MyActivitiesScreen />
              </ProtectedRoute>
            } />
            <Route path="/my-items" element={
              <ProtectedRoute>
                <MyItemsScreen />
              </ProtectedRoute>
            } />
            <Route path="/feedback/:transactionId" element={
              <ProtectedRoute>
                <FeedbackScreen />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <NotificationsScreen />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfileScreen />
              </ProtectedRoute>
            } />
            <Route path="/chat-list" element={
              <ProtectedRoute>
                <ChatListScreen />
              </ProtectedRoute>
            } />
            
            {/* Redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
