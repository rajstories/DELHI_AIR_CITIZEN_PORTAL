import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateAndPlayAudio = async (prompt: string) => {
  try {
    // Step 1: Generate the script text using a text model
    // The prompt contains instructions (e.g., "You are an assistant... Speak in Hindi...").
    // The TTS model cannot handle these instructions directly; it only reads text.
    // So we first use a text model to generate the actual words to be spoken.
    const textResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt + "\n\nIMPORTANT: Return ONLY the spoken text response. Do not include quotes, markdown, or stage directions. Just the words to speak.",
    });

    const scriptToSpeak = textResponse.text;
    
    if (!scriptToSpeak) {
       console.error("Text generation failed");
       throw new Error("Failed to generate audio script from text model.");
    }
    
    // console.log("Generated Script:", scriptToSpeak);

    // Step 2: Convert the generated text to speech using the TTS model
    const audioResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: scriptToSpeak }] }],
      config: {
        responseModalities: ['AUDIO' as any], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const candidate = audioResponse.candidates?.[0];
    const base64Audio = candidate?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      const textResponse = candidate?.content?.parts?.[0]?.text;
      if (textResponse) {
        console.error("Gemini TTS returned text instead of audio:", textResponse);
        throw new Error("Received text response from TTS model.");
      }
      throw new Error("No audio data received from API");
    }

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      ctx,
      24000,
      1
    );

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
    
    return new Promise<void>((resolve) => {
      source.onended = () => resolve();
    });

  } catch (error) {
    console.error("Audio generation failed", error);
    throw error;
  }
};