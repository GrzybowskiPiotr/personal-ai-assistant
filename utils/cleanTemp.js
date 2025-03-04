const fs = require("fs");
const path = require("path");
module.exports = function cleanTemp(dirForCleanUp) {
  fs.readdir(dirForCleanUp, (err, files) => {
    if (err) {
      console.error("Błąd odczytywania listy plików: " + err);
      return;
    }
    if (files.length > 0) {
      files.forEach((file) => {
        const filePath = path.join(dirForCleanUp, file);
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error("Błą sprawdzania pliku: ", err);
          }
          if (!stats.isDirectory()) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error("Błąd kasowania plików temp: ", err);
              }
            });
          }
        });
      });
    }
  });
};
