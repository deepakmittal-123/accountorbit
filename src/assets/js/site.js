// Small enhancement only: the page works without JavaScript.
const menu = document.querySelector('.site-menu');
if (menu) {
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

// Mark tables that overflow, so CSS can show a visible swipe hint.
(function () {
  var wraps = document.querySelectorAll('.data-table-wrap');
  if (!wraps.length) return;
  var mark = function () { wraps.forEach(function (w) { var t = w.querySelector('table'); w.classList.toggle('can-scroll', Boolean(t) && t.offsetWidth > w.clientWidth + 1); }); };
  mark();
  window.addEventListener('resize', mark);
})();
