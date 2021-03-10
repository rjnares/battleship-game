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

  // Ignore player if connections is filled
  if (playerIndex == -1) return;

  // Tell the connecting client what player number they are
  socket.emit("player-number", playerIndex);

  console.log(`Player ${playerIndex} has connected`);
});
