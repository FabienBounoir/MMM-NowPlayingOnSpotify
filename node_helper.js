'use strict';

const NodeHelper = require('node_helper');
const SpotifyConnector = require('./core/SpotifyConnector');


module.exports = NodeHelper.create({

  // Un connecteur par instance du module : chaque bloc de config peut avoir son propre compte Spotify
  start: function () {
    this.connectors = {};
  },


  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case 'CONNECT_TO_SPOTIFY':
        this.connectors[payload.id] = new SpotifyConnector(payload.credentials);
        this.retrieveCurrentSong(payload.id);
        break;

      case 'UPDATE_CURRENT_SONG':
        this.retrieveCurrentSong(payload.id);
        break;
    }
  },


  retrieveCurrentSong: function (id) {
    const connector = this.connectors[id];
    if (!connector) return;

    connector.retrieveCurrentlyPlaying()
      .then((response) => {
        this.sendRetrievedNotification(id, response || { noSong: true });
      })
      .catch((error) => {
        console.error('Can’t retrieve current song. Reason: ');
        console.error(error);
      });
  },


  sendRetrievedNotification: function (id, songInfo) {
    let payload = songInfo;

    if (!songInfo.noSong) {
      payload = {
        imgURL: this.getImgURL(songInfo.item.album.images),
        songTitle: songInfo.item.name,
        artist: this.getArtistName(songInfo.item.artists),
        album: songInfo.item.album.name,
        titleLength: songInfo.item.duration_ms,
        progress: songInfo.progress_ms,
        isPlaying: songInfo.isPlaying,
        deviceName: songInfo.device.name
      };
    }

    this.sendSocketNotification('RETRIEVED_SONG_DATA', { id, songData: payload });
  },


  getArtistName: function (artists) {
    return artists.map((artist) => {
      return artist.name;
    }).join(', ');
  },


  getImgURL(images) {
    let filtered = images.filter((image) => {
      return image.width >= 240 && image.width <= 350;
    });

    return filtered[0].url;
  }
});
