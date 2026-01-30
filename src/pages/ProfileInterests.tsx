import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import InterestsSection from '@/components/profile/InterestsSection';

const ProfileInterests: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MobileLayout hideNav>
      <header className="sticky top-0 z-10 px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-bold text-foreground">I Miei Interessi</h1>
        </div>
      </header>

      <div className="px-6 py-4 pb-32">
        <InterestsSection />
      </div>
    </MobileLayout>
  );
};

export default ProfileInterests;
