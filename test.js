// node test.js : vérifie la conversion des réponses Spotify (core/songData.js)
const assert = require('assert/strict');
const toSongData = require('./core/songData');

const img = (width) => ({ width, url: 'img' + width });

// Rien ne joue (réponse vide) ou pub (pas de morceau)
assert.deepEqual(toSongData(''), { noSong: true });
assert.deepEqual(toSongData({ currently_playing_type: 'ad', item: null, is_playing: true }), { noSong: true });

// Morceau : is_playing lu correctement (B1), pochette moyenne choisie
const track = toSongData({
  is_playing: true, progress_ms: 1000, device: { name: 'HomePod' },
  item: { name: 'Titre', duration_ms: 3000, artists: [{ name: 'A' }, { name: 'B' }], album: { name: 'Album', images: [img(640), img(300), img(64)] } }
});
assert.equal(track.isPlaying, true);
assert.equal(track.artist, 'A, B');
assert.equal(track.imgURL, 'img300');
assert.equal(track.deviceName, 'HomePod');
assert.equal(toSongData({ is_playing: false, item: { name: 'x', artists: [], album: {} } }).isPlaying, false);

// Pas de pochette à la bonne taille (B3) : la plus grande, ou rien
assert.equal(toSongData({ item: { name: 'x', artists: [], album: { images: [img(640), img(64)] } } }).imgURL, 'img640');
assert.equal(toSongData({ item: { name: 'x', artists: [], album: { images: [] } } }).imgURL, '');

// Épisode de podcast (B2) : l'émission sert d'album et d'artiste
const episode = toSongData({
  is_playing: true, progress_ms: 0,
  item: { type: 'episode', name: 'Épisode 12', duration_ms: 60000, images: [img(300)], show: { name: 'Mon podcast', publisher: 'Radio' } }
});
assert.equal(episode.songTitle, 'Épisode 12');
assert.equal(episode.artist, 'Radio');
assert.equal(episode.album, 'Mon podcast');
assert.equal(episode.imgURL, 'img300');
assert.equal(episode.deviceName, '');

console.log('MMM-NowPlayingOnSpotify : OK');

// --- Affichage : durée et couleur du halo (core/NPOS_DomBuilder.js) ---
const { NPOS_formatDuration, NPOS_brighten } = require('./core/NPOS_DomBuilder');
assert.equal(NPOS_formatDuration(102000), '1:42');
assert.equal(NPOS_formatDuration(5000), '0:05');
assert.equal(NPOS_formatDuration(3723000), '1:02:03');
assert.equal(NPOS_formatDuration(undefined), '0:00');
assert.equal(NPOS_brighten(10, 20, 0), 'rgb(102,204,0)'); // couleur sombre remontée, teinte gardée
assert.equal(NPOS_brighten(250, 100, 50), 'rgb(250,100,50)'); // déjà lumineuse : inchangée

// --- Connecteur Spotify avec un faux fetch (core/SpotifyConnector.js) ---
const SpotifyConnector = require('./core/SpotifyConnector');
const reply = (status, body) => ({ ok: status < 300, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) });

(async () => {
  // Première installation : pas de refresh token → QR code directement
  assert.equal(new SpotifyConnector({ clientID: 'a', clientSecret: 'b' }).needsAuth, true);

  // Refresh puis lecture ; Spotify renvoie un nouveau refresh token → enregistré
  let saved;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push(url);
    if (url.includes('/api/token')) return reply(200, { access_token: 'NEW', refresh_token: 'R2', expires_in: 3600 });
    assert.equal(options.headers.Authorization, 'Bearer NEW');
    return reply(204);
  };
  const ok = new SpotifyConnector({ clientID: 'a', clientSecret: 'b', refreshToken: 'R1' }, (c) => { saved = { ...c }; });
  assert.equal(await ok.retrieveCurrentlyPlaying(), ''); // 204 : rien ne joue
  assert.equal(saved.refreshToken, 'R2');
  await ok.retrieveCurrentlyPlaying(); // token encore valide : pas de nouveau refresh
  assert.equal(calls.filter((u) => u.includes('/api/token')).length, 1);

  // Token révoqué → needsAuth, et l'erreur remonte
  global.fetch = async () => reply(400, { error: 'invalid_grant', error_description: 'Refresh token revoked' });
  const revoked = new SpotifyConnector({ clientID: 'a', clientSecret: 'b', refreshToken: 'R1' });
  await assert.rejects(revoked.retrieveCurrentlyPlaying(), /Spotify 400/);
  assert.equal(revoked.needsAuth, true);

  // Autre erreur (Spotify indisponible) : pas de reconnexion demandée
  global.fetch = async () => reply(503, 'Service Unavailable');
  const down = new SpotifyConnector({ clientID: 'a', clientSecret: 'b', refreshToken: 'R1' });
  await assert.rejects(down.retrieveCurrentlyPlaying(), /Spotify 503/);
  assert.equal(down.needsAuth, false);

  console.log('MMM-NowPlayingOnSpotify : connecteur et affichage OK');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
