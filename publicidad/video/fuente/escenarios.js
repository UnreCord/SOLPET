const { chromium } = require('playwright');
(async () => {
  const vert = process.argv[2] === 'v'; const b = await chromium.launch(); const p = await b.newPage({ viewport: vert ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 } });
  for (const id of ['intro', 'mapa', 'tarjetas', 'buscar', 'cerca', 'voz', 'llegar', 'lista', 'minimizar', 'whatsapp', 'cierre']) {
    await p.goto(`file://${__dirname}/${vert ? 'escenario-vertical' : 'escenario'}.html?paso=${id}`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.evaluate(() => window.__acomodar()); await p.waitForTimeout(250);
    if (!await p.evaluate(() => document.fonts.check('800 40px "Bricolage Grotesque"'))) throw new Error('fuente');
    await p.screenshot({ path: `${__dirname}/${vert ? 'escv' : 'esc'}-${id}.png` });
  }
  await b.close(); console.log('ok');
})();
