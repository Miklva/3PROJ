require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Server } = require("socket.io");
const app = express();
const PORT = process.env.PORT || 5000;
const http = require("http");
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const path = require('path');
const passport = require('./src/config/passport');
app.use(cors());
app.use(express.json());
app.use(passport.initialize());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);

const usersRoutes = require('./src/routes/users');
app.use('/api/users', usersRoutes);

const mediaRoutes = require('./src/routes/media');
app.use('/api/media', mediaRoutes);

const reviewsRoutes = require('./src/routes/reviews');
app.use('/api/reviews', reviewsRoutes);

const listsRoutes = require('./src/routes/lists');
app.use('/api/lists', listsRoutes);

const adminRoutes = require('./src/routes/admin');
app.use('/api/admin', adminRoutes);

const feedRoutes = require('./src/routes/feed');
app.use('/api/feed', feedRoutes);

const messagesRoutes = require('./src/routes/messages');
app.use('/api/messages', messagesRoutes);

app.get('/', (req, res) => {
  res.send('SupContent Server is running!');
});

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
  });

  socket.on("send_message", (data) => {
    const { roomId, message } = data;

    socket.to(roomId).emit("receive_message", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});