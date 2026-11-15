
class NPOS_DomBuilder {

  constructor(config, pathPrefix) {
    this.config = config;
    this.pathPrefix = pathPrefix + '/';
  }

  getDom(context) {
    if (context.authRequired) {
      return this.getWrapper(this.getAuthRequiredContent(context));
    } else if (context.noSong) {
      return this.getWrapper(this.getNothingIsPlayingContent());
    } else {
      return this.getWrapper(this.getPlayingContent(context));
    }
  }

  getInitDom(loadingText) {
    return this.getWrapper(this.getInitializingContent(loadingText));
  }

  getWrapper(content) {
    let wrapper = document.createElement('div');
    wrapper.className = 'medium'; //small
    wrapper.style.marginTop = this.config.marginTop + 'px';
    wrapper.style.marginLeft = this.config.marginLeft + 'px';
    wrapper.style.marginRight = this.config.marginRight + 'px';
    wrapper.style.marginBottom = this.config.marginBottom + 'px';
    wrapper.appendChild(content);

    return wrapper;
  }

  getInitializingContent(loadingText) {
    let content = document.createElement('div');
    content.className = 'NPOS_initContent';

    let loadingDiv = document.createElement('div');
    loadingDiv.className = 'NPOS_loading medium';
    loadingDiv.innerHTML = loadingText;

    content.appendChild(loadingDiv);

    return content;
  }

  getNothingIsPlayingContent() {
    let content = document.createElement('div');
    content.className = 'NPOS_nothingIsPlayingContent';

    if (this.config.showLogoWhenNothingIsPlaying) {
      content.appendChild(this.getLogoImage());
    }

    return content;
  }

  // Compte révoqué : QR code à scanner avec le téléphone pour se reconnecter
  getAuthRequiredContent(context) {
    let content = document.createElement('div');
    content.className = 'NPOS_authRequired';

    let qrCode = document.createElement('div');
    qrCode.className = 'NPOS_qrCode';
    qrCode.innerHTML = context.qrCode; // SVG généré par node_helper.js
    content.appendChild(qrCode);

    let text = document.createElement('div');
    text.className = 'NPOS_authText small';
    let who = this.config.accountName ? ' de ' + this.config.accountName : '';
    text.innerHTML = '<i class="fa-brands fa-spotify"></i> Spotify' + who + ' déconnecté<br><span class="dimmed xsmall">Scanne pour te reconnecter</span>';
    content.appendChild(text);

    return content;
  }

  getLogoImage() {
    return this.getImage('img/Spotify_Logo_RGB_White.png', 'NPOS_nothingIsPlayingImage');
  }

  getIconImage(className) {
    return this.getImage('img/Spotify_Icon_RGB_White.png', className);
  }

  getImage(imageName, className) {
    let image = document.createElement('img');
    image.src = this.pathPrefix + imageName;
    image.className = className;

    return image;
  }

  /**
   * Returns a div configured for the given context.
   *
   * context = {
   *   imgURL: *an url*,
   *   songTitle: *string*,
   *   artist: *string*,
   *   album: *string*,
   *   titleLength: *num*,
   *   progress: *num*,
   *   isPlaying: *boolean*,
   *   deviceName: *string*
   * }
   *
   * @param context
   * @returns {HTMLDivElement}
   */
  getPlayingContent(context) {
    let content = document.createElement('div');

    if (this.config.showCoverArt && context.imgURL) {
      content.appendChild(this.getCoverArtDiv(context.imgURL, 'NPOS_logoImage_cover'));
    } else {
      content.appendChild(this.getIconImage('NPOS_logoImage'));
    }

    content.appendChild(this.getInfoDiv('fa fa-music', context.songTitle));
    content.appendChild(this.getInfoDiv('fa fa-user', context.artist));
    content.appendChild(this.getInfoDiv('fa fa-folder', context.album));
    content.appendChild(this.getInfoDiv(this.getPlayStatusIcon(context.isPlaying), this.getTimeInfo(context)));
    content.appendChild(this.getProgressBar(context));
    content.appendChild(this.getInfoDiv('', context.deviceName));

    return content;
  }

  // La barre avance toute seule en CSS jusqu'à la fin du morceau, entre deux appels à Spotify
  getProgressBar(context) {
    let progressBar = document.createElement('div');
    progressBar.className = 'NPOS_progress';

    let value = document.createElement('div');
    value.className = 'NPOS_progressValue';
    let start = context.titleLength ? Math.min(1, context.progress / context.titleLength) : 0;
    value.style.transform = 'scaleX(' + start + ')';
    if (context.isPlaying && context.titleLength) {
      value.style.setProperty('--NPOS-start', start);
      value.style.animation = 'NPOS_progress ' + (context.titleLength - context.progress) + 'ms linear forwards';
    }

    progressBar.appendChild(value);
    return progressBar;
  }

  getTimeInfo(context) {
    let currentPos = moment.duration(context.progress);
    let length = moment.duration(context.titleLength);

    return currentPos.format() + ' / ' + length.format();
  }

  getInfoDiv(symbol, text) {
    let infoDiv = document.createElement('div');
    infoDiv.className = 'NPOS_infoText';

    if (symbol) {
      let icon = document.createElement('i');
      icon.className = 'NPOS_icon ' + symbol;
      infoDiv.appendChild(icon);
    }

    infoDiv.appendChild(document.createTextNode(text));

    return infoDiv;
  }

  getCoverArtDiv(coverURL, className = 'NPOS_coverArtArea') {
    let coverArea = document.createElement('div');
    coverArea.className = className;

    let cover = document.createElement('img');
    cover.src = coverURL;
    cover.className = 'NPOS_albumCover';

    coverArea.appendChild(cover);

    return coverArea;
  }

  getPlayStatusIcon(isPlaying) {
    return isPlaying ? 'fa fa-play' : 'fa fa-pause';
  }
}
