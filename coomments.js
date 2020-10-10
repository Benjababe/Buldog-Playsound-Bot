const { CommentStream } = require("snoostorm");

module.exports.CommentJob = class {
  constructor(item, reply, soundURL, soundName, speed, streamer) {
    this.item = item;
    this.reply = reply;
    this.soundURL = soundURL;
    this.speedURL = "";
    this.soundName = soundName;
    this.speed = speed;
    this.streamer = streamer;
  }
}

module.exports.listenComments = (client, parseComment) => {
  const subreddits = ["admiralbulldog", "dota2", "testingground4bots"];
  subreddits.forEach((subreddit) => {
    let cStream = new CommentStream(client, {
      subreddit: subreddit,
      limit: 50,
      pollTime: 5000,
      continueAfterRatelimitError: true
    });
    cStream.on("item", parseComment);
  });
};