'use strict';

// Couleur dominante de chaque pochette, calculée une seule fois par image
const NPOS_colors = {};


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
    wrapper.className = 'medium';
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
      content.appendChild(this.getImage('img/Spotify_Logo_RGB_White.png', 'NPOS_nothingIsPlayingImage'));
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

  getImage(imageName, className) {
    let image = document.createElement('img');
    image.src = this.pathPrefix + imageName;
    image.className = className;

    return image;
  }

  /**
   * Design « Halo » : la couleur de la pochette diffuse derrière le texte et colore la barre.
   * context = { imgURL, songTitle, artist, album, titleLength, progress, isPlaying, deviceName, next }
   */
  getPlayingContent(context) {
    let content = document.createElement('div');
    content.className = 'NPOS_halo' + (context.isPlaying ? '' : ' NPOS_paused');

    let glow = document.createElement('div');
    glow.className = 'NPOS_glow';
    content.appendChild(glow);

    if (this.config.showCoverArt && context.imgURL) {
      let cover = document.createElement('img');
      cover.className = 'NPOS_cover';
      cover.crossOrigin = 'anonymous'; // les images de Spotify l'autorisent : on peut lire leurs pixels
      cover.src = context.imgURL;
      this.applyColor(content, cover, context.imgURL);
      content.appendChild(cover);
    } else {
      content.appendChild(this.getImage('img/Spotify_Icon_RGB_White.png', 'NPOS_cover NPOS_coverIcon'));
    }

    let text = document.createElement('div');
    text.className = 'NPOS_text';
    text.appendChild(this.getLine('NPOS_title bright', context.songTitle));
    text.appendChild(this.getLine('NPOS_artist small', context.artist));

    let meta = document.createElement('div');
    meta.className = 'NPOS_meta xsmall dimmed';
    let device = document.createElement('span');
    device.innerHTML = '<i class="fa-solid ' + (context.isPlaying ? 'fa-play' : 'fa-pause') + '"></i> ';
    device.appendChild(document.createTextNode(context.deviceName));
    meta.appendChild(device);
    meta.appendChild(this.getLine('NPOS_time', this.getTimeInfo(context)));
    text.appendChild(meta);

    text.appendChild(this.getProgressBar(context));

    if (context.next) {
      text.appendChild(this.getLine('NPOS_next xsmall dimmed', 'À suivre : ' + context.next));
    }

    content.appendChild(text);
    return content;
  }

  getLine(className, value) {
    let line = document.createElement('div');
    line.className = className;
    line.textContent = value;
    return line;
  }

  // Couleur dominante de la pochette → variable CSS --NPOS-color (halo et barre)
  applyColor(content, cover, url) {
    if (NPOS_colors[url]) {
      content.style.setProperty('--NPOS-color', NPOS_colors[url]);
      return;
    }
    cover.addEventListener('load', () => {
      NPOS_colors[url] = NPOS_dominantColor(cover);
      content.style.setProperty('--NPOS-color', NPOS_colors[url]);
    }, { once: true });
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
}


// Moyenne des pixels colorés de la pochette (les gris et les noirs sont ignorés), éclaircie pour rester visible sur le miroir noir.
// ponytail: moyenne pondérée, pas de vrai clustering ; une pochette très bicolore donne une teinte intermédiaire
function NPOS_dominantColor(image) {
  try {
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    let r = 0, g = 0, b = 0, total = 0;
    for (let i = 0; i < data.length; i += 4) {
      const max = Math.max(data[i], data[i + 1], data[i + 2]);
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      const weight = (max - min) / 255 + 0.02; // les pixels saturés comptent plus
      r += data[i] * weight; g += data[i + 1] * weight; b += data[i + 2] * weight; total += weight;
    }
    return NPOS_brighten(r / total, g / total, b / total);
  } catch (e) {
    return '#ffffff';
  }
}

// Garde la teinte mais remonte la luminosité à au moins 60 % pour le noir du miroir
function NPOS_brighten(r, g, b) {
  const max = Math.max(r, g, b, 1);
  const scale = Math.max(1, 153 / max);
  return 'rgb(' + [r, g, b].map((c) => Math.min(255, Math.round(c * scale))).join(',') + ')';
}
