// Fighter viewer: pick a fighter in the cast, see their specials in the game, their manga panels, every animation
// playing at game speed and every drawing.
(function () {
  const $ = id => document.getElementById(id);
  const byId = Object.fromEntries(window.FIGHTERS.map(f => [f.id, f]));
  const GAME = 'https://armory-amber.vercel.app/play';
  const words = s => s.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
  let current = null, timers = [], slow = false;

  function stopAll() { timers.forEach(clearTimeout); timers = []; }

  // Plays a list of [image, seconds] forever, with a short rest before it starts again.
  function play(img, frames, rest) {
    let i = 0;
    const step = () => {
      const [src, sec] = frames[i];
      img.src = src;
      const wait = sec * (slow ? 3 : 1) + (i === frames.length - 1 ? rest : 0);
      i = (i + 1) % frames.length;
      timers.push(setTimeout(step, wait * 1000));
    };
    step();
  }

  function card(f, name, frames, rest, special, note) {
    const el = document.createElement('div');
    el.className = 'anim' + (special ? ' sp' : '');
    el.innerHTML = `<div class="stage"><img alt=""></div><b>${name}</b><small>${note}</small>`;
    play(el.querySelector('img'), frames, rest);
    return el;
  }

  function show(id, scroll) {
    const f = byId[id]; if (!f) return;
    current = f; stopAll();
    document.querySelectorAll('.fighter').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    const P = n => `f/${f.id}/${n}.png`;
    $('vPortrait').src = `img/p-${f.id === 'fletch' ? 'Fletch' : f.name}.png`;
    $('vName').textContent = f.name;
    $('vTitle').textContent = f.title;

    // specials in the game
    $('screen').innerHTML = '<span>Pick a special to watch it play in the game.</span>';
    document.querySelectorAll('.watchBtns button').forEach(b => b.classList.remove('on'));

    // manga panels, labelled by who is attacking and who is getting hit
    const lab = {
      light: ['att', `${f.name}'s light special`, `${f.name} attacking`],
      heavy: ['att', `${f.name}'s heavy special`, `${f.name} attacking`],
      shocked: ['hit', `${f.name} getting hit`, `Shown when someone's special lands on ${f.name}`],
    };
    $('vPanels').innerHTML = ['light', 'heavy', 'shocked'].filter(k => f.panels[k]).map(k =>
      `<figure><div class="lab ${lab[k][0]}"><b>${lab[k][1]}</b>${lab[k][2]}</div><img src="${f.panels[k]}" alt="" loading="lazy"></figure>`).join('');

    // animations: loops first, then every move (specials first), timed like the game (60 frames a second)
    const box = $('vAnims'); box.innerHTML = '';
    for (const l of f.loops) {
      const fps = /Idle/.test(l.name) ? 8 : 10;
      box.appendChild(card(f, l.name, l.frames.map(n => [P(n), 1 / fps]), 0, false, `${l.frames.length} frames, loops`));
    }
    for (const m of f.moves) {
      // merge repeated poses into one hold, and keep every pose on screen long enough to see
      const seq = [];
      for (const [pose, n] of m.seq) { const last = seq[seq.length - 1]; if (last && last[0] === pose) last[1] += n; else seq.push([pose, n]); }
      const frames = seq.map(([pose, n]) => [P(pose), Math.max(.09, n / 60)]);
      const unique = new Set(seq.map(s => s[0])).size;
      box.appendChild(card(f, m.name, frames, .6, m.special, `${unique} drawing${unique > 1 ? 's' : ''}`));
    }

    // every drawing
    $('vCount').textContent = `${f.files.length} drawings`;
    $('vAll').innerHTML = f.files.map(n => `<div><img src="${P(n)}" alt="" loading="lazy">${words(n)}</div>`).join('');
    if (scroll) $('viewer').scrollIntoView({behavior: 'smooth'});
  }

  document.querySelectorAll('.fighter').forEach(b => b.addEventListener('click', () => show(b.dataset.id, true)));

  document.querySelectorAll('.watchBtns button').forEach(b => b.addEventListener('click', () => {
    if (!current) return;
    document.querySelectorAll('.watchBtns button').forEach(x => x.classList.toggle('on', x === b));
    const q = `preview&cpuoff&noescape&p1=${current.id}&p2=${current.foe}&cut=${current.cuts[b.dataset.cut]}`;
    $('screen').innerHTML = `<iframe src="${GAME}?${q}" title="${current.name} special" allow="autoplay; fullscreen"></iframe>`;
  }));

  $('slow').addEventListener('click', () => {
    slow = !slow;
    $('slow').classList.toggle('on', slow);
    $('slow').textContent = 'SLOW MOTION: ' + (slow ? 'ON' : 'OFF');
    if (current) show(current.id, false);
  });

  show('razor', false);
})();
