import { t } from '../i18n';
import type { Theme } from '../hooks/useTheme';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

// Mostra o ícone do tema para o qual o clique leva: lua no claro, sol no escuro.
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={isDark ? t.themeToLightAria : t.themeToDarkAria}
      title={isDark ? t.themeToLightAria : t.themeToDarkAria}
    >
      {isDark ? (
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8 3a.75.75 0 0 1-.75-.75V.75a.75.75 0 0 1 1.5 0v1.5A.75.75 0 0 1 8 3m0 7.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5M8 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8m-.75 3.25a.75.75 0 0 0 1.5 0v-1.5a.75.75 0 0 0-1.5 0zM13 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 13 8M.75 7.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5zm10.786-2.786a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0m-9.193 8.132a.75.75 0 0 0 1.06 1.06l1.062-1.06a.75.75 0 0 0-1.061-1.06zm9.193-1.06a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06M3.404 2.343a.75.75 0 0 0-1.06 1.06l1.06 1.061a.75.75 0 1 0 1.06-1.06z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 3h.393a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 2.992z"
          />
        </svg>
      )}
    </button>
  );
}
