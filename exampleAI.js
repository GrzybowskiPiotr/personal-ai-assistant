const dotenv = require("dotenv").config();
const OpenAI = require("openai");

const openaiKey = process.env.OPENAI_API_KEY;

if (!openaiKey) {
  console.log("Brak OPENAI_API_KEY w pliku .env");
  process.exit(1);
} else {
  console.log("API_KEY zaczytany");
  console.log(`API_KEY: ${openaiKey.slice(0, 5)}...`);
}

const openai = new OpenAI({ apiKey: openaiKey });

const firstContact = async () => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Response language: Polish",
        },
        {
          role: "user",
          content: "Przedstaw i przywitaj się. ",
        },
      ],
    });

    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error("Błąd wyowłania OpenAI: ", error);
  }
};

firstContact();
