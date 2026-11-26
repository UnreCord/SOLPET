// Graba la app real en un celular simulado (iPhone 13) con un guion de uso.
// Guarda los cuadros (screencast) con su tiempo y un registro de en qué segundo empieza cada paso.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/frames';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// el dedo: un círculo que aparece donde se toca, y que puede deslizarse
const DEDO = () => {
  const css = `.dedo{position:fixed;z-index:99999;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
    background:rgba(255,255,255,.55);border:3px solid rgba(0,90,38,.85);box-shadow:0 4px 14px rgba(0,0,0,.25);
    pointer-events:none;transform:scale(.6);opacity:0;transition:transform .18s,opacity .18s}
    .dedo.on{transform:scale(1);opacity:1}.dedo.tap{animation:tap .55s ease-out forwards}
    @keyframes tap{0%{transform:scale(.6);opacity:1}40%{transform:scale(1);opacity:1}100%{transform:scale(1.5);opacity:0}}
    .aviso-sim{position:fixed;left:16px;right:16px;bottom:24px;z-index:99998;padding:16px 18px;border-radius:18px;
    background:#fff;box-shadow:0 12px 34px rgba(0,40,15,.3);font:600 15px/1.4 "Bricolage Grotesque",system-ui;color:#005a26;
    display:flex;gap:12px;align-items:center;pointer-events:none;opacity:0;transform:translateY(20px);transition:.3s}
    .aviso-sim.on{opacity:1;transform:none}.aviso-sim b{display:grid;place-items:center;width:40px;height:40px;flex:none;
    border-radius:50%;background:#e6f2ea;font-size:20px}`;
  const add = () => {
    if (document.querySelector('.dedo')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const d = document.createElement('div'); d.className = 'dedo'; document.body.appendChild(d);
  };
  window.__tap = (x, y) => { add(); const d = document.querySelector('.dedo'); d.className = 'dedo'; d.style.left = x + 'px'; d.style.top = y + 'px'; void d.offsetWidth; d.className = 'dedo tap'; };
  window.__drag = (x1, y1, x2, y2, ms) => new Promise(res => {
    add(); const d = document.querySelector('.dedo'); d.className = 'dedo on'; d.style.transition = 'none';
    d.style.left = x1 + 'px'; d.style.top = y1 + 'px'; void d.offsetWidth;
    d.style.transition = `left ${ms}ms ease-in-out, top ${ms}ms ease-in-out, transform .18s, opacity .18s`;
    d.style.left = x2 + 'px'; d.style.top = y2 + 'px';
    setTimeout(() => { d.className = 'dedo'; d.style.transition = ''; res(); }, ms + 50);
  });
  window.__aviso = (icono, texto, ms) => {
    add(); let a = document.querySelector('.aviso-sim');
    if (!a) { a = document.createElement('div'); a.className = 'aviso-sim'; document.body.appendChild(a); }
    a.innerHTML = `<b>${icono}</b><span>${texto}</span>`; void a.offsetWidth; a.classList.add('on');
    setTimeout(() => a.classList.remove('on'), ms);
  };
};

// dictado por voz simulado: el texto aparece de a poco, como en el celular
const VOZ = () => {
  class Rec {
    start() {
      const partes = ['estoy', 'estoy en', 'estoy en Mira', 'estoy en Miraflo', 'estoy en Miraflores'];
      partes.forEach((t, i) => setTimeout(() => this.onresult && this.onresult({ results: [[{ transcript: t }]] }), 900 + i * 420));
      setTimeout(() => this.onend && this.onend(), 900 + partes.length * 420 + 700);
    }
    stop() {}
  }
  window.SpeechRecognition = window.webkitSpeechRecognition = Rec;
  // acceso al mapa para ubicar los pines en pantalla
  let ml; Object.defineProperty(window, 'maplibregl', { configurable: true, get: () => ml, set: v => { const M = v.Map; v.Map = class extends M { constructor(o) { super(o); window.__m = this; } }; ml = v; } });
  // los enlaces externos no salen de la app durante la grabación
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="https://wa.me"], a.store__go, a.card__go'); if (a) { e.preventDefault(); window.__ultimoEnlace = a.href; } }, true);
};

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-device-scale-factor=1.5'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5,
    geolocation: { latitude: -12.0905, longitude: -77.0420 }, permissions: ['geolocation'] }); // Lince / San Isidro
  const p = await ctx.newPage();
  await p.addInitScript(DEDO); await p.addInitScript(VOZ);
  await p.goto('http://127.0.0.1:8767/', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.waitForTimeout(3500);

  // screencast
  const cdp = await ctx.newCDPSession(p);
  let n = 0; const lista = [];
  cdp.on('Page.screencastFrame', async f => {
    const name = `f${String(n++).padStart(5, '0')}.jpg`;
    fs.writeFileSync(`${OUT}/${name}`, Buffer.from(f.data, 'base64'));
    lista.push([name, f.metadata.timestamp]);
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1, maxWidth: 585, maxHeight: 1266 });
  const t0 = Date.now() / 1000;
  const pasos = [];
  const paso = id => { pasos.push([id, Date.now() / 1000]); console.log('paso', id, (Date.now() / 1000 - t0).toFixed(1)); };
  const centro = async sel => { const bb = await p.locator(sel).first().boundingBox(); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; };
  const tocar = async (sel, espera = 700) => { const [x, y] = await centro(sel); await p.evaluate(([x, y]) => window.__tap(x, y), [x, y]); await sleep(260); await p.locator(sel).first().click(); await sleep(espera); };
  const tocarXY = async (x, y, espera = 700) => { await p.evaluate(([x, y]) => window.__tap(x, y), [x, y]); await sleep(260); await p.mouse.click(x, y); await sleep(espera); };

  // 0. portada
  paso('intro'); await sleep(4500);

  // 1. todas las tiendas: se toca un grupo y el mapa se acerca
  paso('mapa'); await sleep(1500);
  const grupo = await p.evaluate(() => { const fs = window.__m.queryRenderedFeatures({ layers: ['store-clusters'] }); let best = fs.sort((a, b) => b.properties.point_count - a.properties.point_count)[0]; const q = window.__m.project(best.geometry.coordinates); const r = document.querySelector('#map').getBoundingClientRect(); return [r.left + q.x, r.top + q.y]; });
  await tocarXY(grupo[0], grupo[1], 3200);

  // 2. deslizar las tarjetas
  paso('tarjetas'); await sleep(800);
  for (let i = 0; i < 2; i++) {
    const deck = await p.locator('#deck').boundingBox();
    const y = deck.y + deck.height / 2;
    p.evaluate(([a, y, c]) => window.__drag(a, y, c, y, 650), [deck.x + deck.width * .8, y, deck.x + deck.width * .2]);
    await p.evaluate(() => { const d = document.querySelector('#deck'); d.dispatchEvent(new Event('pointerdown')); d.scrollBy({ left: d.querySelector('.card').offsetWidth + 10, behavior: 'smooth' }); });
    await sleep(3200);
  }

  // 3. buscar por distrito
  paso('buscar'); await sleep(600);
  await tocar('#store-q', 500);
  await p.keyboard.type('Surco', { delay: 230 }); await sleep(2800);
  await tocar('#open-list', 2600);
  await tocar('#close-list', 900);
  await p.evaluate(() => { const q = document.querySelector('#store-q'); q.value = ''; q.dispatchEvent(new Event('input')); q.blur(); });
  await sleep(1500);

  // 4. cerca de mí
  paso('cerca'); await sleep(600);
  await tocar('#near-me', 6500);

  // 5. dictado por voz
  paso('voz'); await sleep(600);
  await tocar('#voice', 9000);

  // 6. cómo llegar
  paso('llegar'); await sleep(600);
  const go = '.card.is-active .card__go';
  await tocar(go, 200);
  const destino = await p.evaluate(() => document.querySelector('.card.is-active .store__name').textContent);
  await p.evaluate(d => window.__aviso('➜', `Se abre Google Maps con la ruta en auto hasta ${d}`, 3600), destino);
  await sleep(4200);

  // 7. ver lista
  paso('lista'); await sleep(500);
  await tocar('#open-list', 1600);
  const lb = await p.locator('#store-list').boundingBox();
  p.evaluate(([x, a, c]) => window.__drag(x, a, x, c, 900), [lb.x + lb.width * .6, lb.y + lb.height * .75, lb.y + lb.height * .25]);
  await p.evaluate(() => document.querySelector('#store-list').scrollBy({ top: 520, behavior: 'smooth' }));
  await sleep(2600);
  await tocar('#close-list', 1200);

  // 8. minimizar tarjetas
  paso('minimizar'); await sleep(500);
  await tocar('#toggle-deck', 2600);
  await tocar('#toggle-deck', 1800);

  // 9. whatsapp
  paso('whatsapp'); await sleep(500);
  await tocar('#wsp', 300);
  const enlace = await p.evaluate(() => window.__ultimoEnlace);
  const mensaje = decodeURIComponent(enlace.split('text=')[1] || '');
  console.log('mensaje WhatsApp:', mensaje);
  await p.setContent(fs.readFileSync(__dirname + '/whatsapp.html', 'utf8').replace('{{MENSAJE}}', mensaje.replace(/&/g, '&amp;').replace(/</g, '&lt;')), { waitUntil: 'networkidle' });
  await p.evaluate(DEDO);
  await sleep(2600);
  await tocar('#enviar', 300);
  await p.evaluate(() => window.__enviar());
  await sleep(3600);

  // 10. cierre
  paso('cierre'); await sleep(5500);
  paso('fin');

  await cdp.send('Page.stopScreencast');
  await sleep(300);
  fs.writeFileSync(__dirname + '/registro.json', JSON.stringify({ t0, pasos, cuadros: lista }, null, 1));
  console.log('cuadros', lista.length, 'duración', (Date.now() / 1000 - t0).toFixed(1), 's');
  await b.close();
})();
