const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Ustawienia middleware, jeśli są potrzebne
app.use(express.json());

// Przykładowa trasa
app.get("/", (req, res) => {
  res.send("Worker is running!");
});

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`Worker is listening on port ${PORT}`);
});
