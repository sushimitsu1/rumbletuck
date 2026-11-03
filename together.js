// "Guess the vehicle": a tiny read-aloud guessing game for the homepage. No network, no storage.
(function(){
  const root = document.querySelector('[data-game]');
  if (!root) return;
  const FRIENDS = {
    ra:    {name: 'Ra the Ratata', slug: 'ra-the-ratata-and-the-rocky-road'},
    cody:  {name: 'Cody the Cement Mixer', slug: 'cody-the-cement-mixer-and-the-cracked-sidewalk'},
    ruby:  {name: 'Ruby the Rescue Rover', slug: 'ruby-the-rescue-rover-and-the-foggy-meadow-path'},
    hank:  {name: 'Harbor Hank the Pilot Boat', slug: 'harbor-hank-the-pilot-boat-and-the-loose-float-line'},
    cedar: {name: 'Cedar the Night Train', slug: 'cedar-the-night-train-and-the-sleepy-valley'},
    willa: {name: 'Willa the Little Plane', slug: 'willa-the-little-plane-and-the-quiet-sky'},
    heli:  {name: 'Heli the Rescue Helicopter', slug: 'heli-the-rescue-helicopter-and-the-mountain-picnic'},
    gavin: {name: 'Gavin the Garbage Truck', slug: 'gavin-the-garbage-truck-and-the-moonlit-cleanup'},
    luna:  {name: 'Luna the Little Spaceship', slug: 'luna-the-little-spaceship-and-the-sleepy-star-garden'},
    niko:  {name: 'Niko the Snowplow', slug: 'niko-the-snowplow-and-the-sleepy-mountain-road'}
  };
  const CLUES = [
    ['ra',    '“I go ra-ta-ta-ta! and break big rocks into little ones.” Who am I?'],
    ['cedar', '“I’m pine green, I never hurry, and I carry sleepy passengers through a moonlit valley.” Who am I?'],
    ['cody',  '“My drum goes swish, swish, swish, and I fix bumpy cracks in the sidewalk.” Who am I?'],
    ['luna',  '“I float far above the Earth and visit a garden full of stars.” Who am I?'],
    ['ruby',  '“My warm amber lights help a little lost lamb find her mama in the fog.” Who am I?'],
    ['niko',  '“Scrrrape–swish! I push the snow off a twisty mountain road.” Who am I?'],
    ['gavin', '“Whooooosh! After a windy gust, I tidy up the park so the animals can sleep.” Who am I?'],
    ['willa', '“I fly one quiet loop over town and glide home as the moon comes up.” Who am I?'],
    ['heli',  '“My spinning blades carry a picnic basket over the mountain rocks.” Who am I?'],
    ['hank',  '“I have a soft yellow cabin light, and my tiny friend Dot is a dinghy.” Who am I?']
  ];
  const clueEl = root.querySelector('[data-clue]'), choicesEl = root.querySelector('[data-choices]');
  const resultEl = root.querySelector('[data-result]'), nextBtn = root.querySelector('[data-next]');
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let order = shuffle(CLUES.map((_, i) => i)), pos = 0, done = false;
  function round(){
    const [answer, clue] = CLUES[order[pos % order.length]];
    done = false; resultEl.textContent = ''; resultEl.className = 'game-result';
    clueEl.textContent = clue;
    const others = shuffle(Object.keys(FRIENDS).filter(k => k !== answer)).slice(0, 2);
    choicesEl.innerHTML = '';
    shuffle([answer, ...others]).forEach(id => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice'; b.dataset.id = id;
      b.innerHTML = `<img src="img/friends/${id}.webp" width="400" height="387" alt=""><span>${FRIENDS[id].name.split(' the ')[0]}</span>`;
      b.setAttribute('aria-label', FRIENDS[id].name);
      b.addEventListener('click', () => pick(b, id, answer));
      choicesEl.appendChild(b);
    });
  }
  function pick(btn, id, answer){
    if (done) return;
    if (id === answer) {
      done = true; btn.classList.add('right');
      const f = FRIENDS[answer];
      resultEl.className = 'game-result yes';
      resultEl.innerHTML = `Yes! It’s ${f.name}. <a href="/story/${f.slug}/">Read the story</a>`;
    } else {
      btn.classList.add('wrong'); btn.disabled = true;
      resultEl.className = 'game-result';
      resultEl.textContent = 'Not quite. Try again!';
    }
  }
  nextBtn.addEventListener('click', () => { pos++; round(); clueEl.focus && clueEl.setAttribute('tabindex', '-1'); clueEl.focus(); });
  root.hidden = false;
  round();
})();
