"""Arma los videos a partir de la grabación (registro.json + frames/) y de los fondos (esc-*.png, escv-*.png).
Uso, desde publicidad/video/fuente:  python3 armar.py
"""
import json, subprocess
from PIL import Image, ImageDraw

r = json.load(open('registro.json')); t0 = r['t0']; c = r['cuadros']
pasos = [(pid, t - t0) for pid, t in r['pasos']]
fin = dict(pasos)['fin']; pasos = [p for p in pasos if p[0] != 'fin']
lines = []
for i, (n, t) in enumerate(c):
    start = t0 if i == 0 else t
    end = c[i + 1][1] if i + 1 < len(c) else t0 + fin
    lines.append(f"file 'frames/{n}'\nduration {max(end - start, 0.001):.4f}")
lines.append(f"file 'frames/{c[-1][0]}'")
open('celular.txt', 'w').write('\n'.join(lines) + '\n')

# (prefijo de fondos, pantalla ancho, alto, x, y, radio, salida)
for pref, W, H, X, Y, R, salida in [('esc', 444, 960, 1010, 60, 53, '../guia-mapa-solpet-1920x1080.mp4'),
                                     ('escv', 502, 1082, 79, 649, 61, '../guia-mapa-solpet-1080x1920.mp4')]:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'celular.txt',
                    '-vf', f'fps=30,scale={W}:{H}:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', f'cel-{pref}.mp4'], check=True)
    k = 4; m = Image.new('L', (W * k, H * k), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, W * k - 1, H * k - 1], radius=R * k, fill=255)
    m.resize((W, H), Image.LANCZOS).save(f'mascara-{pref}.png')
    F = 0.5; ids = [p[0] for p in pasos]; T = [p[1] for p in pasos] + [fin]
    inputs, filt = [], []
    for i, pid in enumerate(ids):
        L = (T[i + 1] - T[i]) + (F / 2 if i in (0, len(ids) - 1) else F)
        inputs += ['-loop', '1', '-framerate', '30', '-t', f'{L:.3f}', '-i', f'{pref}-{pid}.png']
    prev = '[0:v]'
    for i in range(1, len(ids)):
        filt.append(f'{prev}[{i}:v]xfade=transition=fade:duration={F}:offset={T[i] - F / 2:.3f}[x{i}]'); prev = f'[x{i}]'
    n = len(ids)
    inputs += ['-i', f'cel-{pref}.mp4', '-loop', '1', '-i', f'mascara-{pref}.png']
    filt += [f'[{n + 1}:v]format=gray[m]', f'[{n}:v]format=rgba[cel]', '[cel][m]alphamerge[celm]', f'{prev}format=rgba[fondo]',
             f'[fondo][celm]overlay={X}:{Y}:shortest=1:format=auto,format=yuv420p[v]']
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filt), '-map', '[v]', '-an', '-r', '30', '-t', f'{fin:.3f}',
                    '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', salida], check=True)
    print('listo', salida)
