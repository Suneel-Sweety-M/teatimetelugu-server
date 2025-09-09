import axios from "axios";

function htmlToSsmlForEn(html) {
  let ssml = html;

  // ===== Handle Jodit-specific formatting =====
  // Replace non-breaking spaces with normal spaces
  ssml = ssml.replace(/&nbsp;/g, " ");
  ssml = ssml.replace(/\s+/g, " ").trim();

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
  ssml = `<speak>${ssml}</speak>`;

  return ssml;
}

function htmlToSsmlForTe(html) {
  let ssml = html;

  // Replace non-breaking spaces with normal spaces
  ssml = ssml.replace(/&nbsp;/g, " ");
  ssml = ssml.replace(/\s+/g, " ").trim();

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

  return `<speak>${ssml}</speak>`;
}

// Helper function to validate and clean SSML
function validateAndCleanSsml(ssml) {
  // Ensure proper SSML structure
  if (!ssml.startsWith("<speak>")) {
    ssml = `<speak>${ssml}`;
  }
  if (!ssml.endsWith("</speak>")) {
    ssml = `${ssml}</speak>`;
  }

  // Remove any invalid characters that might break the XML
  ssml = ssml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // Ensure proper Unicode encoding for Telugu
  ssml = ssml.normalize("NFC");

  return ssml;
}

export const generateAudioForTexts = async ({
  enTitle,
  enDescription,
  teTitle,
  teDescription,
}) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error(
        "Google API key is missing. Audio generation will be skipped."
      );
      return { en: null, te: null };
    }

    const endpoint = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${apiKey}`;

    // Combine title + description
    const enText = `<p>Title: ${enTitle}.</p> <p>Description:</p> ${enDescription}`;
    const teText = `<p>శీర్షిక: ${teTitle}.</p> <p>వివరణ:</p> ${teDescription}`;

    // Convert to SSML
    let enSsml = htmlToSsmlForEn(enText);
    let teSsml = htmlToSsmlForTe(teText);

    // Validate and clean SSML
    enSsml = validateAndCleanSsml(enSsml);
    teSsml = validateAndCleanSsml(teSsml);

    console.log("English SSML length:", enSsml.length);
    console.log("Telugu SSML length:", teSsml.length);

    // Helper for Google TTS request
    const synthesize = async (
      ssml,
      languageCode,
      voiceName,
      fallbackVoices = []
    ) => {
      const voicesToTry = [voiceName, ...fallbackVoices];

      for (const currentVoice of voicesToTry) {
        const payload = {
          audioConfig: {
            audioEncoding: "MP3",
            pitch: 0,
            speakingRate: 1,
          },
          input: { ssml },
          voice: { languageCode, name: currentVoice },
        };

        try {
          const res = await axios.post(endpoint, payload, {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 30000,
          });

          if (res.data.audioContent) {
            console.log(
              `Successfully generated audio with voice: ${currentVoice}`
            );
            return res.data.audioContent;
          }
        } catch (error) {
          console.warn(`Voice ${currentVoice} failed, trying next...`);
          // Continue to next voice
        }
      }

      console.error(`All voices failed for ${languageCode}`);
      return null;
    };

    // Generate both audios with fallback options
    const [enAudio, teAudio] = await Promise.allSettled([
      // English with fallback voices
      synthesize(
        enSsml,
        "en-IN",
        "en-IN-Chirp3-HD-Achernar",
        ["en-IN-Wavenet-D", "en-IN-Neural2-A", "en-IN-Standard-A"] // Fallbacks
      ),

      // Telugu with fallback voices - START WITH STANDARD VOICES
      synthesize(
        teSsml,
        "te-IN",
        "te-IN-Chirp3-HD-Achernar",
        ["te-IN-Standard-A", "te-IN-Standard-C", "te-IN-Chirp3-HD-Achird"] // Fallbacks
      ),
    ]);

    // Extract results
    const result = {
      en: enAudio.status === "fulfilled" ? enAudio.value : null,
      te: teAudio.status === "fulfilled" ? teAudio.value : null,
    };

    // Log results
    if (result.en === null) console.warn("English audio generation failed");
    if (result.te === null) console.warn("Telugu audio generation failed");

    return result;
  } catch (err) {
    console.error("Unexpected error in generateAudioForTexts:", err.message);
    return { en: null, te: null };
  }
};
