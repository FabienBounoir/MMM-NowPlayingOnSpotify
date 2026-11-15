'use strict';

// Transforme la réponse de GET /me/player en données d'affichage.
// Renvoie { noSong: true } quand il n'y a rien à montrer (rien ne joue, ou une pub).
module.exports = function toSongData(info) {
  const item = info && info.item;
  if (!item) return { noSong: true }; // pub, ou lecture sans morceau

  // Morceau : album + artistes. Épisode de podcast : l'émission joue les deux rôles.
  const album = item.album || item.show || {};
  const artists = item.artists ? item.artists.map((artist) => artist.name).join(', ') : album.publisher || album.name;
  const images = album.images || item.images || [];

  return {
    // Spotify trie les images de la plus grande à la plus petite : on prend la taille moyenne si elle existe
    imgURL: (images.find((image) => image.width >= 240 && image.width <= 350) || images[0] || {}).url || '',
    songTitle: item.name,
    artist: artists || '',
    album: album.name || '',
    titleLength: item.duration_ms,
    progress: info.progress_ms,
    isPlaying: info.is_playing === true,
    deviceName: info.device ? info.device.name : ''
  };
};
