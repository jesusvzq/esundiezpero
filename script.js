(function () {
  // Both decks share the same suit-index order (heart~copas, diamond~oros,
  // club~bastos, spade~espadas) so switching decks mid-round keeps the same
  // hidden card. The Spanish deck's inlined ids reuse these same suit words
  // internally (see baraja-espanola.svg), just prefixed with "es_".
  const SUIT_KEYS = ['heart', 'diamond', 'club', 'spade'];
  const REVEAL_SECONDS = 5;
  const COUNTDOWN_START = 3;
  const FLIP_TRANSITION_MS = 600; // must match .flip-card-inner transition duration in style.css

  const screens = {
    rules: document.getElementById('screen-rules'),
    game: document.getElementById('screen-game'),
  };

  const card = document.getElementById('card');
  const cardUse = document.getElementById('card-use');
  const cardUseEs = document.getElementById('card-use-es');
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownNumber = document.getElementById('countdown-number');
  const revealCountdownEl = document.getElementById('reveal-countdown');
  const hintEl = document.getElementById('game-hint');

  const btnPlay = document.getElementById('btn-play');
  const btnFlip = document.getElementById('btn-flip');
  const btnReflip = document.getElementById('btn-reflip');
  const btnDiscover = document.getElementById('btn-discover');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const deckButtons = document.querySelectorAll('[data-deck-option]');
  const themeToggle = document.getElementById('theme-toggle');

  let currentCard = null;
  let currentDeck = document.documentElement.dataset.deck || 'spanish';
  let pendingTimeouts = [];

  function clearPendingTimeouts() {
    pendingTimeouts.forEach(clearTimeout);
    pendingTimeouts = [];
  }

  function after(ms, fn) {
    const id = setTimeout(fn, ms);
    pendingTimeouts.push(id);
    return id;
  }

  function showScreen(name) {
    Object.values(screens).forEach((el) => el.classList.remove('active'));
    screens[name].classList.add('active');
  }

  function setButtons({ flip = false, reflip = false, discover = false, playAgain = false }) {
    btnFlip.classList.toggle('hidden', !flip);
    btnReflip.classList.toggle('hidden', !reflip);
    btnDiscover.classList.toggle('hidden', !discover);
    btnPlayAgain.classList.toggle('hidden', !playAgain);
  }

  function renderCard() {
    if (!currentCard) return;
    const suit = SUIT_KEYS[currentCard.suitIndex];
    cardUse.setAttribute('href', `#${suit}_${currentCard.value}`);
    cardUseEs.setAttribute('href', `#es_${suit}_${currentCard.value}`);
  }

  function dealCard() {
    const value = 1 + Math.floor(Math.random() * 10);
    const suitIndex = Math.floor(Math.random() * 4);
    currentCard = { value, suitIndex };
    renderCard();
  }

  function setDeck(deck) {
    currentDeck = deck;
    document.documentElement.dataset.deck = deck;
    try {
      localStorage.setItem('deck', deck);
    } catch (e) {}
    deckButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.deckOption === deck);
    });
    renderCard();
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
  }

  function enterReadyState() {
    clearPendingTimeouts();
    const wasFlipped = card.classList.contains('is-flipped');
    card.classList.remove('is-flipped');
    countdownOverlay.classList.remove('active');
    revealCountdownEl.textContent = '';
    hintEl.textContent = '¡Muestra la carta a los demás, no la mires tú!';
    setButtons({});

    function finishReady() {
      dealCard();
      setButtons({ flip: true });
    }

    // Wait for the flip-back animation to finish hiding the front face
    // before swapping in the next card, otherwise the new value flashes
    // on screen while the old front face is still visible mid-flip.
    if (wasFlipped) {
      after(FLIP_TRANSITION_MS, finishReady);
    } else {
      finishReady();
    }
  }

  function startCountdown(onDone) {
    countdownOverlay.classList.add('active');
    hintEl.textContent = 'Prepárate para mostrar la carta...';
    setButtons({});

    let remaining = COUNTDOWN_START;
    countdownNumber.textContent = String(remaining);

    function tick() {
      remaining -= 1;
      if (remaining <= 0) {
        countdownOverlay.classList.remove('active');
        onDone();
        return;
      }
      countdownNumber.textContent = String(remaining);
      after(1000, tick);
    }

    after(1000, tick);
  }

  function revealCard() {
    card.classList.add('is-flipped');
    hintEl.textContent = 'Mostrando la carta a la sala...';
    setButtons({});

    let remaining = REVEAL_SECONDS;
    revealCountdownEl.textContent = String(remaining);

    function tick() {
      remaining -= 1;
      if (remaining <= 0) {
        revealCountdownEl.textContent = '';
        card.classList.remove('is-flipped');
        hintEl.textContent = 'Carta oculta de nuevo. Comenten "Es un 10, pero..."';
        setButtons({ reflip: true, discover: true });
        return;
      }
      revealCountdownEl.textContent = String(remaining);
      after(1000, tick);
    }

    after(1000, tick);
  }

  function discoverCard() {
    clearPendingTimeouts();
    revealCountdownEl.textContent = '';
    card.classList.add('is-flipped');
    hintEl.textContent = `¡Es un ${currentCard.value}!`;
    setButtons({ playAgain: true });
  }

  btnPlay.addEventListener('click', () => {
    showScreen('game');
    enterReadyState();
  });

  btnFlip.addEventListener('click', () => {
    startCountdown(revealCard);
  });

  btnReflip.addEventListener('click', () => {
    startCountdown(revealCard);
  });

  btnDiscover.addEventListener('click', discoverCard);

  btnPlayAgain.addEventListener('click', enterReadyState);

  deckButtons.forEach((btn) => {
    btn.addEventListener('click', () => setDeck(btn.dataset.deckOption));
  });

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    setTheme(next);
  });

  deckButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.deckOption === currentDeck);
  });
  setTheme(document.documentElement.dataset.theme || 'light');
})();
