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
