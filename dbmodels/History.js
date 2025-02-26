const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  messages: [
    {
      role: { type: String, enum: ["user", "assistant"], required: true },
      content: { type: String, required: true },
    },
  ],
  timestamp: { type: Date, default: Date.now },
});

const History = mongoose.model("History", historySchema, "messages_history");

module.exports = History;
