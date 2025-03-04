const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cleanTemp = require("./cleanTemp");

const tempDir = "./temp/audio";
const outputDir = "./temp/audio/converted_audio";

async function converted_audio(inputPath, outputDir, fileName, format) {
  return new Promise((resolve, reject) => {
    ffmpeg.setFfmpegPath(ffmpegStatic);
    const outputFileName = `${fileName}.${format}`;
    const outputPath = path.join(outputDir, outputFileName);
    const outStraem = fs.createWriteStream(outputPath);
    ffmpeg()
      .input(inputPath)
      .toFormat("mp3")
      .on("error", (error) => {
        console.log(`Encoding Error: ${error.message}`);
        reject(error);
      })
      .on("end", () => {
        console.log("Audio Transcoding succeeded !");
        resolve(outputPath);
      })
      .pipe(outStraem, { end: true });
  });
}
module.exports = async function voiceMessageFileConverter(fileLink, fileId) {
  try {
    // Create temp and output directories if they don't exist
    //dose temp folder exsists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    //dose output folder exsists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const TARGET_FORMAT = "mp3";

    //cleanUp temp folders;

    cleanTemp(tempDir);
    cleanTemp(outputDir);

    //File download

    const tempFilePath = path.join(tempDir, `${fileId}.oga`);

    const response = await axios({
      method: "GET",
      url: fileLink,
      responseType: "arraybuffer",
    });

    fs.writeFileSync(tempFilePath, Buffer.from(response.data));

    const convertedFilePath = await converted_audio(
      tempFilePath,
      outputDir,
      fileId,
      TARGET_FORMAT
    );
    return convertedFilePath;
  } catch (error) {
    console.log("Error in convertion process.." + error);
    throw error;
  }
};
