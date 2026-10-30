'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarView } from '@/components/calendar/CalendarView';
import { useAppShell } from '@/contexts/AppShellContext';

function CalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const eventIdParam = searchParams.get('eventId') || searchParams.get('id');

  const {
    currentUser,
    poles,
    selectedEventForCalendar,
    isLeaderOrAdmin,
    openAssignmentsDrawer,
    openUnavailabilityModal
  } = useAppShell();

  if (!currentUser) return null;

  return (
    <CalendarView
      poles={poles}
      currentUser={currentUser}
      initialDate={dateParam}
      initialEventId={eventIdParam}
      initialSelectedEvent={selectedEventForCalendar}
      onOpenCreateEventModal={(dateStr) => {
        router.push(dateStr ? `/calendar/new?date=${dateStr}` : '/calendar/new');
      }}
      onOpenAssignmentsDrawer={(ev) => {
        if (isLeaderOrAdmin) {
          openAssignmentsDrawer(ev);
        }
      }}
      onOpenUnavailabilities={openUnavailabilityModal}
    />
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-zinc-400">
          Chargement du calendrier...
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
