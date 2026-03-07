import { useState, useEffect, useCallback, useRef } from 'react';

export function useVoice(onCommand) {
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    // Provide a continuous transcript that resets on new speech segments but accumulates
    const fullTranscriptRef = useRef('');

    useEffect(() => {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Web Speech API is not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            let currentInterim = '';
            let currentFinal = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    currentFinal += text + ' ';

                    // Fire command check on final segments for reliability
                    if (onCommand) {
                        onCommand(text.toLowerCase());
                    }
                } else {
                    currentInterim += text;

                    // Also check interim for snappier command response (eraser, pen, etc)
                    if (onCommand) {
                        onCommand(text.toLowerCase());
                    }
                }
            }

            if (currentFinal) {
                fullTranscriptRef.current += currentFinal;
            }

            setTranscript(fullTranscriptRef.current + currentInterim);
        };

        recognition.onerror = (event) => {
            // "no-speech" isn't a real error, just quiet
            if (event.error !== 'no-speech') {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            // Automatically restart if we were supposed to be listening
            // but the browser stopped it (happens after periods of silence)
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onCommand]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (err) {
                console.error(err);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, [isListening]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    return {
        transcript,
        isListening,
        startListening,
        stopListening,
        toggleListening
    };
}
