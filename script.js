(function () {
  const SUITS = ['♥', '♦', '♣', '♠'];
  const REVEAL_SECONDS = 5;
  const COUNTDOWN_START = 3;
  const FLIP_TRANSITION_MS = 600; // must match .flip-card-inner transition duration in style.css

  const screens = {
    rules: document.getElementById('screen-rules'),
    game: document.getElementById('screen-game'),
  };

  const card = document.getElementById('card');
  const cardValueEl = document.getElementById('card-value');
  const cardCornerTop = document.getElementById('card-corner-top');
  const cardCornerBottom = document.getElementById('card-corner-bottom');
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownNumber = document.getElementById('countdown-number');
  const revealCountdownEl = document.getElementById('reveal-countdown');
  const hintEl = document.getElementById('game-hint');

  const btnPlay = document.getElementById('btn-play');
  const btnFlip = document.getElementById('btn-flip');
  const btnReflip = document.getElementById('btn-reflip');
  const btnDiscover = document.getElementById('btn-discover');
  const btnPlayAgain = document.getElementById('btn-play-again');

  let currentCard = null;
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

  function dealCard() {
    const value = 1 + Math.floor(Math.random() * 10);
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    currentCard = { value, suit };
    cardValueEl.textContent = `${value}${suit}`;
    cardCornerTop.textContent = `${value}${suit}`;
    cardCornerBottom.textContent = `${value}${suit}`;
    const isRed = suit === '♥' || suit === '♦';
    card.querySelector('.flip-card-front').classList.toggle('suit-red', isRed);
  }

  function enterReadyState() {
    clearPendingTimeouts();
    const wasFlipped = card.classList.contains('is-flipped');
    card.classList.remove('is-flipped');
    countdownOverlay.classList.remove('active');
    revealCountdownEl.textContent = '';
    hintEl.textContent = '¡Muestra la carta a la sala, no la mires tú!';
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
    hintEl.textContent = '¡La carta está al descubierto!';
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
})();
