document.addEventListener('DOMContentLoaded', () => {
  let highestZ = 20;

  // --- AUDIO MANAGER ---
  const audioTracks = {
    zelda: new Audio('assets/zelda.mp3'),
    kirby: new Audio('assets/kirby.mp3'),
    tetris: new Audio('assets/tetris.mp3')
  };

  Object.values(audioTracks).forEach(audio => {
    audio.loop = true;
    audio.preload = 'auto';
  });

  let currentTrackName = 'zelda';
  let isMuted = false;
  let currentVolume = 0.7; // default 70%
  let hasUserInteracted = false;

  function applyVolume() {
    const vol = isMuted ? 0 : currentVolume;
    Object.values(audioTracks).forEach(audio => {
      audio.volume = vol;
    });

    const volBtn = document.getElementById('vol-btn');
    const volSlider = document.getElementById('vol-slider');
    const volMuteBtn = document.getElementById('vol-btn-mute');
    const trackInfo = document.getElementById('vol-track-info');

    if (volSlider) volSlider.value = Math.round(currentVolume * 100);

    if (volBtn) {
      if (isMuted || currentVolume === 0) {
        volBtn.textContent = '🔇 Mute';
      } else if (currentVolume < 0.4) {
        volBtn.textContent = `🔈 ${Math.round(currentVolume * 100)}%`;
      } else {
        volBtn.textContent = `🔊 ${Math.round(currentVolume * 100)}%`;
      }
    }

    if (volMuteBtn) {
      volMuteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    }

    if (trackInfo) {
      trackInfo.textContent = currentTrackName.toUpperCase();
    }
  }

  function playTrack(name) {
    currentTrackName = name;
    applyVolume();
    if (!hasUserInteracted) return;

    Object.entries(audioTracks).forEach(([track, audio]) => {
      if (track === name) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    });
  }

  // Volume UI setup
  const volBtn = document.getElementById('vol-btn');
  const volPopover = document.getElementById('vol-popover');
  const volSlider = document.getElementById('vol-slider');
  const volMuteBtn = document.getElementById('vol-btn-mute');

  if (volBtn && volPopover) {
    volBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      volPopover.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!volPopover.contains(e.target) && e.target !== volBtn) {
        volPopover.classList.add('hidden');
      }
    });
  }

  if (volSlider) {
    volSlider.addEventListener('input', (e) => {
      currentVolume = parseInt(e.target.value, 10) / 100;
      if (isMuted && currentVolume > 0) isMuted = false;
      applyVolume();
    });
  }

  if (volMuteBtn) {
    volMuteBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      applyVolume();
    });
  }

  applyVolume();

  // --- CLOCK ---
  function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // --- CRT TOGGLE ---
  const crtBtn = document.getElementById('toggle-crt');
  if (crtBtn) {
    crtBtn.addEventListener('click', () => {
      document.body.classList.toggle('crt-filter');
      crtBtn.textContent = document.body.classList.contains('crt-filter') ? 'CRT: ON' : 'CRT: OFF';
    });
  }

  // --- WINDOWS MANAGEMENT ---
  const windows = Array.from(document.querySelectorAll('.window'));
  const taskbarTasks = document.getElementById('taskbar-tasks');

  function bringToFront(win) {
    highestZ += 1;
    win.style.zIndex = highestZ;
    windows.forEach(w => w.classList.remove('active'));
    win.classList.add('active');
    updateTaskbar();
  }

  function updateTaskbar() {
    if (!taskbarTasks) return;
    taskbarTasks.innerHTML = '';
    windows.forEach(win => {
      // Don't show entrance modal on taskbar
      if (win.id === 'win-entrance') return;

      if (!win.classList.contains('hidden')) {
        const titleEl = win.querySelector('.title-bar-text');
        const title = titleEl ? titleEl.textContent : 'Window';
        const taskBtn = document.createElement('button');
        taskBtn.className = 'task-item' + (win.classList.contains('active') ? ' active' : '');
        taskBtn.textContent = title;
        taskBtn.onclick = () => {
          if (win.classList.contains('active')) {
            win.classList.add('hidden');
            win.classList.remove('active');
          } else {
            win.classList.remove('hidden');
            bringToFront(win);
          }
          updateTaskbar();
        };
        taskbarTasks.appendChild(taskBtn);
      }
    });
  }

  // Controls & Dragging
  windows.forEach(win => {
    win.addEventListener('mousedown', () => bringToFront(win));

    const closeBtn = win.querySelector('.btn-close');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        win.classList.add('hidden');
        win.classList.remove('active');
        updateTaskbar();

        // Pause Tetris if closed
        if (win.id === 'win-tetris' && window.TetrisGame) {
          window.TetrisGame.pause();
        }
      };
    }

    const minBtn = win.querySelector('.btn-min');
    if (minBtn) {
      minBtn.onclick = (e) => {
        e.stopPropagation();
        win.classList.add('hidden');
        win.classList.remove('active');
        updateTaskbar();
      };
    }

    const titleBar = win.querySelector('.title-bar');
    if (titleBar) {
      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      titleBar.addEventListener('mousedown', (e) => {
        if (e.target.tagName.toLowerCase() === 'button') return;
        isDragging = true;
        bringToFront(win);
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = win.offsetLeft;
        initialTop = win.offsetTop;

        // Clear center-transform if dragging entrance modal
        if (win.style.transform) {
          const rect = win.getBoundingClientRect();
          win.style.transform = 'none';
          win.style.left = `${rect.left}px`;
          win.style.top = `${rect.top}px`;
          initialLeft = rect.left;
          initialTop = rect.top;
        }

        const onMouseMove = (ev) => {
          if (!isDragging) return;
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          win.style.left = `${Math.max(0, initialLeft + dx)}px`;
          win.style.top = `${Math.max(0, initialTop + dy)}px`;
        };

        const onMouseUp = () => {
          isDragging = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }
  });

  // Desktop Icons Click/Double-click
  function openWindow(winId) {
    const win = document.getElementById(winId);
    if (win) {
      win.classList.remove('hidden');
      bringToFront(win);
    }
  }

  document.querySelectorAll('.icon').forEach(icon => {
    icon.addEventListener('dblclick', () => {
      const targetId = icon.getAttribute('data-window');
      openWindow(targetId);
    });
    icon.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        const targetId = icon.getAttribute('data-window');
        openWindow(targetId);
      }
    });
  });

  // --- ENTRANCE BOOT MODAL ---
  const winEntrance = document.getElementById('win-entrance');
  const btnEnter = document.getElementById('btn-enter-system');
  const btnEntranceClose = document.getElementById('btn-entrance-close');

  function enterSystem() {
    hasUserInteracted = true;
    playTrack('zelda'); // Default theme on open
    if (winEntrance) {
      winEntrance.classList.add('hidden');
      winEntrance.classList.remove('active');
    }
    updateTaskbar();
  }

  if (btnEnter) btnEnter.addEventListener('click', enterSystem);
  if (btnEntranceClose) btnEntranceClose.addEventListener('click', enterSystem);

  // --- KIRBY & AUTO TOUR ---
  const startBtn = document.getElementById('start-btn');
  const kirbyWalker = document.getElementById('kirby-walker');
  const kirbySpeech = document.getElementById('kirby-speech');
  const tourToast = document.getElementById('tour-toast');
  const tourToastText = document.getElementById('tour-toast-text');

  let tourTimer = null;
  let kirbyAnimFrame = null;
  let kirbyX = -120;
  let kirbySpeed = 2.4;

  function showToast(text, duration = 3000) {
    if (!tourToast || !tourToastText) return;
    tourToastText.textContent = text;
    tourToast.classList.remove('hidden');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      tourToast.classList.add('hidden');
    }, duration);
  }

  function startKirbyWalk() {
    if (!kirbyWalker) return;
    kirbyWalker.classList.remove('hidden');
    kirbyX = -100;
    cancelAnimationFrame(kirbyAnimFrame);

    function animateKirby() {
      kirbyX += kirbySpeed;
      kirbyWalker.style.left = `${kirbyX}px`;

      if (kirbyX < window.innerWidth + 120) {
        kirbyAnimFrame = requestAnimationFrame(animateKirby);
      } else {
        kirbyWalker.classList.add('hidden');
      }
    }
    kirbyAnimFrame = requestAnimationFrame(animateKirby);
  }

  function setKirbySpeech(text) {
    if (kirbySpeech) kirbySpeech.textContent = text;
  }

  function runWebsiteTour() {
    hasUserInteracted = true;
    playTrack('kirby'); // Kirby theme on Start button

    if (startBtn) startBtn.classList.add('touring');
    startKirbyWalk();

    // Tour Timeline
    const steps = [
      {
        delay: 300,
        action: () => {
          showToast('🌟 Step 1: Opening About Me...', 2800);
          setKirbySpeech("Hi! I'm Kirby! Let's check out Arul! 📁");
          openWindow('win-about');
        }
      },
      {
        delay: 3200,
        action: () => {
          showToast('💾 Step 2: Projects Showcase...', 2800);
          setKirbySpeech('Cool retro projects built right here! 💾');
          openWindow('win-projects');
        }
      },
      {
        delay: 6200,
        action: () => {
          showToast('📟 Step 3: MS-DOS Prompt...', 3200);
          setKirbySpeech('Hacking the terminal! Type "help" anytime! 📟');
          openWindow('win-terminal');
          // Auto type command demo
          const termInput = document.getElementById('term-input');
          const termOutput = document.getElementById('term-output');
          if (termInput && termOutput) {
            termInput.value = 'help';
            setTimeout(() => {
              const demoResp = document.createElement('div');
              demoResp.innerHTML = '<div>C:\\&gt; help</div><div>Commands: help, about, date, clear, domain, contact</div><br>';
              termOutput.appendChild(demoResp);
              termOutput.scrollTop = termOutput.scrollHeight;
              termInput.value = '';
            }, 600);
          }
        }
      },
      {
        delay: 9800,
        action: () => {
          showToast('📝 Step 4: Sign the Guestbook...', 2800);
          setKirbySpeech('Leave a greeting in the guestbook! 📝');
          openWindow('win-guestbook');
        }
      },
      {
        delay: 13000,
        action: () => {
          showToast('🕹️ Step 5: Ready for Hard Tetris?', 3200);
          setKirbySpeech('Try Tetris.exe if you dare! Enjoy! ⭐');
          openWindow('win-tetris');
          if (startBtn) startBtn.classList.remove('touring');
        }
      }
    ];

    steps.forEach(step => {
      setTimeout(step.action, step.delay);
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      runWebsiteTour();
    });
  }

  // --- TERMINAL COMMANDS ---
  const termInput = document.getElementById('term-input');
  const termOutput = document.getElementById('term-output');

  if (termInput) {
    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = termInput.value.trim().toLowerCase();
        termInput.value = '';

        let response = '';
        if (cmd === 'help') {
          response = 'Commands: help, about, tour, tetris, music, date, clear, domain, contact';
        } else if (cmd === 'about') {
          response = 'Arul - Retro enthusiast & web maker.';
        } else if (cmd === 'tour') {
          runWebsiteTour();
          response = 'Initiating interactive site tour...';
        } else if (cmd === 'tetris') {
          openWindow('win-tetris');
          response = 'Launching TETRIS.EXE [HARD MODE]...';
        } else if (cmd === 'music') {
          response = `Current soundtrack: ${currentTrackName.toUpperCase()} (Volume: ${Math.round(currentVolume * 100)}%)`;
        } else if (cmd === 'date') {
          response = new Date().toString();
        } else if (cmd === 'domain') {
          response = 'Domain: arul.cc.cd (Cloudflare Tunnel: Active)';
        } else if (cmd === 'clear') {
          termOutput.innerHTML = '';
          return;
        } else if (cmd === 'contact') {
          response = 'Email: hello@arul.cc.cd';
        } else if (cmd !== '') {
          response = `Bad command or file name: "${cmd}"`;
        }

        const entry = document.createElement('div');
        entry.innerHTML = `<div>C:\\&gt; ${cmd}</div>${response ? `<div>${response}</div>` : ''}<br>`;
        termOutput.appendChild(entry);
        termOutput.scrollTop = termOutput.scrollHeight;
      }
    });
  }

  // --- GUESTBOOK ---
  const gbForm = document.getElementById('guestbook-form');
  const gbEntries = document.getElementById('gb-entries');
  if (gbForm) {
    gbForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('gb-name').value.trim();
      const msg = document.getElementById('gb-msg').value.trim();
      if (!name || !msg) return;

      const item = document.createElement('div');
      item.className = 'gb-entry';
      item.innerHTML = `<strong>${escapeHtml(name)}:</strong> ${escapeHtml(msg)}`;
      gbEntries.prepend(item);

      gbForm.reset();
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- HARD TETRIS ENGINE ---
  const canvas = document.getElementById('tetris-canvas');
  const nextCanvas = document.getElementById('tetris-next');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;

  const scoreEl = document.getElementById('tetris-score');
  const linesEl = document.getElementById('tetris-lines');
  const overlay = document.getElementById('tetris-overlay');
  const overlayTitle = document.getElementById('tetris-overlay-title');
  const overlayDesc = document.getElementById('tetris-overlay-desc');
  const startBtnTetris = document.getElementById('tetris-start-btn');
  const bgmToggleTetris = document.getElementById('tetris-bgm-toggle');

  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 20; // 10 * 20 = 200, 20 * 20 = 400

  // Hard Tetris Pieces & Retro Colors
  const PIECES = [
    { name: 'I', shape: [[1, 1, 1, 1]], color: '#00ffff' },
    { name: 'J', shape: [[1, 0, 0], [1, 1, 1]], color: '#0000ff' },
    { name: 'L', shape: [[0, 0, 1], [1, 1, 1]], color: '#ff7f00' },
    { name: 'O', shape: [[1, 1], [1, 1]], color: '#ffff00' },
    { name: 'S', shape: [[0, 1, 1], [1, 1, 0]], color: '#00ff00' },
    { name: 'T', shape: [[0, 1, 0], [1, 1, 1]], color: '#800080' },
    { name: 'Z', shape: [[1, 1, 0], [0, 1, 1]], color: '#ff0000' }
  ];

  let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let currentPiece = null;
  let nextPiece = null;
  let pieceX = 0;
  let pieceY = 0;
  let score = 0;
  let lines = 0;
  let gameOver = false;
  let isPaused = false;
  let gameInterval = null;
  let baseSpeed = 180; // Hard mode default: very fast 180ms
  let tetrisBgmActive = false;

  function randomPiece() {
    const p = PIECES[Math.floor(Math.random() * PIECES.length)];
    return {
      shape: p.shape.map(row => [...row]),
      color: p.color
    };
  }

  function drawBlock(c, x, y, color, size = BLOCK_SIZE) {
    c.fillStyle = color;
    c.fillRect(x * size, y * size, size, size);

    // Retro bevel
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x * size, (y + 1) * size);
    c.lineTo(x * size, y * size);
    c.lineTo((x + 1) * size, y * size);
    c.stroke();

    c.strokeStyle = '#000000';
    c.beginPath();
    c.moveTo((x + 1) * size, y * size);
    c.lineTo((x + 1) * size, (y + 1) * size);
    c.lineTo(x * size, (y + 1) * size);
    c.stroke();
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw board
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          drawBlock(ctx, c, r, board[r][c]);
        } else {
          // faint grid dots
          ctx.fillStyle = '#111122';
          ctx.fillRect(c * BLOCK_SIZE + 9, r * BLOCK_SIZE + 9, 2, 2);
        }
      }
    }

    // Draw current piece
    if (currentPiece) {
      currentPiece.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            drawBlock(ctx, pieceX + c, pieceY + r, currentPiece.color);
          }
        });
      });
    }

    // Draw Next Piece
    if (nextCtx && nextPiece) {
      nextCtx.fillStyle = '#000';
      nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
      const nSize = 16;
      const offsetX = Math.floor((nextCanvas.width - nextPiece.shape[0].length * nSize) / 2 / nSize);
      const offsetY = Math.floor((nextCanvas.height - nextPiece.shape.length * nSize) / 2 / nSize);

      nextPiece.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            drawBlock(nextCtx, offsetX + c, offsetY + r, nextPiece.color, nSize);
          }
        });
      });
    }
  }

  function collides(nx, ny, shape = currentPiece.shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = nx + c;
          const newY = ny + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && board[newY][newX]) return true;
        }
      }
    }
    return false;
  }

  function rotate(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const res = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        res[c][rows - 1 - r] = shape[r][c];
      }
    }
    return res;
  }

  function spawnPiece() {
    currentPiece = nextPiece || randomPiece();
    nextPiece = randomPiece();
    pieceX = Math.floor((COLS - currentPiece.shape[0].length) / 2);
    pieceY = 0;

    if (collides(pieceX, pieceY)) {
      endTetris();
    }
  }

  function lockPiece() {
    currentPiece.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          const by = pieceY + r;
          const bx = pieceX + c;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
            board[by][bx] = currentPiece.color;
          }
        }
      });
    });

    // Clear completed lines
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell !== 0)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }

    if (cleared > 0) {
      lines += cleared;
      // Hard mode bonus scoring
      const lineMultipliers = [0, 100, 300, 600, 1200];
      score += (lineMultipliers[cleared] || 1500);
      if (scoreEl) scoreEl.textContent = String(score).padStart(5, '0');
      if (linesEl) linesEl.textContent = lines;

      // Speed up in Hard mode (down to 70ms minimum)
      baseSpeed = Math.max(70, 180 - Math.floor(lines / 3) * 10);
      restartInterval();
    }

    spawnPiece();
    draw();
  }

  function drop() {
    if (gameOver || isPaused) return;
    if (!collides(pieceX, pieceY + 1)) {
      pieceY++;
    } else {
      lockPiece();
    }
    draw();
  }

  function hardDrop() {
    if (gameOver || isPaused) return;
    while (!collides(pieceX, pieceY + 1)) {
      pieceY++;
      score += 2;
    }
    if (scoreEl) scoreEl.textContent = String(score).padStart(5, '0');
    lockPiece();
  }

  function restartInterval() {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(drop, baseSpeed);
  }

  function startTetris() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0;
    lines = 0;
    baseSpeed = 180;
    gameOver = false;
    isPaused = false;
    if (scoreEl) scoreEl.textContent = '00000';
    if (linesEl) linesEl.textContent = '0';
    if (overlay) overlay.classList.add('hidden');

    if (tetrisBgmActive) {
      playTrack('tetris');
    }

    nextPiece = randomPiece();
    spawnPiece();
    draw();
    restartInterval();
  }

  function endTetris() {
    gameOver = true;
    if (gameInterval) clearInterval(gameInterval);
    if (overlay) {
      overlayTitle.textContent = 'GAME OVER';
      overlayDesc.textContent = `Score: ${score} | Lines: ${lines}`;
      startBtnTetris.textContent = '🔄 TRY AGAIN';
      overlay.classList.remove('hidden');
    }
  }

  function togglePause() {
    if (gameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
      if (gameInterval) clearInterval(gameInterval);
      if (overlay) {
        overlayTitle.textContent = 'PAUSED';
        overlayDesc.textContent = 'Hard Mode [180ms Speed]';
        startBtnTetris.textContent = '▶ RESUME';
        overlay.classList.remove('hidden');
      }
    } else {
      if (overlay) overlay.classList.add('hidden');
      restartInterval();
    }
  }

  window.TetrisGame = {
    pause: () => {
      if (!isPaused && !gameOver) togglePause();
    }
  };

  if (startBtnTetris) {
    startBtnTetris.addEventListener('click', () => {
      if (isPaused && !gameOver) {
        togglePause();
      } else {
        startTetris();
      }
    });
  }

  if (bgmToggleTetris) {
    bgmToggleTetris.addEventListener('click', () => {
      tetrisBgmActive = !tetrisBgmActive;
      bgmToggleTetris.textContent = tetrisBgmActive ? '🎵 Tetris BGM: On' : '🎵 Tetris BGM: Off';
      if (tetrisBgmActive) {
        playTrack('tetris');
      } else {
        playTrack('zelda');
      }
    });
  }

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    const tetrisWin = document.getElementById('win-tetris');
    if (!tetrisWin || tetrisWin.classList.contains('hidden')) return;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    if (gameOver || isPaused) {
      if (e.key.toLowerCase() === 'p') togglePause();
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
        if (!collides(pieceX - 1, pieceY)) { pieceX--; draw(); }
        break;
      case 'ArrowRight':
        if (!collides(pieceX + 1, pieceY)) { pieceX++; draw(); }
        break;
      case 'ArrowUp': {
        const rotated = rotate(currentPiece.shape);
        if (!collides(pieceX, pieceY, rotated)) {
          currentPiece.shape = rotated;
          draw();
        } else if (!collides(pieceX - 1, pieceY, rotated)) {
          pieceX--;
          currentPiece.shape = rotated;
          draw();
        } else if (!collides(pieceX + 1, pieceY, rotated)) {
          pieceX++;
          currentPiece.shape = rotated;
          draw();
        }
        break;
      }
      case 'ArrowDown':
        drop();
        break;
      case ' ':
        hardDrop();
        break;
      case 'p':
      case 'P':
        togglePause();
        break;
    }
  });

  // Touch / Button controls for Tetris
  document.getElementById('t-left')?.addEventListener('click', () => {
    if (!collides(pieceX - 1, pieceY)) { pieceX--; draw(); }
  });
  document.getElementById('t-right')?.addEventListener('click', () => {
    if (!collides(pieceX + 1, pieceY)) { pieceX++; draw(); }
  });
  document.getElementById('t-rot')?.addEventListener('click', () => {
    if (!currentPiece) return;
    const rotated = rotate(currentPiece.shape);
    if (!collides(pieceX, pieceY, rotated)) {
      currentPiece.shape = rotated;
      draw();
    }
  });
  document.getElementById('t-down')?.addEventListener('click', drop);
  document.getElementById('t-drop')?.addEventListener('click', hardDrop);
  document.getElementById('t-pause')?.addEventListener('click', togglePause);

  // Initial draw of Tetris board
  draw();
  updateTaskbar();
});
