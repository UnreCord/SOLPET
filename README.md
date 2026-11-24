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
- `mapa/tiendas.js`: **los puntos de venta**, tomados de la tabla `DIRECCIONES.xlsx` (nombre, logo, distrito,
  dirección, coordenadas y web si tiene tienda online). Una fila sin dirección es una tienda solo online; con dirección
  pero sin coordenadas sale en la lista sin pin. La tabla trae también los productos de cada punto, pero el mapa no los muestra.
- `mapa/mapa.js`, `mapa/app.js`: el mapa, los pines, la lista y las tarjetas. `mapa/base.css`, `mapa/estilos.css`: colores y diseño.
- `assets/logos/`: logos de los clientes (cuadrados de 240 px en WebP). Para una tienda nueva, guardar su logo ahí y
  poner el nombre del archivo (sin `.webp`) en su fila de `tiendas.js`. Sin logo, sale con sus iniciales.
- `assets/`: logo de Solpet, la huella, los pines y los iconos. `assets/vendor/maplibre/`: librería del mapa (BSD).
- `propuesta-1/`, `propuesta-2/`: direcciones anteriores; solo redirigen al mapa, para que no se rompan enlaces o QR
  que ya se hayan compartido.
- `qr/`: el QR (PNG para imprimir, SVG vectorial y una tarjeta lista para compartir).

## QR

`qr/qr-mapa-solpet.*` lleva directo a https://unrecord.github.io/SOLPET/ y funciona en cuanto GitHub Pages esté activo.
Si el mapa se publica en otra dirección (por ejemplo un dominio propio), se regenera así:

```bash
pip install segno pillow
```

```bash
python3 herramientas/generar-qr.py https://la-direccion-final/ qr-mapa-solpet
```

Usa corrección de errores alta, así que se lee aunque la huella tape el centro. Si la dirección cambia después de
imprimir el QR, los impresos dejan de funcionar: conviene definirla antes de imprimir.

## Pendiente

- **Sin pin** (salen en la lista con "Cómo llegar"):
  - Veterinaria San Felipe, Los Olivos ("Asentamiento San Martín"): no tiene número de puerta.
  - Veterinaria Mundo Animal, Chorrillos ("Av. Alameda Los Horizontes Mza. A1 Lote 15 Urb. L..."): en la tabla la
    urbanización está cortada y la avenida es larga; falta el nombre completo de la urbanización.
  - Peluditos Pet Shop, "Av. Central 993, Lima": OpenStreetMap no encuentra una Av. Central en el Cercado de Lima; falta confirmar el distrito.
- **Pin aproximado** (marcados `'calle'` en `tiendas.js`): OpenStreetMap no tiene esos números de puerta y el pin se
  calculó sobre el trazo de la calle (100 números ≈ una cuadra), así que puede quedar a una o dos cuadras y la distancia
  en auto puede diferir más de la de Google Maps: Pals & Tails, T&M (Magdalena y La Victoria) y Veterinaria Engreídos.
  Para corregir uno, copiar las coordenadas del local en Google Maps (clic derecho sobre el local), pegarlas en su fila
  y cambiar `'calle'` por `'google'`. Ya corregidos con Google Maps: Lumpet, The Urban Pets, American Vet (San Borja),
  Peluditos (Pueblo Libre) y Naricitas (×2).
