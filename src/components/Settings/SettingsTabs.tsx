import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountInfoSection } from './AccountInfoSection';
import { ChangePasswordSection } from './ChangePasswordSection';
import { DangerZoneSection } from './DangerZoneSection';
import type { ProfileDTO } from '../../types';

interface SettingsTabsProps {
  profile: ProfileDTO;
}

/**
 * SettingsTabs - Tabbed interface for organizing settings sections
 * Contains Account and Security tabs with their respective content
 */
export function SettingsTabs({ profile }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="account" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="space-y-6">
        <AccountInfoSection profile={profile} />
      </TabsContent>

      <TabsContent value="security" className="space-y-6">
        <ChangePasswordSection />
        <DangerZoneSection />
      </TabsContent>
    </Tabs>
  );
}