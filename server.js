import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
// Parse JSON payloads up to 10mb (in case we need to send base64 data, though we'll use Cloudinary)
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB using the URI from .env (no VITE_ prefix so it stays secure)
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error('❌ Missing MONGO_URI in .env');
    process.exit(1);
}

mongoose.connect(mongoUri)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Define the Battle Schema matching our README data model
const battleSchema = new mongoose.Schema({
    player1: Object,
    player2: Object,
    winnerId: String,
    battleNarrative: String,
    winnerVerdict: String,
    loserVerdict: String,
    videoURL: String,
    createdAt: { type: Date, default: Date.now }
});

const Battle = mongoose.model('Battle', battleSchema);

// GET /api/battles — fetch recent battles for the gallery
app.get('/api/battles', async (req, res) => {
    try {
        const battles = await Battle.find().sort({ createdAt: -1 }).limit(50);
        res.json(battles);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch battles: ' + err.message });
    }
});

// GET /api/battles/:id — fetch a specific battle
app.get('/api/battles/:id', async (req, res) => {
    try {
        const battle = await Battle.findById(req.params.id);
        if (!battle) return res.status(404).json({ error: 'Battle not found' });
        res.json(battle);
    } catch (err) {
        res.status(500).json({ error: 'Failed to find battle: ' + err.message });
    }
});

// POST /api/battles — create a new battle record
app.post('/api/battles', async (req, res) => {
    try {
        const newBattle = new Battle(req.body);
        const savedBattle = await newBattle.save();
        res.status(201).json({ success: true, battleId: savedBattle._id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save battle: ' + err.message });
    }
});

// PUT /api/battles/:id — update a battle (e.g. adding winner/video details later)
app.put('/api/battles/:id', async (req, res) => {
    try {
        const updatedBattle = await Battle.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.json({ success: true, battle: updatedBattle });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update battle: ' + err.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 API Server running on http://localhost:${PORT}`));
