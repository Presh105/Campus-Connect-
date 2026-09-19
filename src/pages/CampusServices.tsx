import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bus, Home, Heart, ChevronLeft, ChevronRight, CreditCard, Video } from 'lucide-react';
import { TransportTab } from '@/components/services/TransportTab';
import { FoodPantriesTab } from '@/components/services/FoodPantriesTab';
import { LodgesTab } from '@/components/services/LodgesTab';
import { WatchEarnTab } from '@/components/services/WatchEarnTab';
import Contact from '@/pages/Contact';

const SERVICES = [
  { value: 'transport', label: 'Transport', description: 'Request rides & manage transport', icon: Bus },
  { value: 'watch', label: 'Watch & Earn Session', description: 'Watch short videos · earn points', icon: Video },
  { value: 'food', label: 'Community Support', description: 'Essential items & local care', icon: Heart },
  { value: 'lodges', label: 'Lodges', description: 'Find accommodation nearby', icon: Home },
  { value: 'contact', label: 'Contact & Payment', description: 'Official accounts & support', icon: CreditCard },
];

function ContactTab() {
  return <Contact embedded />;
}

const SERVICE_COMPONENTS: Record<string, React.FC> = {
  transport: TransportTab,
  watch: WatchEarnTab,
  food: FoodPantriesTab,
  lodges: LodgesTab,
  contact: ContactTab,
};

export default function CampusServices() {
  const [activeService, setActiveService] = useState<string | null>(null);

  if (activeService) {
    const service = SERVICES.find(s => s.value === activeService);
    const ServiceComponent = SERVICE_COMPONENTS[activeService];

    return (
      <AppLayout>
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => setActiveService(null)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-bold text-lg truncate text-foreground">{service?.label}</h1>
            <p className="text-xs text-muted-foreground truncate">{service?.description}</p>
          </div>
        </div>
        <div className="px-4 py-2 flex-1 overflow-y-auto">
          <ServiceComponent />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Local Services" subtitle="Everything you need, nearby" />
      <div className="px-4 py-4 space-y-3">
        {SERVICES.map(({ value, label, description, icon: Icon }) => (
          <Card
            key={value}
            className="p-4 cursor-pointer hover:shadow-elevated transition-all active:scale-[0.98]"
            onClick={() => setActiveService(value)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-foreground">{label}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
