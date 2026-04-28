require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

const path = require('path');
const passport = require('./src/config/passport');
app.use(cors());
app.use(express.json());
app.use(passport.initialize());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const authRoutes = require('./src/routes/auth');
const usersRoutes = require('./src/routes/users');
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

const mediaRoutes = require('./src/routes/media');
app.use('/api/media', mediaRoutes);

const reviewsRoutes = require('./src/routes/reviews');
app.use('/api/reviews', reviewsRoutes);

app.get('/', (req, res) => {
  res.send('SupContent Server is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
