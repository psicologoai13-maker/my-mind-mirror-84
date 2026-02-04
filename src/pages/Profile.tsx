import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import LegalDisclaimer from '@/components/layout/LegalDisclaimer';
import ProfileCompactHeader from '@/components/profile/ProfileCompactHeader';
import CompactPremiumBanner from '@/components/profile/CompactPremiumBanner';
import SettingsGroupList from '@/components/profile/SettingsGroupList';
import NotificationsSheet from '@/components/profile/NotificationsSheet';
import AppearanceSheet from '@/components/profile/AppearanceSheet';
import ReferralCard from '@/components/profile/ReferralCard';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const Profile: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast.success('Arrivederci!');
    navigate('/auth');
  };

  return (
    <MobileLayout>
      {/* Compact Header */}
      <header className="px-5 pt-5 pb-3">
        <h1 className="font-display text-2xl font-bold text-foreground">Profilo</h1>
        <p className="text-muted-foreground text-sm">Le tue impostazioni</p>
      </header>

      <div className="px-5 space-y-4 pb-8">
        {/* Compact Header with Avatar, Stats, Streak */}
        <ProfileCompactHeader />

        {/* Premium CTA - Only for Free users */}
        <CompactPremiumBanner />

        {/* Settings Groups */}
        <SettingsGroupList 
          onNotificationsClick={() => setNotificationsOpen(true)}
          onAppearanceClick={() => setAppearanceOpen(true)}
          onReferralClick={() => setReferralOpen(true)}
        />

        {/* Logout */}
        <Button 
          variant="outline" 
          className={cn(
            "w-full rounded-2xl",
            "bg-glass backdrop-blur-xl border-glass-border",
            "text-destructive hover:bg-destructive/10 hover:border-destructive/30"
          )}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Esci
        </Button>

        {/* Footer */}
        <LegalDisclaimer variant="compact" />
        <p className="text-center text-xs text-muted-foreground mt-2">
          Aria v1.0.0 • Made with 💚
        </p>
      </div>

      {/* Sheets */}
      <NotificationsSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <AppearanceSheet open={appearanceOpen} onOpenChange={setAppearanceOpen} />
      
      {/* Referral Sheet */}
      <Sheet open={referralOpen} onOpenChange={setReferralOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              🎁 Invita amici
            </SheetTitle>
          </SheetHeader>
          <ReferralCard />
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
};

export default Profile;
