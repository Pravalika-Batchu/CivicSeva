import { useState } from "react";
import api from "../services/api/axios";

function AIChatbot({ setForm }) {
    const [chatbotOpen, setChatbotOpen] = useState(false);
    const [chat, setChat] = useState([]);
    const [input, setInput] = useState("");
    const [formMode, setFormMode] = useState(false);
    const [formStep, setFormStep] = useState(0);
    const [tempForm, setTempForm] = useState({ title: "", description: "", category: "OTHER", latitude: "", longitude: "", address: "" });

    const formFields = [
        { key: "title", question: "Please enter the title of the issue:" },
        { key: "description", question: "Please describe the issue in detail:" },
        { key: "category", question: "Select category (HYGIENE, ROADS, ELECTRICITY, WATER, SAFETY, INFRA, OTHER):" },
        { key: "address", question: "Enter the address/location:" },
    ];

    const addMessage = (sender, message) => setChat((prev) => [...prev, { sender, message }]);

    const toggleChatbot = () => {
        setChatbotOpen(!chatbotOpen);
        if (!chatbotOpen) addMessage("🤖", "Hello! Ask me anything or type 'fill the form' to submit an issue.");
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input.trim();
        addMessage("You", userMsg);
        setInput("");

        if (userMsg.toLowerCase().includes("fill the form")) {
            setFormMode(true);
            setFormStep(0);
            addMessage("🤖", formFields[0].question);
            return;
        }

        if (formMode) {
            const currentField = formFields[formStep].key;
            setTempForm((prev) => ({ ...prev, [currentField]: userMsg }));

            if (currentField === "description") {
                try {
                    const res = await api.post("/api/refine-description/", { text: userMsg });
                    const parsed = JSON.parse(res.data.refined);
                    setTempForm((prev) => ({
                        ...prev,
                        title: parsed.title,
                        description: `
${parsed.description}
Urgency: ${parsed.urgency}
Details: ${parsed.details}
Contact: ${parsed.contact}
            `.trim(),
                    }));
                } catch (err) {
                    console.error("AI refinement failed", err);
                    addMessage("🤖", "❌ Failed to refine description. Using your input.");
                }
            }

            if (formStep + 1 < formFields.length) {
                setFormStep(formStep + 1);
                addMessage("🤖", formFields[formStep + 1].question);
            } else {
                setForm(tempForm);
                addMessage("🤖", "✅ Form filled successfully with AI-refined description!");
                setFormMode(false);
            }
            return;
        }

        // Regular AI chat
        try {
            const res = await api.post("/api/ai-chat/", { message: userMsg });
            addMessage("🤖", res.data.reply || "Sorry, I couldn't understand that.");
        } catch (err) {
            console.error(err);
            addMessage("🤖", "❌ AI response failed.");
        }
    };

    return (
        <>
            <div style={{ position: "fixed", bottom: 20, right: 20, cursor: "pointer", zIndex: 1000 }} onClick={toggleChatbot}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", backgroundColor: "#0d6efd", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🤖</div>
            </div>

            {chatbotOpen && (
                <div style={{ position: "fixed", bottom: 80, right: 20, width: 300, maxHeight: 400, overflowY: "auto", backgroundColor: "#fff", borderRadius: 8, boxShadow: "0 0 8px rgba(0,0,0,0.3)", padding: 10, zIndex: 1000 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {chat.map((msg, idx) => (
                            <div key={idx} style={{ textAlign: msg.sender === "You" ? "right" : "left" }}>
                                <strong>{msg.sender}:</strong> {msg.message}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", marginTop: 6 }}>
                        <input style={{ flex: 1, padding: 6 }} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type your message..." />
                        <button className="btn btn-primary btn-sm ms-1" onClick={handleSend}>Send</button>
                    </div>
                </div>
            )}
        </>
    );
}

export default AIChatbot;