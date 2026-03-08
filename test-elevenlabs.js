import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_ELEVENLABS_API_KEY;
if (!API_KEY) {
    console.error('❌ No VITE_ELEVENLABS_API_KEY in .env');
    process.exit(1);
}

const VOICE_ID = 'FF7KdobWPaiR0vkcALHF';
const TEST_TEXT = 'The legend of the warrior begins now. Victory is assured.';

const MODELS = [
    'eleven_flash_v2_5',
    'eleven_flash_v2',
    'eleven_turbo_v2_5',
    'eleven_turbo_v2',
    'eleven_multilingual_v2',
    'eleven_monolingual_v1',
];

async function testVoice(voiceId, modelId) {
    try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: {
                'xi-api-key': API_KEY,
                'Content-Type': 'application/json',
                'accept': 'audio/mpeg',
            },
            body: JSON.stringify({
                text: TEST_TEXT,
                model_id: modelId,
                voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
        });

        if (res.ok) {
            const buf = await res.arrayBuffer();
            console.log(`  ✅ ${modelId} — SUCCESS (${buf.byteLength} bytes)`);
            return true;
        } else {
            const err = await res.text();
            console.log(`  ❌ ${modelId} — ${res.status}: ${err.slice(0, 200)}`);
            return false;
        }
    } catch (e) {
        console.log(`  ❌ ${modelId} — FETCH ERROR: ${e.message}`);
        return false;
    }
}

async function main() {
    console.log(`\n🔊 Testing ElevenLabs voice: ${VOICE_ID}`);
    console.log(`   API key: ${API_KEY.slice(0, 8)}…\n`);

    // First, check if the voice exists
    try {
        const voiceRes = await fetch(`https://api.elevenlabs.io/v1/voices/${VOICE_ID}`, {
            headers: { 'xi-api-key': API_KEY },
        });
        if (voiceRes.ok) {
            const voice = await voiceRes.json();
            console.log(`   Voice name: "${voice.name}" | category: ${voice.category} | labels: ${JSON.stringify(voice.labels)}\n`);
        } else {
            const err = await voiceRes.text();
            console.log(`   ⚠️  Could not fetch voice info: ${voiceRes.status} ${err.slice(0, 200)}\n`);
        }
    } catch (e) {
        console.log(`   ⚠️  Voice lookup failed: ${e.message}\n`);
    }

    // Test each model
    let workingModel = null;
    for (const model of MODELS) {
        const ok = await testVoice(VOICE_ID, model);
        if (ok && !workingModel) workingModel = model;
    }

    console.log('\n' + '─'.repeat(50));
    if (workingModel) {
        console.log(`✅ BEST WORKING MODEL: ${workingModel}`);
        console.log(`   Voice ID: ${VOICE_ID}`);
    } else {
        console.log('❌ No model worked with this voice ID.');
        console.log('   Trying fallback with default Adam voice (pNInz6obpgDQGcFmaJcg)…\n');
        for (const model of MODELS) {
            const ok = await testVoice('pNInz6obpgDQGcFmaJcg', model);
            if (ok) {
                console.log(`\n✅ FALLBACK: Adam voice works with ${model}`);
                break;
            }
        }
    }
}

main();
