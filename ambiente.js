// Música da Central de Investigação (YouTube) + som ambiente de mistério gerado no navegador.
(() => {
  const VIDEO_ID = 'KoxxBeH7J3Q';
  const PREF = 'arquivo-cinza-som';
  const home = document.getElementById('home-screen');
  const app = document.getElementById('app');
  const central = document.getElementById('painel-principal');

  const lerPref = () => { try { return localStorage.getItem(PREF); } catch { return null; } };
  const salvarPref = v => { try { localStorage.setItem(PREF, v); } catch {} };
  const naEntrada = () => home && !home.hidden;
  // A música toca só na tela "CENTRAL DE INVESTIGAÇÃO" (painel principal, depois do login).
  const login = document.getElementById('login-screen');
  const naCentral = () => (login && !login.hidden) || (app && central && !app.hidden && !central.hidden);
  let ativado = false; // o navegador só libera som depois do primeiro toque/clique

  // ---------- Botão ----------
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'som-ambiente';
  btn.setAttribute('aria-label', 'Ligar ou desligar som');
  Object.assign(btn.style, {
    position: 'fixed', bottom: '16px', right: '16px', zIndex: '9999',
    padding: '8px 14px', background: '#1d1519e6', color: '#eee0d4',
    border: '1px solid #6d2730', borderRadius: '6px', fontSize: '12px',
    letterSpacing: '2px', cursor: 'pointer'
  });
  document.body.appendChild(btn);

  // ---------- Música do YouTube (tela de entrada) ----------
  let player = null, playerPronto = false, musicaTocando = false, querMusica = false;

  const caixa = document.createElement('div');
  Object.assign(caixa.style, {
    position: 'fixed', left: '0', bottom: '0', width: '1px', height: '1px',
    opacity: '0', pointerEvents: 'none', overflow: 'hidden', zIndex: '-1'
  });
  const alvo = document.createElement('div');
  alvo.id = 'musica-entrada';
  caixa.appendChild(alvo);
  document.body.appendChild(caixa);

  const anterior = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    if (typeof anterior === 'function') anterior();
    player = new YT.Player('musica-entrada', {
      width: '1', height: '1', videoId: VIDEO_ID,
      playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: VIDEO_ID, playsinline: 1, rel: 0 },
      events: {
        onReady: () => {
          playerPronto = true;
          player.setVolume(60);
          if (querMusica && naCentral()) tocarMusica();
        },
        onStateChange: e => {
          musicaTocando = e.data === YT.PlayerState.PLAYING;
          if (e.data === YT.PlayerState.ENDED) { player.seekTo(0); player.playVideo(); }
          atualizarBotao();
        }
      }
    });
  };
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  function tocarMusica() {
    querMusica = true;
    if (playerPronto) { player.unMute(); player.playVideo(); }
    atualizarBotao();
  }
  function pararMusica() {
    querMusica = false;
    if (playerPronto) player.pauseVideo();
    musicaTocando = false;
    atualizarBotao();
  }

  // ---------- Som ambiente (depois da entrada) ----------
  let ctx = null, master = null, ambienteLigado = false;

  function iniciarAmbiente() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const eco = ctx.createDelay(); eco.delayTime.value = 0.6;
    const ecoGain = ctx.createGain(); ecoGain.gain.value = 0.45;
    eco.connect(ecoGain); ecoGain.connect(eco); ecoGain.connect(master);

    [55, 82.4, 110.5].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = i === 1 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.08;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.03;
      const lg = ctx.createGain(); lg.gain.value = 0.05;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(master); o.start(); lfo.start();
    });

    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const ruido = ctx.createBufferSource(); ruido.buffer = buf; ruido.loop = true;
    const filtro = ctx.createBiquadFilter(); filtro.type = 'bandpass';
    filtro.frequency.value = 400; filtro.Q.value = 0.8;
    const fl = ctx.createOscillator(); fl.frequency.value = 0.07;
    const flg = ctx.createGain(); flg.gain.value = 250;
    fl.connect(flg); flg.connect(filtro.frequency);
    const rg = ctx.createGain(); rg.gain.value = 0.05;
    ruido.connect(filtro); filtro.connect(rg); rg.connect(master);
    ruido.start(); fl.start();

    const notas = [220, 233.1, 261.6, 311.1, 329.6, 440, 466.2];
    const tocar = () => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = notas[Math.floor(Math.random() * notas.length)];
      const g = ctx.createGain(); const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
      o.connect(g); g.connect(master); g.connect(eco);
      o.start(t); o.stop(t + 4.2);
      setTimeout(tocar, 3000 + Math.random() * 6000);
    };
    tocar();
  }

  function ligarAmbiente() {
    if (!ctx) iniciarAmbiente();
    ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 2);
    ambienteLigado = true;
    atualizarBotao();
  }
  function desligarAmbiente() {
    if (ctx) master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    ambienteLigado = false;
    atualizarBotao();
  }

  // ---------- Controle ----------
  function atualizarBotao() {
    if (naCentral()) {
      btn.textContent = (querMusica || musicaTocando) ? '♪ MÚSICA: LIGADA' : '♪ MÚSICA: DESLIGADA';
    } else {
      btn.textContent = ambienteLigado ? '♪ SOM: LIGADO' : '♪ SOM: DESLIGADO';
    }
  }

  // Decide o que toca conforme a tela aberta.
  function sincronizar() {
    const somPermitido = ativado && lerPref() !== '0';
    if (naCentral()) {
      if (ambienteLigado) desligarAmbiente();
      if (somPermitido && !querMusica) tocarMusica();
    } else {
      if (querMusica || musicaTocando) pararMusica();
      if (naEntrada()) { if (ambienteLigado) desligarAmbiente(); }
      else if (somPermitido && !ambienteLigado) ligarAmbiente();
    }
    atualizarBotao();
  }

  btn.onclick = e => {
    e.stopPropagation();
    ativado = true;
    if (naCentral()) {
      if (querMusica || musicaTocando) { pararMusica(); salvarPref('0'); }
      else { tocarMusica(); salvarPref('1'); }
    } else {
      if (ambienteLigado) { desligarAmbiente(); salvarPref('0'); }
      else { ligarAmbiente(); salvarPref('1'); }
    }
  };

  const primeiroToque = () => {
    if (ativado) return;
    ativado = true;
    sincronizar();
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, primeiroToque, { capture: true }));

  // O som ambiente começa ao clicar em "Entrar na investigação".
  const entrar = document.getElementById('enter-button');
  if (entrar) entrar.addEventListener('click', () => { ativado = true; setTimeout(sincronizar, 0); });

  const obs = new MutationObserver(sincronizar);
  [home, login, app, central].forEach(el => el && obs.observe(el, { attributes: true, attributeFilter: ['hidden'] }));

  atualizarBotao();
})();