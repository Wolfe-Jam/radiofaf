// RadioFAF Episode Combo — Google-style search dropdown.
// Renders into <div id="ep-combo-mount" data-current="N"></div>.
// Keyboard: ↑/↓ navigate, Enter go, Esc close. Click to dismiss.
// Add a new episode = one line in the EPISODES array below.

(function () {
  'use strict';

  const EPISODES = [
    { num: 13, slug: 'ep13', title: 'Nelly Wants to Sing' },
    { num: 12, slug: 'ep12', title: 'The Token Tax' },
    { num: 11, slug: 'ep11', title: "Empathy's Echo" },
    { num: 10, slug: 'ep10', title: 'Training Troubles' },
    { num: 9,  slug: 'ep9',  title: 'Context Chaos' },
    { num: 8,  slug: 'ep8',  title: "Memory's Mirage" },
    { num: 7,  slug: 'ep7',  title: 'Structure Over Syntax' },
    { num: 6,  slug: 'ep6',  title: 'Persistent Souls' },
    { num: 5,  slug: 'ep5',  title: 'David vs Goliath' },
    { num: 4,  slug: 'ep4',  title: 'Love On The Air' },
    { num: 3,  slug: 'ep3',  title: 'Standardize This' },
    { num: 2,  slug: 'ep2',  title: 'Code Wars' },
    { num: 1,  slug: 'ep1',  title: 'Open Claw or Closed Flaw?' },
  ];

  const STYLES = `
    /* Episode combo — bottom-anchored, opens UP. Frees the top of the page for title + share-x. */
    .ep-combo { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); width: calc(100vw - 32px); max-width: 480px; font-family: 'SF Mono','Fira Code',Consolas,monospace; padding: 0; z-index: 100; }
    @media (max-width: 720px) {
      .ep-combo { bottom: max(12px, env(safe-area-inset-bottom, 12px)); width: calc(100vw - 16px); max-width: calc(100vw - 16px); }
    }
    .ep-combo-input { width: 100%; padding: 0.7rem 2.4rem 0.7rem 2.2rem; background: #0f0f0f; color: #fff; border: 2px solid #444; border-radius: 8px; font-family: inherit; font-size: 0.9rem; letter-spacing: 0.01em; outline: none; transition: border-color 0.2s ease, box-shadow 0.2s ease; caret-color: #E91E9E; cursor: pointer; }
    .ep-combo-input::placeholder { color: #888; }
    .ep-combo-input:focus { border-color: #E91E9E; box-shadow: 0 0 0 3px rgba(233,30,158,0.15); cursor: text; }
    .ep-combo-icon { position: absolute; left: 0.6rem; top: 50%; transform: translateY(-50%); color: #666; pointer-events: none; font-size: 0.85rem; }
    /* Caret: up-arrow when closed (▴), rotates 180° to ▾ when open. */
    .ep-combo-caret { position: absolute; right: 0.7rem; top: 50%; color: #84FF00; pointer-events: none; font-size: 1.1rem; font-weight: 900; line-height: 1; transform: translateY(-50%) rotate(0deg); transition: transform 0.18s ease, color 0.18s ease; }
    .ep-combo.open .ep-combo-caret { transform: translateY(-50%) rotate(180deg); color: #E91E9E; }
    /* List opens UPWARD from the input. */
    .ep-combo-list { position: absolute; left: 0; right: 0; bottom: 100%; margin-bottom: 0.4rem; background: #0f0f0f; border: 2px solid #444; border-radius: 8px; max-height: 56vh; overflow-y: auto; z-index: 1000; display: none; box-shadow: 0 -8px 32px rgba(0,0,0,0.5); }
    .ep-combo-list.open { display: block; }
    .ep-combo-item { display: block; padding: 0.6rem 1rem; color: #ddd; text-decoration: none; font-size: 0.85rem; border-bottom: 1px solid #1a1a1a; transition: background 0.15s ease, color 0.15s ease; }
    .ep-combo-item:last-child { border-bottom: none; }
    .ep-combo-item:hover, .ep-combo-item.highlighted { background: rgba(233,30,158,0.12); color: #fff; }
    .ep-combo-item .ep-num { color: #84FF00; font-weight: 700; margin-right: 0.5rem; }
    .ep-combo-item.active { background: rgba(132,255,0,0.08); }
    .ep-combo-item.active .ep-num { color: #E91E9E; }
    .ep-combo-empty { padding: 0.9rem 1rem; color: #666; font-size: 0.85rem; text-align: center; font-style: italic; }
  `;

  function fmtNum(n) { return 'EP' + (n < 10 ? '0' + n : n); }

  function match(ep, f) {
    if (!f) return true;
    return (
      ep.title.toLowerCase().includes(f) ||
      ('ep' + ep.num).includes(f) ||
      String(ep.num).includes(f)
    );
  }

  function mount() {
    const root = document.getElementById('ep-combo-mount');
    if (!root) return;

    // Inject styles once.
    if (!document.getElementById('ep-combo-styles')) {
      const s = document.createElement('style');
      s.id = 'ep-combo-styles';
      s.textContent = STYLES;
      document.head.appendChild(s);
    }

    const currentNum = parseInt(root.dataset.current, 10) || 0;
    const current = EPISODES.find(function (e) { return e.num === currentNum; });
    const placeholder = current
      ? (fmtNum(current.num) + ' · ' + current.title)
      : 'Find an episode…';

    root.innerHTML =
      '<div class="ep-combo">' +
        '<span class="ep-combo-icon">🔍</span>' +
        '<input type="text" class="ep-combo-input" placeholder="' + placeholder.replace(/"/g, '&quot;') + '" autocomplete="off" aria-label="Find an episode">' +
        '<span class="ep-combo-caret" aria-hidden="true">▴</span>' +
        '<div class="ep-combo-list" role="listbox"></div>' +
      '</div>';

    const wrap = root.querySelector('.ep-combo');
    const input = root.querySelector('.ep-combo-input');
    const list = root.querySelector('.ep-combo-list');
    let highlighted = 0;
    let currentMatches = EPISODES.slice();

    function render(filter) {
      const f = (filter || '').trim().toLowerCase();
      currentMatches = EPISODES.filter(function (e) { return match(e, f); });
      highlighted = 0;
      if (currentMatches.length === 0) {
        list.innerHTML = '<div class="ep-combo-empty">No episodes match "' + f.replace(/</g, '&lt;') + '"</div>';
        return;
      }
      list.innerHTML = currentMatches.map(function (ep, i) {
        const cls = 'ep-combo-item' +
          (ep.num === currentNum ? ' active' : '') +
          (i === highlighted ? ' highlighted' : '');
        return '<a href="/' + ep.slug + '" class="' + cls + '" data-idx="' + i + '" role="option">' +
          '<span class="ep-num">' + fmtNum(ep.num) + '</span>' + ep.title +
        '</a>';
      }).join('');
    }

    function updateHighlight() {
      const items = list.querySelectorAll('.ep-combo-item');
      items.forEach(function (item, i) {
        item.classList.toggle('highlighted', i === highlighted);
      });
      const el = items[highlighted];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }

    function isOpen() { return list.classList.contains('open'); }
    function open() {
      list.classList.add('open');
      wrap.classList.add('open'); // rotates caret via CSS
      render(input.value);
    }
    function close() {
      list.classList.remove('open');
      wrap.classList.remove('open');
    }

    input.addEventListener('focus', function () {
      input.value = '';
      open();
    });
    input.addEventListener('blur', function () {
      // Delay so clicks on items register before close.
      setTimeout(close, 150);
    });
    // Click on the input bar when open also closes (in addition to outside-click).
    // Detected via mousedown so it fires before blur and we can intercept.
    input.addEventListener('mousedown', function (e) {
      if (isOpen()) {
        e.preventDefault();
        input.blur(); // triggers the blur → setTimeout close above
      }
    });
    input.addEventListener('input', function (e) {
      render(e.target.value);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); input.blur(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlighted = Math.min(highlighted + 1, currentMatches.length - 1);
        updateHighlight();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlighted = Math.max(highlighted - 1, 0);
        updateHighlight();
      } else if (e.key === 'Enter') {
        const ep = currentMatches[highlighted];
        if (ep) {
          e.preventDefault();
          window.location.href = '/' + ep.slug;
        }
      }
    });

    // Close when clicking outside.
    document.addEventListener('click', function (e) {
      if (!root.contains(e.target)) close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
