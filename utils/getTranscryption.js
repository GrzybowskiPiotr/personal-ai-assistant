const OpenAI = require("openai");
const openai = new OpenAI();
const fs = require("fs");
module.exports = async function getTranscryption(
  convertedFilePath,
  audioAiModel
) {
  let transcription;
  try {
    transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(convertedFilePath),
      model: audioAiModel,
    });
  } catch (error) {
    console.error("Błąd przy próbie transkrypcji pliku przez AI: " + error);
  }
  return transcription;
};
