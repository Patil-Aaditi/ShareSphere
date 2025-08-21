import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Package, Calendar, Coins, ArrowLeft } from 'lucide-react';

const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

const BorrowRequestPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [returnDate, setReturnDate] = useState('');
    const [totalCost, setTotalCost] = useState(0);
    const [error, setError] = useState('');

    // Fetch item details on component mount
    useEffect(() => {
        const fetchItem = async () => {
            try {
                const response = await fetch(`${API_BASE}/items/${id}`);
                if (!response.ok) throw new Error('Item not found');
                const data = await response.json();
                setItem(data);
                setTotalCost(data.token_cost); // Default cost for 1 day
            } catch (err) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
                navigate('/');
            } finally {
                setLoading(false);
            }
        };
        fetchItem();
    }, [id, navigate, toast]);

    // Recalculate total token cost when the return date changes
    useEffect(() => {
        if (item && returnDate) {
            const startDate = new Date();
            const endDate = new Date(returnDate);
            
            if (endDate <= startDate) {
                setError('Return date must be in the future.');
                setTotalCost(item.token_cost);
                return;
            }

            const diffTime = Math.abs(endDate - startDate);
            // Calculate days, rounding up to the nearest whole day
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const numDays = Math.max(1, diffDays); // Ensure it's at least 1 day
            
            // Calculate cost based on the formula: daily_cost + (days - 1) * daily_cost
            const calculatedCost = item.token_cost + (numDays - 1) * item.token_cost;
            setTotalCost(calculatedCost);
            setError('');
        }
    }, [returnDate, item]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!returnDate || error) {
            setError('Please select a valid return date.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const body = {
                item_id: item.id,
                // Using the current user's profile for contact details
                pickup_contact: { name: user.name, phone: user.phone, email: user.email, address: user.address },
                return_contact: { name: user.name, phone: user.phone, email: user.email, address: user.address },
                requested_from: new Date().toISOString(),
                requested_until: new Date(returnDate).toISOString(),
            };

            const response = await fetch(`${API_BASE}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to send borrow request.');
            }

            toast({ title: "Request Sent!", description: "The owner has been notified of your borrow request." });
            navigate('/transactions');

        } catch (err) {
            toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="container mx-auto px-4 py-8 text-center">Loading item details...</div>;
    }

    if (!item) {
        return <div className="container mx-auto px-4 py-8 text-center">Item not found.</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Item
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-4">
                        <Package className="h-10 w-10 text-primary" />
                        <div>
                            <CardTitle className="text-2xl">Borrow Request</CardTitle>
                            <p className="text-muted-foreground">You are requesting to borrow: <strong>{item.name}</strong></p>
                        </div>
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="returnDate">When will you return it?</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="returnDate"
                                    type="datetime-local"
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                    className="pl-10"
                                    min={new Date().toISOString().slice(0, 16)}
                                />
                            </div>
                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>

                        <Card className="bg-muted/50">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-center">
                                    <p className="text-lg font-semibold">Total Token Cost:</p>
                                    <div className="flex items-center space-x-2 text-2xl font-bold text-primary">
                                        <Coins className="h-6 w-6" />
                                        <span>{totalCost}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    The cost is calculated based on a daily rate of {item.token_cost} tokens. The final amount will be deducted from your account upon the owner's approval.
                                </p>
                            </CardContent>
                        </Card>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isSubmitting || !!error}>
                            {isSubmitting ? 'Sending Request...' : 'Confirm and Send Request'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default BorrowRequestPage;