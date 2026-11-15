'use strict';

const NodeHelper = require('node_helper');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const SpotifyConnector = require('./core/SpotifyConnector');
const toSongData = require('./core/songData');

// Tokens obtenus en se reconnectant depuis le téléphone, par clientID. Ils priment sur ceux de config.js.
const TOKENS_FILE = path.join(__dirname, 'tokens.json');
const ROUTE = '/MMM-NowPlayingOnSpotify';
// Spotify n'accepte que des redirections HTTPS : cette page renvoie le téléphone vers le miroir (voir docs/callback.html).
// Elle doit être ajoutée aux "Redirect URIs" de chaque app Spotify.
const RELAY_URI = 'https://fabienbounoir.github.io/MMM-NowPlayingOnSpotify/callback.html';
const SCOPE = 'user-read-playback-state user-read-currently-playing';


module.exports = NodeHelper.create({

  // Un connecteur par instance du module : chaque bloc de config peut avoir son propre compte Spotify
  start: function () {
    this.connectors = {};
    this.pendingLogins = {}; // state OAuth -> id de l'instance
    try {
      this.tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
    } catch (e) {
      this.tokens = {};
    }

    // Le QR code mène ici : on redirige vers la page de connexion Spotify
    this.expressApp.get(ROUTE + '/login/:id', (req, res) => {
      const connector = this.connectors[req.params.id];
      if (!connector) return res.status(404).send(page('Compte inconnu, rescanne le QR code affiché sur le miroir.'));

      const nonce = crypto.randomBytes(16).toString('hex');
      this.pendingLogins[nonce] = req.params.id;
      // L'adresse du miroir voyage dans le state pour que la page relais sache où renvoyer le téléphone
      const back = Buffer.from('http://' + req.headers.host + ROUTE + '/callback').toString('base64url');

      res.redirect('https://accounts.spotify.com/authorize?' + new URLSearchParams({
        response_type: 'code',
        client_id: connector.credentials.clientID,
        scope: SCOPE,
        redirect_uri: RELAY_URI,
        state: nonce + '.' + back,
        show_dialog: 'true' // permet de choisir le bon compte si le téléphone est déjà connecté à un autre
      }));
    });

    this.expressApp.get(ROUTE + '/callback', (req, res) => {
      const nonce = String(req.query.state || '').split('.')[0];
      const id = this.pendingLogins[nonce];
      const connector = this.connectors[id];
      if (!connector || !req.query.code) {
        const reason = req.query.error ? 'Spotify a répondu : ' + req.query.error : (id ? 'pas de code reçu' : 'lien inconnu ou déjà utilisé');
        console.warn('[MMM-NowPlayingOnSpotify] reconnexion refusée (' + reason + ') : ' + req.originalUrl.replace(/code=[^&]*/, 'code=…'));
        return res.status(400).send(page('Connexion annulée ou lien expiré (' + reason + '). Rescanne le QR code affiché sur le miroir.'));
      }
      delete this.pendingLogins[nonce];

      connector.authorize(req.query.code, RELAY_URI)
        .then(() => {
          res.send(page('✅ Spotify est reconnecté sur le miroir. Tu peux fermer cette page.'));
          this.retrieveCurrentSong(id);
        })
        .catch((error) => {
          console.error('[MMM-NowPlayingOnSpotify] échec de la reconnexion :', error.message);
          res.status(500).send(page('La connexion a échoué. Rescanne le QR code pour réessayer.'));
        });
    });
  },


  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case 'CONNECT_TO_SPOTIFY': {
        const credentials = { ...payload.credentials, ...this.tokens[payload.credentials.clientID] };
        this.connectors[payload.id] = new SpotifyConnector(credentials, (c) => this.saveTokens(c));
        this.retrieveCurrentSong(payload.id);
        break;
      }

      case 'UPDATE_CURRENT_SONG':
        this.retrieveCurrentSong(payload.id);
        break;
    }
  },


  retrieveCurrentSong: function (id) {
    const connector = this.connectors[id];
    // Compte révoqué : on attend la reconnexion par QR code au lieu de harceler Spotify
    // Une requête à la fois par compte : si Spotify répond lentement, on ne relance pas un 2e renouvellement de token
    if (!connector || connector.needsAuth || connector.busy) return;
    connector.busy = true;

    connector.retrieveCurrentlyPlaying()
      .then((response) => {
        this.sendSocketNotification('RETRIEVED_SONG_DATA', { id, songData: toSongData(response) });
      })
      .catch((error) => {
        if (connector.needsAuth) return this.sendAuthRequired(id);
        console.error('Can’t retrieve current song. Reason: ');
        console.error(error);
      })
      .finally(() => {
        connector.busy = false;
      });
  },


  sendAuthRequired: function (id) {
    const url = 'http://' + lanAddress() + ':' + ((global.config && global.config.port) || 8080) + ROUTE + '/login/' + id;
    console.warn('[MMM-NowPlayingOnSpotify] compte Spotify déconnecté, reconnexion : ' + url);

    QRCode.toString(url, { type: 'svg', margin: 2 }).then((qrCode) => {
      this.sendSocketNotification('RETRIEVED_SONG_DATA', { id, songData: { authRequired: true, qrCode, url } });
    });
  },


  saveTokens: function (credentials) {
    this.tokens[credentials.clientID] = {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken
    };
    fs.writeFile(TOKENS_FILE, JSON.stringify(this.tokens, null, 2), { mode: 0o600 }, (error) => {
      if (error) console.error('[MMM-NowPlayingOnSpotify] tokens non enregistrés : ' + error.message);
    });
  }
});


// Adresse du miroir sur le réseau local, pour le QR code (on ignore Docker et les interfaces virtuelles)
// ponytail: première IPv4 trouvée ; ajouter une option de config si un miroir a plusieurs réseaux
function lanAddress() {
  const address = Object.entries(os.networkInterfaces())
    .filter(([name]) => !/^(docker|br-|veth|virbr|lo)/.test(name))
    .flatMap(([, addresses]) => addresses)
    .find((a) => a.family === 'IPv4' && !a.internal);
  return address ? address.address : os.hostname() + '.local';
}


function page(message) {
  return '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>MagicMirror · Spotify</title>' +
    '<body style="font:18px system-ui;background:#121212;color:#fff;display:grid;place-items:center;min-height:90vh;text-align:center;padding:1em">' +
    '<p>' + message + '</p>';
}
