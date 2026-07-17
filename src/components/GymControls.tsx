import { ExternalLink, LoaderCircle, Music2, Pause, Play, RefreshCw, SkipBack, SkipForward, Timer, Unplug, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { beginSpotifyLogin, completeSpotifyLogin, disconnectSpotify, getSpotifyClientId, hasSpotifyConnection, spotifyRedirectUri, spotifyRequest } from '../spotify';
import { formatTimer } from '../utils';
import { Button, IconButton } from './UI';

type SpotifyPlayback = {
  is_playing: boolean;
  device?: { id: string | null; name: string; type: string; volume_percent: number };
  item?: {
    name: string;
    artists?: Array<{ name: string }>;
    show?: { name: string };
    album?: { images?: Array<{ url: string }> };
    images?: Array<{ url: string }>;
  };
};

type SpotifyDevice = { id: string | null; is_active: boolean; name: string; type: string };

export function GymControls() {
  const { startRest, restEnd, showToast } = useApp();
  const returningFromSpotify = new URLSearchParams(window.location.search).has('code') || new URLSearchParams(window.location.search).has('error');
  const [open, setOpen] = useState(returningFromSpotify);
  const [clientId, setClientId] = useState(getSpotifyClientId);
  const [connected, setConnected] = useState(hasSpotifyConnection);
  const [playback, setPlayback] = useState<SpotifyPlayback | null>(null);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [busy, setBusy] = useState(false);
  const [spotifyError, setSpotifyError] = useState('');

  const loadSpotify = useCallback(async () => {
    if (!hasSpotifyConnection()) return;
    try {
      const [player, deviceResponse] = await Promise.all([
        spotifyRequest<SpotifyPlayback>('/me/player'),
        spotifyRequest<{ devices: SpotifyDevice[] }>('/me/player/devices'),
      ]);
      setPlayback(player); setDevices(deviceResponse?.devices || []); setSpotifyError('');
    } catch (error) { setSpotifyError(error instanceof Error ? error.message : 'Spotify could not be reached.'); }
  }, []);

  useEffect(() => {
    if (!returningFromSpotify) return;
    setBusy(true);
    completeSpotifyLogin().then((success) => {
      if (success) { setConnected(true); showToast('Spotify connected'); return loadSpotify(); }
    }).catch((error) => setSpotifyError(error instanceof Error ? error.message : 'Spotify login failed.')).finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    if (!open || !connected) return;
    loadSpotify();
    const timer = window.setInterval(loadSpotify, 5000);
    return () => window.clearInterval(timer);
  }, [open, connected, loadSpotify]);

  const control = async (path: string, method: 'PUT' | 'POST', body?: object) => {
    setBusy(true);
    try {
      await spotifyRequest(path, { method, body: body ? JSON.stringify(body) : undefined });
      window.setTimeout(loadSpotify, 450); setSpotifyError('');
    } catch (error) { setSpotifyError(error instanceof Error ? error.message : 'Spotify command failed.'); }
    finally { setBusy(false); }
  };

  const connect = async () => {
    setBusy(true); setSpotifyError('');
    try { await beginSpotifyLogin(clientId); }
    catch (error) { setSpotifyError(error instanceof Error ? error.message : 'Spotify login could not start.'); setBusy(false); }
  };

  const disconnect = () => {
    disconnectSpotify(); setConnected(false); setPlayback(null); setDevices([]); setSpotifyError(''); showToast('Spotify disconnected');
  };

  const artwork = playback?.item?.album?.images?.[0]?.url || playback?.item?.images?.[0]?.url;
  const artist = playback?.item?.artists?.map((item) => item.name).join(', ') || playback?.item?.show?.name || 'Spotify';

  return <>
    <IconButton label="Open music and rest timer" className="gym-controls-fab" onClick={() => setOpen(true)}><Music2 size={19} /></IconButton>
    <aside className={`gym-controls ${open ? 'gym-controls--open' : ''}`} role="dialog" aria-label="Music and rest timer" aria-hidden={!open}>
      <div className="gym-controls__header"><div><p className="eyebrow">BETWEEN-SET TOOLS</p><h2>Music & rest</h2></div><IconButton label="Close music and rest controls" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}><X size={20} /></IconButton></div>

      <section className="gym-control-section">
        <div className="gym-control-title"><span><Timer size={18} /></span><div><strong>Rest timer</strong><small>{restEnd ? 'Timer running' : 'Choose a duration'}</small></div></div>
        <div className="rest-presets rest-presets--compact">{[30, 60, 90, 120, 180].map((seconds) => <button tabIndex={open ? 0 : -1} key={seconds} onClick={() => { startRest(seconds); setOpen(false); }}>{formatTimer(seconds)}</button>)}</div>
      </section>

      <section className="gym-control-section spotify-section">
        <div className="gym-control-title"><span className="spotify-icon"><Music2 size={18} /></span><div><strong>Spotify Connect</strong><small>{connected ? playback?.device?.name || 'Connected' : 'Control your Spotify app'}</small></div></div>
        {!connected ? <div className="spotify-connect-setup">
          <p>Connect your personal Spotify Developer app once. FORM uses secure PKCE login and never asks for a client secret.</p>
          <ol><li>Create an app in the Spotify Developer Dashboard.</li><li>Add this exact Redirect URI:</li></ol>
          <button className="redirect-copy" tabIndex={open ? 0 : -1} onClick={() => { navigator.clipboard.writeText(spotifyRedirectUri()); showToast('Redirect URI copied'); }}><code>{spotifyRedirectUri()}</code><span>Copy</span></button>
          <label className="field"><span>Spotify Client ID</span><input tabIndex={open ? 0 : -1} autoCapitalize="none" autoCorrect="off" maxLength={32} placeholder="Paste the 32-character Client ID" value={clientId} onChange={(event) => { setClientId(event.target.value.trim()); setSpotifyError(''); }} /></label>
          <div className="spotify-setup-actions"><a tabIndex={open ? 0 : -1} href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Developer Dashboard <ExternalLink size={15} /></a><Button tabIndex={open ? 0 : -1} onClick={connect} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Music2 size={17} />} Connect Spotify</Button></div>
        </div> : <>
          {playback?.item ? <div className="now-playing">{artwork ? <img src={artwork} alt="" /> : <span><Music2 size={24} /></span>}<div><small>NOW PLAYING</small><strong>{playback.item.name}</strong><p>{artist}</p></div></div> : <div className="spotify-empty"><Music2 size={22} /><div><strong>No active playback</strong><small>Open Spotify on your phone and play any song once, then refresh.</small></div></div>}
          <div className="spotify-native-controls"><IconButton tabIndex={open ? 0 : -1} label="Previous track" disabled={busy} onClick={() => control('/me/player/previous', 'POST')}><SkipBack size={20} /></IconButton><button className="spotify-play" tabIndex={open ? 0 : -1} disabled={busy} aria-label={playback?.is_playing ? 'Pause Spotify' : 'Play Spotify'} onClick={() => control(playback?.is_playing ? '/me/player/pause' : '/me/player/play', 'PUT')}>{busy ? <LoaderCircle className="spin" size={23} /> : playback?.is_playing ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}</button><IconButton tabIndex={open ? 0 : -1} label="Next track" disabled={busy} onClick={() => control('/me/player/next', 'POST')}><SkipForward size={20} /></IconButton><IconButton tabIndex={open ? 0 : -1} label="Refresh Spotify" disabled={busy} onClick={loadSpotify}><RefreshCw size={18} /></IconButton></div>
          {!!devices.length && <label className="spotify-device"><span>PLAY ON</span><select tabIndex={open ? 0 : -1} value={playback?.device?.id || devices.find((device) => device.is_active)?.id || ''} onChange={(event) => control('/me/player', 'PUT', { device_ids: [event.target.value], play: true })}>{devices.map((device) => <option key={device.id || device.name} value={device.id || ''}>{device.name} · {device.type}</option>)}</select></label>}
          <div className="spotify-connected-actions"><a tabIndex={open ? 0 : -1} href="https://open.spotify.com" target="_blank" rel="noreferrer">Open Spotify <ExternalLink size={15} /></a><button tabIndex={open ? 0 : -1} onClick={disconnect}><Unplug size={15} /> Disconnect</button></div>
        </>}
        {spotifyError && <p className="field-error" role="alert">{spotifyError}</p>}
        <p className="spotify-offline-note">Spotify controls require Premium, an active Spotify device, and internet. FORM's workout and timer still work offline.</p>
      </section>
    </aside>
  </>;
}
