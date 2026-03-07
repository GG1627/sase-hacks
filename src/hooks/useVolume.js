import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useVolume — connects to the mic via Web Audio API and returns a
 * live 0–1 volume level + a boolean "isShouting" flag at 60 fps.
 */
export function useVolume(shoutThreshold = 0.45) {
    const [volume, setVolume] = useState(0);
    const [isShouting, setIsShouting] = useState(false);
    const rafRef = useRef(null);
    const analyserRef = useRef(null);
    const dataRef = useRef(null);
    const streamRef = useRef(null);

    const start = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.6;
            src.connect(analyser);
            analyserRef.current = analyser;
            dataRef.current = new Uint8Array(analyser.frequencyBinCount);

            const tick = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataRef.current);
                // Compute RMS-style average normalised 0-1
                let sum = 0;
                for (let i = 0; i < dataRef.current.length; i++) sum += dataRef.current[i];
                const avg = sum / dataRef.current.length / 255;
                setVolume(avg);
                setIsShouting(avg > shoutThreshold);
                rafRef.current = requestAnimationFrame(tick);
            };
            tick();
        } catch (err) {
            console.warn('useVolume: mic access denied or unavailable', err);
        }
    }, [shoutThreshold]);

    const stop = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        analyserRef.current = null;
    }, []);

    useEffect(() => () => stop(), [stop]);

    return { volume, isShouting, startVolume: start, stopVolume: stop };
}
