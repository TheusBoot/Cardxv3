// ═══════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════
let avatarColor      = '#1d9bf0';
let tweetData        = null;
let videoEl          = null;
let mediaType        = null;
let mediaRecorder    = null;
let recChunks        = [];
let fetchController  = null;      // FIX 11: cancela fetch anterior

// Detecta se está rodando no servidor local
const IS_LOCAL_SERVER = location.protocol === 'http:' && location.hostname === 'localhost';

// ═══════════════════════════════════════════════════
// FIX 3: URLs do proxy — usa servidor local se disponível
// ═══════════════════════════════════════════════════
const API = {
  fxtwitter(user, id) {
    return IS_LOCAL_SERVER
      ? `/proxy/fxtwitter?user=${encodeURIComponent(user)}&id=${id}`
      : `https://api.fxtwitter.com/${encodeURIComponent(user)}/status/${id}`;
  },
  syndication(id) {
    if (IS_LOCAL_SERVER) return `/proxy/syndication?id=${id}`;
    const token = (Math.round(Number(id) / 1e15 * Math.PI) >>> 0).toString(36); // FIX 2
    return `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=pt&token=${token}`;
  },
  mediaProxy(url) {
    return IS_LOCAL_SERVER ? `/proxy/media?url=${encodeURIComponent(url)}` : url;
  }
};

// ═══════════════════════════════════════════════════
// PARSE URL
// ═══════════════════════════════════════════════════
function parseTweetUrl(raw) {
  const s = raw.trim();
  try {
    const url  = new URL(s.match(/^https?:\/\//) ? s : 'https://' + s);
    const m    = url.pathname.match(/\/([^/?#]+)\/status\/(\d+)/);
    if (m) return { username: m[1], id: m[2] };
  } catch {}
  const m2 = s.match(/(?:twitter\.com|x\.com)\/([^/?#]+)\/status\/(\d+)/);
  if (m2) return { username: m2[1], id: m2[2] };
  return null;
}

// ═══════════════════════════════════════════════════
// FIX 9: fetch com timeout
// ═══════════════════════════════════════════════════
async function fetchTimeout(url, options = {}, ms = 9000) {
  const ctrl   = new AbortController();
  const timer  = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } catch(e) {
    if (e.name === 'AbortError') throw new Error('Timeout — servidor não respondeu');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ═══════════════════════════════════════════════════
// FONTES DE DADOS
// ═══════════════════════════════════════════════════
async function tryFxTwitter(parsed, signal) {
  const res  = await fetchTimeout(API.fxtwitter(parsed.username, parsed.id), { signal });
  if (!res.ok) throw new Error('fxtwitter HTTP ' + res.status);
  const json = await res.json();
  if (!json.tweet) throw new Error(json.message || 'not found');
  const t = json.tweet;
  return {
    name:        t.author.name,
    screen_name: t.author.screen_name,
    avatar:      t.author.avatar_url || '',
    verified:    !!(t.author.blue_verified || t.author.verified),
    text:        t.text || '',
    created_at:  t.created_at,
    likes:       t.likes     || 0,
    retweets:    t.retweets  || 0,
    views:       t.views     || null,
    photos:      (t.media && t.media.photos) || [],
    videos:      (t.media && t.media.videos) || [],
  };
}

async function trySyndication(parsed, signal) {
  const res = await fetchTimeout(API.syndication(parsed.id), { signal });
  if (!res.ok) throw new Error('syndication HTTP ' + res.status);
  const t   = await res.json();
  if (!t || !t.user) throw new Error('resposta incompleta');

  const photos = [], videos = [];
  (t.mediaDetails || []).forEach(m => {
    if (m.type === 'photo') {
      photos.push({ url: m.media_url_https });
    } else if (m.type === 'video' || m.type === 'animated_gif') {
      const variants = (m.video_info && m.video_info.variants) || [];
      const mp4s = variants
        .filter(v => v.content_type === 'video/mp4')
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      if (mp4s[0]) videos.push({ url: mp4s[0].url });
    }
  });

  return {
    name:        t.user.name,
    screen_name: t.user.screen_name,
    avatar:      (t.user.profile_image_url_https || '').replace('_normal', '_400x400'),
    verified:    !!(t.user.is_blue_verified || t.user.verified),
    text:        t.text || t.full_text || '',
    created_at:  t.created_at,
    likes:       t.favorite_count || 0,
    retweets:    t.retweet_count  || 0,
    views:       null,
    photos,
    videos,
  };
}

// ═══════════════════════════════════════════════════
// FETCH PRINCIPAL  (FIX 11: cancela anterior)
// ═══════════════════════════════════════════════════
async function fetchTweet() {
  const raw = document.getElementById('inp-url').value.trim();
  if (!raw) return showError('Cole uma URL de tweet primeiro.');

  const parsed = parseTweetUrl(raw);
  if (!parsed) return showError('URL inválida. Use: x.com/usuario/status/ID');

  // Cancela fetch anterior se existir
  if (fetchController) fetchController.abort();
  fetchController = new AbortController();
  const { signal } = fetchController;

  hideError();
  showSkeleton();
  setFetchLoading(true);

  let data   = null;
  const errs = [];

  try { data = await tryFxTwitter(parsed, signal); }
  catch(e) { if (e.name !== 'AbortError') errs.push('fxtwitter: ' + e.message); }

  if (!data && !signal.aborted) {
    try { data = await trySyndication(parsed, signal); }
    catch(e) { if (e.name !== 'AbortError') errs.push('syndication: ' + e.message); }
  }

  setFetchLoading(false);

  if (signal.aborted) return; // descarta resultado de fetch cancelado

  if (!data) {
    hideSkeleton();
    showError('Não foi possível carregar o tweet. Verifique se é público.\n(' + errs.join(' | ') + ')');
    return;
  }

  tweetData = data;
  applyData(data);
}

function applyData(d) {
  set('s-name',   d.name || '');
  set('s-handle', '@' + (d.screen_name || ''));
  set('s-avatar', d.avatar || '');
  document.getElementById('s-verified').checked = !!d.verified;
  set('s-text',   d.text || '');

  const date = d.created_at ? new Date(d.created_at) : new Date();
  set('s-time',   formatDate(date));
  set('s-likes',  fmtNum(d.likes));
  set('s-rt',     fmtNum(d.retweets));
  set('s-views',  d.views ? fmtNum(d.views) : '');

  renderCard();
  hideSkeleton();
  document.getElementById('tweet-card').style.display = 'block';
  document.getElementById('bottom-hint').style.display = 'block';
  setStatus('Tweet carregado!', 'var(--green)');
  setTimeout(() => setStatus(''), 2500);
}

// ═══════════════════════════════════════════════════
// RENDER CARD
// ═══════════════════════════════════════════════════
function renderCard() {
  const dark     = document.getElementById('s-dark').checked;
  const name     = get('s-name')   || 'Usuário';
  const handle   = get('s-handle') || '@usuario';
  const verified = document.getElementById('s-verified').checked;
  const text     = get('s-text');
  const avatarUrl= get('s-avatar').trim();
  const time     = get('s-time');
  const likes    = get('s-likes');
  const rt       = get('s-rt');
  const views    = get('s-views');

  const card = document.getElementById('tweet-card');
  card.classList.toggle('dark', dark);

  // avatar
  const av = document.getElementById('c-avatar');
  av.style.background = avatarColor;
  if (avatarUrl) {
    // FIX 1: sem crossOrigin no avatar (evita CORS block para exibição)
    av.innerHTML = `<img src="${esc(avatarUrl)}" alt="" onerror="this.remove()" />`;
  } else {
    av.textContent = name.charAt(0).toUpperCase();
  }

  // nome + badge
  const badge = `<svg width="17" height="17" viewBox="0 0 24 24" fill="#1d9bf0"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.9-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C3.13 9.33 2.25 10.57 2.25 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.66 1.31 1.9 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.26-2.52.8-3.91C21.38 14.67 22.25 13.43 22.25 12zm-9.25 4.5L8.5 12l1.41-1.41 3.09 3.09 5.59-5.59L20 9.5l-7 7z"/></svg>`;
  document.getElementById('c-name').innerHTML   = esc(name) + (verified ? ' ' + badge : '');
  document.getElementById('c-handle').textContent = handle.startsWith('@') ? handle : '@' + handle;

  // FIX 10: linkify antes de escapar (não quebra URLs com &)
  document.getElementById('c-text').innerHTML = renderText(text);
  document.getElementById('c-time').textContent = time;

  // FIX 6: stats escapados
  const statsEl = document.getElementById('c-stats');
  statsEl.innerHTML = [
    rt    ? `<span>🔁 <b>${esc(rt)}</b> Retweets</span>`  : '',
    likes ? `<span>❤️ <b>${esc(likes)}</b> Curtidas</span>` : '',
    views ? `<span>📊 ${esc(views)} Views</span>`          : '',
  ].filter(Boolean).join('');

  // FIX 8: só re-renderiza mídia se não estiver gravando
  const recording = mediaRecorder && mediaRecorder.state === 'recording';
  if (tweetData && !recording) renderMedia();
}

function renderMedia() {
  const t = tweetData;
  const wrap = document.getElementById('c-media');
  wrap.innerHTML = '';
  wrap.style.display = 'none';
  wrap.className = 'tw-media-wrap';
  videoEl   = null;
  mediaType = null;

  const videos = t.videos || [];
  const photos = t.photos || [];

  if (videos.length > 0) {
    mediaType = 'video';
    const vid = document.createElement('video');
    // FIX 1: sem crossOrigin — evita CORS block. Canvas usará allowTaint para PNG
    vid.src         = API.mediaProxy(videos[0].url);
    vid.controls    = true;
    vid.playsInline = true;
    // NÃO setar crossOrigin aqui — vídeos do Twitter não têm CORS headers
    vid.style.cssText = 'width:100%;display:block;max-height:320px;object-fit:contain;background:#000';
    wrap.appendChild(vid);
    wrap.style.display = 'block';
    videoEl = vid;

    el('btn-vid').style.display = 'flex';
    el('btn-vid').disabled      = false;
    el('btn-png').disabled      = false;
    el('btn-copy').disabled     = false;
    const fmtWrap = el('vid-format-wrap');
    if (fmtWrap) fmtWrap.style.display = 'block';

  } else if (photos.length > 0) {
    mediaType = 'image';
    if (photos.length === 1) {
      const img = document.createElement('img');
      img.src = API.mediaProxy(photos[0].url);
      img.alt = '';
      // FIX 1: sem crossOrigin — evita CORS block para exibição
      wrap.appendChild(img);
      wrap.style.display = 'block';
    } else {
      const count = Math.min(photos.length, 4);
      wrap.className = `tw-media-wrap grid-${count}`;
      photos.slice(0, count).forEach(p => {
        const div = document.createElement('div');
        div.className = 'photo-item';
        const img = document.createElement('img');
        img.src = API.mediaProxy(p.url);
        img.alt = '';
        div.appendChild(img);
        wrap.appendChild(div);
      });
    }
    el('btn-vid').style.display = 'none';
    el('btn-png').disabled      = false;
    el('btn-copy').disabled     = false;
    const fmtWrap2 = el('vid-format-wrap');
    if (fmtWrap2) fmtWrap2.style.display = 'none';
  } else {
    el('btn-vid').style.display = 'none';
    el('btn-png').disabled      = false;
    el('btn-copy').disabled     = false;
    const fmtWrap3 = el('vid-format-wrap');
    if (fmtWrap3) fmtWrap3.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════
// GRAVAÇÃO DE VÍDEO
// ═══════════════════════════════════════════════════

// FIX 4: polyfill para ctx.roundRect (Chrome <99, Firefox <112, Safari <15.4)
function pathRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Retorna o melhor mimeType para o formato escolhido pelo usuário
function getMimeType(format) {
  const map = {
    webm: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'],
    mp4:  ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4'],
  };
  const candidates = map[format] || map.webm;
  return candidates.find(t => {
    try { return MediaRecorder.isTypeSupported(t); } catch { return false; }
  }) || '';
}

async function startRecordVideo() {
  if (!videoEl) return;

  // Gravação só funciona com servidor local (vídeo precisa ser same-origin)
  if (!IS_LOCAL_SERVER) {
    showError('A gravação de vídeo requer o servidor local. Execute: node server.js e acesse http://localhost:3000');
    return;
  }

  const format   = (el('s-vid-format') && el('s-vid-format').value) || 'webm';
  const mimeType = getMimeType(format);
  if (!mimeType) {
    showError('Seu navegador não suporta gravação. Use Chrome ou Firefox.');
    return;
  }

  el('btn-vid').disabled       = true;
  el('btn-stop').style.display = 'flex';
  el('btn-stop').disabled      = false;
  setStatus('Preparando gravação…', '#aaa');

  // ── ETAPA 1: garantir que o vídeo está carregado ──────────────────────────
  if (videoEl.readyState < 2) {
    setStatus('Aguardando vídeo carregar…', '#aaa');
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout ao carregar vídeo')), 15000);
      videoEl.addEventListener('canplay', () => { clearTimeout(t); resolve(); }, { once: true });
      videoEl.addEventListener('error',   () => { clearTimeout(t); reject(new Error('Erro no vídeo')); }, { once: true });
    }).catch(e => {
      el('btn-vid').disabled = false;
      el('btn-stop').style.display = 'none';
      showError('Não foi possível carregar o vídeo: ' + e.message);
      throw e;
    });
  }

  // ── ETAPA 2: snapshot estático do card (sem vídeo visível) ───────────────
  setStatus('Capturando fundo do card…', '#aaa');
  const card     = document.getElementById('tweet-card');
  const cardRect = card.getBoundingClientRect();
  const scale    = 2;
  const W        = Math.round(cardRect.width  * scale);
  const H        = Math.round(cardRect.height * scale);

  videoEl.style.visibility = 'hidden';
  const imgSwaps = await preloadImagesAsBlobURLs();
  let bgCanvas;
  try {
    const dark = document.getElementById('s-dark').checked;
    bgCanvas = await html2canvas(card, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: dark ? '#15202b' : '#ffffff',
      logging: false,
    });
  } catch(e) {
    console.warn('html2canvas snapshot error:', e);
  } finally {
    restoreImages(imgSwaps);
    videoEl.style.visibility = 'visible';
  }

  // ── ETAPA 3: canvas de gravação ───────────────────────────────────────────
  const recCanvas  = document.createElement('canvas');
  recCanvas.width  = W;
  recCanvas.height = H;
  const ctx = recCanvas.getContext('2d');

  // ── ETAPA 4: testar se drawImage funciona (detecta taint antes de gravar) ─
  // Quando vídeo é servido pelo proxy local, é same-origin → sem taint
  try {
    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, W, H);
    videoEl.currentTime = 0;
    await new Promise(r => { videoEl.onseeked = r; setTimeout(r, 500); });
    ctx.drawImage(videoEl, 0, 0, 1, 1);
    ctx.getImageData(0, 0, 1, 1); // lança SecurityError se canvas estiver tainted
    ctx.clearRect(0, 0, W, H);
  } catch(e) {
    el('btn-vid').disabled       = false;
    el('btn-stop').style.display = 'none';
    showError('CORS: não foi possível desenhar o vídeo no canvas. Certifique-se de acessar via http://localhost:3000');
    return;
  }

  // ── ETAPA 5: posição do vídeo no card ────────────────────────────────────
  const vidRect = videoEl.getBoundingClientRect();
  const relX    = (vidRect.left - cardRect.left) * scale;
  const relY    = (vidRect.top  - cardRect.top)  * scale;
  const relW    = vidRect.width  * scale;
  const relH    = vidRect.height * scale;
  const radius  = 14 * scale;

  // ── ETAPA 6: duração segura ───────────────────────────────────────────────
  const rawDur   = videoEl.duration;
  const duration = (!rawDur || !isFinite(rawDur)) ? 60 : rawDur;

  // ── ETAPA 7: combinar vídeo do canvas + áudio do videoEl ───────────────────
  recChunks = [];

  // Canvas stream → apenas vídeo
  const canvasStream = recCanvas.captureStream(30);

  // Captura áudio do elemento de vídeo e injeta no stream de gravação
  let audioTracks = [];
  try {
    const vidStream = (videoEl.captureStream || videoEl.mozCaptureStream)
      ? (videoEl.captureStream || videoEl.mozCaptureStream).call(videoEl)
      : null;
    if (vidStream) {
      audioTracks = vidStream.getAudioTracks();
      audioTracks.forEach(t => canvasStream.addTrack(t));
      console.log('[rec] áudio:', audioTracks.length, 'faixa(s) capturada(s)');
    }
  } catch(e) {
    console.warn('[rec] não foi possível capturar áudio:', e.message);
  }

  mediaRecorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
    audioBitsPerSecond: 128_000,
  });
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    // Remove trilhas de áudio emprestadas para não vazar referências
    audioTracks.forEach(t => { try { canvasStream.removeTrack(t); } catch {} });
    saveRecording(mimeType);
  };

  const barFill = el('rec-bar-fill');
  const recInfo = el('rec-info');
  el('rec-bar-wrap').style.display = 'flex';
  barFill.style.width = '0%';

  // ── ETAPA 8: iniciar ──────────────────────────────────────────────────────
  // chunk a cada 200ms garante dados mais frequentes → arquivo não fica vazio
  mediaRecorder.start(200);
  videoEl.currentTime = 0;
  await videoEl.play().catch(() => {});

  const startTime = performance.now();
  let drawnFrames = 0;

  function drawFrame() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

    // Fundo estático
    ctx.clearRect(0, 0, W, H);
    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, W, H);

    // Frame do vídeo — só desenha se está reproduzindo
    if (videoEl.readyState >= 2 && !videoEl.paused && !videoEl.ended) {
      ctx.save();
      pathRoundRect(ctx, relX, relY, relW, relH, radius);
      ctx.clip();
      ctx.drawImage(videoEl, relX, relY, relW, relH);
      ctx.restore();
      drawnFrames++;
    }

    const elapsed = (performance.now() - startTime) / 1000;
    barFill.style.width      = Math.min((elapsed / duration) * 100, 100) + '%';
    recInfo.textContent      = `Gravando… ${elapsed.toFixed(1)}s / ${duration.toFixed(1)}s · ${drawnFrames} frames`;

    requestAnimationFrame(drawFrame);
  }

  drawFrame();

  // Para automaticamente quando o vídeo termina
  videoEl.onended = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') stopRecording();
  };

  setStatus('● Gravando…', '#f4212e');
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    if (videoEl) videoEl.pause();
  }
  el('btn-stop').style.display  = 'none';
  el('btn-vid').disabled        = false;
  el('rec-bar-wrap').style.display = 'none';
  setStatus('Processando…', '#aaa');
}

function saveRecording(mimeType) {
  const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const blob = new Blob(recChunks, { type: mimeType });
  const sizeMB = (blob.size / 1024 / 1024).toFixed(1);

  if (blob.size < 1000) {
    setStatus(`Arquivo vazio (${blob.size}B) — tente novamente`, 'var(--red)');
    console.error('[save] recChunks:', recChunks.length, 'blob:', blob.size);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = `tweet_card.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setStatus(`✓ ${ext.toUpperCase()} salvo · ${sizeMB} MB`, 'var(--green)');
  setTimeout(() => setStatus(''), 4000);
}

// ═══════════════════════════════════════════════════
// PRÉ-CARREGAMENTO DE MÍDIA COMO BLOB URL
// Converte URLs externas → blob: locais para não
// contaminar (taint) o canvas durante o export
// ═══════════════════════════════════════════════════

async function urlToBlobURL(src) {
  // Usa proxy se servidor local disponível; senão tenta direto
  const url = (IS_LOCAL_SERVER && !src.startsWith('blob:') && !src.startsWith('data:'))
    ? `/proxy/media?url=${encodeURIComponent(src)}`
    : src;
  const res  = await fetchTimeout(url, {}, 15000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// Substitui todos os src de <img> no card por blob URLs
// Retorna array de swaps para restauração posterior
async function preloadImagesAsBlobURLs() {
  const card  = document.getElementById('tweet-card');
  const swaps = [];
  const imgs  = Array.from(card.querySelectorAll('img'));

  for (const img of imgs) {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('blob:') || src.startsWith('data:')) continue;
    try {
      const blobUrl = await urlToBlobURL(src);
      swaps.push({ img, original: src });
      img.crossOrigin = 'anonymous';
      img.src = blobUrl;
      // Aguarda o load com a nova src
      await new Promise(res => {
        if (img.complete && img.naturalWidth) return res();
        img.onload = img.onerror = res;
      });
    } catch(e) {
      console.warn('[preload img] falhou:', src, e.message);
    }
  }
  return swaps;
}

function restoreImages(swaps) {
  for (const { img, original } of swaps) {
    img.removeAttribute('crossOrigin');
    // Revoga blob URL anterior para liberar memória
    if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    img.src = original;
  }
}

// ─── PNG EXPORT ───────────────────────────────────
async function getCardCanvas() {
  const dark  = document.getElementById('s-dark').checked;
  setStatus('Carregando imagens…', '#aaa');

  // Etapa 1: converter imagens para blob URLs (sem CORS issue)
  const swaps = await preloadImagesAsBlobURLs();

  try {
    // Etapa 2: html2canvas com useCORS:true — agora seguro pois são blob:
    const canvas = await html2canvas(document.getElementById('tweet-card'), {
      scale: 3,
      useCORS: true,
      allowTaint: false,
      backgroundColor: dark ? '#15202b' : '#ffffff',
      logging: false,
    });
    return canvas;
  } finally {
    // Etapa 3: restaurar srcs originais
    restoreImages(swaps);
  }
}

async function downloadPNG() {
  el('btn-png').disabled = true;
  try {
    const c = await getCardCanvas();
    const a = document.createElement('a');
    a.download = 'tweet_card.png';
    a.href     = c.toDataURL('image/png');
    a.click();
    setStatus('PNG salvo!', 'var(--green)');
  } catch(e) {
    setStatus('Erro ao gerar PNG: ' + e.message, 'var(--red)');
    console.error(e);
  } finally {
    el('btn-png').disabled = false;
    setTimeout(() => setStatus(''), 3000);
  }
}

async function copyPNG() {
  el('btn-copy').disabled = true;
  try {
    const c    = await getCardCanvas();
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    setStatus('Copiado!', 'var(--green)');
  } catch(e) {
    setStatus('Erro ao copiar — tente o download', 'var(--red)');
    console.error(e);
  } finally {
    el('btn-copy').disabled = false;
    setTimeout(() => setStatus(''), 3000);
  }
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
function el(id)       { return document.getElementById(id); }
function get(id)      { return el(id).value; }
function set(id, v)   { el(id).value = v; }

// FIX 6: escape seguro contra XSS
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// FIX 10: linkify ANTES de escapar texto puro
function renderText(raw) {
  if (!raw) return '';
  const urlRe  = /(https?:\/\/[^\s]+)/g;
  const atRe   = /@(\w+)/g;
  const hashRe = /#(\w+)/g;

  // Divide em partes: URLs ficam intactas, texto é escapado
  const parts = raw.split(urlRe);
  return parts.map((part, i) => {
    if (urlRe.test(part)) {
      return `<a href="${part}" target="_blank" rel="noopener noreferrer">${esc(part)}</a>`;
    }
    // Escapa o texto e depois linkifica @mentions e #hashtags
    return esc(part)
      .replace(/@(\w+)/g, '<a href="https://x.com/$1" target="_blank" rel="noopener">@$1</a>')
      .replace(/#(\w+)/g, '<a href="https://x.com/hashtag/$1" target="_blank" rel="noopener">#$1</a>');
  }).join('');
}

function fmtNum(n) {
  if (n == null || n === '') return '';
  const num = typeof n === 'string' ? parseInt(n.replace(/[^\d]/g,''), 10) : n;
  if (isNaN(num)) return String(n);
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace('.0','') + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace('.0','') + 'K';
  return String(num);
}

// FIX 13: formatar data de forma consistente
function formatDate(d) {
  const pad  = n => String(n).padStart(2,'0');
  const h    = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${h12}:${pad(d.getMinutes())} ${ampm} · ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function setAvatarColor(elSwatch) {
  avatarColor = elSwatch.dataset.c;
  document.querySelectorAll('.cswatch').forEach(s => s.classList.remove('active'));
  elSwatch.classList.add('active');
  renderCard();
}

function setFetchLoading(on) {
  const btn = el('btn-fetch');
  btn.disabled = on;
  btn.innerHTML = on
    ? 'Buscando…'
    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Buscar`;
}

function showSkeleton() {
  el('empty-state').style.display = 'none';
  el('tweet-card').style.display  = 'none';
  el('skeleton').style.display    = 'flex';
  el('bottom-hint').style.display = 'none';
}
function hideSkeleton() { el('skeleton').style.display = 'none'; }

// FIX 15: showError não exibe empty-state junto
function showError(msg) {
  el('empty-state').style.display = 'none';   // ← corrigido
  el('skeleton').style.display    = 'none';
  const e = el('error-msg');
  e.textContent = '⚠ ' + msg;
  e.style.display = 'block';
}
function hideError() { el('error-msg').style.display = 'none'; }

function setStatus(msg, color = 'var(--green)') {
  const s = el('status');
  s.style.color = color;
  s.textContent = msg;
}

// Esconde o banner se já está no servidor
if (IS_LOCAL_SERVER) el('setup-banner').classList.add('hidden');
