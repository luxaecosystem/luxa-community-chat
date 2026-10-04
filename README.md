# ChatCord App
Realtime chat app with websockets using Node.js, Express and Socket.io with Vanilla JS on the frontend with a custom UI.

## Project structure
```
chatcord/
├── backend/
│   ├── server.js
│   └── utils/
│       ├── messages.js
│       └── users.js
├── frontend/
│   └── public/
│       ├── css/
│       ├── js/
│       ├── index.html
│       └── chat.html
├── package.json
├── README.md
└── tests/
    └── server-smoke.test.js
```

## Usage
```
npm install
npm run dev

Go to http://localhost:3000
```

## Notes
- The backend serves the frontend files from the `frontend/public` folder.
- Redis is optional for local development. If Redis is not running, the app automatically falls back to Socket.IO's default in-memory adapter.
- The `_html_css` folder is just a starter template used in the tutorial and is not required for the app itself.
