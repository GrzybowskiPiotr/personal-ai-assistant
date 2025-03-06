module.exports = function validateIsFileImage(fileId) {
  const fileFormat = fileId.file_path.split(".").pop();

  if (!["jpg", "jpeg", "png"].includes(fileFormat)) {
    ctx.reply("Błędny format pliku. Umiem obsłurzyć tylko pliki JPG lub PNG");
    return false;
  }
  return true;
};
