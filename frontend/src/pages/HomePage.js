import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Search, Filter, Star, MapPin, Calendar, Package, Users, TrendingUp } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

const HomePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stats, setStats] = useState({
    totalItems: 0,
    activeUsers: 0,
    totalTransactions: 0
  });

  const categories = [
    { value: 'tools', label: 'Tools' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'outdoor_gear', label: 'Outdoor Gear' },
    { value: 'books', label: 'Books' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'sports', label: 'Sports' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchItems();
    if (user) {
      fetchStats();
    }
  }, [user, searchTerm, selectedCategory]);

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      params.append('available_only', 'true');
      params.append('limit', '20');

      const response = await fetch(`${API_BASE}/items?${params}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to load items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Fetch real stats from backend
      const [itemsResponse, usersResponse, transactionsResponse] = await Promise.all([
        fetch(`${API_BASE}/items`, { headers }),
        fetch(`${API_BASE}/stats/users`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/stats/transactions`, { headers }).catch(() => ({ ok: false }))
      ]);
      
      let totalItems = 0;
      let activeUsers = 0;
      let totalTransactions = 0;
      
      if (itemsResponse.ok) {
        const items = await itemsResponse.json();
        totalItems = items.length;
      }
      
      // For now, we'll count based on available data
      // These endpoints would need to be implemented for full functionality
      if (user) {
        const userStatsResponse = await fetch(`${API_BASE}/stats/community`, { headers });
        if (userStatsResponse.ok) {
          const communityStats = await userStatsResponse.json();
          activeUsers = communityStats.activeUsers || 1; // At least the current user
          totalTransactions = communityStats.totalTransactions || 0;
        } else {
          // Fallback to basic counting
          activeUsers = 1; // At least the current user
          totalTransactions = user.successful_transactions || 0;
        }
      }
      
      setStats({
        totalItems,
        activeUsers,
        totalTransactions
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set minimal real stats on error
      setStats({
        totalItems: items.length,
        activeUsers: user ? 1 : 0,
        totalTransactions: user ? user.successful_transactions : 0
      });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchItems();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCategoryLabel = (category) => {
    return categories.find(cat => cat.value === category)?.label || category;
  };

  const getConditionColor = (condition) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      good: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      poor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return colors[condition] || colors.good;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <Package className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Share. Borrow. Connect.
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Join ShareSphere, the community-driven platform where neighbors share equipment, 
              earn tokens, and build trust through every successful transaction.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="/register">Get Started Free</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/login">Sign In</a>
              </Button>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Community Driven</h3>
              <p className="text-muted-foreground">
                Connect with neighbors and build trust through successful transactions and ratings.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Token Rewards</h3>
              <p className="text-muted-foreground">
                Earn tokens and stars for successful lending and borrowing. Build your reputation.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Sharing</h3>
              <p className="text-muted-foreground">
                List your items, manage requests, and coordinate pickup/return with built-in messaging.
              </p>
            </div>
          </div>

          {/* Sample Items Preview */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Start Sharing?</h2>
            <p className="text-muted-foreground mb-8">Join the community and discover amazing items shared by your neighbors</p>
          </div>

          <div className="text-center">
            <Button size="lg" asChild>
              <a href="/register">Join ShareSphere Today</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back, {user.name}!
            </h1>
            <p className="text-muted-foreground">
              Discover amazing items shared by your community
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{user.tokens}</div>
              <div className="text-sm text-muted-foreground">Tokens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{user.stars}</div>
              <div className="text-sm text-muted-foreground">Stars</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{user.successful_transactions}</div>
              <div className="text-sm text-muted-foreground">Transactions</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="flex items-center p-6">
              <Package className="h-8 w-8 text-primary mr-4" />
              <div>
                <p className="text-2xl font-bold">{stats.totalItems}</p>
                <p className="text-sm text-muted-foreground">Available Items</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <Users className="h-8 w-8 text-primary mr-4" />
              <div>
                <p className="text-2xl font-bold">{stats.activeUsers}</p>
                <p className="text-sm text-muted-foreground">Active Members</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <TrendingUp className="h-8 w-8 text-primary mr-4" />
              <div>
                <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                <p className="text-sm text-muted-foreground">Successful Shares</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full md:w-48 px-3 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        {(searchTerm || selectedCategory) && (
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="h-8 bg-muted rounded w-full"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No items found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategory ? 'Try adjusting your search criteria' : 'Be the first to share an item!'}
          </p>
          <Button asChild>
            <a href="/items/add">Add Your First Item</a>
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{item.name}</span>
                  <Badge variant="outline">{item.token_cost} tokens</Badge>
                </CardTitle>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{item.owner_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{item.owner_name}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary">{getCategoryLabel(item.category)}</Badge>
                  <Badge className={getConditionColor(item.condition)}>
                    {item.condition}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Until {formatDate(item.available_until)}</span>
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    ₹{item.value.toLocaleString()}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <a href={`/items/${item.id}`}>View Details</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;