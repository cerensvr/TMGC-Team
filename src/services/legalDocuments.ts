import { API_BASE_URL } from './apiConfig';

export type LegalDocument = 'privacy' | 'terms' | 'dataDeletion';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
const configuredBaseUrl = process.env.EXPO_PUBLIC_LEGAL_BASE_URL?.trim();
const legalBaseUrl = trimTrailingSlash(configuredBaseUrl || `${backendOrigin}/legal`);

export const LEGAL_DOCUMENT_URLS: Record<LegalDocument, string> = {
  privacy: `${legalBaseUrl}/privacy`,
  terms: `${legalBaseUrl}/terms`,
  dataDeletion: `${legalBaseUrl}/data-deletion`,
};
