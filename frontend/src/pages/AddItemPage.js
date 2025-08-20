import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Package, Upload, Calendar, DollarSign, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';

const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

const AddItemPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    condition: '',
    value: '',
    token_cost: '',
    available_from: '',
    available_until: ''
  });
  const [errors, setErrors] = useState({});

  // Fix for static asset loading on nested routes
  useEffect(() => {
    const setCorrectBase = () => {
      let baseElement = document.querySelector('base');
      if (!baseElement) {
        baseElement = document.createElement('base');
        document.head.insertBefore(baseElement, document.head.firstChild);
      }
      baseElement.href = '/';
    };
  
    setCorrectBase();
  
    // Cleanup on unmount
    return () => {
      const baseElement = document.querySelector('base');
      if (baseElement) {
        baseElement.remove();
      }
    };
  }, []);
  const categories = [
    { value: 'tools', label: 'Tools' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'outdoor_gear', label: 'Outdoor Gear' },
    { value: 'books', label: 'Books' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'sports', label: 'Sports' },
    { value: 'other', label: 'Other' }
  ];

  const conditions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      toast({
        title: "Too many images",
        description: "You can upload maximum 5 images per item",
        variant: "destructive",
      });
      return;
    }
    setImages(prev => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.condition) {
      newErrors.condition = 'Condition is required';
    }

    if (!formData.value) {
      newErrors.value = 'Item value is required';
    } else if (isNaN(formData.value) || parseFloat(formData.value) <= 0) {
      newErrors.value = 'Please enter a valid value';
    } else if (parseFloat(formData.value) > 100000) {
      newErrors.value = 'Item value cannot exceed ₹1,00,000';
    }

    if (!formData.token_cost) {
      newErrors.token_cost = 'Token cost is required';
    } else if (isNaN(formData.token_cost) || parseInt(formData.token_cost) <= 0) {
      newErrors.token_cost = 'Please enter a valid token cost';
    }

    if (!formData.available_from) {
      newErrors.available_from = 'Available from date is required';
    }

    if (!formData.available_until) {
      newErrors.available_until = 'Available until date is required';
    } else if (formData.available_from && new Date(formData.available_until) <= new Date(formData.available_from)) {
      newErrors.available_until = 'Available until must be after available from date';
    }

    if (images.length === 0) {
      newErrors.images = 'At least one image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      // Add images
      images.forEach(image => {
        formDataToSend.append('images', image);
      });

      const response = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        const newItem = await response.json();
        toast({
          title: "Item added successfully",
          description: "Your item is now available for sharing",
        });
        navigate(`/items/${newItem.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add item');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Failed to add item",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-suggest token cost based on value
  const suggestTokenCost = (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    
    if (numValue < 1000) return '2';
    if (numValue < 5000) return '5';
    if (numValue < 10000) return '8';
    if (numValue < 25000) return '12';
    if (numValue < 50000) return '15';
    return '20';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Add New Item</h1>
          <p className="text-muted-foreground">
            Share your item with the community and earn tokens
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Power Drill, Camping Tent, Stand Mixer"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your item, its features, and any special instructions"
                    className={`min-h-[100px] ${errors.description ? 'border-destructive' : ''}`}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <select 
                      value={formData.category} 
                      onChange={(e) => handleSelectChange('category', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md bg-background text-foreground ${errors.category ? 'border-destructive' : 'border-border'}`}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="text-sm text-destructive">{errors.category}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition *</Label>
                    <select 
                      value={formData.condition} 
                      onChange={(e) => handleSelectChange('condition', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md bg-background text-foreground ${errors.condition ? 'border-destructive' : 'border-border'}`}
                    >
                      <option value="">Select condition</option>
                      {conditions.map((condition) => (
                        <option key={condition.value} value={condition.value}>
                          {condition.label}
                        </option>
                      ))}
                    </select>
                    {errors.condition && (
                      <p className="text-sm text-destructive">{errors.condition}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing & Value</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Item Value (₹) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="value"
                        name="value"
                        type="number"
                        value={formData.value}
                        onChange={(e) => {
                          handleInputChange(e);
                          if (e.target.value && !formData.token_cost) {
                            setFormData(prev => ({
                              ...prev,
                              token_cost: suggestTokenCost(e.target.value)
                            }));
                          }
                        }}
                        placeholder="0"
                        className={`pl-10 ${errors.value ? 'border-destructive' : ''}`}
                        max="100000"
                      />
                    </div>
                    {errors.value && (
                      <p className="text-sm text-destructive">{errors.value}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Maximum value: ₹1,00,000
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="token_cost">Token Cost *</Label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="token_cost"
                        name="token_cost"
                        type="number"
                        value={formData.token_cost}
                        onChange={handleInputChange}
                        placeholder="0"
                        className={`pl-10 ${errors.token_cost ? 'border-destructive' : ''}`}
                        min="1"
                      />
                    </div>
                    {errors.token_cost && (
                      <p className="text-sm text-destructive">{errors.token_cost}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Tokens required to borrow this item
                    </p>
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Availability</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="available_from">Available From *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="available_from"
                        name="available_from"
                        type="datetime-local"
                        value={formData.available_from}
                        onChange={handleInputChange}
                        className={`pl-10 ${errors.available_from ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.available_from && (
                      <p className="text-sm text-destructive">{errors.available_from}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="available_until">Available Until *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="available_until"
                        name="available_until"
                        type="datetime-local"
                        value={formData.available_until}
                        onChange={handleInputChange}
                        className={`pl-10 ${errors.available_until ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.available_until && (
                      <p className="text-sm text-destructive">{errors.available_until}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Images (Required) *</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="images">Upload Images *</Label>
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center ${errors.images ? 'border-destructive' : 'border-border'}`}>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      At least 1 image required, maximum 5 images, up to 10MB each
                    </p>
                    <Input
                      id="images"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('images').click()}
                    >
                      Choose Files
                    </Button>
                  </div>
                  {errors.images && (
                    <p className="text-sm text-destructive">{errors.images}</p>
                  )}
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => removeImage(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex space-x-4 pt-6">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Adding Item...' : 'Add Item'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/items')}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddItemPage;