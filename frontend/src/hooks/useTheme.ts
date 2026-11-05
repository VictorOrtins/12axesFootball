import { useCallback, useLayoutEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = '12axes:theme';
const LEGACY_STORAGE_KEY = '12axes:quiz-theme';
const ATTRIBUTE = 'data-theme';

/** O padrão é o escuro; só a escolha guardada do usuário liga o claro. */
export function resolveTheme(stored: string | null): Theme {
  return stored === 'light' ? 'light' : 'dark';
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * O atributo vai no <html> e não no app-shell porque o painel (?) e o tooltip do glossário
 * renderizam fora dele. O script inline do index.html aplica o mesmo valor antes da primeira pintura.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readStored()));

  useLayoutEffect(() => {
    document.documentElement.setAttribute(ATTRIBUTE, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Navegação privada ou armazenamento bloqueado: a escolha vale só nesta sessão.
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
