const express = require("express");
const app = express();
const PORT = process.env.PORT || 4000;
module.exports = function worker() {
  app.use(express.json());
  app.get("/", (req, res) => {
    res.send("Worker is running!");
  });

  // Uruchomienie serwera
  app.listen(PORT, () => {
    console.log(`Worker is listening on port ${PORT}`);
  });
};
