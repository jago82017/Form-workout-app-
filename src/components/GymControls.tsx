import { ExternalLink, Music2, Timer, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { formatTimer } from '../utils';
import { Button, IconButton } from './UI';

const spotifyStorageKey = 'form-spotify-url';
const spotifyTypes = new Set(['playlist', 'album', 'track', 'artist', 'episode', 'show']);

const readSpotifyUrl = () => {
  try { return localStorage.getItem(spotifyStorageKey) || ''; }
  catch { return ''; }
};

const spotifyEmbedUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    if (url.hostname !== 'open.spotify.com') return null;
    const [type, id] = url.pathname.split('/').filter(Boolean);
    if (!spotifyTypes.has(type) || !/^[A-Za-z0-9]+$/.test(id || '')) return null;
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=form&theme=0`;
  } catch { return null; }
};

export function GymControls({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { startRest, restEnd } = useApp();
  const [spotifyUrl, setSpotifyUrl] = useState(readSpotifyUrl);
  const [draftUrl, setDraftUrl] = useState(readSpotifyUrl);
  const [editingSpotify, setEditingSpotify] = useState(!readSpotifyUrl());
  const [error, setError] = useState('');
  const embedUrl = useMemo(() => spotifyEmbedUrl(spotifyUrl), [spotifyUrl]);

  const saveSpotify = () => {
    const next = draftUrl.trim();
    if (!spotifyEmbedUrl(next)) {
      setError('Paste a full open.spotify.com playlist, album, artist, show, or track link.');
      return;
    }
    try { localStorage.setItem(spotifyStorageKey, next); } catch { /* The player still works for this visit. */ }
    setSpotifyUrl(next); setEditingSpotify(false); setError('');
  };

  const removeSpotify = () => {
    try { localStorage.removeItem(spotifyStorageKey); } catch { /* Nothing else to clear. */ }
    setSpotifyUrl(''); setDraftUrl(''); setEditingSpotify(true); setError('');
  };

  return <aside className={`gym-controls ${open ? 'gym-controls--open' : ''}`} role="dialog" aria-label="Music and rest timer" aria-hidden={!open}>
    <div className="gym-controls__header">
      <div><p className="eyebrow">BETWEEN-SET TOOLS</p><h2>Music & rest</h2></div>
      <IconButton label="Close music and rest controls" tabIndex={open ? 0 : -1} onClick={onClose}><X size={20} /></IconButton>
    </div>

    <section className="gym-control-section">
      <div className="gym-control-title"><span><Timer size={18} /></span><div><strong>Rest timer</strong><small>{restEnd ? 'Timer running' : 'Choose a duration'}</small></div></div>
      <div className="rest-presets rest-presets--compact">{[30, 60, 90, 120, 180].map((seconds) => <button tabIndex={open ? 0 : -1} key={seconds} onClick={() => { startRest(seconds); onClose(); }}>{formatTimer(seconds)}</button>)}</div>
    </section>

    <section className="gym-control-section spotify-section">
      <div className="gym-control-title"><span className="spotify-icon"><Music2 size={18} /></span><div><strong>Spotify</strong><small>{embedUrl ? 'Your saved player' : 'Add your music'}</small></div></div>
      {embedUrl && !editingSpotify ? <>
        <iframe className="spotify-embed" tabIndex={open ? 0 : -1} title="Spotify player" src={embedUrl} width="100%" height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
        <div className="spotify-actions"><Button variant="secondary" tabIndex={open ? 0 : -1} onClick={() => { setDraftUrl(spotifyUrl); setEditingSpotify(true); }}>Change music</Button><a tabIndex={open ? 0 : -1} href={spotifyUrl} target="_blank" rel="noreferrer">Open Spotify <ExternalLink size={15} /></a><IconButton tabIndex={open ? 0 : -1} label="Remove saved Spotify link" onClick={removeSpotify}><Trash2 size={17} /></IconButton></div>
      </> : <>
        <p className="spotify-help">In Spotify, open a playlist, album, artist, podcast, or song, tap Share, then Copy link and paste it here.</p>
        <label className="field"><span>Spotify link</span><input tabIndex={open ? 0 : -1} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://open.spotify.com/playlist/..." value={draftUrl} onChange={(event) => { setDraftUrl(event.target.value); setError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') saveSpotify(); }} /></label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="spotify-setup-actions"><a tabIndex={open ? 0 : -1} href="https://open.spotify.com" target="_blank" rel="noreferrer">Open Spotify <ExternalLink size={15} /></a>{spotifyUrl && <Button variant="ghost" tabIndex={open ? 0 : -1} onClick={() => { setEditingSpotify(false); setError(''); }}>Cancel</Button>}<Button tabIndex={open ? 0 : -1} onClick={saveSpotify}>Save player</Button></div>
      </>}
      <p className="spotify-offline-note">Spotify needs an internet connection. Your workout and timer still work offline.</p>
    </section>
  </aside>;
}
