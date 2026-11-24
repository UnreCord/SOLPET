// Búsqueda por lugar: "estoy en Miraflores", "cerca de Larcomar"...
// Primero reconoce los distritos de Lima y Callao (centro aproximado, de OpenStreetMap) y sus nombres de uso común;
// si no es un distrito, busca el lugar en OpenStreetMap (Nominatim), solo dentro de Lima.
(function () {
  const DISTRITOS = [
    ["Ancón", -11.69678, -77.11161],
    ["Ate", -12.03873, -76.89687],
    ["Barranco", -12.14396, -77.02027],
    ["Bellavista", -12.05974, -77.11116],
    ["Breña", -12.0597, -77.05012],
    ["Callao", -12.05226, -77.13911],
    ["Carabayllo", -11.79499, -76.98929],
    ["Carmen de la Legua Reynoso", -12.04306, -77.09088],
    ["Chaclacayo", -11.99248, -76.77617],
    ["Chorrillos", -12.19235, -77.00896],
    ["Cieneguilla", -12.07317, -76.77707],
    ["Comas", -11.93286, -77.04067],
    ["El Agustino", -12.04205, -76.99571],
    ["Independencia", -11.98902, -77.04365],
    ["Jesús María", -12.07819, -77.0464],
    ["La Molina", -12.0901, -76.92268],
    ["La Perla", -12.0716, -77.11739],
    ["La Punta", -12.07086, -77.16304],
    ["La Victoria", -12.07399, -77.0182],
    ["Lima", -12.04598, -77.03059],
    ["Lince", -12.0853, -77.03698],
    ["Los Olivos", -11.96599, -77.07307],
    ["Lurigancho", -11.94883, -76.7627],
    ["Lurín", -12.23817, -76.78389],
    ["Magdalena del Mar", -12.09571, -77.06822],
    ["Mi Perú", -11.85353, -77.12036],
    ["Miraflores", -12.1215, -77.02591],
    ["Pachacámac", -12.14954, -76.79128],
    ["Pucusana", -12.46847, -76.77249],
    ["Pueblo Libre", -12.07664, -77.06786],
    ["Puente Piedra", -11.87677, -77.07467],
    ["Punta Hermosa", -12.33268, -76.8257],
    ["Punta Negra", -12.36556, -76.79519],
    ["Rímac", -12.0203, -77.03546],
    ["San Bartolo", -12.38982, -76.78059],
    ["San Borja", -12.09645, -76.99569],
    ["San Isidro", -12.0979, -77.03537],
    ["San Juan de Lurigancho", -11.94875, -76.97791],
    ["San Juan de Miraflores", -12.15539, -76.97244],
    ["San Luis", -12.07236, -76.99589],
    ["San Martín de Porres", -11.98783, -77.09826],
    ["San Miguel", -12.07911, -77.09479],
    ["Santa Anita", -12.04327, -76.96195],
    ["Santa María del Mar", -12.40192, -76.77371],
    ["Santa Rosa", -11.80495, -77.16],
    ["Santiago de Surco", -12.1251, -76.98216],
    ["Surquillo", -12.1142, -77.0105],
    ["Ventanilla", -11.8839, -77.12323],
    ["Villa El Salvador", -12.21689, -76.94915],
    ["Villa María del Triunfo", -12.17664, -76.91897]
  ];
  // nombres de uso común -> distrito
  const ALIAS = {
    'surco': 'Santiago de Surco', 'santiago surco': 'Santiago de Surco', 'magdalena': 'Magdalena del Mar',
    'sjl': 'San Juan de Lurigancho', 'sjm': 'San Juan de Miraflores', 'smp': 'San Martín de Porres',
    'ves': 'Villa El Salvador', 'vmt': 'Villa María del Triunfo', 'cercado': 'Lima', 'cercado de lima': 'Lima',
    'centro de lima': 'Lima', 'lima centro': 'Lima', 'el centro': 'Lima', 'jesus maria': 'Jesús María',
    'rimac': 'Rímac', 'brena': 'Breña', 'lurin': 'Lurín', 'pachacamac': 'Pachacámac', 'molina': 'La Molina',
    'victoria': 'La Victoria', 'olivos': 'Los Olivos', 'agustino': 'El Agustino', 'carmen de la legua': 'Carmen de la Legua Reynoso',
    'chosica': 'Lurigancho', 'san martin': 'San Martín de Porres', 'perla': 'La Perla'
  };
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();

  // quita lo que la gente dice antes del lugar: "estoy en", "cerca de", "la tienda más cercana a"...
  function limpiar(texto) {
    let t = ' ' + norm(texto) + ' ';
    const RELLENO = [
      'quiero', 'busco', 'buscar', 'necesito', 'donde hay', 'donde queda', 'cual es', 'muestrame', 'mostrar',
      'la tienda mas cercana', 'las tiendas mas cercanas', 'tienda mas cercana', 'tiendas cercanas', 'tiendas', 'tienda',
      'punto de venta', 'puntos de venta', 'mas cercano', 'mas cercana', 'cercana', 'cercano',
      'estoy en', 'estoy por', 'vivo en', 'me encuentro en', 'cerca de', 'cerca a', 'por la zona de', 'por', 'zona de',
      'el distrito de', 'distrito de', 'distrito', 'en', 'a', 'de', 'la', 'el', 'del', 'lima peru', 'peru'
    ];
    let prev;
    do {
      prev = t;
      for (const w of RELLENO) {
        if (t.startsWith(' ' + w + ' ')) t = t.slice(w.length + 1);
      }
    } while (t !== prev);
    return t.trim();
  }

  const INDICE = DISTRITOS.map(([nombre, lat, lng]) => ({ nombre, lat, lng, n: norm(nombre) }));

  // distrito mencionado en el texto (el nombre más largo que aparezca, para no confundir "San Juan de Miraflores" con "Miraflores")
  function distrito(texto) {
    const t = ' ' + norm(texto) + ' ';
    let mejor = null;
    for (const d of INDICE) {
      if (t.includes(' ' + d.n + ' ') && (!mejor || d.n.length > mejor.n.length)) mejor = d;
    }
    for (const [alias, nombre] of Object.entries(ALIAS)) {
      if (t.includes(' ' + alias + ' ')) {
        const d = INDICE.find(x => x.nombre === nombre);
        if (d && (!mejor || alias.length > mejor.n.length)) mejor = d;
      }
    }
    return mejor && { nombre: mejor.nombre, lat: mejor.lat, lng: mejor.lng, tipo: 'distrito' };
  }

  // cualquier otro lugar de Lima (avenida, centro comercial, parque...)
  async function geocodificar(texto) {
    const q = limpiar(texto);
    if (q.length < 3) return null;
    const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
      q: `${q}, Lima, Perú`, format: 'jsonv2', limit: '1', countrycodes: 'pe',
      viewbox: '-77.25,-11.75,-76.70,-12.45', bounded: '1', 'accept-language': 'es'
    });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) return null;
      const [x] = await r.json();
      if (!x) return null;
      return { nombre: x.name || q, lat: Number(x.lat), lng: Number(x.lon), tipo: 'lugar' };
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function buscarLugar(texto) {
    return distrito(texto) || distrito(limpiar(texto)) || geocodificar(texto);
  }

  window.SolpetLugares = { buscarLugar, distrito, limpiar };
})();
