const chatForm = document.getElementById('chat-form');
const chatMessages = document.getElementById('chatMessages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const userCount = document.getElementById('userCount');
const roomFlag = document.getElementById('roomFlag');
const connStatus = document.getElementById('connStatus');
const msgInput = document.getElementById('msg');

// Parametri URL
const { username, room, code } = Qs.parse(location.search, { ignoreQueryPrefix: true });
const activeUser = username || 'Miner';
const activeRoom = room || 'Global';
const activeCode = (code || 'un').toLowerCase();

if (roomFlag) roomFlag.src = `flags/1x1/${activeCode}.svg`;
if (roomName) roomName.innerText = activeRoom;

// Supporto RTL automatico per lingue arabe
const arabicCodes = ['sa', 'ae', 'ma', 'dz', 'eg', 'qa', 'tn'];
const isArabic = arabicCodes.includes(activeCode);
if (isArabic && msgInput) {
  msgInput.dir = 'rtl';
  msgInput.placeholder = 'اكتب رسالتك هنا...';
}

// Integrazione pulsante Indietro nativo di Telegram
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.BackButton) {
    tg.BackButton.show();
    tg.BackButton.onClick(() => goBack());
  }
}

function goBack() {
  window.location.href = 'index.html';
}

function closeMiniApp() {
  if (tg && tg.close) {
    tg.close();
  } else {
    window.location.href = 'index.html';
  }
}

// Connessione Socket.io corretta per Alwaysdata (Long-Polling prioritario)
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const BACKEND_URL = isLocal ? 'http://localhost:3000' : 'https://luxaecosystem.alwaysdata.net';

const socket = io(BACKEND_URL, {
  transports: ['polling', 'websocket'], // Risolve l'errore di WebSocket failed
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  if (connStatus) {
    connStatus.classList.remove('offline');
    connStatus.classList.add('online');
  }

  // Entra nella stanza
  socket.emit('joinRoom', {
    username: activeUser,
    room: activeRoom,
    code: activeCode
  });
});

socket.on('disconnect', () => {
  if (connStatus) {
    connStatus.classList.remove('online');
    connStatus.classList.add('offline');
  }
});

// Ricezione cronologia messaggi da MongoDB
socket.on('chatHistory', (historyMessages) => {
  chatMessages.innerHTML = '';
  historyMessages.forEach((m) => outputMessage(m));
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Ricezione nuovo messaggio
socket.on('message', (message) => {
  outputMessage(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Invio messaggio
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit('chatMessage', text);
  msgInput.value = '';
  msgInput.focus();

  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred('light');
  }
});

// Render dei messaggi
function outputMessage(message) {
  const div = document.createElement('div');
  const isMine = message.username === activeUser;
  const isBot = message.username === 'LUXA Bot';

  if (isBot) {
    div.className = 'system-message';
    div.innerText = message.text;
  } else {
    div.className = `message ${isMine ? 'mine' : 'other'}`;
    if (isArabic) div.dir = 'rtl';

    div.innerHTML = `
      <div class="meta">
        <span>${escapeHtml(message.username)}</span>
        <span>${message.time || ''}</span>
      </div>
      <div class="text">${escapeHtml(message.text)}</div>
    `;
  }

  chatMessages.appendChild(div);
}

socket.on('roomUsers', ({ users }) => {
  if (userCount) userCount.innerText = users.length;
  if (!userList) return;
  userList.innerHTML = '';
  users.forEach((u) => {
    const li = document.createElement('li');
    li.innerText = u.username;
    userList.appendChild(li);
  });
});

window.toggleSidebar = function() {
  document.getElementById('chatSidebar')?.classList.toggle('open');
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
}