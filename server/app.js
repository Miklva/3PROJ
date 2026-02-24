require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('SupContent Server is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
