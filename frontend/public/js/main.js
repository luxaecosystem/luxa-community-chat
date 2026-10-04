const chatForm = document.getElementById('chat-form');
const chatMessages = document.getElementById('chatMessages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const userCount = document.getElementById('userCount');
const roomFlag = document.getElementById('roomFlag');
const sidebarFlag = document.getElementById('sidebarFlag');
const sidebarRoomTitle = document.getElementById('sidebarRoomTitle');
const leaveBtn = document.getElementById('leave-btn');
const msgInput = document.getElementById('msg');

// Legge i parametri GET inviati dal form di index.html
const { username, room, code } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const activeUser = username || 'Miner';
const activeRoom = room || 'Global';
const activeCode = (code || 'un').toLowerCase();

// Imposta la grafica della bandiera
if (roomFlag) roomFlag.src = `flags/1x1/${activeCode}.svg`;
if (sidebarFlag) sidebarFlag.src = `flags/1x1/${activeCode}.svg`;
if (roomName) roomName.innerText = `${activeRoom}`;
if (sidebarRoomTitle) sidebarRoomTitle.innerText = activeRoom;

// Attiva la scrittura RTL (da destra a sinistra) per i paesi di lingua araba
const arabicCodes = ['sa', 'ae', 'ma', 'dz', 'eg', 'qa', 'tn'];
const isArabic = arabicCodes.includes(activeCode);
if (isArabic && msgInput) {
  msgInput.dir = 'rtl';
  msgInput.placeholder = 'اكتب رسالتك هنا...';
}

const BACKEND_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000'
  : 'https://luxaecosystem.alwaysdata.net';

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling']
});

// Entra nella stanza
socket.emit('joinRoom', {
  username: activeUser,
  room: activeRoom,
  code: activeCode
});

// Aggiorna lista utenti e contatore
socket.on('roomUsers', ({ room, users }) => {
  if (userCount) userCount.innerText = users.length;
  outputUsers(users);
});

// Ricezione messaggi
socket.on('message', (message) => {
  outputMessage(message);
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});

// Invio messaggio
if (chatForm) {
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const text = msgInput.value.trim();
    if (!text) return;

    socket.emit('chatMessage', text);

    msgInput.value = '';
    msgInput.focus();

    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  });
}

// Render del singolo messaggio
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

// Render lista utenti
function outputUsers(users) {
  if (!userList) return;
  userList.innerHTML = '';
  users.forEach((u) => {
    const li = document.createElement('li');
    li.innerText = u.username;
    userList.appendChild(li);
  });
}

// Mostra/Nasconde la sidebar utenti su dispositivi mobili
window.toggleSidebar = function() {
  const sidebar = document.getElementById('chatSidebar');
  if (sidebar) sidebar.classList.toggle('open');
};

// Pulsante Leave Room
if (leaveBtn) {
  leaveBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
}