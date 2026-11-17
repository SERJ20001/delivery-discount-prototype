const { limits } = DiscountModel;
const asset = name => `assets/current/${name}`;
const allItems = categories.flatMap(category => category.items);
const inventory = [...allItems, previousItem];
const state = { tab: 'eligible', selected: new Set(), applied: new Map([[previousItem.id, calculateAmount(previousItem, 300)]]), range: 'recommended', previews: new Map(), editor: null };
const money = value => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
const word = count => count % 10 === 1 && count % 100 !== 11 ? 'товар' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'товара' : 'товаров';
const $ = selector => document.querySelector(selector);
const app = $('#app');
const visibleItems = () => inventory.filter(item => state.tab === 'eligible' ? !state.applied.has(item.id) : state.applied.has(item.id));
const chosenItems = () => visibleItems().filter(item => state.selected.has(item.id));
const groupItems = index => visibleItems().filter(item => categories[index].items.includes(item) || (index === 0 && item === previousItem));
let toastTimer;
let editorTrigger;
let infoTrigger;

function calculateAmount(item, requestedAmount) {
  const requested = Number(requestedAmount);
  if (requestedAmount === null || String(requestedAmount).trim() === '' || !Number.isFinite(requested) || requested < 0) return null;
  const { minimum, maximum } = limits(item.price);
  const amount = Math.min(maximum, Math.max(minimum, Math.round(requested)));
  return { amount, requestedAmount: requested, minimum, maximum, limited: amount !== requested };
}

function rangeAmount(item, range = state.range) {
  const base = Math.min(600, Math.max(100, item.recommendedAmount));
  const requested = range === 'higher' ? Math.round((600 + (base - 100) / 500 * 600) / 50) * 50 : base;
  return calculateAmount(item, requested);
}

function rangeLabel(items, range) {
  const amounts = items.map(item => state.range === range ? preview(item).amount : rangeAmount(item, range).amount);
  const minimum = Math.min(...amounts);
  const maximum = Math.max(...amounts);
  return minimum === maximum ? money(minimum) : `${new Intl.NumberFormat('ru-RU').format(minimum)} – ${money(maximum)}`;
}

function singlePresets(item) {
  return [...new Set([100, 200, 300].map(value => calculateAmount(item, value).amount))];
}

function preview(item) {
  return state.selected.has(item.id) ? state.previews.get(item.id) : state.applied.get(item.id);
}

function checkbox(selected) {
  return `<img class="check-image" src="${selected ? asset('a4747.svg') : 'assets/checkbox-inactive.svg'}" alt="">`;
}
function photo(item) {
  return item.images.map(image => `<img src="${asset(image)}" alt="">`).join('');
}
function productMarkup(item) {
  const selected = state.selected.has(item.id);
  const result = preview(item);
  const chip = result ? `<button class="discount-chip" data-edit="${item.id}" aria-label="Изменить скидку: ${item.title}, ${money(result.amount)}"><span>${money(result.amount)}</span><img src="${asset('86592.svg')}" alt=""></button>` : '';
  return `<article class="product" data-id="${item.id}"><button class="product-select" data-select="${item.id}" aria-pressed="${selected}" aria-label="${selected ? 'Снять выбор' : 'Выбрать'}: ${item.title}, ${money(item.price)}"><span class="product-photo">${photo(item)}</span><span class="product-check">${checkbox(selected)}</span><span class="product-body"><strong class="product-price">${money(item.price)}</strong><span class="product-title">${item.title}</span></span></button>${chip}</article>`;
}
function presetButtons(item, selectedAmount, attribute) {
  return singlePresets(item).map((amount, index) => `<button class="chip ${index === 0 ? 'ai-chip' : ''} ${amount === selectedAmount ? 'active' : ''}" ${attribute}="${amount}" aria-pressed="${amount === selectedAmount}">${index === 0 ? `<img src="${asset('c8762.svg')}" alt="">` : ''}${money(amount)}</button>`).join('');
}

function render() {
  const eligibleCount = inventory.length - state.applied.size;
  if (!eligibleCount) state.tab = 'discounted';
  const chosen = chosenItems();
  const discounted = state.tab === 'discounted';
  app.classList.toggle('discounted', discounted);
  app.classList.toggle('no-selection', chosen.length === 0);
  EntryScreen.updateCount(state.applied.size, word(state.applied.size));
  $('#offer-recommendation-total').textContent = `${inventory.length} ${word(inventory.length) === 'товар' ? 'объявление' : word(inventory.length) === 'товара' ? 'объявления' : 'объявлений'}`;
  $('[data-tab="eligible"]').hidden = eligibleCount === 0;
  $('#eligible-count').textContent = eligibleCount;
  $('#discounted-count').textContent = state.applied.size;
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === state.tab);
    button.setAttribute('aria-pressed', String(button.dataset.tab === state.tab));
  });
  $('#catalog').innerHTML = categories.map((category, index) => {
    const items = groupItems(index);
    if (!items.length) return '';
    const checked = items.every(item => state.selected.has(item.id));
    return `<section class="category" data-group="${index}"><h2 class="category-title"><button data-category="${index}" aria-pressed="${checked}">${checkbox(checked)}<span>${category.name}</span></button></h2>${items.map(productMarkup).join('')}</section>`;
  }).join('') || '<p class="empty">Здесь пока нет товаров</p>';
  $('.calculator').hidden = chosen.length === 0;
  $('#selection-count').textContent = chosen.length ? `${chosen.length} ${word(chosen.length)}` : 'Выбрать все товары';
  $('#select-all').disabled = !visibleItems().length;
  $('#select-all').setAttribute('aria-pressed', String(chosen.length > 0));
  $('#select-all').setAttribute('aria-label', chosen.length === visibleItems().length ? 'Снять выбор со всех товаров' : 'Выбрать все товары');
  $('#select-all').querySelector('img').src = chosen.length > 0 ? asset('a4747.svg') : 'assets/checkbox-inactive.svg';
  $('#ai-caption').hidden = discounted;
  if (chosen.length > 1) {
    $('#options').innerHTML = ['recommended', 'higher'].map((range, index) => `<button class="chip range-chip ${index === 0 ? 'ai-chip' : ''} ${state.range === range ? 'active' : ''}" data-range="${range}" aria-pressed="${state.range === range}">${index === 0 ? `<img src="${asset('c8762.svg')}" alt="">` : ''}${rangeLabel(chosen, range)}</button>`).join('');
  } else if (chosen.length === 1) {
    const item = chosen[0];
    const amount = preview(item).amount;
    const custom = !singlePresets(item).includes(amount);
    $('#options').innerHTML = presetButtons(item, amount, 'data-amount') + `<button class="chip custom-option ${custom ? 'active' : ''}" id="edit" data-edit="${item.id}">${custom ? money(amount) : 'Своя'}</button>`;
  } else $('#options').innerHTML = '';
  const removing = discounted && chosen.length > 0 && chosen.every(item => preview(item).amount === state.applied.get(item.id).amount);
  $('#apply').textContent = removing ? 'Удалить скидку' : 'Применить';
  $('#apply').classList.toggle('secondary', removing);
  $('#apply').disabled = chosen.length === 0;
  renderCategoryNavigation();
}

function renderCategoryNavigation() {
  $('#category-nav').innerHTML = categories.map((category, index) => {
    const count = groupItems(index).length;
    return count ? `<button class="chip" data-jump="${index}">${category.name} · ${count}</button>` : '';
  }).join('');
  updateCategoryNavigation();
}
function updateCategoryNavigation() {
  const scroll = $('#scroll');
  const header = $('#catalog-header');
  header.hidden = scroll.scrollTop < 308;
  if (header.hidden) return;
  const groups = [...document.querySelectorAll('[data-group]')];
  const active = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 1 ? groups.at(-1) : groups.findLast(group => group.offsetTop <= scroll.scrollTop + 150) || groups[0];
  document.querySelectorAll('[data-jump]').forEach(button => {
    const selected = button.dataset.jump === active?.dataset.group;
    const changed = button.classList.contains('active') !== selected;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-current', String(selected));
    if (selected && changed) button.parentElement.scrollTo({ left: button.offsetLeft - 68 });
  });
}
function prepareSelection() {
  const chosen = chosenItems();
  for (const item of chosen) {
    if (state.previews.has(item.id)) continue;
    const result = state.applied.get(item.id) ?? (chosen.length === 1 ? calculateAmount(item, singlePresets(item)[0]) : rangeAmount(item));
    state.previews.set(item.id, result);
  }
}

function openEditor(itemId, custom = false) {
  const item = inventory.find(item => item.id === itemId);
  if (!item) return;
  editorTrigger = document.activeElement;
  const amount = preview(item)?.amount ?? rangeAmount(item).amount;
  state.editor = { item, mode: custom || !singlePresets(item).includes(amount) ? 'custom' : 'preset', draft: String(amount), scrollTop: $('#scroll').scrollTop };
  clearTimeout(toastTimer);
  $('#toast').hidden = true;
  setEditorProductVisibility();
  $('#screen').inert = true;
  $('#editor').hidden = false;
  $('#editor-options').innerHTML = `<div class="editor-presets" id="editor-presets"></div><label class="custom-input"><input id="amount" type="text" inputmode="none" autocomplete="off" maxlength="6" aria-label="Своя сумма скидки в рублях"><span id="amount-suffix">₽</span></label><div id="limit-tooltip" class="limit-tooltip" role="tooltip" aria-live="polite" hidden></div>`;
  updateEditor();
  if (custom) { $('#amount').focus({ preventScroll: true }); $('#amount').select(); }
  else $('#done').focus({ preventScroll: true });
}
function updateEditor() {
  const { item, draft, mode } = state.editor;
  const result = calculateAmount(item, draft);
  const bounds = limits(item.price);
  $('#editor-product').innerHTML = `<div class="product-photo">${photo(item)}</div><div class="product-body"><strong class="product-price">${money(item.price)}</strong><p class="product-title" id="editor-product-title">${item.title}</p><span class="editor-discount ${result ? '' : 'placeholder'}">${result ? money(result.requestedAmount) : 'Скидка ₽'}</span></div>`;
  $('#editor-presets').innerHTML = presetButtons(item, mode === 'preset' ? result?.amount : null, 'data-editor-amount');
  const input = $('#amount');
  input.value = mode === 'custom' ? draft : '';
  $('.custom-input').style.setProperty('--digits', draft.length);
  input.placeholder = mode === 'custom' ? `от ${bounds.minimum} ₽` : 'Своя';
  $('.custom-input').classList.toggle('active', mode === 'custom');
  $('#amount-suffix').hidden = mode !== 'custom' || !draft;
  const connected = state.applied.has(item.id);
  $('#done').disabled = !result;
  $('#done').textContent = connected ? 'Сохранить' : 'Применить скидку';
  $('#cancel-edit').hidden = connected;
  $('#remove-discount').hidden = !connected;
  const limited = result?.limited === true;
  $('#limit-tooltip').hidden = !limited;
  $('#limit-tooltip').textContent = limited ? `${result.requestedAmount < bounds.minimum ? 'Минимальная' : 'Максимальная'}: ${money(result.amount)}` : '';
  if (limited) input.setAttribute('aria-describedby', 'limit-tooltip');
  else input.removeAttribute('aria-describedby');
}
function setDraft(value, caret) {
  if (!state.editor) return;
  state.editor.mode = 'custom';
  state.editor.draft = value.replace(/\D/g, '').slice(0, 6).replace(/^0+(?=\d)/, '');
  updateEditor();
  const next = Math.min(caret ?? state.editor.draft.length, state.editor.draft.length);
  $('#amount').setSelectionRange(next, next);
}
function setEditorProductVisibility() {
  document.querySelectorAll('#catalog .product').forEach(product => {
    product.hidden = product.dataset.id === state.editor?.item.id;
  });
}
function closeEditor() {
  const scrollTop = state.editor.scrollTop;
  state.editor = null;
  setEditorProductVisibility();
  $('#scroll').scrollTop = scrollTop;
  $('#editor').hidden = true;
  $('#screen').inert = false;
  (editorTrigger?.isConnected ? editorTrigger : $('#select-all')).focus({ preventScroll: true });
}
function commitEditor() {
  const { item, draft } = state.editor;
  const result = calculateAmount(item, draft);
  if (!result) return;
  const updating = state.applied.has(item.id);
  state.applied.set(item.id, result);
  state.selected.delete(item.id);
  state.previews.delete(item.id);
  prepareSelection();
  closeEditor();
  render();
  $('#select-all').focus({ preventScroll: true });
  notify(updating ? 'Изменили скидку на товар' : 'Подключили скидку на товар');
}
function notify(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 2500);
}

$('#catalog').addEventListener('click', event => {
  const edit = event.target.closest('[data-edit]');
  if (edit) return openEditor(edit.dataset.edit);
  const product = event.target.closest('[data-select]');
  const category = event.target.closest('[data-category]');
  if (product) state.selected.has(product.dataset.select) ? state.selected.delete(product.dataset.select) : state.selected.add(product.dataset.select);
  else if (category) {
    const items = groupItems(Number(category.dataset.category));
    const checked = items.every(item => state.selected.has(item.id));
    items.forEach(item => checked ? state.selected.delete(item.id) : state.selected.add(item.id));
  }
  prepareSelection();
  render();
});
$('#select-all').addEventListener('click', () => {
  const items = visibleItems();
  state.selected = new Set(chosenItems().length === items.length ? [] : items.map(item => item.id));
  prepareSelection();
  render();
});
$('#options').addEventListener('click', event => {
  const edit = event.target.closest('[data-edit]');
  if (edit) return openEditor(edit.dataset.edit, true);
  const range = event.target.closest('[data-range]');
  const amount = event.target.closest('[data-amount]');
  if (range) {
    state.range = range.dataset.range;
    chosenItems().forEach(item => state.previews.set(item.id, rangeAmount(item)));
  }
  if (amount) {
    const item = chosenItems()[0];
    state.previews.set(item.id, calculateAmount(item, amount.dataset.amount));
  }
  render();
});
$('#editor-options').addEventListener('click', event => {
  const preset = event.target.closest('[data-editor-amount]');
  if (preset) { state.editor.mode = 'preset'; state.editor.draft = preset.dataset.editorAmount; updateEditor(); }
});
$('#editor-options').addEventListener('focusin', event => {
  if (event.target.id !== 'amount' || state.editor.mode === 'custom') return;
  state.editor.mode = 'custom';
  updateEditor();
  $('#amount').select();
});
$('#editor-options').addEventListener('input', event => { if (event.target.id === 'amount') setDraft(event.target.value, event.target.selectionStart); });
$('#done').addEventListener('click', commitEditor);
$('#cancel-edit').addEventListener('click', closeEditor);
$('#cancel-area').addEventListener('click', closeEditor);
$('#remove-discount').addEventListener('click', () => {
  state.applied.delete(state.editor.item.id);
  state.selected.delete(state.editor.item.id);
  state.previews.delete(state.editor.item.id);
  closeEditor(); render();
  $('#select-all').focus({ preventScroll: true });
  notify('Удалили скидку на товар');
});
$('#apply').addEventListener('click', () => {
  const chosen = chosenItems();
  if (!chosen.length) return;
  const removing = state.tab === 'discounted' && chosen.every(item => preview(item).amount === state.applied.get(item.id).amount);
  if (removing) chosen.forEach(item => state.applied.delete(item.id));
  else chosen.map(item => [item.id, preview(item)]).forEach(([id, result]) => state.applied.set(id, result));
  chosen.forEach(item => state.previews.delete(item.id));
  state.selected.clear(); render();
  notify(`${removing ? 'Удалили' : 'Применили'} скидку для ${chosen.length} ${chosen.length % 10 === 1 && chosen.length % 100 !== 11 ? 'товара' : 'товаров'}`);
});
$('#ai-caption').addEventListener('click', () => {
  infoTrigger = $('#ai-caption'); $('#info').hidden = false; $('#screen').inert = true; $('#close-info').focus({ preventScroll: true });
});
function closeInfo() {
  $('#info').hidden = true; $('#screen').inert = false; infoTrigger?.focus({ preventScroll: true });
}
$('#close-info').addEventListener('click', closeInfo);
$('#understood').addEventListener('click', closeInfo);
$('#info').addEventListener('click', event => { if (event.target === $('#info')) closeInfo(); });
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
  state.tab = button.dataset.tab; state.selected.clear(); state.range = state.tab === 'eligible' ? 'recommended' : 'saved'; state.previews.clear();
  $('#scroll').scrollTop = 0; render();
}));
document.querySelectorAll('.back').forEach(button => button.addEventListener('click', EntryScreen.back));
$('#scroll').addEventListener('scroll', updateCategoryNavigation, { passive: true });
$('#category-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-jump]');
  if (!button) return;
  const group = $(`[data-group="${button.dataset.jump}"]`);
  $('#scroll').scrollTo({ top: Math.max(308, group.offsetTop - 142), behavior: 'smooth' });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.editor) { event.preventDefault(); closeEditor(); }
  else if (event.key === 'Enter' && state.editor && event.target.id === 'amount') { event.preventDefault(); commitEditor(); }
  else if (event.key === 'Escape' && !$('#info').hidden) closeInfo();
  if (event.key === 'Tab' && (state.editor || !$('#info').hidden)) {
    const container = state.editor ? $('#editor') : $('#info');
    const controls = [...container.querySelectorAll('button:not(:disabled),input')].filter(element => element.offsetParent !== null);
    const edge = event.shiftKey ? controls[0] : controls.at(-1);
    if (event.target === edge) { event.preventDefault(); controls[event.shiftKey ? controls.length - 1 : 0].focus(); }
  }
});
const letters = ['', 'АБВГ', 'ДЕЖЗ', 'ИЙКЛ', 'МНОП', 'РСТУ', 'ФХЦЧ', 'ШЩЪЫ', 'ЬЭЮЯ'];
$('#keyboard').innerHTML = `<div class="numeric-keyboard" aria-label="Цифровая клавиатура">${letters.map((label, i) => `<button class="numeric-key" data-key="${i + 1}" aria-label="${i + 1}"><span>${i + 1}</span><small>${label}</small></button>`).join('')}<span></span><button class="numeric-key zero" data-key="0" aria-label="0"><span>0</span></button><button class="numeric-key delete-key" data-key="delete" aria-label="Удалить цифру"><img src="${asset('bbc80.svg')}" alt=""></button></div><div class="home"><span></span></div>`;
$('#keyboard').addEventListener('pointerdown', event => { if (event.target.closest('button')) event.preventDefault(); });
$('#keyboard').addEventListener('click', event => {
  const key = event.target.closest('[data-key]');
  if (!key || !state.editor) return;
  const input = $('#amount');
  const draft = state.editor.mode === 'custom' ? state.editor.draft : '';
  const start = input.selectionStart ?? draft.length;
  const end = input.selectionEnd ?? start;
  const deleting = key.dataset.key === 'delete';
  const from = deleting && start === end ? Math.max(0, start - 1) : start;
  setDraft(draft.slice(0, from) + (deleting ? '' : key.dataset.key) + draft.slice(end), from + (deleting ? 0 : 1));
  input.focus({ preventScroll: true });
});

function resize() {
  const width = window.visualViewport?.width || window.innerWidth;
  const height = window.visualViewport?.height || window.innerHeight;
  const mobile = width <= 600;
  const scale = mobile ? width / 375 : Math.min(1, (height - 32) / 812);
  const logicalHeight = mobile ? height / scale : 812;
  $('#stage').style.width = `${375 * scale}px`;
  $('#stage').style.height = `${logicalHeight * scale}px`;
  app.style.height = `${logicalHeight}px`;
  app.style.transform = `scale(${scale})`;
}

function enterDelivery() {
  state.tab = 'eligible';
  state.selected.clear();
  state.range = 'recommended';
  state.previews.clear();
  $('#scroll').scrollTop = 0;
  render();
  $('#screen .back').focus({ preventScroll: true });
}

function leaveDelivery() {
  if (state.editor) closeEditor();
  if (!$('#info').hidden) closeInfo();
  clearTimeout(toastTimer);
  $('#toast').hidden = true;
}

const prepared = new Map();
async function prepareImage(path) {
  if (prepared.has(path)) return;
  const image = new Image();
  image.src = path;
  await image.decode();
  prepared.set(path, image);
}
async function prepareFont(name, weight) {
  if (prepared.has(name)) return;
  const face = new FontFace('Avito Sans Text', `url("assets/avito-sans-text-${name}.woff2")`, { weight: String(weight) });
  await face.load();
  document.fonts.add(face);
  prepared.set(name, face);
}
async function start() {
  $('#retry').hidden = true;
  $('#loading-copy').textContent = 'Загружаем прототип…';
  let timeout;
  try {
    render();
    const paths = new Set([...document.querySelectorAll('img')].map(image => image.getAttribute('src')));
    ['86592.svg', 'c8762.svg', 'a31ca.svg'].forEach(name => paths.add(asset(name)));
    paths.add('assets/checkbox-inactive.svg');
    [previousItem, ...allItems].forEach(item => item.images.forEach(image => paths.add(asset(image))));
    await Promise.race([
      Promise.all([...paths].map(prepareImage).concat(Object.entries({ regular: 400, medium: 500, bold: 700 }).map(([name, weight]) => prepareFont(name, weight)))),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 20000); })
    ]);
    await document.fonts.ready;
    resize();
    app.hidden = false;
    await new Promise(requestAnimationFrame);
    app.inert = false;
    $('#loading').hidden = true;
    EntryScreen.start(enterDelivery, leaveDelivery);
  } catch {
    $('#loading-copy').textContent = 'Не удалось загрузить экран';
    $('#retry').hidden = false;
  } finally { clearTimeout(timeout); }
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
$('#retry').addEventListener('click', start);
start();
