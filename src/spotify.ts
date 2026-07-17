const clientIdKey = 'form-spotify-client-id';
const tokenKey = 'form-spotify-token';
const verifierKey = 'form-spotify-verifier';
const stateKey = 'form-spotify-auth-state';

type SpotifyToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

const readJson = <T>(key: string): T | null => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch { return null; }
};

const randomValue = (length = 64) => {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[byte % 66]).join('');
};

const base64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const challengeFor = async (verifier: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
};

const saveToken = (response: TokenResponse, previousRefreshToken = '') => {
  const token: SpotifyToken = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token || previousRefreshToken,
    expiresAt: Date.now() + response.expires_in * 1000,
  };
  localStorage.setItem(tokenKey, JSON.stringify(token));
  return token;
};

export const spotifyRedirectUri = () => `${window.location.origin}${window.location.pathname}`;

export const getSpotifyClientId = () => localStorage.getItem(clientIdKey) || '';

export const hasSpotifyConnection = () => !!readJson<SpotifyToken>(tokenKey)?.refreshToken;

export const beginSpotifyLogin = async (clientId: string) => {
  const cleanClientId = clientId.trim();
  if (!/^[A-Fa-f0-9]{32}$/.test(cleanClientId)) throw new Error('Spotify Client ID should be 32 letters and numbers.');
  const verifier = randomValue();
  const authState = randomValue(24);
  const challenge = await challengeFor(verifier);
  localStorage.setItem(clientIdKey, cleanClientId);
  localStorage.setItem(verifierKey, verifier);
  localStorage.setItem(stateKey, authState);
  const url = new URL('https://accounts.spotify.com/authorize');
  url.search = new URLSearchParams({
    client_id: cleanClientId,
    response_type: 'code',
    redirect_uri: spotifyRedirectUri(),
    scope: 'user-read-playback-state user-read-currently-playing user-modify-playback-state',
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state: authState,
  }).toString();
  window.location.assign(url.toString());
};

export const completeSpotifyLogin = async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');
  if (!code && !error) return false;
  const cleanUrl = `${window.location.pathname}${window.location.hash}`;
  try {
    if (error) throw new Error(error === 'access_denied' ? 'Spotify connection was cancelled.' : `Spotify login failed: ${error}`);
    const expectedState = localStorage.getItem(stateKey);
    if (!expectedState || params.get('state') !== expectedState) throw new Error('Spotify security check failed. Please connect again.');
    const clientId = getSpotifyClientId();
    const verifier = localStorage.getItem(verifierKey) || '';
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, grant_type: 'authorization_code', code: code || '', redirect_uri: spotifyRedirectUri(), code_verifier: verifier }),
    });
    if (!response.ok) throw new Error('Spotify could not finish connecting. Check the Client ID and Redirect URI.');
    saveToken(await response.json() as TokenResponse);
    return true;
  } finally {
    localStorage.removeItem(verifierKey); localStorage.removeItem(stateKey);
    window.history.replaceState({}, document.title, cleanUrl);
  }
};

const refreshSpotifyToken = async (token: SpotifyToken) => {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: getSpotifyClientId(), grant_type: 'refresh_token', refresh_token: token.refreshToken }),
  });
  if (!response.ok) throw new Error('Spotify connection expired. Please reconnect.');
  return saveToken(await response.json() as TokenResponse, token.refreshToken);
};

const accessToken = async () => {
  const token = readJson<SpotifyToken>(tokenKey);
  if (!token) throw new Error('Connect Spotify first.');
  return token.expiresAt > Date.now() + 60_000 ? token.accessToken : (await refreshSpotifyToken(token)).accessToken;
};

export const spotifyRequest = async <T>(path: string, init: RequestInit = {}): Promise<T | null> => {
  const token = await accessToken();
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  if (response.status === 204) return null;
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(detail?.error?.message || `Spotify request failed (${response.status}).`);
  }
  return await response.json() as T;
};

export const disconnectSpotify = () => {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(verifierKey);
  localStorage.removeItem(stateKey);
};
