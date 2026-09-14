(function () {
  // Both decks share the same suit-index order (heart~copas, diamond~oros,
  // club~bastos, spade~espadas) so switching decks mid-round keeps the same
  // hidden card. The Spanish deck's inlined ids reuse these same suit words
  // internally (see baraja-espanola.svg), just prefixed with "es_".
  const SUIT_KEYS = ['heart', 'diamond', 'club', 'spade'];
  const REVEAL_SECONDS = 5;
  const COUNTDOWN_START = 3;
  const FLIP_TRANSITION_MS = 600; // must match .flip-card-inner transition duration in style.css

  const TRANSLATIONS = {
    es: {
      appTitle: 'Es un 10, pero&hellip;',
      subtitle: 'Un juego de fiesta con una baraja de cartas',
      rules: [
        'Un jugador pulsa <strong>Jugar</strong> y recibe una carta oculta — un número del 1 al 10.',
        'Solo el resto de la sala ve la carta. ¡El jugador no debe mirar!',
        'La sala describe a alguien que sería un 10 perfecto, pero con un defecto — pensado según lo que a ese jugador le molestaría: <em>"Es un 10, pero se corta las uñas de los pies en el sofá."</em>',
        'El jugador adivina el número imaginando cómo lo valoraría personalmente: <em>"Entonces es un 5."</em>',
        'Descubre la carta para ver qué tan cerca estuvo, ¡y pasa el turno para jugar de nuevo!',
      ],
      play: 'Jugar',
      flip: 'Girar carta',
      reflip: 'Volver a mostrar',
      discover: 'Revelar',
      playAgain: 'Jugar de nuevo',
      deck: { ariaLabel: 'Baraja', spanish: 'Española', french: 'Francesa' },
      themeToggleAria: 'Cambiar tema',
      langToggleAria: 'Cambiar idioma',
      footer: { developedBy: 'Desarrollado por' },
      hints: {
        showCard: '¡Muestra la carta a los demás, no la mires tú!',
        getReady: 'Prepárate para mostrar la carta...',
        revealing: 'Mostrando la carta a la sala...',
        hidden: 'Carta oculta de nuevo. Comenten "Es un 10, pero..."',
        discovered: (value) => `¡Es un ${value}!`,
      },
    },
    en: {
      appTitle: 'It\'s a 10, but&hellip;',
      subtitle: 'A party game with a deck of cards',
      rules: [
        'A player presses <strong>Play</strong> and gets a hidden card — a number from 1 to 10.',
        'Only the rest of the room sees the card. The player must not look!',
        'The room describes someone who would be a perfect 10, but with a flaw — chosen based on what would bother that player: <em>"It\'s a 10, but they clip their toenails on the couch."</em>',
        'The player guesses the number by imagining how they\'d personally rate it: <em>"So it\'s a 5."</em>',
        'They reveal the card to see how close they were, then pass the turn to play again!',
      ],
      play: 'Play',
      flip: 'Flip card',
      reflip: 'Show again',
      discover: 'Reveal',
      playAgain: 'Play again',
      deck: { ariaLabel: 'Deck', spanish: 'Spanish', french: 'French' },
      themeToggleAria: 'Switch theme',
      langToggleAria: 'Switch language',
      footer: { developedBy: 'Developed by' },
      hints: {
        showCard: 'Show the card to everyone else, don\'t look yourself!',
        getReady: 'Get ready to show the card...',
        revealing: 'Showing the card to the room...',
        hidden: 'Card hidden again. Discuss "It\'s a 10, but..."',
        discovered: (value) => `It's a ${value}!`,
      },
    },
  };

  function getPath(obj, path) {
    return path.split('.').reduce((o, key) => (o == null ? o : o[key]), obj);
  }

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
  const langToggle = document.getElementById('lang-toggle');

  let currentCard = null;
  let currentDeck = document.documentElement.dataset.deck || 'spanish';
  let currentLang = document.documentElement.lang || 'es';
  let currentHint = null; // { key, args } — re-rendered on language switch
  let pendingTimeouts = [];

  function t(path) {
    return getPath(TRANSLATIONS[currentLang], path);
  }

  function setHint(key, ...args) {
    currentHint = { key, args };
    const value = t(`hints.${key}`);
    hintEl.textContent = typeof value === 'function' ? value(...args) : value;
  }

  function applyTranslations() {
    document.title = t('appTitle').replace('&hellip;', '…');
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.innerHTML = getPath(TRANSLATIONS[currentLang], el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', getPath(TRANSLATIONS[currentLang], el.dataset.i18nAria));
    });
    langToggle.textContent = currentLang === 'es' ? 'EN' : 'ES';
    if (currentHint) {
      setHint(currentHint.key, ...currentHint.args);
    }
  }

  function setLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('lang', lang);
    } catch (e) {}
    applyTranslations();
  }

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
    setHint('showCard');
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
    setHint('getReady');
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
    setHint('revealing');
    setButtons({});

    let remaining = REVEAL_SECONDS;
    revealCountdownEl.textContent = String(remaining);

    function tick() {
      remaining -= 1;
      if (remaining <= 0) {
        revealCountdownEl.textContent = '';
        card.classList.remove('is-flipped');
        setHint('hidden');
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
    setHint('discovered', currentCard.value);
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

  langToggle.addEventListener('click', () => {
    setLang(currentLang === 'es' ? 'en' : 'es');
  });

  deckButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.deckOption === currentDeck);
  });
  setTheme(document.documentElement.dataset.theme || 'light');
  applyTranslations();
})();
