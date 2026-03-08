import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// ─── Gemini: Parse voice transcript ───
const genaiProject = new GoogleGenAI({
    project: 'project-09390c46-5306-4e39-97e',
    location: 'us-central1',
    vertexai: true,
});

// ─── Vertex AI Health Check on startup ───
(async () => {
    try {
        console.log('🔍 Testing Vertex AI connection (Gemini 2.0 Flash)…');
        const testResult = await genaiProject.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts: [{ text: 'Say "ok" and nothing else.' }] }],
        });
        console.log('✅ Vertex AI (Gemini) is working. Response:', testResult.text?.slice(0, 50));
    } catch (err) {
        console.error('❌ Vertex AI (Gemini) health check FAILED:', err.message);
        console.error('   Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2).slice(0, 500));
        console.error('   ➜ Make sure GOOGLE_APPLICATION_CREDENTIALS is set or `gcloud auth application-default login` has been run.');
    }
})();

app.post('/api/parse-transcript', async (req, res) => {
    const startTime = Date.now();
    console.log('\n📝 POST /api/parse-transcript');
    const { transcript, heroName, bossName } = req.body;
    console.log('   transcript length:', transcript?.length || 0, '| heroName:', heroName, '| bossName:', bossName);
    if (!transcript || !transcript.trim()) {
        console.log('   ⚠️  Empty transcript, returning defaults');
        return res.json({
            description: '',
            commands: '',
            lore: ''
        });
    }

    try {
        const promptText = `
You are analyzing a voice transcript from an art battle game. The player "${heroName || 'the artist'}" was drawing a character to fight "${bossName || 'a boss'}". 

While drawing, they spoke aloud — some of what they said are DRAWING COMMANDS (like "give me red", "eraser", "thicker", "undo", "fire", "ice") and some are CREATIVE DESCRIPTIONS about the character they're drawing (like "he has wings", "she breathes fire", "this is a dragon warrior").

Your job:
1. Extract ONLY the creative character description parts
2. Weave them into a short, epic 2-3 sentence character lore/description
3. Ignore all drawing tool commands entirely

Respond in this exact JSON format:
{
  "description": "A cleaned-up version of what they described",
  "lore": "An epic 2-3 sentence character lore written in a dramatic fantasy anime style based on what they described. Make it sound legendary and anime-inspired."
}
        `;

        console.log('   🤖 Calling Gemini 2.0 Flash for transcript parsing…');
        const result = await genaiProject.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: promptText },
                        { text: `Here is the full voice transcript:\n\n"${transcript}"` }
                    ]
                }
            ],
            config: {
                responseMimeType: 'application/json',
            }
        });

        const parsed = JSON.parse(result.text);
        console.log(`   ✅ Transcript parsed in ${Date.now() - startTime}ms`, JSON.stringify(parsed).slice(0, 200));
        res.json(parsed);
    } catch (err) {
        console.error(`   ❌ Transcript parse error (${Date.now() - startTime}ms):`, err.message);
        console.error('   Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2).slice(0, 500));
        res.status(500).json({ error: 'Failed to parse transcript: ' + err.message });
    }
});

// ─── Gemini: Battle Logic & Video Prompt Generation (via Vertex AI) ───
app.post('/api/generate-battle', async (req, res) => {
    const startTime = Date.now();
    console.log('\n⚔️  POST /api/generate-battle');
    try {
        const { heroData, bossData } = req.body;
        console.log('   hero:', heroData?.name, '| boss:', bossData?.name);
        console.log('   drawing present:', !!heroData?.drawing, '| lore length:', heroData?.characterLore?.length || 0);

        // Convert the base64 Data URL to a format Gemini can use
        const base64String = heroData.drawing.split(',')[1];
        const mimeType = heroData.drawing.split(';')[0].split(':')[1];
        console.log('   image mimeType:', mimeType, '| base64 length:', base64String?.length || 0);

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
  "fightCommentary": "A RAPID-FIRE, insanely hype 2-sentence sports commentator call of the fight. Think UFC announcer losing their mind. Must be under 25 words total. Reference both fighters by name. Be hilarious and dramatic.",
  "winnerVerdict": "A triumphant, dramatic, short sentence announcing the winner (under 15 words) that will be spoken aloud",
  "videoPrompt": "A highly descriptive, 100-word prompt for an AI Video generator. Describe two anime characters in an EPIC HIGH-SPEED DUEL: the hero (based on the drawing) and the boss (based on their description). They dash toward each other at superhuman speed, their glowing energy auras clashing and exploding on contact. Rapid cuts between both characters as they leap, spin, and charge massive energy waves at each other. Ground shatters beneath them, wind howls, lightning crackles between their power auras. Show dramatic slow-motion moments of their powers colliding mid-air with massive shockwave explosions. Dragon Ball Z / Naruto style anime action. Ufotable cinematic quality, dynamic swooping camera, intense speed lines, particle effects everywhere.",
  "imagePrompt": "A highly descriptive prompt for an AI Image generator to create a high-quality, cinematic 16:9 portrait of the hero alone. Base the hero's appearance very strictly on the visual details shown in the attached drawing. Describe their clothes, weapon, color scheme, and vibe in detail so the AI generator makes an accurate high-level anime style version of the sketch. Start with 'High-quality anime style character portrait, Studio Ghibli, highly detailed anime aesthetic'."
}
        `;

        console.log('   🤖 Calling Gemini 2.0 Flash (vision) for battle logic…');
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

        const parsed = JSON.parse(result.text);
        console.log(`   ✅ Battle logic generated in ${Date.now() - startTime}ms`);
        console.log('   winner:', parsed.winner, '| verdict:', parsed.winnerVerdict);
        res.json(parsed);
    } catch (err) {
        console.error(`   ❌ Battle generation error (${Date.now() - startTime}ms):`, err.message);
        console.error('   Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2).slice(0, 800));
        res.status(500).json({ error: 'Failed to generate battle logic: ' + err.message });
    }
});

// ─── ElevenLabs: Text to Speech ───
app.post('/api/generate-speech', async (req, res) => {
    const startTime = Date.now();
    console.log('\n🎙️  POST /api/generate-speech');
    const ELEVENLABS_API_KEY = process.env.VITE_ELEVENLABS_API_KEY;
    if (!ELEVENLABS_API_KEY) {
        console.error('   ❌ Missing VITE_ELEVENLABS_API_KEY in .env');
        return res.status(500).json({ error: 'Missing VITE_ELEVENLABS_API_KEY' });
    }

    const { text, voiceId = 'pNInz6obpgDQGcFmaJgB' } = req.body; // Default: Adam's Voice ID
    console.log('   text length:', text?.length || 0, '| voiceId:', voiceId);

    if (!text) {
        return res.status(400).json({ error: 'No text provided' });
    }

    try {
        console.log('   🔊 Calling ElevenLabs API…');
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
                'accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_flash_v2_5',
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
        console.log(`   ✅ Speech generated in ${Date.now() - startTime}ms | size: ${buffer.length} bytes`);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': buffer.length,
        });

        res.send(buffer);
    } catch (err) {
        console.error(`   ❌ TTS error (${Date.now() - startTime}ms):`, err.message);
        res.status(500).json({ error: 'Failed to generate speech: ' + err.message });
    }
});

// ─── Gemini: Image Generation (Imagen 3) ───
app.post('/api/generate-image', async (req, res) => {
    const startTime = Date.now();
    console.log('\n🎨 POST /api/generate-image');
    const { prompt } = req.body;
    console.log('   prompt:', prompt?.slice(0, 120), '…');
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    try {
        console.log('   🖼️  Calling Imagen 3.0 (generate-002)…');
        const response = await genaiProject.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '16:9'
            }
        });

        const base64Image = response.generatedImages[0].image.imageBytes;
        console.log(`   ✅ Image generated in ${Date.now() - startTime}ms | base64 length: ${base64Image?.length || 0}`);
        res.json({ image: `data:image/png;base64,${base64Image}` });
    } catch (error) {
        console.error(`   ❌ Imagen error (${Date.now() - startTime}ms):`, error.message);
        console.error('   Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2).slice(0, 800));
        res.status(500).json({ error: 'Failed to generate image: ' + error.message });
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
    const startTime = Date.now();
    console.log('\n🎬 POST /api/generate-video');

    const { prompt, image } = req.body;
    console.log('   prompt:', prompt?.slice(0, 120), '…');
    console.log('   image provided:', !!image, image ? `(length: ${image.length})` : '');
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    try {
        // Build the request — optionally include image for image-to-video
        const videoRequest = {
            model: 'veo-3.0-generate-preview',
            prompt: prompt,
            config: {
                durationSeconds: 8,
                aspectRatio: '16:9',
                includeRaiReason: true,
            },
        };

        // If an image was provided, use image-to-video mode
        if (image) {
            // Strip the data URL prefix if present: "data:image/png;base64,..."
            const base64Match = image.match(/^data:([^;]+);base64,(.+)$/);
            if (base64Match) {
                videoRequest.image = {
                    imageBytes: base64Match[2],
                    mimeType: base64Match[1],
                };
                console.log('   📸 Using image-to-video mode (mimeType:', base64Match[1], ')');
            }
        }

        console.log('   🎥 Calling Veo 2.0 Generate…');
        let operation = await veoProject.models.generateVideos(videoRequest);
        console.log('   📋 Initial operation done?', operation.done, '| has response?', !!operation.response);

        // Poll for completion with a 4-minute safety limit
        let pollCount = 0;
        const maxPollTime = 240000; // 4 minutes
        while (!operation.done) {
            if (Date.now() - startTime > maxPollTime) {
                console.error(`   ⏰ Veo polling timed out after ${Math.round((Date.now() - startTime) / 1000)}s`);
                return res.status(504).json({ error: 'Video generation timed out after 4 minutes' });
            }
            pollCount++;
            console.log(`   ⏳ Veo polling #${pollCount} (${Math.round((Date.now() - startTime) / 1000)}s elapsed)…`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
            operation = await veoProject.operations.getVideosOperation({ operation });
        }

        console.log(`   📋 Veo operation response keys:`, Object.keys(operation.response || {}));
        console.log('   📋 Full Veo response:', JSON.stringify(operation.response || {}).slice(0, 2000));

        // Check for RAI (safety) filtering
        const raiReason = operation.response?.raiMediaFilteredReasons || operation.response?.raiFilteredReasons;
        if (raiReason) {
            console.error('   🚫 Veo RAI filter triggered:', JSON.stringify(raiReason));
        }

        const videos = operation.response?.generatedVideos;
        if (!videos || videos.length === 0) {
            console.error(`   ❌ Veo returned no videos after ${Date.now() - startTime}ms`);
            const reason = raiReason ? `Content filtered: ${JSON.stringify(raiReason)}` : 'No video found (possible safety filter)';
            return res.status(500).json({ error: reason });
        }

        const video = videos[0].video;
        console.log(`   📋 Video object keys:`, Object.keys(video || {}));

        if (video.videoBytes) {
            console.log(`   ✅ Video generated in ${Date.now() - startTime}ms | base64 length: ${video.videoBytes?.length || 0}`);
            res.json({ video: `data:video/mp4;base64,${video.videoBytes}` });
        } else if (video.uri) {
            // Veo sometimes returns a GCS URI — fetch the video bytes from it
            console.log(`   📥 Video has URI (${video.uri}), fetching bytes…`);
            try {
                const { Storage } = await import('@google-cloud/storage');
                const storage = new Storage();
                // URI format: gs://bucket-name/path/to/video.mp4
                const uriMatch = video.uri.match(/^gs:\/\/([^/]+)\/(.+)$/);
                if (uriMatch) {
                    const [, bucket, path] = uriMatch;
                    const [fileBuffer] = await storage.bucket(bucket).file(path).download();
                    const base64Video = fileBuffer.toString('base64');
                    console.log(`   ✅ Video fetched from GCS in ${Date.now() - startTime}ms | base64 length: ${base64Video.length}`);
                    res.json({ video: `data:video/mp4;base64,${base64Video}` });
                } else {
                    // Try fetching via HTTP if it's an HTTPS URI
                    const videoFetch = await fetch(video.uri);
                    if (videoFetch.ok) {
                        const videoArrayBuf = await videoFetch.arrayBuffer();
                        const base64Video = Buffer.from(videoArrayBuf).toString('base64');
                        console.log(`   ✅ Video fetched via HTTP in ${Date.now() - startTime}ms | base64 length: ${base64Video.length}`);
                        res.json({ video: `data:video/mp4;base64,${base64Video}` });
                    } else {
                        throw new Error(`Failed to fetch video URI: ${videoFetch.status}`);
                    }
                }
            } catch (fetchErr) {
                console.error(`   ❌ Failed to fetch video from URI:`, fetchErr.message);
                res.status(500).json({ error: 'Video URI returned but fetch failed: ' + fetchErr.message });
            }
        } else {
            console.error('   ❌ Video returned without inline bytes or URI');
            console.error('   Video object:', JSON.stringify(video).slice(0, 500));
            res.status(500).json({ error: 'Video returned without inline bytes or URI' });
        }
    } catch (error) {
        console.error(`   ❌ Veo error (${Date.now() - startTime}ms):`, error.message);
        console.error('   Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2).slice(0, 800));
        res.status(500).json({ error: 'Failed to generate video: ' + error.message });
    }
});

// Serve the Vite production build
app.use(express.static(path.join(__dirname, 'dist')));

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 API Server running on http://localhost:${PORT}`));
