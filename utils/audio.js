import axios from "axios";

function htmlToSsmlForEn(html) {
  let ssml = html;

  // ===== Handle Jodit-specific formatting =====
  // Bold text (font-weight or <strong>)
  ssml = ssml.replace(
    /<(span|strong)[^>]*style="[^"]*font-weight:\s*(bold|700|800|900)[^"]*"[^>]*>(.*?)<\/\1>/gi,
    '<emphasis level="strong">$3</emphasis>'
  );
  ssml = ssml.replace(
    /<(b|strong)>(.*?)<\/\1>/gi,
    '<emphasis level="strong">$2</emphasis>'
  );

  // Italic text (font-style or <em>)
  ssml = ssml.replace(
    /<(span|em|i)[^>]*style="[^"]*font-style:\s*italic[^"]*"[^>]*>(.*?)<\/\1>/gi,
    '<emphasis level="moderate">$2</emphasis>'
  );
  ssml = ssml.replace(
    /<(i|em)>(.*?)<\/\1>/gi,
    '<emphasis level="moderate">$2</emphasis>'
  );

  // Underlined text (could be read with a different tone)
  ssml = ssml.replace(
    /<(span|u)[^>]*style="[^"]*text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/\1>/gi,
    '<prosody pitch="+10%">$2</prosody>'
  );
  ssml = ssml.replace(/<u>(.*?)<\/u>/gi, '<prosody pitch="+10%">$1</prosody>');

  // Headings (adjust speaking rate)
  ssml = ssml.replace(
    /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi,
    '<break time="500ms"/><prosody rate="slow">$1</prosody><break time="500ms"/>'
  );

  // Lists (add pauses for bullets)
  ssml = ssml.replace(
    /<li[^>]*>(.*?)<\/li>/gi,
    '<break time="300ms"/>• $1<break time="300ms"/>'
  );

  // ===== Structural pauses =====
  ssml = ssml.replace(/<br\s*\/?>/gi, '<break time="800ms"/>');
  ssml = ssml.replace(/<\/p>/gi, '<break time="1200ms"/>');
  ssml = ssml.replace(/<p[^>]*>/gi, '<break time="400ms"/>');

  // ===== Clean up remaining HTML tags =====
  ssml = ssml.replace(/<\/?[^>]+(>|$)/g, "");

  // ===== Final SSML Wrapping =====
  ssml = `${ssml}`;

  return ssml;
}

function htmlToSsmlForTe(html) {
  let ssml = html;

  // Ensure commas read properly
  ssml = ssml.replace(/,(\S)/g, ", $1"); // insert missing spaces
  ssml = ssml.replace(/,/g, '<break strength="medium"/>'); // add pause

  // Replace <br> and <p> with pauses
  ssml = ssml.replace(/<br\s*\/?>/gi, '<break time="800ms"/>');
  ssml = ssml.replace(/<\/p>/gi, '<break time="1200ms"/>');
  ssml = ssml.replace(/<p[^>]*>/gi, '<break time="400ms"/>');

  // Bold → strong emphasis
  ssml = ssml.replace(
    /<b>(.*?)<\/b>/gi,
    '<emphasis level="strong">$1</emphasis>'
  );

  // Italic → moderate emphasis
  ssml = ssml.replace(
    /<i>(.*?)<\/i>/gi,
    '<emphasis level="moderate">$1</emphasis>'
  );

  // Remove leftover tags
  ssml = ssml.replace(/<\/?[^>]+(>|$)/g, "");

  return `${ssml}`;
}

export const generateAudioForTexts = async ({
  enTitle,
  enDescription,
  teTitle,
  teDescription,
}) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    const endpoint = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${apiKey}`;

    // Combine title + description
    const enText = `<p>Title: ${enTitle}.</p> <p>Description:</p> ${enDescription}`;
    const teText = `<p>శీర్షిక: ${teTitle}.</p> <p>వివరణ:</p> ${teDescription}`;

    // Convert to SSML (or plain text if you don’t need SSML)
    const enSsml = htmlToSsmlForEn(enText);
    const teSsml = htmlToSsmlForTe(teText);

    // Helper for Google TTS request
    const synthesize = async (text, languageCode, voiceName) => {
      const payload = {
        audioConfig: {
          audioEncoding: "MP3",
          pitch: 0,
          speakingRate: 1,
        },
        input: { text },
        voice: { languageCode, name: voiceName },
      };
      const res = await axios.post(endpoint, payload);
      return res.data.audioContent; // base64 encoded mp3
    };

    // Generate both audios in parallel
    const [enAudio, teAudio] = await Promise.all([
      synthesize(enSsml, "en-IN", "en-IN-Chirp3-HD-Achernar"),
      synthesize(teSsml, "te-IN", "te-IN-Chirp3-HD-Achernar"),
    ]);

    // ✅ Return without saving to any DB
    return {
      en: enAudio,
      te: teAudio,
    };
  } catch (err) {
    console.error("Error generating audio:", err.message);
    throw err;
  }
};
