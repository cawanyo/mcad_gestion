// Indigo as the single accent (matches the web app's sobered palette —
// see src/components/dashboard/MemberDashboard.tsx and
// src/components/unavailability/UnavailabilitiesView.tsx on the web side),
// slate as neutral. success/warning/danger stay as real semantic status
// colors (mirrors web's Badge component variants) — those aren't the
// "too colorful" problem the web sobering passes were fixing, decorative
// hue variety per-screen was.
export const theme = {
  colors: {
    primary: '#4f46e5',
    primaryDark: '#4338ca',
    primaryLight: '#eef2ff',
    accent: '#4f46e5',
    background: '#f8f9fe',
    card: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    border: '#f1f5f9',
    borderDark: '#e2e8f0',

    // Status badges
    statusSuccessBg: '#dcfce7',
    statusSuccessText: '#16a34a',
    statusWarningBg: '#fef3c7',
    statusWarningText: '#d97706',
    statusDangerBg: '#ffe4e6',
    statusDangerText: '#e11d48',

    // Event tags
    tagCulteBg: 'rgba(255, 255, 255, 0.25)',
    tagCulteText: '#ffffff',
    tagReunionBg: 'rgba(255, 255, 255, 0.25)',
    tagReunionText: '#ffffff',

    // Pole theme colors
    poles: {
      louange: { bg: '#ede9fe', color: '#7c3aed', icon: '🎵' },
      intercession: { bg: '#ffedd5', color: '#ea580c', icon: '🙏' },
      accueil: { bg: '#dcfce7', color: '#16a34a', icon: '🤝' },
      technique: { bg: '#fee2e2', color: '#dc2626', icon: '🎛️' },
      enseignement: { bg: '#e0f2fe', color: '#0284c7', icon: '📖' },
      default: { bg: '#eef2ff', color: '#4f46e5', icon: '✨' }
    }
  },
  shadow: {
    card: {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2
    },
    hero: {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8
    }
  },
  borderRadius: {
    sm: 8,
    md: 14,
    lg: 18,
    xl: 24,
    round: 9999
  }
};

export const getPoleTheme = (name?: string) => {
  if (!name) return theme.colors.poles.default;
  const n = name.toLowerCase();
  if (n.includes('louange') || n.includes('musique') || n.includes('chant')) return theme.colors.poles.louange;
  if (n.includes('intercession') || n.includes('priere') || n.includes('prière')) return theme.colors.poles.intercession;
  if (n.includes('accueil') || n.includes('protocole') || n.includes('ordre')) return theme.colors.poles.accueil;
  if (n.includes('technique') || n.includes('son') || n.includes('media') || n.includes('médias')) return theme.colors.poles.technique;
  if (n.includes('enseignement') || n.includes('formation') || n.includes('école')) return theme.colors.poles.enseignement;
  return theme.colors.poles.default;
};
