import fs from "node:fs";
import Snoowrap from "snoowrap";

import creds from "./private/credentials.json" assert { type: 'json' };;

const client = new Snoowrap(creds);
client.config({ continueAfterRatelimitError: false });

const actionLogPath = "./private/actionlog.txt";

export const CommentJob = class {
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

export const DeleteJob = class {
    constructor(filepath, expiryTime) {
        this.filepath = filepath;
        this.expiryTime = expiryTime;
    }
}

// prints onto console
export const log = (header, text, bracket = true) => {
    header = (header.length == 0) ? "" : (bracket) ? `[${header}] ` : `${header} `;
    console.log(`${header}${text}`);
}


// appends into action log
export const actionlog = (header, msg) => {
    let toWrite = `${getDateTime()} (${header}) ${msg}\n`;
    fs.appendFileSync(actionLogPath, toWrite);
}

export const listenComments = (parseComment) => {
    const subreddits = [
        "admiralbulldog",
        "dota2",
        "drunkmers",
        "testingground4bots"
    ];

    // inefficient since it goes through old comments
    // but doesn't result in ratelimit exceeding
    subreddits.forEach(async (subreddit) => {
        try {
            await client.getSubreddit(subreddit).getNewComments().then((comments) => {
                comments.forEach(parseComment);
            });
        } catch (e) {
            console.error(e.message);
            console.log("Error with reading comments");
        }
    });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const dtFormat = (dt) => ("0" + dt).slice(-2);

export const getDateTime = () => {
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