// Riti Boutique — mobile nav, scroll-chapter choreography, gallery reveal.
// No dependencies: IntersectionObserver + CSS transforms only.

(function () {
  // Progressive enhancement: only hide .reveal elements once JS confirms
  // it can also reveal them again. Crawlers / no-JS visitors see everything.
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) document.documentElement.classList.add('js-anim');

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

  // ---- Scroll-chapter reveal (fade + small rise on enter, per-chapter) ----
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle('in-view', entry.isIntersecting);
        });
      },
      { threshold: 0.35 }
    );
    document.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });

    var chapterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle('in-view', entry.isIntersecting);
        });
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll('.chapter').forEach(function (el) { chapterObserver.observe(el); });
  }

  // ---- Chapter dot indicator: visible + synced only while inside .story ----
  var story = document.getElementById('story');
  var dots = document.getElementById('dots');
  if (story && dots && 'IntersectionObserver' in window) {
    var chapters = Array.prototype.slice.call(story.querySelectorAll('.chapter'));
    var dotButtons = Array.prototype.slice.call(dots.querySelectorAll('button'));

    dots.hidden = false;
    var visibility = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          dots.classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );
    visibility.observe(story);

    var active = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var idx = chapters.indexOf(entry.target);
          dotButtons.forEach(function (b, i) { b.classList.toggle('is-active', i === idx); });
        });
      },
      { threshold: 0.6 }
    );
    chapters.forEach(function (el) { active.observe(el); });

    dotButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.getElementById(btn.dataset.target);
        if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }
})();
