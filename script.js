document.addEventListener('DOMContentLoaded', () => {
  let highestZ = 10;

  // Clock
  function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // CRT Toggle
  const crtBtn = document.getElementById('toggle-crt');
  crtBtn.addEventListener('click', () => {
    document.body.classList.toggle('crt-filter');
    crtBtn.textContent = document.body.classList.contains('crt-filter') ? 'CRT: ON' : 'CRT: OFF';
  });

  // Windows management
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
    taskbarTasks.innerHTML = '';
    windows.forEach(win => {
      if (!win.classList.contains('hidden')) {
        const title = win.querySelector('.title-bar-text').textContent;
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

  // Window Controls & Dragging
  windows.forEach(win => {
    win.addEventListener('mousedown', () => bringToFront(win));

    const closeBtn = win.querySelector('.btn-close');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        win.classList.add('hidden');
        win.classList.remove('active');
        updateTaskbar();
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

    // Dragging
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
      const win = document.getElementById(targetId);
      if (win) {
        win.classList.remove('hidden');
        bringToFront(win);
      }
    });
    icon.addEventListener('click', () => {
      // Single click support for touch/mobile
      if (window.innerWidth <= 600) {
        const targetId = icon.getAttribute('data-window');
        const win = document.getElementById(targetId);
        if (win) {
          win.classList.remove('hidden');
          bringToFront(win);
        }
      }
    });
  });

  // Terminal commands
  const termInput = document.getElementById('term-input');
  const termOutput = document.getElementById('term-output');

  if (termInput) {
    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = termInput.value.trim().toLowerCase();
        termInput.value = '';

        let response = '';
        if (cmd === 'help') {
          response = 'Commands: help, about, date, clear, domain, contact';
        } else if (cmd === 'about') {
          response = 'Arul - Retro enthusiast & web maker.';
        } else if (cmd === 'date') {
          response = new Date().toString();
        } else if (cmd === 'domain') {
          response = 'Domain: arul.cc.cd (Status: Configured)';
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

  // Guestbook
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

  updateTaskbar();
});
