// services/translate.js
import axios from "axios";

export const translateToEnglish = async (text, sourceLang) => {
    try {
        const res = await axios.post("https://libretranslate.com/translate", {
            q: text,
            source: sourceLang,
            target: "en",
            format: "text",
        });
        return res.data.translatedText;
    } catch (err) {
        console.error("Translation Error:", err);
        return text; // fallback to original text
    }
};
