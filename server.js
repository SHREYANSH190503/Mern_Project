const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();  // Load environment variables from .env file

const transactionRoutes = require('./routes/transactions');  // Import routes

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB using the connection string in .env
mongoose.connect(process.env.MONGODB_URI) // Removed deprecated options
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Use transaction routes
app.use('/api/transactions', transactionRoutes);

const PORT = process.env.PORT || 5001; // Change to 5001

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
