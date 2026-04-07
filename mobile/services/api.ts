import Constants from 'expo-constants';
import { Platform } from 'react-native';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function isLocalAddress(url: string): boolean {
  return /localhost|127\.0\.0\.1/.test(url);
}

function extractHost(candidate: string): string | null {
  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes('://')) {
    try {
      return new URL(trimmed).hostname || null;
    } catch {
      // Fall back to plain parsing below.
    }
  }

  const host = trimmed.split(':')[0];
  return host || null;
}

function getExpoHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants as any).manifest?.hostUri,
    (Constants as any).manifest?.debuggerHost,
    (Constants as any).manifest2?.extra?.expoClient?.hostUri,
    (Constants as any).expoGoConfig?.debuggerHost,
    (Constants as any).linkingUri,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) {
      continue;
    }

    const host = extractHost(candidate);
    if (host) {
      return host;
    }
  }

  return null;
}

export function resolveApiUrl(): string {
  const expoHost = getExpoHost();
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    (typeof Constants.expoConfig?.extra?.apiUrl === 'string'
      ? Constants.expoConfig.extra.apiUrl
      : '');

  if (configuredUrl) {
    const normalized = stripTrailingSlash(configuredUrl);

    if (!isLocalAddress(normalized)) {
      return normalized;
    }

    if (expoHost) {
      return normalized.replace(/localhost|127\.0\.0\.1/, expoHost);
    }
  }

  if (expoHost) {
    return `http://${expoHost}:5000/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return 'http://localhost:5000/api';
}

export const API_URL = resolveApiUrl();