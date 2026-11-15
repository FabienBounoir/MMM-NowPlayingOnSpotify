'use strict';

Module.register('MMM-NowPlayingOnSpotify', {

  // default values
  defaults: {
    // Module misc
    name: 'MMM-NowPlayingOnSpotify',
    hidden: false,

    // user definable
    updatesEvery: 1,                  // How often should the table be updated in s? (while music is playing)
    idleUpdatesEvery: 30,             // Same, while nothing is playing or the music is paused
    showCoverArt: true,               // Do you want the cover art to be displayed?
    showLogoWhenNothingIsPlaying: true, // Do you want the Spotify logo to be shown when nothing is playing?
    hideWhenNothingIsPlaying: false,  // Fade the whole module out while nothing is playing
    showNextTrack: false,             // Show the next track of the queue under the progress bar
    contrast: 1,                      // Brightness of secondary texts and halo: 1.5 = brighter, 0.7 = softer
    accountName: '',                  // Shown next to the reconnect QR code, e.g. 'Fabien'
    marginTop: 0,                     // Top margin in pixels
    marginLeft: 0,                    // Left margin in pixels
    marginRight: 0,                   // Right margin in pixels
    marginBottom: 0                   // Bottom margin in pixels
  },


  start: function () {
    Log.info('Starting module: ' + this.name );

    this.initialized = false;
    this.context = {};
    this.receivedAt = Date.now();

    this.startFetchingLoop();

    // Le temps écoulé avance chaque seconde, comme la barre, entre deux appels à Spotify
    setInterval(() => {
      if (!this.context.isPlaying) return;
      const time = document.querySelector('#' + this.identifier + ' .NPOS_time');
      if (time) time.textContent = NPOS_DomBuilder.prototype.getTimeInfo({ progress: this.currentProgress(), titleLength: this.context.titleLength });
    }, 1000);
  },

  // Position estimée dans le morceau : dernière valeur de Spotify + temps écoulé depuis
  currentProgress() {
    const elapsed = this.context.isPlaying ? Date.now() - this.receivedAt : 0;
    return Math.min(this.context.titleLength || 0, (this.context.progress || 0) + elapsed);
  },

  getDom: function () {
    let domBuilder = new NPOS_DomBuilder(this.config, this.file(''));

    if (this.initialized) {
      const dom = domBuilder.getDom(this.context);
      // Animation d'entrée seulement au changement de morceau, pas à chaque rafraîchissement
      if (this.entering) dom.classList.add('NPOS_enter');
      this.entering = false;
      return dom;
    } else {
      return domBuilder.getInitDom(this.translate('LOADING'));
    }
  },

  getStyles: function () {
    return [
      this.file('css/styles.css'),
      this.file('node_modules/moment-duration-format/lib/moment-duration-format.js'),
      'font-awesome.css'
    ];
  },

  getScripts: function () {
    return [
      this.file('core/NPOS_DomBuilder.js'),
      'moment.js'
    ];
  },

  socketNotificationReceived: function (notification, payload) {
    if (payload.id !== this.identifier) return;

    switch (notification) {
      case 'RETRIEVED_SONG_DATA':
        this.initialized = true;
        this.showSongData(payload.songData);
    }
  },

  // Changement de morceau : l'ancien sort (pochette qui pivote, textes qui s'effacent), puis le nouveau entre
  showSongData(songData) {
    const key = songData.noSong || songData.authRequired ? '' : songData.songTitle + '|' + songData.artist;
    const changed = key !== this.trackKey;
    this.trackKey = key;

    const render = () => {
      this.context = songData;
      this.receivedAt = Date.now();
      this.entering = changed && key !== '';
      this.updateDom();
      this.toggleVisibility();
    };

    const current = document.querySelector('#' + this.identifier + ' .NPOS_halo');
    if (changed && current && !this.leaving) {
      this.leaving = true;
      current.classList.add('NPOS_leave');
      setTimeout(() => {
        this.leaving = false;
        render();
      }, 450);
    } else if (!this.leaving) {
      render();
    }
  },

  nextDelay() {
    if (!this.context.isPlaying) return Math.max(this.config.idleUpdatesEvery, this.config.updatesEvery) * 1000;
    const remaining = this.context.titleLength - this.currentProgress();
    return Math.max(500, Math.min(this.config.updatesEvery * 1000, remaining + 800));
  },

  // hideWhenNothingIsPlaying : fondu de sortie quand rien ne joue (le QR code de reconnexion reste toujours visible)
  toggleVisibility() {
    if (!this.config.hideWhenNothingIsPlaying) return;
    const lock = { lockString: this.identifier };
    if (this.context.noSong) {
      if (!this.hidden) this.hide(1000, lock);
    } else if (this.hidden) {
      this.show(1000, lock);
    }
  },

  startFetchingLoop() {
    // start immediately ...
    let credentials = {
      clientID: this.config.clientID,
      clientSecret: this.config.clientSecret,
      accessToken: this.config.accessToken,
      refreshToken: this.config.refreshToken
    };

    this.sendSocketNotification('CONNECT_TO_SPOTIFY', {
      id: this.identifier,
      credentials,
      showNextTrack: this.config.showNextTrack
    });

    // ... puis rapide pendant la lecture (un changement de morceau se voit tout de suite), lent sinon,
    // avec un appel calé sur la fin du morceau pour passer au suivant sans attendre
    const tick = () => {
      this.sendSocketNotification('UPDATE_CURRENT_SONG', { id: this.identifier });
      setTimeout(tick, this.nextDelay());
    };
    setTimeout(tick, this.config.updatesEvery * 1000);
  }
});
