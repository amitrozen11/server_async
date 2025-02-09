const mongoose = require('mongoose');

// סכימה להוצאות
const costSchema = new mongoose.Schema({
    description: { type: String, required: true },
    category: { type: String, required: true },
    userId: { type: Number, required: true }, // חיבור למשתמש באמצעות id
    sum: { type: Number, required: true },
    date: { type: Date, default: Date.now } // שדה תאריך עם ברירת מחדל
});

const Cost = mongoose.model('Cost', costSchema);
module.exports = Cost;
