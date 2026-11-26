# Kit de publicidad del mapa de puntos de venta Solpet

Todas las piezas llevan el QR que abre **https://unrecord.github.io/SOLPET/**.

## Piezas

| Archivo | Medida final | Para qué |
|---|---|---|
| `rollup-85x200.pdf` | 85 × 200 cm | Roll-up / banner del stand |
| `afiche-a3.pdf` | 29,7 × 42 cm (A3) | Paredes y vitrinas. Se puede imprimir en A4 escalando al 71 % |
| `hablador-a5.pdf` | 14,8 × 21 cm (A5) | Hablador de mesa o mostrador |
| `sticker-10x10.pdf` | 10 × 10 cm | Sticker o volante para repartir y pegar en bolsas o cajas |
| `pantalla-1920x1080.png` | 1920 × 1080 px | TV o monitor del stand (el QR se escanea desde la pantalla) |
| `historia-1080x1920.png` | 1080 × 1920 px | Historias de Instagram y estados de WhatsApp |
| `post-1080x1080.png` | 1080 × 1080 px | Publicación en el feed |
| `../assets/compartir.png` | 1200 × 630 px | Imagen que sale al compartir el enlace (WhatsApp, Facebook) |

Los `*-vista.png` son vistas previas de las piezas impresas, para revisarlas o enviarlas por chat; **no son para imprimir**.

## Indicaciones para la imprenta

- Los PDF traen **3 mm de sangrado** por lado (el afiche A3 mide 30,3 × 42,6 cm con sangrado). Hay que cortar a la medida final.
- Texto, logo y QR van en **vector**, y la tipografía (Bricolage Grotesque) va incrustada, así que se pueden imprimir
  a cualquier tamaño sin perder nitidez. La única imagen es la captura del celular.
- Colores de marca: verde `#007A33`, amarillo `#F6BB2F`. Los PDF están en RGB; si la imprenta trabaja en CMYK, que
  haga la conversión con su perfil y revise que el verde no se apague.
- **Roll-up:** los últimos ~12 cm (franja amarilla) quedan libres, porque en muchos modelos la base los tapa.
  Si la imprenta pide más sangrado abajo o arriba para el mecanismo, se puede ampliar la franja amarilla.
- **QR:** no lo achiquen por debajo de 2,5 × 2,5 cm. Probar siempre una impresión con la cámara de un celular antes
  de imprimir el tiraje completo.

## Cómo modificarlas

Las piezas están en `fuente/` como HTML. Por ejemplo, para cambiar un texto se edita el archivo y luego se
regeneran todas con:

```bash
node herramientas/generar-publicidad.js
```

(desde la raíz del repositorio; necesita Node e internet para la tipografía; antes: `npm install playwright`
y `npx playwright install chromium`).

Si cambia la dirección del mapa, primero se regenera el QR y después las piezas:

```bash
python3 herramientas/generar-qr.py https://la-direccion-nueva/ qr-mapa-solpet
```

```bash
node herramientas/generar-publicidad.js
```

`fuente/app-celular.jpg` es una captura real del mapa (búsqueda «Cerca de Miraflores») que va dentro del celular.
