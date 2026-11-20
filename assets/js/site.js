// site.js — small page behaviours shared by every page. The pages read correctly without it.
(function () {
  'use strict';
  var each = function (selector, fn) { Array.prototype.forEach.call(document.querySelectorAll(selector), fn); };

  // Reveal sections as they scroll into view, and draw the "how I solve problems" path.
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    each('.reveal, .steps', function (el) { io.observe(el); });
  } else {
    each('.reveal, .steps', function (el) { el.classList.add('in'); });
  }

  // Project library: filter by discipline. A project can belong to several.
  var chips = document.querySelector('.chips');
  if (chips) {
    var buttons = chips.querySelectorAll('button');
    var count = document.querySelector('.count');
    var apply = function (key) {
      var shown = 0;
      each('.library .card', function (card) {
        var on = key === 'all' || (' ' + card.getAttribute('data-disciplines') + ' ').indexOf(' ' + key + ' ') !== -1;
        card.hidden = !on;
        if (on) shown++;
      });
      each('.library .group', function (group) {
        group.hidden = !group.querySelector('.card:not([hidden])');
      });
      Array.prototype.forEach.call(buttons, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === key)); });
      if (count) count.textContent = shown + (shown === 1 ? ' project' : ' projects');
    };
    chips.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      apply(b.getAttribute('data-filter'));
      if (history.replaceState) history.replaceState(null, '', b.getAttribute('data-filter') === 'all' ? location.pathname : '#' + b.getAttribute('data-filter'));
    });
    var wanted = location.hash.replace('#', '');
    if (wanted && chips.querySelector('[data-filter="' + wanted + '"]')) apply(wanted);
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Featured rail: arrows and a sliding bar that scroll the cards sideways.
  each('[data-rail]', function (rail) {
    var track = rail.querySelector('.rail-track');
    var bar = rail.querySelector('[data-rail-bar]'), thumb = rail.querySelector('[data-rail-thumb]');
    var prev = rail.querySelector('[data-rail-prev]'), next = rail.querySelector('[data-rail-next]');
    var sync = function () {
      var max = track.scrollWidth - track.clientWidth;
      var frac = Math.min(1, track.clientWidth / Math.max(1, track.scrollWidth));
      var p = max > 0 ? track.scrollLeft / max : 0;
      thumb.style.width = (frac * 100).toFixed(2) + '%';
      thumb.style.transform = 'translateX(' + (p * (1 / frac - 1) * 100).toFixed(2) + '%)';
      prev.disabled = p <= 0.01;
      next.disabled = p >= 0.99;
      rail.classList.toggle('no-scroll', max <= 2);
    };
    // Arrows move one card at a time. "want" remembers the card being scrolled to, so quick repeated
    // clicks each count, instead of being measured from wherever the slide happens to be mid-way.
    var want = null, settle = 0;
    var step = function (dir) {
      var card = track.querySelector('.card');
      var w = card ? card.getBoundingClientRect().width : track.clientWidth / 3;
      var last = Math.round((track.scrollWidth - track.clientWidth) / w);
      var from = want != null ? want : Math.round(track.scrollLeft / w);
      want = Math.max(0, Math.min(last, from + dir));
      track.scrollTo({ left: want * w, behavior: reduce ? 'auto' : 'smooth' });
    };
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    track.addEventListener('scroll', function () {
      sync();
      clearTimeout(settle);
      settle = setTimeout(function () { want = null; }, 160);
    }, { passive: true });
    window.addEventListener('resize', sync);
    // Drag or click the bar to slide.
    var dragging = false;
    var seek = function (e) {
      var r = bar.getBoundingClientRect();
      var frac = Math.min(1, track.clientWidth / Math.max(1, track.scrollWidth));
      var usable = r.width * (1 - frac);
      var p = usable > 0 ? (e.clientX - r.left - (r.width * frac) / 2) / usable : 0;
      track.scrollLeft = Math.min(1, Math.max(0, p)) * (track.scrollWidth - track.clientWidth);
    };
    bar.addEventListener('pointerdown', function (e) {
      dragging = true; bar.classList.add('is-dragging');
      track.style.scrollSnapType = 'none';
      if (bar.setPointerCapture) bar.setPointerCapture(e.pointerId);
      seek(e);
    });
    bar.addEventListener('pointermove', function (e) { if (dragging) seek(e); });
    var release = function () {
      if (!dragging) return;
      dragging = false; bar.classList.remove('is-dragging');
      track.style.scrollSnapType = '';
    };
    bar.addEventListener('pointerup', release);
    bar.addEventListener('pointercancel', release);
    sync();
    window.addEventListener('load', sync);
  });

  // The floating "All projects" button appears once the visitor has scrolled into a case study.
  var floatBack = document.querySelector('.back-float');
  if (floatBack) {
    var onScroll = function () { floatBack.classList.toggle('on', window.scrollY > 520); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Pop-up window for LinkedIn and GitHub. Those sites refuse to be shown inside another page,
  // so the window gives a dark preview here and opens the real page in a new tab on request.
  var win = document.getElementById('win');
  if (win) {
    var body = document.body, d = body.dataset;
    var title = win.querySelector('.win-title'), open = win.querySelector('.win-open'), content = win.querySelector('.win-body');
    var closeBtn = win.querySelector('.win-close'), barEl = win.querySelector('[data-win-drag]');
    var opener = null;
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var initials = (d.name || '').split(' ').map(function (w) { return w.charAt(0); }).join('').slice(0, 2);
    var who = function (avatar, name, line) {
      return '<div class="win-who">' + avatar + '<div><h3>' + esc(name) + '</h3><p>' + esc(line) + '</p></div></div>';
    };
    var badge = '<span class="win-avatar" aria-hidden="true">' + esc(initials) + '</span>';

    // LinkedIn posts listed in content/site.json ("linkedin_posts") are written into the page by tools/build.py.
    var posts = [];
    try { posts = JSON.parse((document.getElementById('linkedin-posts') || {}).textContent || '[]'); } catch (err) { posts = []; }
    var showLinkedIn = function () {
      title.textContent = 'LinkedIn · ' + d.linkedinHandle;
      open.href = d.linkedinUrl;
      var list = posts.map(function (p) {
        return '<li><a href="' + esc(p.url) + '" target="_blank" rel="noopener"><strong>' + esc(p.title) + '</strong>' +
          (p.note ? '<span>' + esc(p.note) + '</span>' : '') + '<small>LinkedIn post</small></a></li>';
      }).join('');
      content.innerHTML = who(badge, d.name, d.headline) +
        '<p>Posts about these projects, experience and education are on LinkedIn.</p>' +
        '<div class="win-actions"><a class="btn primary" href="' + esc(d.linkedinUrl) + '" target="_blank" rel="noopener">Open LinkedIn profile</a>' +
        '<a class="btn" href="mailto:' + esc(d.email) + '">Email instead</a></div>' +
        (list ? '<ul class="win-list">' + list + '</ul>' : '') +
        '<p class="win-note">LinkedIn does not allow its pages to be shown inside another site, so the profile opens in a new tab and this page stays where it is.</p>';
    };

    var renderRepos = function (user, repos) {
      // Leave out forks and the repository this website is published from (<user>.github.io): it holds only the built pages.
      var self = (d.github + '.github.io').toLowerCase();
      var list = repos.filter(function (r) { return !r.fork && String(r.name).toLowerCase() !== self; }).slice(0, 12).map(function (r) {
        var when = r.pushed_at ? new Date(r.pushed_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
        var meta = [r.language, when ? 'updated ' + when : '', r.stargazers_count ? r.stargazers_count + ' stars' : ''].filter(Boolean).join(' · ');
        return '<li><a href="' + esc(r.html_url) + '" target="_blank" rel="noopener"><strong>' + esc(r.name) + '</strong>' +
          (r.description ? '<span>' + esc(r.description) + '</span>' : '') + '<small>' + esc(meta) + '</small></a></li>';
      }).join('');
      var avatar = user && user.avatar_url ? '<img class="win-avatar" src="' + esc(user.avatar_url) + '&s=120" alt="" width="54" height="54">' : badge;
      var line = '@' + d.github;   // no count: the list below leaves out the website's own repository
      // The name always comes from this site, never from the GitHub profile, so it stays as the owner wants it shown.
      content.innerHTML = who(avatar, d.name, line) +
        (list ? '<ul class="win-list">' + list + '</ul>' : '<p>No public repositories to show yet.</p>');
    };
    var showGitHub = function () {
      title.textContent = 'GitHub · ' + d.github;
      open.href = d.githubUrl;
      content.innerHTML = who(badge, d.name, '@' + d.github) + '<p>Loading repositories…</p>';
      var fallback = function () {
        content.innerHTML = who(badge, d.name, '@' + d.github) +
          '<p>The repository list could not be loaded just now.</p>' +
          '<div class="win-actions"><a class="btn primary" href="' + esc(d.githubUrl) + '" target="_blank" rel="noopener">Open GitHub profile</a></div>';
      };
      var cached = null;
      try { cached = JSON.parse(sessionStorage.getItem('gh:' + d.github) || 'null'); } catch (err) { cached = null; }
      if (cached) { renderRepos(cached.user, cached.repos); return; }
      if (!window.fetch) { fallback(); return; }
      var api = 'https://api.github.com/users/' + encodeURIComponent(d.github);
      Promise.all([fetch(api), fetch(api + '/repos?sort=pushed&per_page=30')]).then(function (res) {
        if (!res[0].ok || !res[1].ok) throw new Error('GitHub answered ' + res[0].status);
        return Promise.all([res[0].json(), res[1].json()]);
      }).then(function (data) {
        try { sessionStorage.setItem('gh:' + d.github, JSON.stringify({ user: data[0], repos: data[1] })); } catch (err) { /* private mode */ }
        if (!win.hidden && title.textContent.indexOf('GitHub') === 0) renderRepos(data[0], data[1]);
      }).catch(fallback);
    };

    var closeWin = function () {
      win.hidden = true;
      if (opener && opener.focus) opener.focus();
      opener = null;
    };
    var openWin = function (kind, from) {
      opener = from || null;
      win.hidden = false;
      win.setAttribute('data-kind', kind === 'github' ? 'github' : 'linkedin');
      if (kind === 'github') showGitHub(); else showLinkedIn();
      closeBtn.focus();
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[data-window]') : null;
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      openWin(a.getAttribute('data-window'), a);
    });
    closeBtn.addEventListener('click', closeWin);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !win.hidden) closeWin(); });

    // Drag the window by its title bar. On phones it is a fixed sheet instead.
    var drag = null;
    barEl.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a, button') || window.matchMedia('(max-width: 760px)').matches) return;
      var r = win.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      win.style.left = r.left + 'px'; win.style.top = r.top + 'px'; win.style.right = 'auto'; win.style.bottom = 'auto';
      win.classList.add('is-dragging');
      if (barEl.setPointerCapture) barEl.setPointerCapture(e.pointerId);
    });
    barEl.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var w = win.offsetWidth, h = win.offsetHeight;
      var x = Math.min(window.innerWidth - 60, Math.max(60 - w, e.clientX - drag.dx));
      var y = Math.min(window.innerHeight - 46, Math.max(0, e.clientY - drag.dy));
      win.style.left = x + 'px'; win.style.top = y + 'px';
    });
    var drop = function () { drag = null; win.classList.remove('is-dragging'); };
    barEl.addEventListener('pointerup', drop);
    barEl.addEventListener('pointercancel', drop);
    window.addEventListener('resize', function () {
      if (win.hidden || !win.style.left) return;
      win.style.left = Math.min(window.innerWidth - 60, parseFloat(win.style.left)) + 'px';
      win.style.top = Math.min(window.innerHeight - 46, parseFloat(win.style.top)) + 'px';
    });
  }

  // Copy the email address.
  each('[data-copy]', function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy'), original = btn.textContent;
      var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = original; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
    });
  });
})();
