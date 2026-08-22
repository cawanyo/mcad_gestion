'use client';

import { SettingsView } from '@/components/settings/SettingsView';
import { useAppShell } from '@/contexts/AppShellContext';

export default function SettingsPage() {
  const { currentUser, setCurrentUser, fetchData, handleLogout } = useAppShell();

  if (!currentUser) return null;

  return (
    <SettingsView
      currentUser={currentUser}
      onUserUpdated={(u) => {
        setCurrentUser(u);
        fetchData();
      }}
      onLogout={handleLogout}
    />
  );
}
