# Mapa de puntos de venta Solpet

Mapa interactivo con todos los puntos de venta, pensado sobre todo para el celular (también funciona en laptop),
con el logo de Solpet y el verde `#007A33`. No menciona productos ni marcas: solo las tiendas, sus direcciones,
"Cómo llegar" y la web de las que venden online.

**Sitio:** https://unrecord.github.io/SOLPET/

- **Celular:** el mapa ocupa toda la pantalla. Las tiendas se recorren deslizando las tarjetas de abajo (cada tarjeta
  enciende su pin) y "Ver lista" abre todas las tiendas agrupadas por distrito.
- **PC / laptop:** como "Dónde comprar" de la web de referencia: panel fijo a la izquierda con el logo, el buscador y la
  lista por distrito, y el mapa a la derecha. Al elegir una tienda (en la lista o en su pin) se abre su ficha sobre el mapa.
- En el celular, mientras se mueve el mapa, la barra y las tarjetas se vuelven transparentes. Las tarjetas se pueden
  minimizar con el botón de doble flecha que está junto a "Ver lista".
- Buscador (distrito, tienda o calle) con **búsqueda por voz**: tocando el micrófono, la persona dice su distrito o zona
  ("estoy en Miraflores", "cerca de Larcomar") y el mapa le muestra la tienda más cercana. Funciona en Chrome (Android
  y PC) y Safari (iPhone); en navegadores sin reconocimiento de voz el micrófono no aparece. Si se escribe un lugar que no
  es una tienda y se pulsa "Buscar", hace lo mismo.
- **"Cerca de mí"**: ordena las tiendas por la **distancia en auto** por las calles (servicio de rutas OSRM sobre
  OpenStreetMap, el mismo tipo de cálculo que Google Maps) y marca tu ubicación. Si ese servicio no responde, usa la
  distancia en línea recta y lo indica. No se muestra el tiempo de viaje, porque el servicio no considera el tráfico.
- `mapa/lugares.js`: los 50 distritos de Lima y Callao (y nombres de uso común como "Surco", "SJL" o "Cercado") para la
  búsqueda por lugar; otras zonas se buscan en OpenStreetMap.

- **Contacto:** botón de WhatsApp abajo a la derecha (en el celular, en la fila de "Ver lista") que abre un chat con el
  **+51 960 471 967** y este mensaje ya escrito: *"Hola, necesito saber cuáles son las tiendas más cercanas a
  [Inserte ubicación referencial]."* Si la persona buscó un lugar o usó "Cerca de mí", el mensaje ya lleva ese lugar
  (o un enlace a su ubicación). Al final de la lista también están "WhatsApp" y "Llamar al 960 471 967".
  El número y el mensaje se cambian en `mapa/app.js` (`TELEFONO` y `mensajeWhatsApp`).

## Publicar en GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. En **Source**, elegir **Deploy from a branch**, rama **`main`** y carpeta **`/ (root)`**, y guardar.
3. En uno o dos minutos el sitio queda en https://unrecord.github.io/SOLPET/. Cada vez que se fusiona un PR en `main`,
   GitHub Pages se actualiza solo.

No necesita compilación: es HTML, CSS y JavaScript. Para verlo en la computadora hay que abrirlo desde un servidor
(no con doble clic), por ejemplo con `npx serve .` desde la raíz del repositorio. Necesita internet para las fuentes y
el mapa base (openfreemap.org).

## Archivos

- `index.html`: la página del mapa.
- `mapa/tiendas.js`: **los puntos de venta**, tomados de la tabla `DIRECCIONES_COORDENADAS.xlsx` (nombre, logo,
  distrito, dirección, coordenadas de Google Maps y web si tiene tienda online). Una fila sin dirección es una tienda solo online; con dirección
  pero sin coordenadas sale en la lista sin pin. La tabla trae también los productos de cada punto, pero el mapa no los muestra.
- `mapa/mapa.js`, `mapa/app.js`: el mapa, los pines, la lista y las tarjetas. `mapa/base.css`, `mapa/estilos.css`: colores y diseño.
- `assets/logos/`: logos de los clientes (cuadrados de 240 px en WebP). Para una tienda nueva, guardar su logo ahí y
  poner el nombre del archivo (sin `.webp`) en su fila de `tiendas.js`. Sin logo, sale con sus iniciales.
- `assets/`: logo de Solpet, la huella, los pines y los iconos. `assets/vendor/maplibre/`: librería del mapa (BSD).
- `propuesta-1/`, `propuesta-2/`: direcciones anteriores; solo redirigen al mapa, para que no se rompan enlaces o QR
  que ya se hayan compartido.
- `qr/`: el QR (PNG para imprimir, SVG vectorial y una tarjeta lista para compartir).
- `assets/compartir.png`: imagen que aparece al compartir el enlace en WhatsApp, Facebook, etc. (1200 × 630). Las
  etiquetas `og:` de `index.html` usan la dirección completa del sitio: si el mapa se publica en otra dirección, hay
  que cambiarla ahí (y en `canonical`).
- `404.html`: si alguien abre una dirección que no existe dentro del sitio, lo lleva al mapa.
- `manifest.webmanifest`: nombre e iconos para "Agregar a la pantalla de inicio" en el celular.

## QR

`qr/` tiene el QR que lleva directo a https://unrecord.github.io/SOLPET/:

- `qr-mapa-solpet.svg` / `.png`: verde con la huella amarilla (el principal). El SVG es vectorial, también la huella:
  sirve para cualquier tamaño. El PNG mide 3000 px.
- `qr-mapa-solpet-negro.svg` / `.png`: en negro, para impresiones en blanco y negro.
- `qr-mapa-solpet-tarjeta.png`: QR con el logo y una línea de texto, para compartir.

Usa corrección de errores alta, así que se lee aunque la huella tape el centro. Si el mapa se publica en otra
dirección (por ejemplo un dominio propio), se regenera así y luego se regeneran las piezas de publicidad:

```bash
pip install segno pillow
```

```bash
python3 herramientas/generar-qr.py https://la-direccion-final/ qr-mapa-solpet
```

## Publicidad

`publicidad/` tiene el kit para activaciones, ferias y redes (roll-up, afiche, hablador, sticker, pantalla, historia y
post), con el QR y una captura real del mapa. Ver `publicidad/README.md` para las medidas y las indicaciones de imprenta.
`publicidad/video/` tiene el video guía (horizontal y vertical, sin música) para pantallas de eventos.

## Pendiente

- Los logos de Veterinaria Engreídos, +KOTAS, Veterinaria San Felipe y Pets Canadá son muy anchos (horizontales):
  en el cuadrado de la tarjeta se ven pequeños. Con una versión cuadrada del logo de cada tienda se verían mejor.
