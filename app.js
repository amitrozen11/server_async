/**
 * Express server for cost management system using MongoDB.
 * Implements the Computed Pattern to cache monthly reports.
 */
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config();

/**
 * Connect to MongoDB database.
 */
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err.message);
});

// Import Models
const Costs = require('./models/costs');
const User = require('./models/user');

const app = express();

// Express Setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const cache = new Map();

/**
 * Updates the computed monthly report for a given user and caches it.
 *
 * @param {number} userId - The ID of the user.
 * @param {number} year - The year of the report.
 * @param {number} month - The month of the report.
 */
async function updateMonthlyReport(userId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const costs = await Costs.aggregate([
        { $match: { userId: userId, date: { $gte: startDate, $lte: endDate } } },
        { $project: { category: 1, sum: 1, description: 1, day: { $dayOfMonth: '$date' } } }
    ]);

    const defaultCategories = { food: [], education: [], health: [], housing: [], sport: [] };
    const groupedCosts = costs.reduce((acc, cost) => {
        if (!acc[cost.category]) acc[cost.category] = [];
        acc[cost.category].push({ sum: cost.sum, description: cost.description, day: cost.day });
        return acc;
    }, {});

    Object.keys(defaultCategories).forEach(category => {
        defaultCategories[category] = groupedCosts[category] || [];
    });

    const formattedCosts = Object.keys(defaultCategories).map(category => ({ [category]: defaultCategories[category] }));

    // Update database and cache
    await User.updateOne(
        { id: userId },
        { $set: { [`monthlyReport.${year}.${month}`]: formattedCosts } }
    );
    cache.set(`${userId}-${year}-${month}`, formattedCosts);
}

/**
 * API endpoint to fetch a monthly report of costs.
 *
 * @route GET /api/report
 * @param {number} req.query.id - The user ID.
 * @param {number} req.query.year - The year for the report.
 * @param {number} req.query.month - The month for the report.
 * @returns {Object} 200 - Monthly report containing categorized costs.
 */
app.get('/api/report', async (req, res) => {
    try {
        const { id, year, month } = req.query;
        const userId = parseInt(id);
        if (isNaN(userId) || !year || !month) {
            return res.status(400).json({ error: 'Invalid parameters: user ID, year, or month' });
        }

        const cacheKey = `${userId}-${year}-${month}`;
        if (cache.has(cacheKey)) {
            return res.status(200).json({ userid: userId, year: parseInt(year), month: parseInt(month), costs: cache.get(cacheKey) });
        }

        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await updateMonthlyReport(userId, year, month);
        res.status(200).json({ userid: userId, year: parseInt(year), month: parseInt(month), costs: cache.get(cacheKey) });
    } catch (err) {
        console.error('Error fetching report:', err);
        res.status(500).json({ error: 'Failed to fetch report', details: err.message });
    }
});

/**
 * API endpoint to add a cost entry and update the cache.
 */
app.post('/api/add', async (req, res) => {
    try {
        const { userId, description, category, sum } = req.body;
        const numericUserId = parseInt(userId);
        if (isNaN(numericUserId)) {
            return res.status(400).json({ error: 'Invalid user ID. Please provide a valid numeric user ID.' });
        }

        const userExists = await User.findOne({ id: numericUserId });
        if (!userExists) {
            return res.status(404).json({ error: 'User not found', message: `No user found with ID ${numericUserId}` });
        }

        const date = req.body.date ? new Date(req.body.date) : new Date();
        const newCost = new Costs({ userId: numericUserId, description, category, sum, date });
        const savedCost = await newCost.save();

        await updateMonthlyReport(numericUserId, date.getFullYear(), date.getMonth() + 1);

        res.status(201).json(savedCost);
    } catch (err) {
        console.error('Error adding cost:', err.message);
        res.status(500).json({ error: 'Failed to add cost', details: err.message });
    }
});

/**
 * Starts the Express server.
 *
 * @constant {number} PORT - The port number the server listens on.
 */
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
