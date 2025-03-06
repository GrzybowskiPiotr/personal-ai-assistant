const axios = require("axios");
const fs = require("fs");
const path = require("path");
const tempFolder = "./temp/images/";
const cleanTemp = require("./cleanTemp");
module.exports = async function saveImageFromUrlToTemp(imageUrl, ctx) {
  //Does temp folder exsists.

  if (!fs.existsSync(tempFolder)) {
    console.log(
      "Tempolary folder for images does not exsists. Creating new one."
    );
    fs.mkdirSync(tempFolder, { recursive: true });
  }

  cleanTemp(tempFolder);

  const fileName = `image${Date.now()}.jpg`;
  const filePath = path.join(tempFolder, fileName);

  try {
    const streamDownload = await axios({
      method: "get",
      url: imageUrl,
      responseType: "stream",
    });
    const writer = fs.createWriteStream(filePath);
    streamDownload.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    return filePath;
  } catch (error) {
    console.error("Error while downloading and writing file to temp: " + error);
  }
};
