'use client';

import { CalendarView } from '@/components/calendar/CalendarView';
import { useAppShell } from '@/contexts/AppShellContext';

export default function CalendarPage() {
  const {
    currentUser,
    poles,
    selectedEventForCalendar,
    isLeaderOrAdmin,
    openEventModal,
    openAssignmentsDrawer,
    openUnavailabilityModal
  } = useAppShell();

  if (!currentUser) return null;

  return (
    <CalendarView
      poles={poles}
      currentUser={currentUser}
      initialSelectedEvent={selectedEventForCalendar}
      onOpenCreateEventModal={openEventModal}
      onOpenAssignmentsDrawer={(ev) => {
        if (isLeaderOrAdmin) {
          openAssignmentsDrawer(ev);
        }
      }}
      onOpenUnavailabilities={openUnavailabilityModal}
    />
  );
}
