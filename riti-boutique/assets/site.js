// Riti Boutique — mobile nav + gallery reveal. No dependencies.

(function () {
  var nav = document.getElementById('nav');
  var burger = nav && nav.querySelector('.burger');

  if (burger) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  var more = document.getElementById('more');
  var grid = document.getElementById('grid');
  if (more && grid) {
    var extra = grid.querySelectorAll('[data-extra]');
    if (!extra.length) {
      more.remove();
    } else {
      more.addEventListener('click', function () {
        extra.forEach(function (el) { el.hidden = false; });
        more.remove();
      });
    }
  }
})();
