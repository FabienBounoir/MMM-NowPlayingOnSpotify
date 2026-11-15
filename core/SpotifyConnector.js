'use strict';

const tokenEndpoint = 'https://accounts.spotify.com/api/token';
// additional_types=episode : sans ça, Spotify renvoie un morceau vide pendant un podcast
const playerEndpoint = 'https://api.spotify.com/v1/me/player?additional_types=episode';
const queueEndpoint = 'https://api.spotify.com/v1/me/player/queue';


module.exports = class SpotifyConnector {

  // onTokens(credentials) est appelé à chaque nouveau token, pour les garder sur disque
  constructor(credentials, onTokens = () => {}) {
    this.credentials = credentials;
    this.onTokens = onTokens;
    this.tokenExpiresAt = 0;
    // Pas encore de refresh token (première installation) ou révoqué par Spotify : il faut se connecter par QR code
    this.needsAuth = !credentials.refreshToken;
  }

  saveTokens(response) {
    this.credentials.accessToken = response.access_token;
    // Spotify peut renvoyer un nouveau refresh token : l'ancien finit alors par être révoqué
    if (response.refresh_token) this.credentials.refreshToken = response.refresh_token;
    this.tokenExpiresAt = Date.now() + response.expires_in * 1000;
    this.needsAuth = false;
    this.onTokens(this.credentials);
  }

  // Échange le code reçu après la connexion sur le téléphone contre des tokens
  authorize(code, redirectUri) {
    return this.requestToken({ grant_type: 'authorization_code', code: code, redirect_uri: redirectUri })
      .then((response) => this.saveTokens(response));
  }

  retrieveCurrentlyPlaying() {
    if (Date.now() < this.tokenExpiresAt) {
      return this.getSpotifyData(playerEndpoint);
    }

    return this.requestToken({ grant_type: 'refresh_token', refresh_token: this.credentials.refreshToken })
      .then((response) => {
        console.log('[MMM-NowPlayingOnSpotify] access token renouvelé');
        this.saveTokens(response);
        return this.getSpotifyData(playerEndpoint);
      })
      .catch((error) => {
        if (error.body && error.body.error === 'invalid_grant') this.needsAuth = true;
        throw error;
      });
  }

  // File d'attente : sert à afficher « À suivre »
  getQueue() {
    return this.getSpotifyData(queueEndpoint);
  }

  getSpotifyData(url) {
    return send(url, { headers: { 'Authorization': 'Bearer ' + this.credentials.accessToken } });
  }

  requestToken(form) {
    const basic = Buffer.from(this.credentials.clientID + ':' + this.credentials.clientSecret).toString('base64');
    return send(tokenEndpoint, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + basic },
      body: new URLSearchParams(form)
    });
  }
};


// fetch de Node : renvoie le JSON, '' quand Spotify n'a rien à dire (204 = rien ne joue),
// et lève une erreur avec le corps de la réponse (error.body) en cas d'échec
async function send(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  let body = '';
  try {
    body = text ? JSON.parse(text) : '';
  } catch (e) {
    body = text;
  }

  if (!response.ok) {
    const error = new Error('Spotify ' + response.status + ' sur ' + url.split('?')[0]);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}
