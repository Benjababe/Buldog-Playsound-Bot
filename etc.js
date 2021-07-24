const fs = require("fs"),
      creds = require("./private/credentials.json"),

      Snoowrap = require("snoowrap"),
      client = new Snoowrap(creds);

client.config({ continueAfterRatelimitError: false });
      
const actionLogPath = "./private/actionlog.txt";

module.exports.CommentJob = class {
    constructor(item, reply, soundURL, soundName, speed, streamer, sub) {
        this.item = item;
        this.reply = reply;
        this.soundURL = soundURL;
        this.speedURL = "";
        this.soundName = soundName;
        this.speed = speed;
        this.streamer = streamer;
        this.sub = sub;
    }
}

module.exports.DeleteJob = class {
    constructor(filepath, expiryTime) {
        this.filepath = filepath;
        this.expiryTime = expiryTime;
    }
}

// prints onto console
module.exports.log = (header, text, bracket = true) => {
    header = (header.length == 0) ? "" : (bracket) ? `[${header}] ` : `${header} `;
    console.log(`${header}${text}`);
}


// appends into action log
module.exports.actionlog = (header, msg) => {
    let toWrite = `${getDateTime()} (${header}) ${msg}\n`;
    fs.appendFileSync(actionLogPath, toWrite);
}

module.exports.listenComments = (parseComment) => {
    const subreddits = ["admiralbulldog",       "dota2", 
                        "drunkmers",            "lacari",
                        "testingground4bots"];

    // inefficient since it goes through old comments
    // but doesn't result in ratelimit exceeding
    subreddits.forEach(async (subreddit) => {
        try {
            await client.getSubreddit(subreddit).getNewComments().then((comments) => {
                comments.forEach(parseComment);
            });
        } catch (e) {
            console.log("Comment reading rate limit exceeded");
        }
    });
};

let sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let dtFormat = (dt) => ("0" + dt).slice(-2);

let getDateTime = () => {
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

    // changing 24 hour to 12 hour format
    hour = dtFormat(hour % 12);
    // eg. [25/10/2020 - 11:18:54 PM]
    return `[${date}/${month}/${year} - ${hour}:${min}:${sec} ${ampm}]`;
};

module.exports.getDateTime = getDateTime;