// Mapa a pantalla completa + tarjetas deslizables + lista completa
(function () {
  const S = window.Solpet;
  const STORES = window.SOLPET_TIENDAS;
  const $ = s => document.querySelector(s);
  // PC: panel fijo a la izquierda con la lista (como "Dónde comprar" de la web de referencia);
  // celular: mapa completo, tarjetas deslizables y "Ver lista". Misma condición que en estilos.css.
  const wide = matchMedia('(min-width: 900px) and (min-height: 560px)');

  const bar = $('.bar');
  const deck = $('#deck');
  const deckBox = $('.deck');
  const count = $('#store-count');
  const query = $('#store-q');
  const nearBtn = $('#near-me');
  const sheet = $('#sheet');
  const list = $('#store-list');
  const openBtn = $('#open-list');
  const closeBtn = $('#close-list');
  const [prevBtn, nextBtn] = document.querySelectorAll('.deck__nav');
  let selectedId = null, userPos = null, listOpen = false, popup = null;

  // espacio libre del mapa: lo que no tapan el panel (PC) o la barra y las tarjetas (celular).
  // Nunca deja menos de 180 px libres, para que el mapa siempre pueda encuadrar las tiendas.
  function padding() {
    const w = window.innerWidth, h = window.innerHeight;
    let p;
    if (wide.matches) {
      p = { top: 50, bottom: 50, left: sheet.getBoundingClientRect().right + 50, right: 70 };
    } else {
      // medidas sin la animación: al cerrar la lista las tarjetas todavía están entrando desde abajo
      const top = bar.offsetTop + bar.offsetHeight + 20;
      const bottom = listOpen ? 40 : deckBox.offsetHeight + 16; // tarjetas y botón "Ver lista"
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
    onPin: id => select(id, { scrollCard: true, fromMap: true }),
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
    if (!userMoved && view.ready && selectedId === null) view.fit(current(), false);
  }
  if (view.map) {
    ['mousedown', 'touchstart', 'wheel'].forEach(ev => view.map.getCanvasContainer().addEventListener(ev, () => { userMoved = true; }, { passive: true }));
    window.addEventListener('load', autoFit);
    if (document.fonts) document.fonts.ready.then(autoFit);
  }

  const current = () => S.filter(STORES, query.value, userPos);

  // ---------- tarjetas ----------
  function card(s) {
    const li = S.el('li', 'card');
    li.dataset.id = s.id;
    const pick = S.el('button', 'card__pick');
    pick.type = 'button';
    pick.setAttribute('aria-label', `${s.name}, ${s.addr}, ${s.district}. Ver en el mapa`);
    pick.append(S.el('span', 'card__district', s.district), S.el('span', 'store__name', s.name), S.el('span', 'store__addr', s.addr));
    const foot = S.el('div', 'card__foot');
    const go = S.goLink(s, 'Cómo llegar', 'btn btn--verde card__go');
    foot.appendChild(go);
    if (s.url) foot.appendChild(S.webLink(s));
    if (s.km !== undefined) foot.appendChild(S.el('span', 'store__dist', S.distanceText(s.km)));
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
    count.textContent = S.countText(items, userPos);
    deck.innerHTML = '';
    pins.forEach(s => deck.appendChild(card(s)));
    if (rest.length) deck.appendChild(moreCard(rest));
    if (!items.length) {
      const li = S.el('li', 'card card--more');
      li.append(S.el('strong', '', 'Sin resultados'), S.el('span', '', `No encontramos puntos de venta para “${query.value.trim()}”. Prueba con otro distrito o tienda.`));
      deck.appendChild(li);
    }
    deck.scrollLeft = 0;
    S.renderList(list, items, { selectedId, userPos, query: query.value, onPick: id => { if (!wide.matches) setList(false); select(id, { fly: true, scrollCard: true }); } });
    view.setData(items);
    if (selectedId !== null && !pins.some(s => s.id === selectedId)) clearSelection();
    else if (selectedId !== null) markCard(selectedId);
    updateNav();
  }

  function markCard(id) {
    deck.querySelectorAll('.card').forEach(c => c.classList.toggle('is-active', Number(c.dataset.id) === id));
  }

  function clearSelection() {
    selectedId = null;
    markCard(null);
    S.markActive(list, null);
    view.highlight(null);
    if (popup) { const p = popup; popup = null; p.remove(); }
  }

  // ficha del local sobre el pin (en PC, donde no hay tarjetas)
  function showPopup(s) {
    if (popup) { const p = popup; popup = null; p.remove(); }
    if (!view.ready) return;
    const box = S.el('div', 'pop');
    const links = S.el('span', 'store__links');
    links.append(S.goLink(s));
    if (s.url) links.append(S.webLink(s));
    box.append(S.logo(s), S.el('strong', '', s.name), S.el('span', '', `${s.addr}, ${s.district}.`), links);
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
        const left = wide.matches ? c.offsetLeft - 60 : c.offsetLeft - (deck.clientWidth - c.offsetWidth) / 2;
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
    const ref = wide.matches ? box.left + 60 : box.left + box.width / 2;
    let best = null, bestD = Infinity;
    deck.querySelectorAll('.card[data-id]').forEach(c => {
      const r = c.getBoundingClientRect();
      const d = wide.matches ? Math.abs(r.left - ref) : Math.abs(r.left + r.width / 2 - ref);
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

  // flechas en laptop
  function updateNav() {
    if (!prevBtn) return;
    prevBtn.disabled = deck.scrollLeft < 4;
    nextBtn.disabled = deck.scrollLeft + deck.clientWidth >= deck.scrollWidth - 4;
  }
  [prevBtn, nextBtn].forEach(b => b && b.addEventListener('click', () => {
    touched = true; syncing = false;
    const step = (deck.querySelector('.card')?.offsetWidth || 340) + 14;
    deck.scrollBy({ left: Number(b.dataset.dir) * step, behavior: S.reduceMotion ? 'auto' : 'smooth' });
  }));

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

  // ---------- búsqueda y ubicación ----------
  let timer;
  query.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      render();
      view.fit(current(), true);
    }, 160);
  });
  query.addEventListener('keydown', e => { if (e.key === 'Enter') query.blur(); });

  nearBtn.addEventListener('click', () => {
    nearBtn.disabled = true;
    const label = nearBtn.querySelector('span');
    label.textContent = 'Buscando…';
    S.locate(pos => {
      userPos = pos;
      nearBtn.disabled = false;
      label.textContent = 'Cerca de mí';
      render();
      view.showMe(pos);
      const nearest = S.onMap(current())[0];
      if (nearest) select(nearest.id, { fly: true, scrollCard: true });
    }, msg => {
      nearBtn.disabled = false;
      label.textContent = 'Cerca de mí';
      count.textContent = msg;
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
      if (popup) { const p = popup; popup = null; p.remove(); }
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

  render();
})();
