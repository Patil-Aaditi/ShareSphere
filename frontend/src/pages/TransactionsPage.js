import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Package, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

const TransactionsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        throw new Error('Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      requested: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      returned: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      disputed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    };
    return colors[status] || colors.requested;
  };

  const getStatusIcon = (status) => {
    const icons = {
      requested: Clock,
      approved: CheckCircle,
      active: RefreshCw,
      returned: Package,
      completed: CheckCircle,
      rejected: XCircle,
      disputed: RefreshCw
    };
    const Icon = icons[status] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const borrowedTransactions = transactions.filter(t => t.borrower_id === user?.id);
  const lentTransactions = transactions.filter(t => t.lender_id === user?.id);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Transactions</h1>
        <p className="text-muted-foreground">
          Track your borrowing and lending activities
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
          <TabsTrigger value="borrowed">Borrowed ({borrowedTransactions.length})</TabsTrigger>
          <TabsTrigger value="lent">Lent ({lentTransactions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <TransactionList transactions={transactions} currentUserId={user?.id} />
        </TabsContent>

        <TabsContent value="borrowed">
          <TransactionList transactions={borrowedTransactions} currentUserId={user?.id} />
        </TabsContent>

        <TabsContent value="lent">
          <TransactionList transactions={lentTransactions} currentUserId={user?.id} />
        </TabsContent>
      </Tabs>

      {transactions.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No transactions yet</h3>
          <p className="text-muted-foreground mb-4">
            Start borrowing or lending items to see your transaction history
          </p>
          <Button asChild>
            <a href="/">Browse Items</a>
          </Button>
        </div>
      )}
    </div>
  );
};

const TransactionList = ({ transactions, currentUserId }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    const colors = {
      requested: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      returned: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      disputed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    };
    return colors[status] || colors.requested;
  };

  const getStatusIcon = (status) => {
    const icons = {
      requested: Clock,
      approved: CheckCircle,
      active: RefreshCw,
      returned: Package,
      completed: CheckCircle,
      rejected: XCircle,
      disputed: RefreshCw
    };
    const Icon = icons[status] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No transactions in this category</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => {
        const isBorrower = transaction.borrower_id === currentUserId;
        const otherParty = isBorrower ? transaction.lender_name : transaction.borrower_name;
        const role = isBorrower ? 'Borrowing' : 'Lending';

        return (
          <Card key={transaction.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{transaction.item_name}</CardTitle>
                <Badge className={getStatusColor(transaction.status)}>
                  <span className="flex items-center space-x-1">
                    {getStatusIcon(transaction.status)}
                    <span className="capitalize">{transaction.status}</span>
                  </span>
                </Badge>
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>{role} from/to {otherParty}</span>
                <span>•</span>
                <span>{transaction.token_cost} tokens</span>
                <span>•</span>
                <span>{formatDate(transaction.created_at)}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Requested Period:</span>
                  <div>{formatDate(transaction.requested_from)} - {formatDate(transaction.requested_until)}</div>
                </div>
                {transaction.approved_at && (
                  <div>
                    <span className="text-muted-foreground">Approved:</span>
                    <div>{formatDate(transaction.approved_at)}</div>
                  </div>
                )}
                {transaction.completed_at && (
                  <div>
                    <span className="text-muted-foreground">Completed:</span>
                    <div>{formatDate(transaction.completed_at)}</div>
                  </div>
                )}
              </div>
              
              {transaction.lender_notes && (
                <div className="mt-4 p-3 bg-muted/50 rounded">
                  <span className="text-sm font-medium">Notes:</span>
                  <p className="text-sm text-muted-foreground">{transaction.lender_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TransactionsPage;