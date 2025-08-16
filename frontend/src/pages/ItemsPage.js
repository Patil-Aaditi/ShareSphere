import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Package, Plus, Edit, Trash2, Eye, Calendar, DollarSign } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

const ItemsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyItems();
    }
  }, [user]);

  const fetchMyItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/items/my/listings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        throw new Error('Failed to fetch items');
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to load your items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setItems(items.filter(item => item.id !== itemId));
        toast({
          title: "Item deleted",
          description: "Your item has been deleted successfully.",
        });
      } else {
        throw new Error('Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCategoryLabel = (category) => {
    const categories = {
      tools: 'Tools',
      electronics: 'Electronics',
      outdoor_gear: 'Outdoor Gear',
      books: 'Books',
      appliances: 'Appliances',
      sports: 'Sports',
      other: 'Other'
    };
    return categories[category] || category;
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

  const getStatusColor = (isAvailable) => {
    return isAvailable 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
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
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Items</h1>
          <p className="text-muted-foreground">
            Manage your shared items and track their availability
          </p>
        </div>
        <Button asChild className="mt-4 md:mt-0">
          <a href="/items/add">
            <Plus className="h-4 w-4 mr-2" />
            Add New Item
          </a>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center p-6">
            <Package className="h-8 w-8 text-primary mr-4" />
            <div>
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-4 dark:bg-green-900">
              <div className="h-4 w-4 bg-green-600 rounded-full dark:bg-green-400"></div>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {items.filter(item => item.is_available).length}
              </p>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center mr-4 dark:bg-red-900">
              <div className="h-4 w-4 bg-red-600 rounded-full dark:bg-red-400"></div>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {items.filter(item => !item.is_available).length}
              </p>
              <p className="text-sm text-muted-foreground">In Use</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-primary mr-4" />
            <div>
              <p className="text-2xl font-bold">
                ₹{items.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No items yet</h3>
          <p className="text-muted-foreground mb-4">
            Start sharing by adding your first item to the community
          </p>
          <Button asChild>
            <a href="/items/add">Add Your First Item</a>
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Items ({items.length})</TabsTrigger>
            <TabsTrigger value="available">
              Available ({items.filter(item => item.is_available).length})
            </TabsTrigger>
            <TabsTrigger value="inuse">
              In Use ({items.filter(item => !item.is_available).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  onDelete={handleDeleteItem}
                  formatDate={formatDate}
                  getCategoryLabel={getCategoryLabel}
                  getConditionColor={getConditionColor}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="available">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.filter(item => item.is_available).map((item) => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  onDelete={handleDeleteItem}
                  formatDate={formatDate}
                  getCategoryLabel={getCategoryLabel}
                  getConditionColor={getConditionColor}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="inuse">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.filter(item => !item.is_available).map((item) => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  onDelete={handleDeleteItem}
                  formatDate={formatDate}
                  getCategoryLabel={getCategoryLabel}
                  getConditionColor={getConditionColor}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

const ItemCard = ({ item, onDelete, formatDate, getCategoryLabel, getConditionColor, getStatusColor }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{item.name}</span>
          <Badge variant="outline">{item.token_cost} tokens</Badge>
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{getCategoryLabel(item.category)}</Badge>
          <Badge className={getConditionColor(item.condition)}>
            {item.condition}
          </Badge>
          <Badge className={getStatusColor(item.is_available)}>
            {item.is_available ? 'Available' : 'In Use'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {item.description}
        </p>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-semibold">₹{item.value.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Available until:</span>
            <span>{formatDate(item.available_until)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span>{formatDate(item.created_at)}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex space-x-2">
        <Button asChild size="sm" className="flex-1">
          <a href={`/items/${item.id}`}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </a>
        </Button>
        <Button size="sm" variant="outline" disabled>
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ItemsPage;