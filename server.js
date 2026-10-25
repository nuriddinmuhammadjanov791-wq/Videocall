const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const path = require('path');
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const RELAY = ['call', 'cancel', 'accept', 'decline', 'hangup'];

function roomSize(room) {
  return io.sockets.adapter.rooms.get(room)?.size || 0;
}

io.on('connection', (socket) => {
  socket.on('join', (room) => {
    room = String(room || '').slice(0, 64);
    if (!room) return;
    if (roomSize(room) >= 2) {
      socket.emit('full');
      return;
    }
    socket.join(room);
    socket.data.room = room;
    io.to(room).emit('presence', roomSize(room));
  });

  // Qo'ng'iroq bosqichlari: call -> (accept | decline | cancel) -> hangup
  RELAY.forEach((ev) => {
    socket.on(ev, () => {
      const room = socket.data.room;
      if (room) socket.to(room).emit(ev);
    });
  });

  // WebRTC signal (offer / answer / ice)
  socket.on('signal', (data) => {
    const room = socket.data.room;
    if (room) socket.to(room).emit('signal', data);
  });

  socket.on('disconnect', () => {
    const room = socket.data.room;
    if (room) io.to(room).emit('presence', roomSize(room));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server ishga tushdi: http://localhost:' + PORT));
