const axios = require("axios");
const fs = require("fs");
const path = require("path");
const tempFolder = "./temp/images/";

module.exports = function saveImageFromUrlToTemp(url) {
  //Does temp folder exsists.

  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder, { recursive: true });
  }

  const AiGeneratedImage = axios({
    method: "GET",
    url: url,
    responseType: "stream",
  });

  console.log(AiGeneratedImage);

  //   const fileName = `image${Date.now}.jpg`;
  //   const pathToFile = path.join(tempFolder, fileName);

  //   const writert = fs.writeFileSync(pathToFile);
};
