import { useState, useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import "./AIFormAssistant.css";

function AIFormAssistant({ handleVoiceInput, isLoading }) {
    const { transcript, listening, resetTranscript } = useSpeechRecognition();
    const [language, setLanguage] = useState("hi-IN");
    const [editableTranscript, setEditableTranscript] = useState("");
    const languageMap = { Hindi: "hi-IN", English: "en-US", Telugu: "te-IN", Jharkhandi: "hi-IN" };

    useEffect(() => setEditableTranscript(transcript), [transcript]);

    const applyVoiceInput = () => {
        if (!editableTranscript.trim()) return;
        handleVoiceInput(editableTranscript);
        resetTranscript();
        setEditableTranscript("");
    };

    return (
        <div className="ai-form-assistant-card">
            <h5 className="ai-form-assistant-title">🤖 AI Voice Assistant</h5>
            <div className="form-group">
                <label htmlFor="languageSelect">Select Language</label>
                <select
                    id="languageSelect"
                    className="form-control"
                    value={Object.keys(languageMap).find((key) => languageMap[key] === language)}
                    onChange={(e) => setLanguage(languageMap[e.target.value])}
                    disabled={isLoading || listening}
                >
                    {Object.keys(languageMap).map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                    ))}
                </select>
            </div>
            <div className="form-actions">
                <button
                    className={`btn btn-warning start-voice-btn ${listening ? "listening" : ""}`}
                    onClick={() => SpeechRecognition.startListening({ continuous: true, language })}
                    disabled={isLoading}
                >
                    <span className="btn-icon">🎙</span> {listening ? "Listening..." : "Start Voice"}
                </button>
                <button
                    className="btn btn-danger stop-voice-btn"
                    onClick={() => SpeechRecognition.stopListening()}
                    disabled={isLoading || !listening}
                >
                    <span className="btn-icon">⏹</span> Stop
                </button>
                <button
                    className="btn btn-success submit-voice-btn"
                    onClick={applyVoiceInput}
                    disabled={isLoading || !editableTranscript.trim()}
                >
                    <span className="btn-icon">📝</span> Submit Voice Input
                </button>
            </div>
            <div className="form-group">
                <label htmlFor="transcript">Voice Transcript</label>
                <textarea
                    id="transcript"
                    className="form-control"
                    value={editableTranscript}
                    onChange={(e) => setEditableTranscript(e.target.value)}
                    rows={4}
                    placeholder="Your voice input will appear here. Edit before submitting..."
                    disabled={isLoading}
                />
                <small className="form-text">Speak clearly, then edit and submit your transcript.</small>
            </div>
        </div>
    );
}

export default AIFormAssistant;