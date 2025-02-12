const mongoose = require('mongoose');

// סכימה להוצאות
const costSchema = new mongoose.Schema({
    description: { type: String, required: true },
    category: { type: String, required: true },
    userId: { type: Number, required: true },
    sum: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});

const Cost = mongoose.model('Cost', costSchema);
module.exports = Cost;
