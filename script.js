document.addEventListener('DOMContentLoaded', () => {
  let highestZ = 20;

  // --- AUDIO ENGINE ---
  const tracks = {
    zelda: new Audio('assets/zelda.mp3'),
    kirby: new Audio('assets/kirby.mp3'),
    tetris: new Audio('assets/tetris.mp3')
  };

  Object.values(tracks).forEach(audio => {
    audio.loop = true;
    audio.preload = 'auto';
  });

  let currentTrack = 'zelda';
  let isMuted = false;
  let currentVolume = 0.7;
  let audioUnlocked = false;

  function applyVolume() {
    const effectiveVol = isMuted ? 0 : currentVolume;
    Object.values(tracks).forEach(audio => {
      audio.volume = effectiveVol;
    });

    const volIcon = document.getElementById('vol-icon');
    const volValLabel = document.getElementById('vol-val-label');
    const volRange = document.getElementById('vol-range');
    const volMuteBtn = document.getElementById('vol-mute-btn');

    if (volRange) volRange.value = Math.round(currentVolume * 100);
    if (volValLabel) volValLabel.textContent = isMuted ? 'Muted' : `${Math.round(currentVolume * 100)}%`;

    if (volIcon) {
      if (isMuted || currentVolume === 0) {
        volIcon.textContent = '🔇';
      } else if (currentVolume < 0.4) {
        volIcon.textContent = '🔈';
      } else {
        volIcon.textContent = '🔊';
      }
    }

    if (volMuteBtn) {
      volMuteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    }
  }

  function playTrack(name) {
    currentTrack = name;
    applyVolume();
    if (!audioUnlocked) return;

    Object.entries(tracks).forEach(([key, audio]) => {
      if (key === name) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    });
  }

  function pauseAllAudio() {
    Object.values(tracks).forEach(audio => audio.pause());
  }

  function unlockAudioAndPlay(name = 'zelda') {
    audioUnlocked = true;
    playTrack(name);
  }

  // Fallback: any user gesture unlocks audio if not already done
  function gestureUnlock() {
    if (!audioUnlocked) {
      unlockAudioAndPlay(currentTrack);
    }
  }
  window.addEventListener('pointerdown', gestureUnlock, { once: true });
  window.addEventListener('keydown', gestureUnlock, { once: true });

  // Volume UI setup
  const volControl = document.getElementById('vol-control');
  const volIconBtn = document.getElementById('vol-icon-btn');
  const volPopup = document.getElementById('vol-popup');
  const volRange = document.getElementById('vol-range');
  const volMuteBtn = document.getElementById('vol-mute-btn');

  if (volIconBtn && volPopup) {
    volIconBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      volPopup.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (volControl && !volControl.contains(e.target)) {
        volPopup.classList.remove('show');
      }
    });
  }

  if (volRange) {
    volRange.addEventListener('input', (e) => {
      currentVolume = parseInt(e.target.value, 10) / 100;
      if (isMuted && currentVolume > 0) isMuted = false;
      applyVolume();
    });
  }

  if (volMuteBtn) {
    volMuteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
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

  // --- CRT SCANLINE TOGGLE ---
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

  function openWindow(winId) {
    const win = document.getElementById(winId);
    if (win) {
      win.classList.remove('hidden');
      bringToFront(win);
    }
  }

  // Dragging and window buttons
  windows.forEach(win => {
    win.addEventListener('mousedown', () => bringToFront(win));

    const closeBtn = win.querySelector('.btn-close');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        win.classList.add('hidden');
        win.classList.remove('active');
        updateTaskbar();

        if (win.id === 'win-entrance') {
          unlockAudioAndPlay('zelda');
        }

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

        if (win.style.transform && win.style.transform !== 'none') {
          const rect = win.getBoundingClientRect();
          win.style.transform = 'none';
          win.style.left = `${rect.left}px`;
          win.style.top = `${rect.top}px`;
        }

        initialLeft = win.offsetLeft;
        initialTop = win.offsetTop;

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

  // Desktop Icons
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

  function enterStation() {
    unlockAudioAndPlay('zelda');
    if (winEntrance) {
      winEntrance.classList.add('hidden');
      winEntrance.classList.remove('active');
    }
    updateTaskbar();
  }

  if (btnEnter) {
    btnEnter.addEventListener('click', enterStation);
  }

  // --- KIRBY & AUTO TOUR ---
  const startBtn = document.getElementById('start-btn');
  const kirbyWalker = document.getElementById('kirby-walker');
  let kirbyAnimFrame = null;
  let isTourRunning = false;

  function runKirbyAnimation() {
    if (!kirbyWalker) return;
    kirbyWalker.classList.remove('hidden');
    let x = -80;
    const speed = 3;

    cancelAnimationFrame(kirbyAnimFrame);
    function step() {
      x += speed;
      kirbyWalker.style.left = `${x}px`;

      if (x < window.innerWidth + 80) {
        kirbyAnimFrame = requestAnimationFrame(step);
      } else {
        kirbyWalker.classList.add('hidden');
      }
    }
    kirbyAnimFrame = requestAnimationFrame(step);
  }

  function positionTourWindows() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const about = document.getElementById('win-about');
    const projects = document.getElementById('win-projects');
    const terminal = document.getElementById('win-terminal');
    const guestbook = document.getElementById('win-guestbook');

    if (w >= 980) {
      // 4 quadrant spacing - no overlapping
      if (about) {
        about.style.left = '40px';
        about.style.top = '30px';
        about.style.width = '380px';
      }
      if (projects) {
        projects.style.left = `${Math.max(440, w - 480)}px`;
        projects.style.top = '30px';
        projects.style.width = '440px';
      }
      if (terminal) {
        terminal.style.left = '40px';
        terminal.style.top = `${Math.min(360, h - 360)}px`;
        terminal.style.width = '430px';
      }
      if (guestbook) {
        guestbook.style.left = `${Math.max(440, w - 460)}px`;
        guestbook.style.top = `${Math.min(360, h - 360)}px`;
        guestbook.style.width = '400px';
      }
    } else {
      // Mobile / medium screen cascaded offsets
      const wins = [about, projects, terminal, guestbook];
      wins.forEach((win, idx) => {
        if (win) {
          win.style.left = `${20 + idx * 24}px`;
          win.style.top = `${30 + idx * 28}px`;
        }
      });
    }
  }

  function startWebsiteTour() {
    if (isTourRunning) return;
    isTourRunning = true;
    unlockAudioAndPlay('kirby'); // Kirby BGM during tour

    if (startBtn) startBtn.classList.add('touring');
    runKirbyAnimation();
    positionTourWindows();

    // Sequentially open windows without Tetris
    const tourSequence = [
      { delay: 200, winId: 'win-about' },
      { delay: 1500, winId: 'win-projects' },
      { delay: 2800, winId: 'win-terminal' },
      { delay: 4200, winId: 'win-guestbook' }
    ];

    tourSequence.forEach(item => {
      setTimeout(() => {
        openWindow(item.winId);
      }, item.delay);
    });

    setTimeout(() => {
      if (startBtn) startBtn.classList.remove('touring');
      isTourRunning = false;
    }, 5500);
  }

  if (startBtn) {
    startBtn.addEventListener('click', startWebsiteTour);
  }

  // --- TERMINAL COMMANDS & SOUND CONTROL ---
  const termInput = document.getElementById('term-input');
  const termOutput = document.getElementById('term-output');

  if (termInput) {
    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const fullCmd = termInput.value.trim();
        const cmdParts = fullCmd.toLowerCase().split(/\s+/);
        const cmd = cmdParts[0];
        const arg = cmdParts[1];
        termInput.value = '';

        let response = '';

        if (cmd === 'help') {
          response = [
            'Available commands:',
            '  sound <track>   - Change BGM (zelda, kirby, tetris, stop, play)',
            '  volume <0-100>  - Adjust volume level',
            '  tour            - Run interactive site tour',
            '  tetris          - Launch Tetris minigame',
            '  about           - Open About Me',
            '  projects        - Open Projects',
            '  guestbook       - Open Guestbook',
            '  clear           - Clear terminal screen',
            '  date            - Show date & time',
            '  domain          - Domain information'
          ].join('\n');
        } else if (cmd === 'sound') {
          if (!arg || arg === 'list') {
            response = 'Usage: sound [zelda | kirby | tetris | stop | play]';
          } else if (arg === 'zelda') {
            unlockAudioAndPlay('zelda');
            response = 'Now playing: Zelda Theme.';
          } else if (arg === 'kirby') {
            unlockAudioAndPlay('kirby');
            response = 'Now playing: Kirby Theme.';
          } else if (arg === 'tetris') {
            unlockAudioAndPlay('tetris');
            response = 'Now playing: Tetris Theme.';
          } else if (arg === 'stop' || arg === 'pause') {
            pauseAllAudio();
            response = 'Audio playback paused.';
          } else if (arg === 'play' || arg === 'resume') {
            unlockAudioAndPlay(currentTrack);
            response = `Resumed playing: ${currentTrack}.`;
          } else {
            response = `Unknown soundtrack: ${arg}. Choose from zelda, kirby, tetris, stop.`;
          }
        } else if (cmd === 'volume') {
          const val = parseInt(arg, 10);
          if (!isNaN(val) && val >= 0 && val <= 100) {
            currentVolume = val / 100;
            isMuted = false;
            applyVolume();
            response = `Volume set to ${val}%.`;
          } else {
            response = 'Usage: volume <0-100>';
          }
        } else if (cmd === 'tour') {
          startWebsiteTour();
          response = 'Starting site tour...';
        } else if (cmd === 'tetris') {
          openWindow('win-tetris');
          response = 'Launching Tetris [Hard]...';
        } else if (cmd === 'about') {
          openWindow('win-about');
          response = 'Opened About Me.';
        } else if (cmd === 'projects') {
          openWindow('win-projects');
          response = 'Opened Projects.';
        } else if (cmd === 'guestbook') {
          openWindow('win-guestbook');
          response = 'Opened Guestbook.';
        } else if (cmd === 'date') {
          response = new Date().toString();
        } else if (cmd === 'domain') {
          response = 'Domain: arul.cc.cd';
        } else if (cmd === 'clear') {
          termOutput.innerHTML = '';
          return;
        } else if (cmd !== '') {
          response = `Bad command or file name: "${cmd}"`;
        }

        const entry = document.createElement('div');
        entry.innerHTML = `<div>C:\\&gt; ${escapeHtml(fullCmd)}</div>${response ? `<div>${escapeHtml(response)}</div>` : ''}<br>`;
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

  // --- TETRIS (HARD DIFFICULTY) ---
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
  const BLOCK_SIZE = 20;

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
  let baseSpeed = 170; // Hard mode speed
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
    ctx.fillStyle = '#060614';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          drawBlock(ctx, c, r, board[r][c]);
        } else {
          ctx.fillStyle = '#101020';
          ctx.fillRect(c * BLOCK_SIZE + 9, r * BLOCK_SIZE + 9, 2, 2);
        }
      }
    }

    if (currentPiece) {
      currentPiece.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            drawBlock(ctx, pieceX + c, pieceY + r, currentPiece.color);
          }
        });
      });
    }

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
      const scores = [0, 100, 300, 600, 1200];
      score += (scores[cleared] || 1500);
      if (scoreEl) scoreEl.textContent = String(score).padStart(5, '0');
      if (linesEl) linesEl.textContent = lines;

      baseSpeed = Math.max(65, 170 - Math.floor(lines / 2) * 10);
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
    baseSpeed = 170;
    gameOver = false;
    isPaused = false;
    if (scoreEl) scoreEl.textContent = '00000';
    if (linesEl) linesEl.textContent = '0';
    if (overlay) overlay.classList.add('hidden');

    if (tetrisBgmActive) {
      unlockAudioAndPlay('tetris');
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
      startBtnTetris.textContent = 'Try Again';
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
        overlayDesc.textContent = 'Press P or Resume to continue';
        startBtnTetris.textContent = 'Resume';
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
      bgmToggleTetris.textContent = tetrisBgmActive ? 'Music: On' : 'Music: Off';
      if (tetrisBgmActive) {
        unlockAudioAndPlay('tetris');
      } else {
        unlockAudioAndPlay('zelda');
      }
    });
  }

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

  draw();
  updateTaskbar();
});
