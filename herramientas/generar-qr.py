"""Genera el QR del mapa Solpet con la huella al centro.

Uso (desde la carpeta del repositorio):
    pip install segno pillow
    python3 herramientas/generar-qr.py <URL> [nombre]

Crea en qr/:
    <nombre>.png / .svg              QR verde con la huella amarilla (el principal)
    <nombre>-negro.png / -negro.svg  QR negro, para impresiones en blanco y negro
    <nombre>-tarjeta.png             QR con el logo de Solpet y una línea de texto, listo para compartir
Los PNG miden 3000 px (sirven para imprimir hasta ~25 cm a 300 ppp); los SVG son vectoriales, con la huella
también en vector: sirven para cualquier tamaño (roll-up, banners). Se usa corrección de errores alta (H):
el QR se lee aunque la huella tape el centro.
"""
import re
import sys
from pathlib import Path

import segno
from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
ASSETS = RAIZ / 'assets'
SALIDA = RAIZ / 'qr'
BLANCO = (255, 255, 255)
HUELLA = 0.24      # ancho de la huella respecto al QR (sin el margen)
ESTILOS = {
    '': {'color': (0, 122, 51), 'hex': '#007A33', 'huella': 'huella-solpet'},
    '-negro': {'color': (17, 17, 17), 'hex': '#111111', 'huella': 'huella-negra'},
}


def matriz(url):
    qr = segno.make(url, error='h', boost_error=False)
    return [list(row) for row in qr.matrix]


def png(url, estilo, lado=3000, borde=4):
    m = matriz(url)
    n = len(m)
    mod = lado // (n + borde * 2)
    tam = mod * (n + borde * 2)
    im = Image.new('RGB', (tam, tam), BLANCO)
    d = ImageDraw.Draw(im)
    for y, fila in enumerate(m):
        for x, v in enumerate(fila):
            if v:
                x0, y0 = (x + borde) * mod, (y + borde) * mod
                d.rectangle([x0, y0, x0 + mod - 1, y0 + mod - 1], fill=estilo['color'])
    # huella al centro sobre un círculo blanco (dibujado a 4x para que el borde salga suave)
    h = round(n * mod * HUELLA)
    c = tam // 2
    aire = round(mod * 1.2)
    r = h // 2 + aire
    k = 4
    disco = Image.new('L', (2 * r * k, 2 * r * k), 0)
    ImageDraw.Draw(disco).ellipse([0, 0, 2 * r * k - 1, 2 * r * k - 1], fill=255)
    disco = disco.resize((2 * r, 2 * r), Image.LANCZOS)
    im.paste(Image.new('RGB', (2 * r, 2 * r), BLANCO), (c - r, c - r), disco)
    huella = Image.open(ASSETS / f"{estilo['huella']}.png").convert('RGBA').resize((h, h), Image.LANCZOS)
    im.paste(huella, (c - h // 2, c - h // 2), huella)
    return im


def svg(url, estilo, borde=4):
    m = matriz(url)
    n = len(m)
    tam = n + borde * 2
    rects = ''.join(f'M{x + borde} {y + borde}h1v1h-1z' for y, fila in enumerate(m) for x, v in enumerate(fila) if v)
    h = n * HUELLA
    c = tam / 2
    # la huella vectorial se incrusta como un svg anidado
    huella = (ASSETS / f"{estilo['huella']}.svg").read_text()
    vb = re.search(r'viewBox="([^"]+)"', huella).group(1)
    cuerpo = huella[huella.index('>') + 1:huella.rindex('</svg>')]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {tam} {tam}">'
        f'<rect width="{tam}" height="{tam}" fill="#fff"/>'
        f'<path fill="{estilo["hex"]}" shape-rendering="crispEdges" d="{rects}"/>'
        f'<circle cx="{c}" cy="{c}" r="{h / 2 + 1.2}" fill="#fff"/>'
        f'<svg x="{c - h / 2}" y="{c - h / 2}" width="{h}" height="{h}" viewBox="{vb}">{cuerpo}</svg>'
        '</svg>'
    )


def fuente(tam, negrita=False):
    for f in (['DejaVuSans-Bold.ttf', 'Arial Bold.ttf', 'arialbd.ttf'] if negrita else ['DejaVuSans.ttf', 'Arial.ttf', 'arial.ttf']):
        for base in ('/usr/share/fonts/truetype/dejavu/', '/Library/Fonts/', 'C:/Windows/Fonts/', ''):
            try:
                return ImageFont.truetype(base + f, tam)
            except OSError:
                pass
    return ImageFont.load_default()


def tarjeta(qr_img):
    W, H = 1200, 1480
    verde = ESTILOS['']['color']
    im = Image.new('RGB', (W, H), BLANCO)
    d = ImageDraw.Draw(im)
    d.rectangle([0, H - 150, W, H], fill=verde)
    logo = Image.open(ASSETS / 'solpet-logo.png').convert('RGBA')
    lw = 560
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    im.paste(logo, ((W - lw) // 2, 80), logo)
    q = qr_img.resize((960, 960), Image.LANCZOS)
    im.paste(q, ((W - 960) // 2, 290))
    t = 'Escanea y encuentra tu punto de venta'
    f = fuente(46, True)
    tw = d.textlength(t, font=f)
    d.text(((W - tw) / 2, H - 150 + 48), t, font=f, fill=BLANCO)
    return im


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    url = sys.argv[1]
    nombre = sys.argv[2] if len(sys.argv) > 2 else 'qr-mapa-solpet'
    SALIDA.mkdir(exist_ok=True)
    for sufijo, estilo in ESTILOS.items():
        im = png(url, estilo)
        im.save(SALIDA / f'{nombre}{sufijo}.png', optimize=True)
        (SALIDA / f'{nombre}{sufijo}.svg').write_text(svg(url, estilo), encoding='utf-8')
        if not sufijo:
            tarjeta(im).save(SALIDA / f'{nombre}-tarjeta.png', optimize=True)
    print(f'QR para {url} -> {SALIDA}/{nombre}[ -negro].png/.svg y {nombre}-tarjeta.png')


if __name__ == '__main__':
    main()
