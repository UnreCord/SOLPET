// Exporta las piezas de publicidad de publicidad/fuente/*.html a publicidad/.
//
// Uso (desde la carpeta del repositorio, con Node 18 o más):
//   npm install playwright && npx playwright install chromium
//   node herramientas/generar-publicidad.js            (todas las piezas)
//   node herramientas/generar-publicidad.js afiche-a3  (solo una)
//
// Cada pieza declara su tamaño en la etiqueta <html>:
//   data-impresion="297x420"  -> pieza para imprenta, en mm: sale un PDF con 3 mm de sangrado
//                                (texto, logo y QR en vector) y un PNG de vista previa de data-vista px de ancho
//   data-digital="1080x1920"  -> pieza para pantallas o redes, en px: sale un PNG de ese tamaño
// Dentro de las piezas todo se mide en rem: 100rem = ancho de la pieza.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');
const FUENTE = path.join(RAIZ, 'publicidad', 'fuente');
const SALIDA = path.join(RAIZ, 'publicidad');
const SANGRADO = 3; // mm
const MM = 96 / 25.4; // px por mm en el navegador

async function cargar(page, file, vars) {
  await page.goto('file://' + file, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: `:root{${vars}}` });
  await page.evaluate(() => document.fonts.ready);
  const ok = await page.evaluate(() => document.fonts.check('800 40px "Bricolage Grotesque"'));
  if (!ok) throw new Error('No cargó la tipografía Bricolage Grotesque (¿hay internet?)');
  await page.waitForTimeout(300);
}

(async () => {
  const solo = process.argv[2];
  const piezas = fs.readdirSync(FUENTE).filter(f => f.endsWith('.html') && (!solo || f === `${solo}.html`));
  const browser = await chromium.launch();
  for (const f of piezas) {
    const file = path.join(FUENTE, f);
    const nombre = f.replace('.html', '');
    const html = fs.readFileSync(file, 'utf8');
    const imp = html.match(/data-impresion="(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)"/);
    const dig = html.match(/data-digital="(\d+)x(\d+)"/);
    if (imp) {
      const [w, h] = [Number(imp[1]), Number(imp[2])];
      // PDF para imprenta: tamaño final + 3 mm de sangrado por lado
      const page = await browser.newPage({ viewport: { width: Math.ceil((w + 2 * SANGRADO) * MM), height: Math.ceil((h + 2 * SANGRADO) * MM) } });
      await cargar(page, file, `--w:${w}mm;--h:${h}mm;--b:${SANGRADO}mm;font-size:${w / 100}mm`);
      await page.pdf({ path: path.join(SALIDA, `${nombre}.pdf`), width: `${w + 2 * SANGRADO}mm`, height: `${h + 2 * SANGRADO}mm`, printBackground: true, pageRanges: '1' });
      await page.close();
      // PNG de vista previa (sin sangrado)
      const vw = Number((html.match(/data-vista="(\d+)"/) || [0, 1200])[1]);
      const vh = Math.round(vw * h / w);
      const prev = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
      await cargar(prev, file, `--w:${vw}px;--h:${vh}px;--b:0px;font-size:${vw / 100}px`);
      await prev.screenshot({ path: path.join(SALIDA, `${nombre}-vista.png`) });
      await prev.close();
      console.log(`${nombre}: PDF ${w}×${h} mm (+${SANGRADO} mm de sangrado) y vista previa ${vw}×${vh} px`);
    } else if (dig) {
      const [w, h] = [Number(dig[1]), Number(dig[2])];
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      await cargar(page, file, `--w:${w}px;--h:${h}px;--b:0px;font-size:${w / 100}px`);
      await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`) });
      await page.close();
      console.log(`${nombre}: PNG ${w}×${h} px`);
    }
  }
  await browser.close();
})();
