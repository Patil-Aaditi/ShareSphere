import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { MessageCircle, Users } from 'lucide-react';

const MessagesPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with other community members
          </p>
        </div>

        {/* Coming Soon */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Messages Coming Soon</h3>
            <p className="text-muted-foreground text-center mb-6">
              We're working on the messaging system to help you communicate with other members.
              In the meantime, you can use the contact information provided in item details.
            </p>
            <Button asChild>
              <a href="/">Browse Items</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MessagesPage;