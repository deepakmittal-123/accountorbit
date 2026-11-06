// Small enhancement only: the page works without JavaScript.
const menu = document.querySelector('.site-menu');
if (menu) {
  // Keep the open menu within the screen, measured from where it actually starts, so long lists scroll inside it.
  var fitMenu = function () {
    if (!menu.open) return;
    var nav = menu.querySelector('nav');
    nav.style.maxHeight = Math.max(200, window.innerHeight - nav.getBoundingClientRect().top) + 'px';
  };
  menu.addEventListener('toggle', fitMenu);
  window.addEventListener('resize', fitMenu);
  window.addEventListener('scroll', fitMenu, { passive: true });
  menu.querySelector('nav').addEventListener('click', (event) => {
    if (event.target.closest('a')) menu.open = false;
  });
  document.addEventListener('click', (event) => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
}

// Desktop mega menus. Each hub link always works on its own; the chevron button next to it opens the panel.
// A mouse can also open a panel by hovering, but hover is never the only way in.
(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-mega]'));
  if (!items.length) return;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var closeTimer, openTimer;
  var toggleOf = function (item) { return item.querySelector('.mega__toggle'); };
  var isOpen = function (item) { return toggleOf(item).getAttribute('aria-expanded') === 'true'; };
  var set = function (item, open, byHover) {
    item.dataset.hover = open && byHover ? '1' : '';
    toggleOf(item).setAttribute('aria-expanded', String(open));
    item.querySelector('.mega__panel').hidden = !open;
  };
  var closeAll = function (except) { items.forEach(function (i) { if (i !== except && isOpen(i)) set(i, false); }); };
  items.forEach(function (item) {
    var toggle = toggleOf(item);
    toggle.hidden = false;
    // A click on a panel that hover has just opened keeps it open, rather than closing it under the pointer.
    toggle.addEventListener('click', function () {
      clearTimeout(closeTimer); clearTimeout(openTimer);
      var open = isOpen(item) && item.dataset.hover !== '1' ? false : true;
      closeAll(item); set(item, open);
    });
    // Hover intent: a trigger opens only when the pointer rests on it, so moving diagonally
    // from one menu into its panel does not switch to the menus it passes over.
    item.addEventListener('pointerenter', function (event) {
      if (event.pointerType !== 'mouse' || !finePointer.matches) return;
      clearTimeout(closeTimer); clearTimeout(openTimer);
      if (isOpen(item)) return;
      openTimer = setTimeout(function () { closeAll(item); set(item, true, true); }, 160);
    });
    item.addEventListener('pointerleave', function (event) {
      if (event.pointerType !== 'mouse' || !finePointer.matches) return;
      clearTimeout(openTimer); clearTimeout(closeTimer);
      if (item.dataset.hover !== '1') return; // opened by click or keyboard: stays until dismissed
      closeTimer = setTimeout(function () { if (!item.contains(document.activeElement)) set(item, false); }, 250);
    });
    // Tabbing out of a menu closes it. A click inside the panel does not.
    item.addEventListener('focusout', function (event) {
      if (event.relatedTarget && !item.contains(event.relatedTarget)) set(item, false);
    });
    item.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen(item)) { event.stopPropagation(); set(item, false); toggle.focus(); }
    });
  });
  document.addEventListener('click', function (event) { if (!event.target.closest('[data-mega]')) closeAll(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeAll(); });
})();

// Mobile accordions inside the Menu. They are rendered open, so every link works without JavaScript;
// here they collapse, except the section of the current page.
document.querySelectorAll('[data-macc]').forEach(function (section) {
  var toggle = section.querySelector('.macc__toggle');
  var panel = section.querySelector('.macc__panel');
  var open = Boolean(panel.querySelector('[aria-current="page"]'));
  toggle.hidden = false;
  toggle.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;
  toggle.addEventListener('click', function () {
    var next = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(next));
    panel.hidden = !next;
  });
});

// Mark tables that overflow, so CSS can show a visible swipe hint.
(function () {
  var wraps = document.querySelectorAll('.data-table-wrap');
  if (!wraps.length) return;
  var mark = function () { wraps.forEach(function (w) { var t = w.querySelector('table'); w.classList.toggle('can-scroll', Boolean(t) && t.offsetWidth > w.clientWidth + 1); }); };
  mark();
  window.addEventListener('resize', mark);
})();
