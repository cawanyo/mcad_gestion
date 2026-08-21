// API Client for React Native MCAD Mobile Application
import { Platform } from 'react-native';

// On Android emulator, 10.0.2.2 points to localhost. On iOS simulator or web, localhost works.
export let API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export const setApiBaseUrl = (url: string) => {
  API_BASE_URL = url;
};

// Memory session storage for React Native
let sessionCookie = '';

export const setSessionCookie = (cookie: string) => {
  sessionCookie = cookie;
};

const request = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  // 5s timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Extract set-cookie if provided
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie;
    }

    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Le serveur met trop de temps à répondre.');
    }
    throw err;
  }
};

export const api = {
  auth: {
    login: async (phone: string, password: string) => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Identifiants invalides');
      }
      const data = await res.json();
      return data.user || data;
    },
    register: async (data: {
      phone: string;
      password: string;
      firstName: string;
      lastName: string;
      gender?: 'HOMME' | 'FEMME';
      sex?: 'HOMME' | 'FEMME';
      birthDate?: string;
    }) => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          gender: data.gender || data.sex || 'HOMME'
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de l'inscription");
      }
      const resData = await res.json();
      return resData.user || resData;
    },
    getCurrentUser: async () => {
      try {
        const res = await request('/api/auth/current');
        if (!res.ok) return null;
        const data = await res.json();
        return data.user || data;
      } catch {
        return null;
      }
    },
    logout: async () => {
      await request('/api/auth/logout', { method: 'POST' }).catch(() => {});
      sessionCookie = '';
    }
  },

  dashboard: {
    get: async () => {
      const res = await request('/api/dashboard');
      if (!res.ok) throw new Error('Impossible de charger le tableau de bord');
      return res.json();
    }
  },

  events: {
    getAll: async () => {
      const res = await request('/api/events');
      if (!res.ok) return [];
      return res.json();
    },
    selfAssign: async (eventId: string, poleId: string, userId: string) => {
      const res = await request('/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          poleId,
          userId,
          assignedById: userId,
          roleTag: 'Volontaire'
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors du positionnement');
      }
      return res.json();
    }
  },

  training: {
    getModules: async () => {
      const res = await request('/api/training/modules');
      if (!res.ok) return [];
      return res.json();
    },
    getModuleById: async (id: string) => {
      const res = await request(`/api/training/modules/${id}`);
      if (!res.ok) throw new Error('Impossible de charger le module');
      return res.json();
    },
    updateProgress: async (
      moduleId: string,
      data: { action: string; lessonId?: string; completed?: boolean }
    ) => {
      const res = await request(`/api/training/progress?moduleId=${moduleId}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur progression');
      }
      return res.json();
    }
  },

  checklists: {
    getAll: async () => {
      const res = await request('/api/checklists');
      if (!res.ok) return [];
      return res.json();
    },
    getById: async (id: string) => {
      const res = await request(`/api/checklists/${id}`);
      if (!res.ok) throw new Error('Checklist introuvable');
      return res.json();
    },
    validateService: async (data: {
      checklistId: string;
      comment?: string;
      rating?: number;
    }) => {
      const res = await request('/api/service-validations', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur de validation');
      }
      return res.json();
    }
  },

  unavailabilities: {
    getAll: async () => {
      const res = await request('/api/unavailabilities');
      if (!res.ok) return [];
      return res.json();
    },
    create: async (data: {
      startDate: string;
      endDate: string;
      reason?: string;
    }) => {
      const res = await request('/api/unavailabilities', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      return res.json();
    }
  },

  birthdays: {
    getWeekly: async () => {
      const res = await request('/api/birthdays?filter=week');
      if (!res.ok) return [];
      const data = await res.json();
      return data.birthdaysThisWeek || data;
    }
  },

  poles: {
    getAll: async () => {
      const res = await request('/api/poles');
      if (!res.ok) return [];
      return res.json();
    },
    requestMembership: async (poleId: string) => {
      const res = await request('/api/membership-requests', {
        method: 'POST',
        body: JSON.stringify({ poleId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur demande');
      }
      return res.json();
    }
  },

  notifications: {
    getAll: async () => {
      const res = await request('/api/notifications');
      if (!res.ok) return [];
      const data = await res.json();
      return data.notifications || data;
    },
    markAllRead: async () => {
      await request('/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'MARK_ALL_READ' })
      });
    }
  }
};
