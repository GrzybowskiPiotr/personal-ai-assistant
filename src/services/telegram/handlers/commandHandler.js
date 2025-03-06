const commandHandler = {
  handleStart: (ctx) => {
    ctx.reply("Witaj! Jestem botem GrzybAI.\n W jaki sposób mogę ci pomóc ?");
  },
  handleStop: (ctx) => {
    ctx.reply("Kończe działanie bota");
    ctx.telegram.leaveChat(ctx.message.chat.id);
  },
};
module.exports = commandHandler;
