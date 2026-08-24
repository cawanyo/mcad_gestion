/**
 * Central tab-id -> URL mapping. The view components (MemberDashboard,
 * DesktopDashboard, ServiceHubView, LifeHubView, LeaderHubView, ...) call
 * their onNavigate/onNavigateTab callback with the same tab-id strings they
 * always have — only the callback implementation changed (router.push
 * instead of a local setState). Keeping the id vocabulary unchanged means
 * none of those view components needed to be touched for the routing
 * migration.
 */
export const TAB_PATHS: Record<string, string> = {
  dashboard: '/dashboard',
  home: '/dashboard',
  calendar: '/calendar',
  events: '/calendar',
  training: '/training',
  service_hub: '/service',
  poles: '/poles',
  checklists: '/checklists',
  unavailability: '/unavailabilities',
  unavailabilities: '/unavailabilities',
  life_hub: '/life',
  birthdays: '/birthdays',
  stats: '/stats',
  statistics: '/stats',
  leader_hub: '/leader',
  leader_dashboard: '/leader-dashboard',
  admin_dashboard: '/leader-dashboard',
  members: '/members',
  requests: '/requests',
  settings: '/settings'
};

export function tabToPath(tabId: string): string {
  return TAB_PATHS[tabId] || '/dashboard';
}

const SERVICE_GROUP_PATHS = ['/service', '/poles', '/checklists', '/unavailabilities'];
const LIFE_GROUP_PATHS = ['/life', '/birthdays', '/stats'];
const LEADER_GROUP_PATHS = ['/leader', '/leader-dashboard', '/members', '/requests'];

/** Which top-level hub a given path belongs to — used by the mobile bottom
 * tab bar to keep e.g. "Service" highlighted while on /poles or /checklists. */
export function getBottomTabForPath(pathname: string): string {
  if (SERVICE_GROUP_PATHS.includes(pathname)) return 'service_hub';
  if (LIFE_GROUP_PATHS.includes(pathname)) return 'life_hub';
  if (LEADER_GROUP_PATHS.includes(pathname)) return 'leader_hub';
  if (pathname === '/calendar') return 'calendar';
  if (pathname === '/training') return 'training';
  return 'dashboard';
}
