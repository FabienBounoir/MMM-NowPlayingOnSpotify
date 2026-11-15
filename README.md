# MMM-NowPlayingOnSpotify
A module for the [MagicMirror](https://github.com/MichMich/MagicMirror) project by [Michael Teeuw](https://github.com/MichMich) displaying the song currently playing on Spotify.


[![Maintainability](https://api.codeclimate.com/v1/badges/2742abc792b88536f6e2/maintainability)](https://codeclimate.com/github/raywo/MMM-NowPlayingOnSpotify/maintainability) 
[![Test Coverage](https://api.codeclimate.com/v1/badges/2742abc792b88536f6e2/test_coverage)](https://codeclimate.com/github/raywo/MMM-NowPlayingOnSpotify/test_coverage)
[![Known Vulnerabilities](https://snyk.io/test/github/raywo/mmm-NowPlayingOnSpotify/badge.svg?targetFile=package.json)](https://snyk.io/test/github/raywo/mmm-NowPlayingOnSpotify?targetFile=package.json)
[![Greenkeeper badge](https://badges.greenkeeper.io/raywo/MMM-NowPlayingOnSpotify.svg)](https://greenkeeper.io/)
[![dependency status](https://david-dm.org/raywo/MMM-NowPlayingOnSpotify.svg)](https://david-dm.org/raywo/MMM-NowPlayingOnSpotify)
[![chat on gitter](https://badges.gitter.im/raywo.svg)](https://gitter.im/raywo)


## How it works
After installing the module and configuring and setting up the Spotify app the module displays the song you are currently listening to on Spotify. It shows on which of your devices you’re playing the song. If you like you can also display the album cover.

To be able to display your currently playing song the module must connect to the Spotify service and query your private data. For obvious reasons this is not possible for arbitrary apps – or for that matter MagicMirror modules. There are third party solutions which will enable access to your Spotify data. This module is designed to be independent from third party services. Everything you need is in this module respectively is created by yourself.

## Screenshots
| ![Screenshot when nothing is playing](img/readme/screenshot_nothing_playing.png) | ![Screenshot of a song playing without cover art](img/readme/screenshot_without_coverart.png) | ![Screenshot of a song playing with cover art](img/readme/screenshot_with_coverart.png) |
|---|---|---|
| Nothing is playing. | A song is playing and `showCoverArt` is set to `false`. | A song is playing and `showCoverArt` is set to `true`. |

## Preconditions

* MagicMirror<sup>2</sup> instance
* Node.js version >= 18
* a Spotify account
* a phone on the same network as the mirror (to connect your Spotify account by scanning a QR code)


## Installing

### Step 1 – Install the module

In your MagicMirror directory:

```bash
cd modules
git clone https://github.com/FabienBounoir/MMM-NowPlayingOnSpotify.git
cd MMM-NowPlayingOnSpotify
npm install
```

### Step 2 – Create a Spotify app

1. Create an app in the [Spotify developer dashboard](https://developer.spotify.com/dashboard).
2. In its settings, add this **Redirect URI** and save:

   ```
   https://fabienbounoir.github.io/MMM-NowPlayingOnSpotify/callback.html
   ```

   Spotify only accepts HTTPS redirections, and the mirror is plain HTTP on your local network: this small page just sends your phone back to the mirror.
3. While the app is in development mode, add the Spotify accounts that will use it under **User Management**.

### Step 3 – Configure and connect

Add the module to your `config.js` with the app's `clientID` and `clientSecret` (see [Configuring](#configuring)), then restart MagicMirror. The module shows a QR code: scan it with your phone and log in to Spotify. The tokens are saved in `tokens.json` and the module starts showing what you play. No token to copy by hand.


## Updating

Go to the module’s folder inside MagicMirror modules folder and pull the latest version from GitHub and install:

```bash
git pull
npm install
```


## Configuring
There is not very much to configure but here are the options:

| Option | Description |
|--------|-------------|
| `showCoverArt` | <p>A boolean value decribing whether an album cover photo should be displayed or not.</p><p>**Type:** `boolean` **OPTIONAL**<br>**Example:** `false`<br>**Default Value:** `true`</p> |
| `showLogoWhenNothingIsPlaying` | <p>A boolean value describing whether the Spotify logo should be displayed when nothing is playing.</p><p>**Type:** `boolean` **OPTIONAL**<br>**Example:** `false`<br>**Default Value:** `true`</p> || `marginTop` | <p>An integer value for the top margin in pixels.</p><p>**Type:** `integer` **OPTIONAL**<br>**Example:** `10`<br>**Default Value:** `0`</p> |
| `hideWhenNothingIsPlaying` | <p>Fades the whole module out while nothing is playing or the music is paused, and back in as soon as music plays. The reconnect QR code is always shown.</p><p>**Type:** `boolean` **OPTIONAL**<br>**Example:** `true`<br>**Default Value:** `false`</p> |
| `idleUpdatesEvery` | <p>Refresh interval in seconds while nothing is playing or the music is paused. While music plays, `updatesEvery` is used so track changes show up right away.</p><p>**Type:** `integer` **OPTIONAL**<br>**Example:** `60`<br>**Default Value:** `30`</p> |
| `showNextTrack` | <p>Shows the next track of the queue (« À suivre ») under the progress bar. The queue is only requested when the track changes.</p><p>**Type:** `boolean` **OPTIONAL**<br>**Example:** `true`<br>**Default Value:** `false`</p> |
| `contrast` | <p>One setting for the brightness of the secondary texts (artist, device, time, next track), the progress bar track and the halo. Raise it if the mirror glass makes things look dim.</p><p>**Type:** `number` **OPTIONAL**<br>**Example:** `1.4`<br>**Default Value:** `1`</p> |
| `accountName` | <p>Name shown next to the reconnect QR code when Spotify disconnects the account.</p><p>**Type:** `string` **OPTIONAL**<br>**Example:** `"Fabien"`<br>**Default Value:** `""`</p> |
| `marginLeft` | <p>An integer value for the left margin in pixels.</p><p>**Type:** `integer` **OPTIONAL**<br>**Example:** `10`<br>**Default Value:** `0`</p> |
| `marginRight` | <p>An integer value for the right margin in pixels.</p><p>**Type:** `integer` **OPTIONAL**<br>**Example:** `10`<br>**Default Value:** `0`</p> |
| `marginBottom` | <p>An integer value for the bottom margin in pixels.</p><p>**Type:** `integer` **OPTIONAL**<br>**Example:** `10`<br>**Default Value:** `0`</p> || `updatesEvery` | <p>An integer determining the interval for display updates.</p><p>**Type:** `integer` **OPTIONAL**<br>**Example:** `5`<br>**Default Value:** `1`</p><p>**Note:** With the default setting the display is updated every second. So when you skip to the next song it is virtually immediately visible. Also the progress bar runs smoothly. If you increase the value you may relieve the strain on your Raspberry’s processor but your display will not be as up-to-date. </p> |
| `clientID` | <p>A string describing the `clientID` of your Spotify app.</p><p>**Type:** `string` **REQUIRED**<br>**Example:** `"acecg8a4..."`<br>**Default Value:** none</p><p>**Note:** The easiest way to get that value is by copying the code snippet from step 3 in the [authorisation app](#step-2-–-create-and-authorise-a-spotify-app).</p> |
| `clientSecret` | <p>A string describing the `clientSecret` of your Spotify app.</p><p>**Type:** `string` **REQUIRED**<br>**Example:** `"87978346..."`<br>**Default Value:** none</p><p>**Note:** The easiest way to get that value is by copying the code snippet from step 3 in the [authorisation app](#step-2-–-create-and-authorise-a-spotify-app).</p> |
| `accessToken` | <p>Optional: tokens obtained by scanning the QR code are saved in `tokens.json` and take precedence.</p><p>**Type:** `string` **OPTIONAL**<br>**Example:** `"WaIO1987..."`<br>**Default Value:** none</p><p>**Note:** The easiest way to get that value is by copying the code snippet from step 3 in the [authorisation app](#step-2-–-create-and-authorise-a-spotify-app).</p> |
| `refreshToken` | <p>Optional: without it, the module shows the QR code to connect your account.</p><p>**Type:** `string` **OPTIONAL**<br>**Example:** `"HIuLH798..."`<br>**Default Value:** none</p><p>**Note:** The easiest way to get that value is by copying the code snippet from step 3 in the [authorisation app](#step-2-–-create-and-authorise-a-spotify-app).</p> |

Here is an example for an entry in `config.js`

```javascript
{
    module: "MMM-NowPlayingOnSpotify",
    position: "bottom_bar",

    config: {
        updatesEvery: 2,
        hideWhenNothingIsPlaying: true,
        showNextTrack: true,
        accountName: "Fabien",
        clientID: "<YOUR_CLIENT_ID>",
        clientSecret: "<YOUR_CLIENT_SECRET>"
    }
}
```


### Plusieurs comptes Spotify

Ajoutez simplement un bloc par compte, avec le même nom de module : chaque instance utilise ses propres identifiants. Inutile de dupliquer le dossier du module.

### Reconnexion par QR code

Si Spotify révoque un compte (`invalid_grant`), le bloc affiche un QR code. Scannez-le avec un téléphone connecté au même Wi-Fi que le miroir, connectez-vous à Spotify : les nouveaux tokens sont enregistrés dans `tokens.json` et l'affichage reprend, sans toucher à `config.js`.

Une seule fois, dans le [dashboard Spotify](https://developer.spotify.com/dashboard) de chaque app, ajoutez cette **Redirect URI** :

```
https://fabienbounoir.github.io/MMM-NowPlayingOnSpotify/callback.html
```

(Spotify n'accepte que des redirections HTTPS : cette page renvoie simplement le téléphone vers le miroir.) L'option `accountName` affiche le nom du compte à côté du QR code.


## Special Thanks

* [Michael Teeuw](https://github.com/MichMich) for inspiring me and many others to build a MagicMirror module.
* The community of magicmirror.builders for help in the development process and all contributors for finding and fixing errors in this module.


## Contributing

If you find any problems, bugs or have questions, please [open a GitHub issue](https://github.com/raywo/MMM-NowPlayingOnSpotify/issues) in this repository.
