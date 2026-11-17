const EntryScreen = (() => {
  let enter;
  let leave;
  let enteredFromOffers = false;
  const offers = document.querySelector('#offers-screen');
  const delivery = document.querySelector('#screen');
  const trigger = document.querySelector('#open-delivery');

  function showPage() {
    const editing = location.hash === '#delivery';
    offers.hidden = editing;
    delivery.hidden = !editing;
    if (editing) enter();
    else {
      leave();
      trigger.focus({ preventScroll: true });
    }
  }

  function start(onEnter, onLeave) {
    enter = onEnter;
    leave = onLeave;
    history.replaceState({ page: location.hash === '#delivery' ? 'delivery' : 'offers' }, '');
    trigger.addEventListener('click', () => {
      enteredFromOffers = true;
      history.pushState({ page: 'delivery' }, '', '#delivery');
      showPage();
    });
    window.addEventListener('popstate', showPage);
    showPage();
    if (!offers.hidden) document.querySelector('#offers-title').focus({ preventScroll: true });
  }

  function back() {
    if (enteredFromOffers && history.state?.page === 'delivery') history.back();
    else {
      history.replaceState({ page: 'offers' }, '', location.pathname + location.search);
      showPage();
    }
  }

  function updateCount(count, word) {
    document.querySelector('#offer-delivery-status').textContent = count ? `${count} ${word} со скидкой` : 'Отключена';
  }

  return { start, back, updateCount };
})();
