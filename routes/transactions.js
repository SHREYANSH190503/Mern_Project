const express = require('express');
const axios = require('axios');
const Transaction = require('../models/Transaction');
const router = express.Router();

// Initialize database with data from third-party API
router.get('/initialize', async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const transactions = response.data;

        await Transaction.deleteMany({}); // Clear previous data
        await Transaction.insertMany(transactions);
        res.status(200).json({ message: 'Database initialized' });
    } catch (error) {
        res.status(500).json({ message: 'Error initializing data', error });
    }
});

// API to list transactions with search and pagination
router.get('/', async (req, res) => {
    const { month, page, perPage = 10, search } = req.query;

    // Use the year corresponding to your data (2021)
    const year = 2021;
    const startDate = new Date(`${year}-${month}-01`); // Start of the month
    const endDate = new Date(year, month, 0, 23, 59, 59); // End of the month

    console.log('Start Date:', startDate); // Log start date
    console.log('End Date:', endDate); // Log end date

    const filter = { dateOfSale: { $gte: startDate, $lte: endDate } }; // Use $gte and $lte for date range filtering

    if (search) {
        filter.$or = [
            { title: new RegExp(search, 'i') },
            { description: new RegExp(search, 'i') },
        ];

        // Check if the search term can be a number for the price
        const price = Number(search);
        if (!isNaN(price)) {
            filter.$or.push({ price: price });
        }
    }

    try {
        const transactions = await Transaction.find(filter)
            .skip((page - 1) * perPage)
            .limit(parseInt(perPage));

        // Log the count of transactions found
        console.log('Number of Transactions:', transactions.length);

        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
});

// API for statistics
router.get('/statistics', async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`2021-${month}-01`); // Start of the month
    const endDate = new Date(2021, month, 0, 23, 59, 59); // End of the month

    try {
        const soldItems = await Transaction.countDocuments({ dateOfSale: { $gte: startDate, $lte: endDate }, sold: true });
        const notSoldItems = await Transaction.countDocuments({ dateOfSale: { $gte: startDate, $lte: endDate }, sold: false });
        const totalSales = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startDate, $lte: endDate }, sold: true } },
            { $group: { _id: null, total: { $sum: '$price' } } }
        ]);

        res.json({
            totalSoldItems: soldItems,
            totalNotSoldItems: notSoldItems,
            totalSaleAmount: totalSales[0] ? totalSales[0].total : 0,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching statistics', error });
    }
});

// API for bar chart
router.get('/bar-chart', async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`2021-${month}-01`); // Start of the month
    const endDate = new Date(2021, month, 0, 23, 59, 59); // End of the month

    try {
        const priceRanges = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startDate, $lte: endDate } } },
            {
                $bucket: {
                    groupBy: '$price',
                    boundaries: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, Infinity],
                    default: '900+',
                    output: { count: { $sum: 1 } }
                }
            }
        ]);
        res.json(priceRanges);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bar chart data', error });
    }
});

// API for pie chart
router.get('/pie-chart', async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`2021-${month}-01`); // Start of the month
    const endDate = new Date(2021, month, 0, 23, 59, 59); // End of the month

    try {
        const categories = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pie chart data', error });
    }
});

// API to combine statistics, bar chart, and pie chart
// API to combine statistics, bar chart, and pie chart
router.get('/combined', async (req, res) => {
    const { month } = req.query;

    try {
        const statistics = await axios.get(`http://localhost:5000/api/transactions/statistics?month=${month}`);
        const barChart = await axios.get(`http://localhost:5000/api/transactions/bar-chart?month=${month}`);
        const pieChart = await axios.get(`http://localhost:5000/api/transactions/pie-chart?month=${month}`);

        res.json({
            statistics: statistics.data,
            barChart: barChart.data,
            pieChart: pieChart.data
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching combined data', error: error.message });
    }
});


module.exports = router;
