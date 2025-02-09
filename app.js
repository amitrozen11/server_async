const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');

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
app.set('view engine', 'pug'); // Use Pug as the view engine
app.set('views', path.join(__dirname, 'views')); // Define the directory for views

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.use(bodyParser.urlencoded({ extended: true })); // Parse form data
app.use(express.json()); // Parse JSON data

// Route to render the form for adding a cost
app.get('/api/add', (req, res) => {
    res.render('add-costs');
});

// Route to add a cost to the database
app.post('/api/add', async (req, res) => {
    try {
        const { userId, description, category, sum } = req.body;

        // Convert the user ID to a number and validate it
        const numericUserId = parseInt(userId);
        if (isNaN(numericUserId)) {
            return res.status(400).json({
                error: 'Invalid user ID. Please provide a valid numeric user ID.'
            });
        }

        // Check if the user exists in the database
        const userExists = await User.findOne({ id: numericUserId });
        if (!userExists) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user found with ID ${numericUserId}`
            });
        }

        // Create a new cost document
        const newCost = new Costs({
            userId: numericUserId,
            description,
            category,
            sum,
            date: req.body.date || Date.now()
        });

        // Save the cost to the database
        const savedCost = await newCost.save();

        // Return the saved cost as a JSON response
        res.status(201).json(savedCost);
    } catch (err) {
        console.error('Error adding cost:', err.message);
        res.status(500).json({
            error: 'Failed to add cost',
            details: err.message
        });
    }
});

// Route to fetch a monthly report of costs
app.get('/api/report', async (req, res) => {
    const { id, year, month } = req.query;

    const userId = parseInt(id);
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID. Please provide a valid numeric user ID.' });
    }
    if (!year || !month) {
        return res.status(400).json({ error: 'Missing required parameters: year or month' });
    }

    try {
        // Define the date range for the report
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // Fetch the user information
        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Aggregate costs by category within the date range
        const costs = await Costs.aggregate([
            {
                $match: {
                    userId: userId,
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $project: {
                    category: 1,
                    sum: 1,
                    description: 1,
                    day: { $dayOfMonth: '$date' }
                }
            }
        ]);

        // Group costs by category
        const groupedCosts = costs.reduce((acc, cost) => {
            if (!acc[cost.category]) {
                acc[cost.category] = [];
            }
            acc[cost.category].push({
                sum: cost.sum,
                description: cost.description,
                day: cost.day
            });
            return acc;
        }, {});

        // Format the costs array for the response
        const formattedCosts = Object.keys(groupedCosts).map(category => ({
            [category]: groupedCosts[category]
        }));

        // Return the report
        res.status(200).json({
            userid: userId,
            year: parseInt(year),
            month: parseInt(month),
            costs: formattedCosts
        });
    } catch (err) {
        console.error('Error fetching report:', err);
        res.status(500).json({ error: 'Failed to fetch report', details: err.message });
    }
});

// Route to fetch user details by user ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate the total costs for the user
        const totalCosts = await Costs.aggregate([
            { $match: { userId: userId } },
            { $group: { _id: '$userId', total: { $sum: '$sum' } } }
        ]);

        // Get the total sum or set to 0 if no costs
        let total = totalCosts.length > 0 ? totalCosts[0].total : 0;

        // Return user details and total costs
        res.status(200).json({
            first_name: user.first_name,
            last_name: user.last_name,
            id: user.id,
            total: total
        });
    } catch (err) {
        console.error('Error fetching user:', err.message);
        res.status(500).json({ error: 'Failed to fetch user details', details: err.message });
    }
});

// Route to return the developers' details
app.get('/api/about', (req, res) => {
    const developers = [
        { first_name: 'Amit', last_name: 'Rozen' },
        { first_name: 'Yuval', last_name: 'Benzaquen' }
    ];
    res.status(200).json(developers);
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
});
