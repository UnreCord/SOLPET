# Video guía del mapa (sin música)

| Archivo | Para |
|---|---|
| `guia-mapa-solpet-1920x1080.mp4` | TV o pantalla horizontal del stand |
| `guia-mapa-solpet-1080x1920.mp4` | Pantalla vertical, tótem o historias |

77 s, 30 cuadros por segundo, sin audio. Se puede poner en bucle. Muestra la app real en un celular, paso a paso:
ver las tiendas, deslizar tarjetas, buscar un distrito, «Cerca de mí», dictado por voz, «Cómo llegar», la lista,
minimizar las tarjetas y escribir por WhatsApp (el chat es una simulación con el mensaje real que arma el mapa).
El QR de la pantalla abre el mapa.

## Regenerarlo (por ejemplo si cambia el mapa)

Desde la raíz del repositorio, con el sitio servido en el puerto 8767:

```bash
python3 -m http.server 8767 --bind 127.0.0.1
```

En otra terminal, desde `publicidad/video/fuente` (necesita Node con Playwright, Python con Pillow y ffmpeg):

```bash
node grabar.js && node escenarios.js && node escenarios.js v && python3 armar.py
```

Los textos de cada paso están en `escenario.html` y `escenario-vertical.html` (objeto `PASOS`).
