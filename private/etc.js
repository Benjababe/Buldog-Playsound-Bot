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

module.exports.DeleteJob = class {
  constructor(filepath, expiryTime) {
    this.filepath = filepath;
    this.expiryTime = expiryTime;
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

  module.exports.getDateTime = () => {
    let d = new Date();

    //setting to GMT+8
    d.setHours(d.getHours() + 8);
    let year = d.getFullYear(),
      month = dtFormat(d.getMonth() + 1),
      date = dtFormat(d.getDate()),
      hour = dtFormat(d.getHours()),
      min = dtFormat(d.getMinutes()),
      sec = dtFormat(d.getSeconds()),
      ampm = (hour >= 12) ? "PM" : "AM";

    //changing 24 hour to 12 hour format
    hour = dtFormat(hour % 12);
    //eg. [25/10/2020 - 11:18:54 PM]
    return `[${date}/${month}/${year} - ${hour}:${min}:${sec} ${ampm}]`;
  }

  let dtFormat = (dt) => ("0" + dt).slice(-2);
};