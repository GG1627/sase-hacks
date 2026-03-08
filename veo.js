// veo.js
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

async function run() {
    const ai = new GoogleGenAI({
        project: 'project-09390c46-5306-4e39-97e',
        location: 'global',
        vertexai: true,
    });

    try {
        console.log('🎬 Generating video...');

        const prompt =
            'Cinematic drone shot of a futuristic neon city at night, rainy atmosphere, vibrant blue and pink neon';

        // Start Veo long-running operation
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-001',
            prompt,
            config: {
                durationSeconds: 4,
                aspectRatio: '16:9',
            },
        });

        console.log('⏳ Operation started. ID:', operation.name);

        // Poll until done
        while (!operation.done) {
            process.stdout.write('.');
            await new Promise((resolve) => setTimeout(resolve, 10_000));
            operation = await ai.operations.getVideosOperation({ operation });
        }

        console.log('\n🏁 Done. Dumping full response structure:');

        // Save full response for debugging
        const raw = JSON.stringify(operation, null, 2);
        fs.writeFileSync('response_dump.json', raw);
        console.log('📄 Full response saved to response_dump.json');

        const videos = operation.response?.generatedVideos;
        if (!videos || videos.length === 0) {
            console.log('⚠️ No videos found in response. Check response_dump.json');
            return;
        }

        const video = videos[0].video;
        if (!video) {
            console.log('⚠️ No video object in generatedVideos[0]. Check response_dump.json');
            return;
        }

        // Prefer inline bytes if present
        if (video.videoBytes) {
            const bytes = Buffer.from(video.videoBytes, 'base64');
            fs.writeFileSync('fast_demo.mp4', bytes);
            console.log('✅ Saved inline bytes as fast_demo.mp4');
            return;
        }

        // Fallback: try sdk download if it’s actually a file handle
        try {
            await ai.files.download({
                file: video,
                downloadPath: 'fast_demo.mp4',
            });
            console.log('✅ Downloaded video to fast_demo.mp4 via files API');
        } catch (err) {
            console.error(
                '⚠️ files.download failed and no videoBytes present. See response_dump.json\n',
                err,
            );
        }
    } catch (e) {
        console.error('\n❌ Error:', e?.stack || e);
    }
}

run();
