// Puntos de venta de Solpet (tabla DIRECCIONES.xlsx).
// [nombre comercial, logo (assets/logos/<logo>.webp), distrito, dirección, lat, lng, web, ubicación]
// - sin dirección: tienda solo online (sale en la lista con su web, sin pin)
// - con dirección pero sin coordenadas: sale en la lista con "Cómo llegar", sin pin
// - ubicación 'google': coordenadas del local en Google Maps (tabla DIRECCIONES_COORDENADAS.xlsx enviada por Solpet).
//   Para una tienda nueva: clic derecho sobre el local en Google Maps, copiar las coordenadas y marcarla 'google'.
// "Cómo llegar" abre Google Maps con el nombre y la dirección, así que lleva a la tienda aunque el pin quede a unas casas.
(function () {
  const WEB = {
    miu: 'https://www.adoptamiu.com/',
    brisa: 'https://www.brisapet.pe/',
    patmo: 'https://www.patmopet.pe',
    animalia: 'https://www.animaliastoreperu.com/',
    lumpet: 'https://www.lumpet.pe/',
    miau: 'https://www.miau.pe/',
    peluditos: 'https://www.peluditospet.pe/',
    naricitas: 'https://naricitas.pet/',
    gatuario: 'https://gatuario.com/'
  };
  const FILAS = [
    ['Miu Shop', 'miushop', 'Santiago de Surco', 'Av. Caminos del Inca 1685', -12.126629, -76.981421, WEB.miu, 'google'],
    ['Animal Wasi Pets', 'wasi-pet', 'San Miguel', 'Av. Brígida Silva de Ochoa 210', -12.081384, -77.088958, null, 'google'],
    ['The Urban Pets', 'the-urban-pets', 'Magdalena del Mar', 'Av. Faustino Sánchez Carrión 479', -12.092224, -77.054909, null, 'google'],
    ['Veterinaria Royal Pets', 'royal-pet', 'Lince', 'Av. Gral. Trinidad Morán 417', -12.089550, -77.036786, null, 'google'],
    ['Brisa Pet Shop', 'brisa', 'Magdalena del Mar', 'Av. Javier Prado Oeste 205', -12.090398, -77.064736, WEB.brisa, 'google'],
    ['Brisa Pet Shop', 'brisa', 'Santiago de Surco', 'Av. Caminos del Inca 848', -12.119168, -76.988819, WEB.brisa, 'google'],
    ['Mundo Love Pet', 'mundo-pet', 'Magdalena del Mar', 'Jirón Castilla 778', -12.089553, -77.073085, null, 'google'],
    ['Veterinaria San Felipe', 'san-felipe', 'Jesús María', 'Av. Faustino Sánchez Carrión 1051', -12.092090, -77.054015, null, 'google'],
    ['Veterinaria San Felipe', 'san-felipe', 'San Miguel', 'Av. De Los Precursores 538', -12.068827, -77.093701, null, 'google'],
    ['Peluvet Spa', 'peluvet', 'San Miguel', 'Av. Lima 679', -12.087652, -77.080421, null, 'google'],
    ['Veterinaria San Felipe', 'san-felipe', 'Los Olivos', 'Asentamiento San Martín', -11.962476, -77.078431, null, 'google'],
    ['American Vet', 'american-vet', 'San Borja', 'Av. San Luis 2845', -12.104981, -76.992792, null, 'google'],
    ['American Vet', 'american-vet', 'Barranco', 'Av. República de Panamá 6584', -12.130783, -77.018464, null, 'google'],
    ['+KOTAS Pet Shop', 'mas-kotas', 'Breña', 'Jirón Carhuaz 514', -12.053700, -77.048109, null, 'google'],
    ['Lumpet Pet Shop', 'lumpet', 'La Victoria', 'Av. Canadá 1238', -12.084369, -77.011603, WEB.lumpet, 'google'],
    ['Miau 100% Gatos', '100-miau-gatos', 'Miraflores', 'Calle José Toribio Polo 511', -12.112170, -77.046292, WEB.miau, 'google'],
    ['Peluditos Pet Shop', 'peluditos', 'Pueblo Libre', 'Av. Manuel Cipriano Dulanto 1668', -12.074897, -77.073983, WEB.peluditos, 'google'],
    ['Peluditos Pet Shop', 'peluditos', 'Surquillo', 'Av. Manuel Villarán 770', -12.120556, -77.004182, WEB.peluditos, 'google'],
    ['Peluditos Pet Shop', 'peluditos', 'Santiago de Surco', 'Av. Central 993', -12.103681, -76.958964, WEB.peluditos, 'google'],
    ['Neko Home', 'neko-home', 'Santiago de Surco', 'Jr. Morro Solar 1252', -12.127770, -76.978225, null, 'google'],
    ['Naricitas Pet Shop', 'naricitas', 'Magdalena del Mar', 'Jirón Castilla 690', -12.089497, -77.073568, WEB.naricitas, 'google'],
    ['Naricitas Pet Shop', 'naricitas', 'Magdalena del Mar', 'Jirón Castilla 811', -12.088826, -77.073198, WEB.naricitas, 'google'],
    ['Pals & Tails Pet Shop', 'pals-and-tails', 'Miraflores', 'Av. 28 de Julio 106', -12.124266, -77.033097, null, 'google'],
    ['T&M Pet Style', 'tm-petshop', 'Lince', 'Av. Coronel José Leal 210', -12.083979, -77.036644, null, 'google'],
    ['T&M Pet Style', 'tm-petshop', 'Santiago de Surco', 'Calle Las Retamas 100', -12.150635, -77.007547, null, 'google'],
    ['T&M Pet Style', 'tm-petshop', 'Magdalena del Mar', 'Jirón Yungay 762', -12.088633, -77.075069, null, 'google'],
    ['T&M Pet Style', 'tm-petshop', 'La Victoria', 'Calle Juan Castro 187, Urb. Balconcillo', -12.074882, -77.021540, null, 'google'],
    ['Mr. Pet', 'mr-pet', 'La Molina', 'Calle Samoa 328', -12.083317, -76.897760, null, 'google'],
    ['Gatuario', 'gatuario', 'San Isidro', 'Calle Baltazar La Torre 1115', -12.103198, -77.057576, WEB.gatuario, 'google'],
    ['Gatuario', 'gatuario', 'Santiago de Surco', 'Av. Paseo La Castellana 191', -12.129054, -77.001993, WEB.gatuario, 'google'],
    ['Top Can', 'top-can', 'La Victoria', 'Jr. Agustín Gamarra 1133', -12.069642, -77.012713, null, 'google'],
    ['Monivet Center', 'monivet', 'Santiago de Surco', 'Calle Loma Ponciana 164', -12.134080, -76.985918, null, 'google'],
    ['Veterinaria Pets Canadá', 'pets-canada', 'La Victoria', 'Av. Canadá 1537', -12.084004, -77.007186, null, 'google'],
    ['Veterinaria Mundo Animal', 'mundo-animal', 'Chorrillos', 'Av. Alameda Los Horizontes Mza. A1 Lote 15', -12.201929, -77.006408, null, 'google'],
    ['Veterinaria Engreídos', 'engreidos', 'Santiago de Surco', 'Jr. Lomas de las Azucenas 263', -12.141685, -76.986222, null, 'google'],
    ['Patmo Pets', 'patmo', 'Tiendas online', null, undefined, undefined, WEB.patmo],
    ['Animalia Pet Store', 'animalia', 'Tiendas online', null, undefined, undefined, WEB.animalia]
  ];

  window.SOLPET_TIENDAS = FILAS.map(([name, logo, district, addr, lat, lng, url, ubicacion], id) => ({
    id, name, district,
    logo: logo ? `assets/logos/${logo}.webp` : null,
    online: !addr,
    addr: addr || 'Venta online con delivery',
    url: url || null, lat, lng,
    approx: ubicacion === 'calle'
  }));
})();
