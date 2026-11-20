// pointer.js — shared by every page.
// A custom cursor (a precise dot plus a ring that trails it), buttons that lean toward the pointer,
// project cards that carry a pool of light, and panels that tilt in 3D.
// Mouse and pen only: touch keeps the native behaviour, and nothing here is needed for the page to work.
// See docs/02-design-system.md, section 7.
(function () {
  'use strict';
  var docEl = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (selector, fn) { Array.prototype.forEach.call(document.querySelectorAll(selector), fn); };

  // ----- custom cursor -----
  var cur = document.querySelector('.cursor');
  if (cur) {
    var dot = cur.querySelector('.cursor-dot'), ring = cur.querySelector('.cursor-ring'), label = cur.querySelector('.cursor-label');
    var x = 0, y = 0, rx = 0, ry = 0, active = false;
    var setState = function (target) {
      var el = target && target.closest ? target.closest('[data-cursor], a, button') : null;
      var kind = el ? (el.hasAttribute('data-cursor') ? el.getAttribute('data-cursor') : 'link') : '';
      cur.classList.toggle('is-link', kind === 'link');
      cur.classList.toggle('is-view', kind === 'view');
      cur.classList.toggle('is-scene', kind === 'scene');
      if (kind !== 'scene') cur.classList.remove('is-node');
      label.textContent = kind === 'view' ? (el.getAttribute('data-cursor-label') || 'View') : '';
    };
    var loop = function () {
      if (!active) return;
      var k = reduce ? 1 : 0.22;
      rx += (x - rx) * k; ry += (y - ry) * k;
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      x = e.clientX; y = e.clientY;
      if (!active) { active = true; rx = x; ry = y; docEl.classList.add('has-cursor'); requestAnimationFrame(loop); }
      cur.classList.remove('is-hidden');
      setState(e.target);
    }, { passive: true });
    window.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') { active = false; docEl.classList.remove('has-cursor'); return; }
      cur.classList.add('is-down');
    }, { passive: true });
    window.addEventListener('pointerup', function () { cur.classList.remove('is-down'); }, { passive: true });
    document.addEventListener('mouseleave', function () { cur.classList.add('is-hidden'); });
    window.addEventListener('scroll', function () { if (active) setState(document.elementFromPoint(x, y)); }, { passive: true });
  }

  if (reduce) return;

  // ----- buttons lean a few pixels toward the pointer -----
  each('.btn:not(.pending), .seg', function (el) {
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = el.getBoundingClientRect();
      el.style.transform = 'translate(' + ((e.clientX - (r.left + r.width / 2)) * 0.2).toFixed(1) + 'px,' + ((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1) + 'px)';
    });
    el.addEventListener('pointerleave', function () { el.style.transform = ''; });
  });

  // ----- project cards: the light follows the pointer and the thumbnail tilts toward it -----
  each('.card', function (card) {
    var thumb = card.querySelector('.thumb');
    card.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      if (thumb) thumb.style.transform = 'perspective(700px) rotateX(' + ((0.5 - py) * 9).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 11).toFixed(2) + 'deg) translateZ(8px)';
    });
    card.addEventListener('pointerleave', function () { if (thumb) thumb.style.transform = ''; });
  });

  // ----- panels marked data-tilt lean toward the pointer anywhere over their parent -----
  each('[data-tilt]', function (el) {
    var host = el.parentElement;
    host.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = host.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.transform = 'rotateX(' + ((0.5 - py) * 14).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 18).toFixed(2) + 'deg)';
    });
    host.addEventListener('pointerleave', function () { el.style.transform = ''; });
  });
})();
