import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
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

// ─── Groq: Parse voice transcript ───
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post('/api/parse-transcript', async (req, res) => {
    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'Missing GROQ_API_KEY' });
    }

    const { transcript, heroName, bossName } = req.body;
    if (!transcript || !transcript.trim()) {
        return res.json({
            description: '',
            commands: '',
            lore: ''
        });
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are analyzing a voice transcript from an art battle game. The player "${heroName || 'the artist'}" was drawing a character to fight "${bossName || 'a boss'}". 

While drawing, they spoke aloud — some of what they said are DRAWING COMMANDS (like "give me red", "eraser", "thicker", "undo", "fire", "ice") and some are CREATIVE DESCRIPTIONS about the character they're drawing (like "he has wings", "she breathes fire", "this is a dragon warrior").

Your job:
1. Extract ONLY the creative character description parts
2. Weave them into a short, epic 2-3 sentence character lore/description
3. Ignore all drawing tool commands entirely

Respond in this exact JSON format:
{
  "description": "A cleaned-up version of what they described",
  "lore": "An epic 2-3 sentence character lore written in a dramatic fantasy style based on what they described. Make it sound legendary."
}`
                    },
                    {
                        role: 'user',
                        content: `Here is the full voice transcript:\n\n"${transcript}"`
                    }
                ],
                temperature: 0.7,
                max_tokens: 300,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Groq API error:', errText);
            return res.status(500).json({ error: 'Groq API error: ' + errText });
        }

        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        res.json(parsed);
    } catch (err) {
        console.error('Transcript parse error:', err);
        res.status(500).json({ error: 'Failed to parse transcript: ' + err.message });
    }
});

// ─── Gemini: Battle Logic & Video Prompt Generation (via Vertex AI) ───
app.post('/api/generate-battle', async (req, res) => {
    try {
        const { heroData, bossData } = req.body;

        // Convert the base64 Data URL to a format Gemini can use
        const base64String = heroData.drawing.split(',')[1];
        const mimeType = heroData.drawing.split(';')[0].split(':')[1];

        const promptText = `
You are the ultimate battle judge for an epic fantasy combat game.
Look at the attached drawing of the hero. Also read their backstory and lore:
Hero Name: ${heroData.name}
Backstory: ${heroData.characterLore}

They are fighting this boss:
Boss Name: ${bossData.name}
Boss Description: ${bossData.description}

Analyze the hero's drawing and lore to determine their combat style, strengths, and weaknesses.
Then, decide logically who would win between the Hero and the Boss.

Return YOUR COMPLETE RESPONSE as a raw JSON object with the following structure:
{
  "winner": "hero" or "boss",
  "winnerReason": "One logical sentence explaining why their powers countered the other",
  "battleNarrative": "Three incredibly cinematic sentences describing the epic fight.",
  "winnerVerdict": "A triumphant, dramatic, short sentence announcing the winner (under 15 words) that will be spoken aloud",
  "videoPrompt": "A highly descriptive, 80-word prompt for an AI Video generator. Describe the appearance of the hero (from the drawing) engaging in epic cinematic slow-motion combat against the boss (based on its description). Cinematic lighting, photorealistic."
}
        `;

        const result = await genaiProject.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: promptText },
                        { inlineData: { data: base64String, mimeType } }
                    ]
                }
            ],
            config: {
                responseMimeType: 'application/json',
            }
        });

        res.json(JSON.parse(result.text));
    } catch (err) {
        console.error('Gemini battle generation error:', err);
        res.status(500).json({ error: 'Failed to generate battle logic: ' + err.message });
    }
});

// ─── ElevenLabs: Text to Speech ───
app.post('/api/generate-speech', async (req, res) => {
    const ELEVENLABS_API_KEY = process.env.VITE_ELEVENLABS_API_KEY;
    if (!ELEVENLABS_API_KEY) {
        return res.status(500).json({ error: 'Missing VITE_ELEVENLABS_API_KEY' });
    }

    const { text, voiceId = 'pNInz6obpgDQGcFmaJcg' } = req.body; // Default: Adam's Voice ID

    if (!text) {
        return res.status(400).json({ error: 'No text provided' });
    }

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
                'accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`ElevenLabs API Error: ${errText}`);
        }

        // Send the audio file buffer back directly to the client as an MP3
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': buffer.length,
        });

        res.send(buffer);
    } catch (err) {
        console.error('TTS Generation error:', err);
        res.status(500).json({ error: 'Failed to generate speech: ' + err.message });
    }
});

// ─── Gemini: Image Generation (Imagen 3) ───
const genaiProject = new GoogleGenAI({
    project: 'project-09390c46-5306-4e39-97e',
    location: 'us-central1',
    vertexai: true,
});

app.post('/api/generate-image', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    try {
        const response = await genaiProject.models.generateImages({
            model: 'imagen-3.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9'
            }
        });

        const base64Image = response.generatedImages[0].image.imageBytes;
        res.json({ image: `data:image/jpeg;base64,${base64Image}` });
    } catch (error) {
        console.error('Imagen Error:', error);
        res.status(500).json({ error: 'Failed to generate image' });
    }
});

// ─── Gemini: Video Generation (Veo) ───
const veoProject = new GoogleGenAI({
    project: 'project-09390c46-5306-4e39-97e',
    location: 'global', // Video models require global
    vertexai: true,
});

app.post('/api/generate-video', async (req, res) => {
    // We increase timeout here because Veo takes ~30-60 secs
    req.setTimeout(300000);

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    try {
        let operation = await veoProject.models.generateVideos({
            model: 'veo-3.1-fast-generate-001',
            prompt: prompt,
            config: {
                durationSeconds: 4,
                aspectRatio: '16:9',
            },
        });

        // Poll for completion
        while (!operation.done) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            operation = await veoProject.operations.getVideosOperation({ operation });
        }

        const videos = operation.response?.generatedVideos;
        if (!videos || videos.length === 0) {
            return res.status(500).json({ error: 'No video found' });
        }

        const video = videos[0].video;
        if (video.videoBytes) {
            res.json({ video: `data:video/mp4;base64,${video.videoBytes}` });
        } else {
            // Handle if it's external (needs file download API, but fast-generate returns bytes)
            res.status(500).json({ error: 'Video returned without inline bytes' });
        }
    } catch (error) {
        console.error('Veo Error:', error);
        res.status(500).json({ error: 'Failed to generate video' });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 API Server running on http://localhost:${PORT}`));
