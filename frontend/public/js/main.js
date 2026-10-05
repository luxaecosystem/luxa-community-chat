const chatForm = document.getElementById('chat-form');
const chatMessages = document.getElementById('chatMessages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const userCount = document.getElementById('userCount');
const roomFlag = document.getElementById('roomFlag');
const connStatus = document.getElementById('connStatus');
const msgInput = document.getElementById('msg');
const backBtn = document.getElementById('backBtn');
const closeBtn = document.getElementById('closeBtn');
const sidebarTitle = document.getElementById('sidebarTitle');
const onlineLabel = document.getElementById('onlineLabel');

// Parametri URL
const { username, room, code } = Qs.parse(location.search, { ignoreQueryPrefix: true });
const activeUser = (username || 'Miner').trim();
const activeRoom = room || 'Global';
const activeCode = (code || 'un').toLowerCase();

if (roomFlag) roomFlag.src = `flags/1x1/${activeCode}.svg`;
if (roomName) roomName.innerText = activeRoom;

// Dizionario Multilingua per l'interfaccia Client
const uiTranslations = {
  ar: {
    placeholder: 'اكتب رسالتك هنا... (الروابط ممنوعة)',
    sidebar: 'المعدنون النشطون',
    online: 'متصل',
    dir: 'rtl'
  },
  fr: {
    placeholder: 'Écrivez votre message ici... (liens interdits)',
    sidebar: 'Mineurs Actifs',
    online: 'en ligne',
    dir: 'ltr'
  },
  es: {
    placeholder: 'Escribe tu mensaje aquí... (enlaces prohibidos)',
    sidebar: 'Mineros Activos',
    online: 'en línea',
    dir: 'ltr'
  },
  it: {
    placeholder: 'Scrivi un messaggio... (link esterni vietati)',
    sidebar: 'Miner Attivi',
    online: 'online',
    dir: 'ltr'
  },
  en: {
    placeholder: 'Type message here... (links prohibited)',
    sidebar: 'Active Miners',
    online: 'online',
    dir: 'ltr'
  }
};

const arabicCodes = ['sa', 'ae', 'ma', 'dz', 'eg', 'qa', 'tn'];
let lang = 'en';
if (arabicCodes.includes(activeCode)) lang = 'ar';
else if (activeCode === 'fr') lang = 'fr';
else if (activeCode === 'es') lang = 'es';
else if (activeCode === 'it') lang = 'it';

const currentUI = uiTranslations[lang] || uiTranslations.en;

// Applica lingua e direzione (RTL per Arabo)
if (msgInput) {
  msgInput.placeholder = currentUI.placeholder;
  msgInput.dir = currentUI.dir;
}
if (sidebarTitle) sidebarTitle.innerText = currentUI.sidebar;
if (onlineLabel) onlineLabel.innerText = currentUI.online;
if (currentUI.dir === 'rtl') {
  chatMessages.dir = 'rtl';
}

// -------------------------------------------------------------
// GESTIONE NAVIGAZIONE: Tasto Indietro e Tasto Chiudi
// -------------------------------------------------------------
function goBack() {
  // Ritorna a index.html in modo garantito sia su Browser che su Vercel/Telegram
  window.location.replace('index.html');
}

function closeMiniApp() {
  const tg = window.Telegram?.WebApp;
  if (tg && typeof tg.close === 'function') {
    tg.close();
  } else {
    window.location.replace('index.html');
  }
}

if (backBtn) backBtn.addEventListener('click', goBack);
if (closeBtn) closeBtn.addEventListener('click', closeMiniApp);

// Telegram WebApp SDK compatibilità v6.0+ e v6.1+
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();

  if (typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast('6.1')) {
    if (tg.BackButton) {
      tg.BackButton.show();
      tg.BackButton.onClick(goBack);
    }
  }
}

// -------------------------------------------------------------
// CONNESSIONE BACKEND
// -------------------------------------------------------------
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const BACKEND_URL = isLocal
  ? 'http://localhost:3000'
  : 'https://communitychat.alwaysdata.net';

const socket = io(BACKEND_URL, {
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  if (connStatus) {
    connStatus.classList.remove('offline');
    connStatus.classList.add('online');
  }

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

socket.on('chatHistory', (historyMessages) => {
  chatMessages.innerHTML = '';
  historyMessages.forEach((m) => outputMessage(m));
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('message', (message) => {
  outputMessage(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit('chatMessage', text);
  msgInput.value = '';
  msgInput.focus();

  if (tg && typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast('6.1')) {
    tg.HapticFeedback?.impactOccurred('light');
  }
});

// -------------------------------------------------------------
// RENDER DEI MESSAGGI CON BADGE (CITIZEN 0 / MODERATOR)
// -------------------------------------------------------------
function outputMessage(message) {
  const div = document.createElement('div');
  const isMine = message.username === activeUser;
  const isBot = message.role === 'bot' || message.username.includes('Bot') || message.username.includes('Guardian');

  if (isBot) {
    div.className = 'system-message';
    div.innerText = message.text;
  } else {
    div.className = `message ${isMine ? 'mine' : 'other'}`;

    // Creazione del badge
    let badgeHtml = '';
    if (message.role === 'citizen0') {
      badgeHtml = '<span class="badge-role badge-citizen0">👑 Citizen 0</span>';
    } else if (message.role === 'moderator') {
      badgeHtml = '<span class="badge-role badge-mod">🛡️ MOD</span>';
    }

    div.innerHTML = `
      <div class="meta">
        <span class="user-handle">${escapeHtml(message.username)} ${badgeHtml}</span>
        <span class="time-stamp">${message.time || ''}</span>
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
    let badge = '';
    if (u.role === 'citizen0') badge = ' 👑';
    else if (u.role === 'moderator') badge = ' 🛡️';
    li.innerText = `${u.username}${badge}`;
    userList.appendChild(li);
  });
});

window.toggleSidebar = function() {
  document.getElementById('chatSidebar')?.classList.toggle('open');
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
}