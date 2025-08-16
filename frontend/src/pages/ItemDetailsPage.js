import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../components/ui/carousel';
import { Package, Calendar, DollarSign, Coins, Star, MapPin, Phone, Mail, MessageCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

const ItemDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [item, setItem] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    fetchItemDetails();
  }, [id]);

  const fetchItemDetails = async () => {
    try {
      const response = await fetch(`${API_BASE}/items/${id}`);
      if (response.ok) {
        const itemData = await response.json();
        setItem(itemData);
        
        // Fetch owner details
        const ownerResponse = await fetch(`${API_BASE}/users/${itemData.owner_id}`);
        if (ownerResponse.ok) {
          const ownerData = await ownerResponse.json();
          setOwner(ownerData);
        }
      } else {
        throw new Error('Item not found');
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      toast({
        title: "Error",
        description: "Failed to load item details",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  const handleBorrowRequest = () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to log in to borrow items",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    if (user.tokens < item.token_cost) {
      toast({
        title: "Insufficient tokens",
        description: `You need ${item.token_cost} tokens to borrow this item`,
        variant: "destructive",
      });
      return;
    }

    // Navigate to borrow request form (will be implemented)
    navigate(`/items/${id}/request`);
  };

  const handleContactOwner = () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to log in to contact the owner",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }
    
    // Navigate to messages (will be implemented)
    navigate(`/messages?user=${item.owner_id}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg animate-pulse"></div>
              <div className="grid grid-cols-4 gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="aspect-square bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded animate-pulse"></div>
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-20 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item || !owner) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Item not found</h2>
        <p className="text-muted-foreground mb-4">The item you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  const isOwner = user?.id === item.owner_id;
  const canBorrow = user && !isOwner && item.is_available && user.tokens >= item.token_cost;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Images */}
          <div className="space-y-4">
            {item.images && item.images.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {item.images.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-square">
                        <img
                          src={`${process.env.REACT_APP_BACKEND_URL}${image}`}
                          alt={`${item.name} - Image ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {item.images.length > 1 && (
                  <>
                    <CarouselPrevious />
                    <CarouselNext />
                  </>
                )}
              </Carousel>
            ) : (
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No images available</p>
                </div>
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-foreground mb-2">{item.name}</h1>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">{getCategoryLabel(item.category)}</Badge>
                    <Badge className={getConditionColor(item.condition)}>
                      {item.condition}
                    </Badge>
                    <Badge variant={item.is_available ? "default" : "destructive"}>
                      {item.is_available ? 'Available' : 'Not Available'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{item.token_cost} tokens</div>
                  <div className="text-sm text-muted-foreground">to borrow</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Value:</span>
                  <span className="font-semibold">₹{item.value.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Until:</span>
                  <span className="font-semibold">{formatDate(item.available_until)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {canBorrow && (
                <Button 
                  onClick={handleBorrowRequest} 
                  disabled={requestLoading}
                  className="w-full"
                  size="lg"
                >
                  <Coins className="h-4 w-4 mr-2" />
                  {requestLoading ? 'Sending Request...' : `Borrow for ${item.token_cost} tokens`}
                </Button>
              )}
              
              {!user && (
                <Button onClick={() => navigate('/login')} className="w-full" size="lg">
                  Login to Borrow
                </Button>
              )}

              {user && !isOwner && (
                <Button 
                  variant="outline" 
                  onClick={handleContactOwner}
                  className="w-full"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Owner
                </Button>
              )}

              {user && user.tokens < item.token_cost && !isOwner && (
                <div className="bg-destructive/10 p-3 rounded-lg">
                  <p className="text-sm text-destructive text-center">
                    You need {item.token_cost - user.tokens} more tokens to borrow this item
                  </p>
                </div>
              )}

              {isOwner && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    This is your item
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Owner Information */}
        <Card>
          <CardHeader>
            <CardTitle>Item Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={owner.profile_image} />
                <AvatarFallback className="text-lg">
                  {owner.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{owner.name}</h3>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{owner.stars}</span>
                    <span className="text-sm text-muted-foreground">stars</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{owner.tokens}</span>
                    <span className="text-sm text-muted-foreground">tokens</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {owner.successful_transactions} successful transactions
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Member since {formatDate(owner.created_at)}
                </div>
              </div>

              {!isOwner && user && (
                <Button variant="outline" onClick={handleContactOwner}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available from:</span>
                  <span>{formatDate(item.available_from)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available until:</span>
                  <span>{formatDate(item.available_until)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={item.is_available ? "default" : "destructive"}>
                    {item.is_available ? 'Available' : 'Currently borrowed'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Item Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span>{getCategoryLabel(item.category)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Condition:</span>
                  <Badge className={getConditionColor(item.condition)}>
                    {item.condition}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value:</span>
                  <span>₹{item.value.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Listed on:</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailsPage;