const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    title: String,
    description: String,
    dateOfSale: Date,
    price: Number,
    category: String,
    sold: Boolean,
});

module.exports = mongoose.model('Transaction', transactionSchema);
