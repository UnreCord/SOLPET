// Mapa de puntos de venta Solpet.
// Celular: mapa completo, tarjetas deslizables (se pueden minimizar) y "Ver lista".
// PC: panel fijo a la izquierda con la lista, como "Dónde comprar" de la web de referencia.
(function () {
  const S = window.Solpet;
  const L = window.SolpetLugares;
  const STORES = window.SOLPET_TIENDAS;
  const $ = s => document.querySelector(s);
  // misma condición que en estilos.css
  const wide = matchMedia('(min-width: 900px) and (min-height: 560px)');

  const bar = $('.bar');
  const deck = $('#deck');
  const deckBox = $('.deck');
  const count = $('#store-count');
  const toast = $('#toast');
  const query = $('#store-q');
  const nearBtn = $('#near-me');
  const voiceBtn = $('#voice');
  const sheet = $('#sheet');
  const list = $('#store-list');
  const openBtn = $('#open-list');
  const closeBtn = $('#close-list');
  const minBtn = $('#toggle-deck');
  const [prevBtn, nextBtn] = document.querySelectorAll('.deck__nav');

  let selectedId = null, listOpen = false, popup = null;
  // punto de partida para ordenar por cercanía: tu ubicación o un lugar buscado ({ lat, lng, label })
  let origin = null, routes = null, originSeq = 0;
  // la búsqueda muestra "Cerca de <lugar>" y no filtra por texto
  let placeMode = false;

  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  };

  // ---------- avisos ----------
  let toastTimer;
  function notify(msg) {
    if (wide.matches) {
      count.textContent = msg;
      return;
    }
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 5000);
  }

  // espacio libre del mapa: lo que no tapan el panel (PC) o la barra y las tarjetas (celular).
  // Nunca deja menos de 180 px libres, para que el mapa siempre pueda encuadrar las tiendas.
  function padding() {
    const w = window.innerWidth, h = window.innerHeight;
    let p;
    if (wide.matches) {
      p = { top: 50, bottom: 50, left: sheet.getBoundingClientRect().right + 50, right: 70 };
    } else {
      // medidas sin animaciones (al cerrar la lista o minimizar, las tarjetas todavía se están moviendo)
      const top = bar.offsetTop + bar.querySelector('.bar__row').offsetHeight + 20;
      const bottom = listOpen ? 40 : deckBox.offsetHeight + 16;
      p = { top, bottom, left: 30, right: 30 };
    }
    const fit = (a, b, total) => {
      const over = a + b + 180 - total;
      return over > 0 ? [Math.max(10, a - over / 2), Math.max(10, b - over / 2)] : [a, b];
    };
    [p.top, p.bottom] = fit(p.top, p.bottom, h);
    [p.left, p.right] = fit(p.left, p.right, w);
    return p;
  }

  const view = S.createMap({
    container: 'map',
    stores: STORES,
    padding,
    controls: false,
    onPin: id => {
      if (document.body.classList.contains('deck-min') && !wide.matches) setDeckMin(false);
      select(id, { scrollCard: true, fromMap: true });
    },
    onReady: () => {
      autoFit();
      if (selectedId !== null) select(selectedId, { fly: true, scrollCard: true });
    }
  });
  let zoomCtrl = null;
  function updateControls() {
    if (!view.map) return;
    if (wide.matches && !zoomCtrl) {
      zoomCtrl = new maplibregl.NavigationControl({ showCompass: false });
      view.map.addControl(zoomCtrl, 'bottom-right');
    } else if (!wide.matches && zoomCtrl) {
      view.map.removeControl(zoomCtrl);
      zoomCtrl = null;
    }
  }
  updateControls();

  // encuadre inicial: se repite si la página se reacomoda al terminar de cargar (fuentes, tamaño de la ventana),
  // hasta que la persona mueva el mapa o elija una tienda
  let userMoved = false;
  function autoFit() {
    if (!userMoved && view.ready && selectedId === null && !origin) view.fit(current(), false);
  }

  // mientras la persona mueve el mapa, la barra y las tarjetas se vuelven transparentes (celular)
  let movingTimer;
  function setMoving(on) {
    clearTimeout(movingTimer);
    if (on) document.body.classList.add('is-moving');
    else movingTimer = setTimeout(() => document.body.classList.remove('is-moving'), 300);
  }
  if (view.map) {
    ['mousedown', 'touchstart', 'wheel'].forEach(ev => view.map.getCanvasContainer().addEventListener(ev, () => { userMoved = true; }, { passive: true }));
    view.map.on('movestart', e => { if (e.originalEvent) setMoving(true); });
    view.map.on('moveend', () => setMoving(false));
    window.addEventListener('load', autoFit);
    if (document.fonts) document.fonts.ready.then(autoFit);
  }

  const current = () => S.filter(STORES, placeMode ? '' : query.value, origin, routes);

  // ---------- tarjetas ----------
  function card(s) {
    const li = S.el('li', 'card');
    li.dataset.id = s.id;
    const pick = S.el('button', 'card__pick');
    pick.type = 'button';
    pick.setAttribute('aria-label', `${s.name}, ${s.addr}, ${s.district}. Ver en el mapa`);
    const meta = S.el('span', 'card__meta');
    meta.appendChild(S.el('span', 'card__district', s.district));
    if (s.km !== undefined) meta.appendChild(S.el('span', 'card__km', S.distanceText(s)));
    pick.append(meta, S.el('span', 'store__name', s.name), S.el('span', 'store__addr', s.addr));
    const foot = S.el('div', 'card__foot');
    foot.appendChild(S.goLink(s, 'Cómo llegar', 'btn btn--verde card__go'));
    if (s.url) foot.appendChild(S.webLink(s));
    li.append(S.logo(s), pick, foot);
    li.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      select(s.id, { fly: true, scrollCard: true });
    });
    return li;
  }

  function moreCard(rest) {
    const li = S.el('li', 'card card--more');
    const online = rest.filter(s => s.online).length, local = rest.length - online;
    li.appendChild(S.el('strong', '', [
      local ? S.plural(local, 'local más', 'locales más') : '',
      online ? S.plural(online, 'tienda online', 'tiendas online') : ''
    ].filter(Boolean).join(' y ')));
    li.appendChild(S.el('span', '', 'Están en la lista, sin pin en el mapa.'));
    const btn = S.el('button', 'btn', 'Ver en la lista');
    btn.type = 'button';
    btn.addEventListener('click', () => setList(true));
    li.appendChild(btn);
    return li;
  }

  function render() {
    const items = current();
    const pins = S.onMap(items), rest = items.filter(s => s.lat === undefined);
    count.textContent = S.countText(items, origin);
    deck.innerHTML = '';
    pins.forEach(s => deck.appendChild(card(s)));
    if (rest.length) deck.appendChild(moreCard(rest));
    if (!items.length) {
      const li = S.el('li', 'card card--more');
      li.append(S.el('strong', '', 'Sin resultados'), S.el('span', '', `No encontramos “${query.value.trim()}”. Prueba con otro distrito o tienda, o pulsa “Buscar” para ver la tienda más cercana a ese lugar.`));
      deck.appendChild(li);
    }
    deck.scrollLeft = 0;
    S.renderList(list, items, { selectedId, userPos: origin, query: query.value, onPick: id => { if (!wide.matches) setList(false); select(id, { fly: true, scrollCard: true }); } });
    view.setData(items);
    if (selectedId !== null && !pins.some(s => s.id === selectedId)) clearSelection();
    else if (selectedId !== null) markCard(selectedId);
    updateNav();
  }

  function markCard(id) {
    deck.querySelectorAll('.card').forEach(c => c.classList.toggle('is-active', Number(c.dataset.id) === id));
  }

  function closePopup() {
    if (popup) { const p = popup; popup = null; p.remove(); }
  }

  function clearSelection() {
    selectedId = null;
    markCard(null);
    S.markActive(list, null);
    view.highlight(null);
    closePopup();
  }

  // ficha del local sobre el pin (en PC, donde no hay tarjetas)
  function showPopup(s) {
    closePopup();
    if (!view.ready) return;
    const box = S.el('div', 'pop');
    const links = S.el('span', 'store__links');
    links.append(S.goLink(s));
    if (s.url) links.append(S.webLink(s));
    box.append(S.logo(s), S.el('strong', '', s.name), S.el('span', '', `${s.addr}, ${s.district}.`));
    const shown = current().find(x => x.id === s.id);
    if (shown && shown.km !== undefined) box.append(S.el('span', 'store__dist', S.distanceText(shown)));
    box.append(links);
    const p = new maplibregl.Popup({ offset: [0, -50], maxWidth: '280px', focusAfterOpen: false })
      .setLngLat([s.lng, s.lat]).setDOMContent(box).addTo(view.map);
    p.on('close', () => { if (popup === p) { popup = null; clearSelection(); } });
    popup = p;
  }

  // en PC, la fila elegida queda a la vista dentro de la lista
  function revealRow(id) {
    const row = list.querySelector(`.store[data-id="${id}"]`);
    if (!row) return;
    const box = list.getBoundingClientRect(), r = row.getBoundingClientRect();
    if (r.top < box.top + 40 || r.bottom > box.bottom - 10) {
      list.scrollBy({ top: r.top - box.top - box.height / 3, behavior: S.reduceMotion ? 'auto' : 'smooth' });
    }
  }

  let syncing = false;
  function select(id, { fly = true, scrollCard = false, fromMap = false } = {}) {
    const s = STORES[id];
    if (!s || s.lat === undefined) return;
    selectedId = id;
    markCard(id);
    S.markActive(list, id);
    view.highlight(id);
    if (wide.matches) {
      if (fly && !fromMap) view.focus(s, { zoom: 14.2, duration: 800 });
      showPopup(s);
      revealRow(id);
      return;
    }
    if (fly) view.focus(s, { zoom: 14.2, duration: 700 });
    if (scrollCard) {
      const c = deck.querySelector(`.card[data-id="${id}"]`);
      if (c) {
        syncing = true;
        const left = c.offsetLeft - (deck.clientWidth - c.offsetWidth) / 2;
        deck.scrollTo({ left, behavior: S.reduceMotion ? 'auto' : 'smooth' });
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => { syncing = false; }, 700);
      }
    }
  }

  // al deslizar, la tarjeta que queda al centro enciende su pin
  let scrollTimer, syncTimer, touched = false;
  function centeredCard() {
    const box = deck.getBoundingClientRect();
    const ref = box.left + box.width / 2;
    let best = null, bestD = Infinity;
    deck.querySelectorAll('.card[data-id]').forEach(c => {
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - ref);
      if (d < bestD) { bestD = d; best = c; }
    });
    return best;
  }
  function onDeckSettled() {
    updateNav();
    if (syncing || !touched) return;
    const c = centeredCard();
    if (c && Number(c.dataset.id) !== selectedId) select(Number(c.dataset.id), { fly: true });
  }
  deck.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(onDeckSettled, 140);
  }, { passive: true });
  ['pointerdown', 'touchstart', 'wheel'].forEach(ev => deck.addEventListener(ev, () => { touched = true; syncing = false; }, { passive: true }));

  // flechas (tablets con mouse)
  function updateNav() {
    if (!prevBtn) return;
    prevBtn.disabled = deck.scrollLeft < 4;
    nextBtn.disabled = deck.scrollLeft + deck.clientWidth >= deck.scrollWidth - 4;
  }
  [prevBtn, nextBtn].forEach(b => b && b.addEventListener('click', () => {
    touched = true; syncing = false;
    const step = (deck.querySelector('.card')?.offsetWidth || 340) + 10;
    deck.scrollBy({ left: Number(b.dataset.dir) * step, behavior: S.reduceMotion ? 'auto' : 'smooth' });
  }));

  // ---------- minimizar las tarjetas ----------
  function setDeckMin(min) {
    document.body.classList.toggle('deck-min', min);
    minBtn.setAttribute('aria-expanded', String(!min));
    minBtn.setAttribute('aria-label', min ? 'Mostrar las tiendas' : 'Ocultar las tiendas para ver más mapa');
    deck.inert = min;
    storage.set('solpet-tarjetas', min ? 'min' : '');
  }
  minBtn.addEventListener('click', () => setDeckMin(!document.body.classList.contains('deck-min')));

  // ---------- lista completa ----------
  function setList(open) {
    if (wide.matches) open = true; // en PC la lista siempre está a la vista
    listOpen = open;
    document.body.classList.toggle('list-open', open);
    sheet.inert = !open;
    openBtn.setAttribute('aria-expanded', String(open));
    if (wide.matches) return;
    if (open) {
      const row = list.querySelector('.store.is-active');
      if (row) row.scrollIntoView({ block: 'center' });
      setTimeout(() => closeBtn.focus({ preventScroll: true }), 50);
    } else if (sheet.contains(document.activeElement)) {
      openBtn.focus({ preventScroll: true });
    }
  }
  openBtn.addEventListener('click', () => setList(true));
  closeBtn.addEventListener('click', () => setList(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && listOpen && !wide.matches) setList(false); });

  // deslizar la hoja hacia abajo (desde la cabecera) la cierra
  let dragY = null;
  const head = $('.sheet__head');
  head.addEventListener('touchstart', e => { dragY = e.touches[0].clientY; }, { passive: true });
  head.addEventListener('touchmove', e => {
    if (dragY === null) return;
    const dy = Math.max(0, e.touches[0].clientY - dragY);
    sheet.style.transition = 'none';
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  head.addEventListener('touchend', e => {
    if (dragY === null) return;
    const dy = e.changedTouches[0].clientY - dragY;
    dragY = null;
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (dy > 90) setList(false);
  });

  // ---------- cercanía: tu ubicación o un lugar ----------
  // Ordena las tiendas desde un punto y elige la más cercana. Primero con la línea recta (al instante) y luego,
  // cuando responde el servicio de rutas, con la distancia y el tiempo reales en auto.
  async function setOrigin(pos, label) {
    const seq = ++originSeq;
    origin = { lat: pos.lat, lng: pos.lng, label };
    routes = null;
    userMoved = true;
    if (document.body.classList.contains('deck-min') && !wide.matches) setDeckMin(false);
    render();
    view.showMe(pos, label);
    // se ven juntos el punto de partida y la tienda más cercana
    const show = s => {
      select(s.id, { fly: false, scrollCard: true });
      view.fitPoints([pos, s]);
    };
    const first = S.onMap(current())[0];
    if (first) show(first);

    const r = await S.routes(pos, STORES);
    if (seq !== originSeq) return; // hubo otra búsqueda mientras tanto
    if (r) {
      routes = r;
      const keep = selectedId;
      render();
      const nearest = S.onMap(current())[0];
      if (nearest && nearest.id !== keep) show(nearest);
      else if (nearest) select(nearest.id, { fly: false, scrollCard: true });
    }
    const nearest = S.onMap(current())[0];
    if (nearest) {
      notify(`${label ? `Cerca de ${label}, la` : 'La'} tienda más cercana es ${nearest.name} (${S.distanceText(nearest)}).`);
    }
  }

  // busca un lugar (distrito, zona, avenida...) y muestra la tienda más cercana
  async function searchPlace(text) {
    const lugar = await L.buscarLugar(text);
    if (!lugar) {
      notify(`No encontramos “${text}”. Prueba diciendo o escribiendo tu distrito.`);
      return false;
    }
    placeMode = true;
    query.value = `Cerca de ${lugar.nombre}`;
    await setOrigin({ lat: lugar.lat, lng: lugar.lng }, lugar.nombre);
    return true;
  }

  // ---------- búsqueda por texto ----------
  let timer;
  query.addEventListener('input', () => {
    if (placeMode) {
      // al escribir de nuevo se vuelve a filtrar por texto (la cercanía al lugar se mantiene)
      placeMode = false;
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      render();
      if (!origin) view.fit(current(), true);
    }, 160);
  });
  query.addEventListener('focus', () => { if (placeMode) query.select(); });
  query.addEventListener('keydown', async e => {
    if (e.key !== 'Enter') return;
    const text = query.value.trim();
    query.blur();
    // sin tiendas que coincidan: se busca como lugar ("Larcomar", "Av. Arequipa"...)
    if (!placeMode && text && !current().length) await searchPlace(text);
  });

  // ---------- búsqueda por voz ----------
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  if (Recognition && voiceBtn) {
    voiceBtn.hidden = false;
    query.classList.add('has-mic');
    voiceBtn.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new Recognition();
      rec.lang = 'es-PE';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      const placeholder = query.placeholder;
      let heard = '';
      voiceBtn.classList.add('is-listening');
      voiceBtn.setAttribute('aria-label', 'Escuchando. Toca para detener');
      query.value = '';
      query.placeholder = 'Te escucho… di tu distrito o zona';
      rec.onresult = e => {
        heard = Array.from(e.results).map(r => r[0].transcript).join(' ').trim();
        query.value = heard;
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') notify('Para buscar por voz, permite el uso del micrófono en tu navegador.');
        else if (e.error === 'no-speech') notify('No te escuchamos. Toca el micrófono y di tu distrito, por ejemplo “Miraflores”.');
        else if (e.error !== 'aborted') notify('No pudimos usar el micrófono. Escribe tu distrito en el buscador.');
      };
      rec.onend = async () => {
        rec = null;
        voiceBtn.classList.remove('is-listening');
        voiceBtn.setAttribute('aria-label', 'Buscar por voz: di tu distrito o zona');
        query.placeholder = placeholder;
        if (!heard) { if (!placeMode) { query.value = ''; render(); } return; }
        // si dijo el nombre de una tienda, se filtra; si no, se busca el lugar y su tienda más cercana
        if (!L.distrito(heard) && S.filter(STORES, L.limpiar(heard)).length) {
          placeMode = false;
          query.value = L.limpiar(heard);
          render();
          view.fit(current(), true);
        } else {
          await searchPlace(heard);
        }
      };
      try { rec.start(); } catch (err) { rec = null; voiceBtn.classList.remove('is-listening'); }
    });
  }

  // ---------- cerca de mí ----------
  nearBtn.addEventListener('click', () => {
    nearBtn.disabled = true;
    const label = nearBtn.querySelector('span');
    label.textContent = 'Buscando…';
    S.locate(async pos => {
      nearBtn.disabled = false;
      label.textContent = 'Cerca de mí';
      if (placeMode) { placeMode = false; query.value = ''; }
      await setOrigin(pos, null);
    }, msg => {
      nearBtn.disabled = false;
      label.textContent = 'Cerca de mí';
      notify(msg);
    });
  });

  // alto de la barra: en celular la lista abre justo debajo
  const setBarH = () => {
    if (!wide.matches) document.documentElement.style.setProperty('--bar-h', `${bar.querySelector('.bar__row').getBoundingClientRect().bottom}px`);
  };
  if ('ResizeObserver' in window) new ResizeObserver(setBarH).observe(bar);
  let resizeTimer;
  window.addEventListener('resize', () => {
    updateNav();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(autoFit, 200);
  });

  // PC: el logo, el buscador y la lista van juntos en el panel de la izquierda.
  // Celular: la barra flota arriba y la lista se abre como hoja.
  const barHome = bar.nextElementSibling;
  function layout() {
    if (wide.matches) {
      sheet.prepend(bar);
      setList(true);
    } else {
      barHome.before(bar);
      closePopup();
      setList(false);
    }
    document.body.classList.toggle('is-wide', wide.matches);
    setBarH();
    updateControls();
    updateNav();
  }
  wide.addEventListener('change', () => {
    layout();
    if (view.map) setTimeout(() => { view.map.resize(); if (selectedId === null) view.fit(current(), false); else select(selectedId, { fly: true, scrollCard: true }); }, 60);
  });
  layout();
  if (storage.get('solpet-tarjetas') === 'min') setDeckMin(true);

  render();
})();
