// src/services/elevenlabs.js

/**
 * Calls our backend proxy to generate speech using ElevenLabs API
 * @param {string} text - The text you want spoken
 * @param {string} voiceId - Optional voice ID. Defaults to Adam (pNInz6obpgDQGcFmaJcg)
 * @returns {Promise<string>} An Object URL of the generated audio (can be set as an <audio src={url}>)
 */
export async function generateSpeechUrl(text, voiceId = 'pNInz6obpgDQGcFmaJcg') {
    if (!text || !text.trim()) return null;

    try {
        const response = await fetch('/api/generate-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                voiceId: voiceId
            }),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Speech generation failed');
        }

        // Return a blob URL that can be directly played
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (err) {
        console.error('Error generating speech:', err);
        return null; // Return null so the UI can fallback gracefully
    }
}
