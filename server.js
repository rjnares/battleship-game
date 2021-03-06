const express = require("express");
const path = require("path");
const http = require("http");
const PORT = process.env.PORT || 3000;
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Static folder: folder server will 'serve' to client (this is public folder w/game files)
// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle a socket connection request from web client
// socket = client socket connection
const connections = [null, null];

io.on("connection", (socket) => {
  // Find an available player number
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] == null) {
      playerIndex = i;
      break;
    }
  }

  // Tell the connecting client what player number they are
  // even if they are not one of first two players
  socket.emit("player-number", playerIndex);

  console.log(`Player ${playerIndex} has connected`);

  // Ignore player if connections is full
  if (playerIndex == -1) return;

  //Sets connected player's ready state to false initially by default
  connections[playerIndex] = false;

  // Tell every client what player number just connected
  socket.broadcast.emit("player-connection", playerIndex);

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`Player ${playerIndex} disconnected`);
    connections[playerIndex] = null;

    // Tell every client what player number just disconnected
    socket.broadcast.emit("player-connection", playerIndex);
  });

  // On player ready
  socket.on("player-ready", () => {
    socket.broadcast.emit("enemy-ready", playerIndex);
    connections[playerIndex] = true;
  });

  // Check player connections
  socket.on("check-players", () => {
    const players = [];

    for (const i in connections) {
      connections[i] == null
        ? players.push({ connected: false, ready: false })
        : players.push({ connected: true, ready: connections[i] });
    }

    socket.emit("check-players", players);
  });

  // On fire received
  socket.on("fire", (id) => {
    console.log(`Shot fired from ${playerIndex} on ${id}`);
    // Emit the move to the other player
    socket.broadcast.emit("fire", id);
  });

  // On fire-reply
  socket.on("fire-reply", (cellClassList) => {
    console.log(cellClassList);

    // Forward reply to other player
    socket.broadcast.emit("fire-reply", cellClassList);
  });

  // Set timeout
  setTimeout(() => {
    connections[playerIndex] = null;
    socket.emit("timeout");
    socket.disconnect();
  }, 600000);
});
