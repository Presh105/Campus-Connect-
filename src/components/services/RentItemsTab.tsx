import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Plus, AlertTriangle, Phone, Calendar, Clock, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';

export function RentItemsTab() {
  const { user, profile } = useAuth();
  const { isAdmin } = useAdmin();
  const [showWarning, setShowWarning] = useState(false);

  // For now, show verification required message for non-verified users
  const isVerified = isAdmin; // Admin verified members - placeholder logic

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          Only admin-verified members can post and rent items. Only 100L, 200L, and 300L members can rent.
        </AlertDescription>
      </Alert>

      {!isVerified && (
        <Card className="p-6 text-center">
          <Key className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-2 text-foreground">Verification Required</h3>
          <p className="text-muted-foreground text-sm mb-4">
            You need to be verified by an admin to rent or post items. Please contact the admin through the Contacts section.
          </p>
          <Button variant="outline" className="rounded-full" onClick={() => toast.info('Go to Contacts section to reach admin')}>
            <Phone className="w-4 h-4 mr-2" /> Contact Admin
          </Button>
        </Card>
      )}

      {isVerified && (
        <>
          <Card className="p-4 bg-warning/5 border-warning/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-foreground">Warning Before Posting</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Items can be misplaced, lost, or not returned. This is not in our control. We will try to minimize risk. Proceed only if you accept.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold text-foreground mb-3">Posting Requirements</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Clock className="w-4 h-4" /> Amount per hour</li>
              <li className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Maximum rental days</li>
              <li className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Return date</li>
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold text-foreground mb-3">Rental Rules</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Only 100L, 200L, 300L members can rent</li>
              <li>• All verified members can post items</li>
              <li>• Renting members must be verified</li>
              <li>• Renting members must provide lodge details</li>
              <li>• User must specify number of days, return date</li>
              <li>• User must acknowledge consequences of late return</li>
            </ul>
          </Card>

          <Card className="p-8 text-center">
            <Key className="w-12 h-12 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-2 text-foreground">Rent Items</h3>
            <p className="text-muted-foreground text-sm">
              Rent items from verified members — projectors, speakers, tools, and more.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
