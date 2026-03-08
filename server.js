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

// Define the Battle Schema for the gallery
const battleSchema = new mongoose.Schema({
    heroName: String,
    heroColor: String,
    bossName: String,
    bossImage: String,
    drawingUrl: String,       // Cloudinary URL of the player's hand-drawn sketch
    heroImageUrl: String,     // Cloudinary URL of the AI-generated hero art
    winner: String,           // 'hero' or 'boss'
    winnerName: String,
    battleNarrative: String,
    winnerVerdict: String,
    winnerReason: String,
    fightCommentary: String,
    characterLore: String,
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
  "videoPrompt": "A highly descriptive, 100-word prompt for an AI Video generator. Describe two anime characters in a DRAMATIC SHOWDOWN: the hero (based on the drawing) and the boss (based on their description). They face each other with glowing colorful energy auras, leaping gracefully through the air. Brilliant beams of light and magical energy swirl between them. Wind flows dramatically, sparkles of light scatter on contact. Show dramatic slow-motion moments of their powers meeting mid-air with dazzling flashes. Anime style (like Studio Ghibli or Dragon Ball Z). Ufotable cinematic quality, dynamic swooping camera, vibrant colorful particle effects and speed lines. Family-friendly, no graphic content.",
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

    // ── Sanitize prompt upfront to avoid RAI safety filter ──
    const FLAGGED_WORDS = [
        [/\bexplo(sion|ding|de|des|ded|sive)s?\b/gi, 'burst of energy'],
        [/\bshatter(s|ing|ed)?\b/gi, 'trembles'],
        [/\bdestro(y|ying|yed|ys)\b/gi, 'overcome'],
        [/\bdestructi(on|ve)\b/gi, 'powerful force'],
        [/\bdevastating\b/gi, 'overwhelming'],
        [/\bblood(y|ied)?\b/gi, ''],
        [/\bgore\b/gi, ''],
        [/\bkill(s|ing|ed)?\b/gi, 'defeat'],
        [/\bdeath\b/gi, 'defeat'],
        [/\bdie(s|d)?\b/gi, 'fall'],
        [/\bdying\b/gi, 'falling'],
        [/\bdead\b/gi, 'fallen'],
        [/\bviolen(t|ce)\b/gi, 'intense'],
        [/\bcrush(es|ing|ed)?\b/gi, 'pushes back'],
        [/\bsmash(es|ing|ed)?\b/gi, 'collides with'],
        [/\bslash(es|ing|ed)?\b/gi, 'strikes at'],
        [/\bstab(s|bing|bed)?\b/gi, 'strikes'],
        [/\bpunch(es|ing|ed)?\b/gi, 'strikes'],
        [/\bfight(s|ing)?\b/gi, 'clash'],
        [/\bbattle\b/gi, 'showdown'],
        [/\bcombat\b/gi, 'contest'],
        [/\bwar\b/gi, 'contest'],
        [/\bweapon(s)?\b/gi, 'tool'],
        [/\bsword(s)?\b/gi, 'blade of light'],
        [/\bblade(s)?\b/gi, 'beam of light'],
        [/\bgun(s)?\b/gi, 'energy device'],
        [/\bshoot(s|ing)?\b/gi, 'projects'],
        [/\bshot(s)?\b/gi, 'beam'],
        [/\bbullet(s)?\b/gi, 'energy orb'],
        [/\bmissile(s)?\b/gi, 'energy beam'],
        [/\bbomb(s)?\b/gi, 'energy sphere'],
        [/\bfire(s|d|ball)?\b/gi, 'flame aura'],
        [/\bburn(s|ing|ed)?\b/gi, 'glow'],
        [/\bblaze(s|ing)?\b/gi, 'radiance'],
        [/\binferno\b/gi, 'blazing light'],
        [/\bduel\b/gi, 'face-off'],
        [/\battack(s|ing|ed)?\b/gi, 'charges toward'],
        [/\bhit(s|ting)?\b/gi, 'meets'],
        [/\bstrike(s)?\b/gi, 'flash of light'],
        [/\bstrik(ing|ed)\b/gi, 'illuminating'],
        [/\bwound(s|ed|ing)?\b/gi, 'impact'],
        [/\binjur(y|ed|ies|ing)\b/gi, 'pushed back'],
        [/\bhurt(s|ing)?\b/gi, 'stagger'],
        [/\bscream(s|ing|ed)?\b/gi, 'shout'],
        [/\brage(s|ing|d)?\b/gi, 'intensity'],
        [/\bfury\b/gi, 'determination'],
        [/\bwrath\b/gi, 'resolve'],
        [/\bshockwave(s)?\b/gi, 'wave of energy'],
        [/\bimpact(s)?\b/gi, 'flash'],
        [/\bcollision(s)?\b/gi, 'meeting of forces'],
        [/\bcollid(es|ing|ed)\b/gi, 'meets'],
        [/\blightning\b/gi, 'electric sparkle'],
        [/\bthunder\b/gi, 'rumbling sky'],
        [/\bcrackle(s)?\b/gi, 'shimmer'],
    ];

    let sanitizedPrompt = prompt;
    for (const [pattern, replacement] of FLAGGED_WORDS) {
        sanitizedPrompt = sanitizedPrompt.replace(pattern, replacement);
    }
    sanitizedPrompt = sanitizedPrompt.replace(/  +/g, ' ').trim();
    sanitizedPrompt += ' Safe for all audiences. Stylized anime action. Colorful and family-friendly.';
    console.log('   🧹 Sanitized prompt:', sanitizedPrompt.slice(0, 150), '…');

    // Helper: run a single Veo generation attempt
    async function attemptVeoGeneration(videoPrompt, imageData, attemptLabel) {
        const request = {
            model: 'veo-3.0-generate-preview',
            prompt: videoPrompt,
            config: {
                durationSeconds: 8,
                aspectRatio: '16:9',
                includeRaiReason: true,
            },
        };

        if (imageData) {
            const base64Match = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (base64Match) {
                request.image = {
                    imageBytes: base64Match[2],
                    mimeType: base64Match[1],
                };
                console.log(`   📸 [${attemptLabel}] Using image-to-video mode`);
            }
        }

        console.log(`   🎥 [${attemptLabel}] Calling Veo 3.0…`);
        let operation = await veoProject.models.generateVideos(request);

        let pollCount = 0;
        const maxPollTime = 240000;
        while (!operation.done) {
            if (Date.now() - startTime > maxPollTime) {
                throw new Error('Polling timed out');
            }
            pollCount++;
            console.log(`   ⏳ [${attemptLabel}] Veo polling #${pollCount} (${Math.round((Date.now() - startTime) / 1000)}s)…`);
            await new Promise(r => setTimeout(r, 5000));
            operation = await veoProject.operations.getVideosOperation({ operation });
        }

        const resp = operation.response || {};
        const raiReason = resp.raiMediaFilteredReasons || resp.raiFilteredReasons;
        if (raiReason) {
            console.error(`   🚫 [${attemptLabel}] RAI filter:`, JSON.stringify(raiReason));
        }

        const videos = resp.generatedVideos;
        if (!videos || videos.length === 0) {
            const reason = raiReason ? `Content filtered: ${JSON.stringify(raiReason)}` : 'No video found';
            throw new Error(reason);
        }
        return videos;
    }

    try {
        let videos;

        // Single attempt with pre-sanitized prompt
        try {
            videos = await attemptVeoGeneration(sanitizedPrompt, image, 'Generate');
        } catch (err1) {
            console.warn(`   ⚠️  Generation failed: ${err1.message}`);
            // Last resort: try without image (image itself can trigger RAI)
            if (image) {
                console.log('   🔄 Retrying without image…');
                try {
                    videos = await attemptVeoGeneration(sanitizedPrompt, null, 'No-image retry');
                } catch (err2) {
                    console.error(`   ❌ No-image retry also failed: ${err2.message}`);
                    return res.status(500).json({ error: err2.message });
                }
            } else {
                return res.status(500).json({ error: err1.message });
            }
        }

        console.log(`   📋 Veo response — got ${videos.length} video(s)`);

        // Check for RAI on the successful result (just for logging)
        const raiReason = null; // already logged inside attemptVeoGeneration

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
