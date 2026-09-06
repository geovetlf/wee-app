import { env, NotConfiguredError } from '../http';

/**
 * BytePlus ModelArk: la puerta de ByteDance para Seedance (video) y Seedream (imagen).
 * Clave ARK_API_KEY; región por ARK_BASE_URL (por defecto ap-southeast).
 */
export const ARK_KEY = 'ARK_API_KEY';

export const arkBase = (): string => env('ARK_BASE_URL') || 'https://ark.ap-southeast.bytepluses.com/api/v3';

export const arkHeaders = (provider: string): Record<string, string> => {
  const apiKey = env(ARK_KEY);
  if (!apiKey) throw new NotConfiguredError(provider, ARK_KEY);
  return { Authorization: `Bearer ${apiKey}` };
};

export const isArkConfigured = (): boolean => !!env(ARK_KEY);
