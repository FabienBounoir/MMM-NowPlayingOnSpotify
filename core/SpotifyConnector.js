'use strict';

const request = require('request-promise-native');
const moment = require('moment');

const tokenRefreshEndpoint = 'https://accounts.spotify.com/api/token';
// additional_types=episode : sans ça, Spotify renvoie un morceau vide pendant un podcast
const apiEndpoint = 'https://api.spotify.com/v1/me/player?additional_types=episode';


module.exports = class SpotifyConnector {

  // onTokens(credentials) est appelé à chaque nouveau token, pour les garder sur disque
  constructor(credentials, onTokens = () => {}) {
    this.credentials = credentials;
    this.onTokens = onTokens;
    this.tokenExpiresAt = moment();
    this.needsAuth = false; // true quand Spotify a révoqué le refresh token : il faut se reconnecter
  }

  saveTokens(response) {
    this.credentials.accessToken = response.access_token;
    // Spotify peut renvoyer un nouveau refresh token : l'ancien finit alors par être révoqué
    if (response.refresh_token) this.credentials.refreshToken = response.refresh_token;
    this.tokenExpiresAt = moment().add(response.expires_in, 'seconds');
    this.needsAuth = false;
    this.onTokens(this.credentials);
  }

  // Échange le code reçu après la connexion sur le téléphone contre des tokens
  authorize(code, redirectUri) {
    return request.post({
      url: tokenRefreshEndpoint,
      headers: { 'Authorization': this.basicAuth() },
      form: { grant_type: 'authorization_code', code: code, redirect_uri: redirectUri },
      json: true
    }).then((response) => this.saveTokens(response));
  }

  basicAuth() {
    return 'Basic ' + Buffer.from(this.credentials.clientID + ':' + this.credentials.clientSecret).toString('base64');
  }

  retrieveCurrentlyPlaying() {
    if (moment().isBefore(this.tokenExpiresAt)) {
      return this.getSpotifyData();

    } else {
      return this.refreshAccessToken()
        .then((response) => {
          console.log('Refreshed access token because it has expired. Expired at: %s now is: %s',
            this.tokenExpiresAt.format('HH:mm:ss'), moment().format('HH:mm:ss'));

          this.saveTokens(response);
          return this.getSpotifyData();
        })
        .catch((err) => {
          if (err.error && err.error.error === 'invalid_grant') {
            this.needsAuth = true;
            throw err;
          }
          console.error('Error while refreshing:');
          console.error(err);
        });
    }
  }

  getSpotifyData() {
    let options = {
      url: apiEndpoint,
      headers: {'Authorization': 'Bearer ' + this.credentials.accessToken},
      json: true
    };

    return request.get(options);
  }

  // File d'attente : sert à afficher « À suivre »
  getQueue() {
    return request.get({
      url: 'https://api.spotify.com/v1/me/player/queue',
      headers: { 'Authorization': 'Bearer ' + this.credentials.accessToken },
      json: true
    });
  }

  refreshAccessToken() {
    let options = {
      url: tokenRefreshEndpoint,
      headers: { 'Authorization': this.basicAuth() },
      form: {
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refreshToken
      },
      json: true
    };

    return request.post(options);
  }
};
