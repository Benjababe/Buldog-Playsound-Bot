const etc = require("./etc"),
    psHandler = require("./playsound_handler"),
    creds = require("./private/credentials.json");

const hostURL = "https://Buldog-Playsound-Bot.benjababe.repl.co",
    generatedURL = hostURL + "/playsounds/generated/",
    customURL = hostURL + "/playsounds/custom/",
    playsoundJSONPath = "./private/playsounds.json";

const fs = require("fs");

const STREAMER_BULLDOG = "bulldog",
    STREAMER_LACARI = "lacari",
    STREAMER_DRUNKMERS = "drunkmers",
    STREAMER_CUSTOM = "custom";

const sources = {
    "lc": STREAMER_LACARI,
    "lg": STREAMER_LACARI,
    "lacari": STREAMER_LACARI,
    "lagari": STREAMER_LACARI,
    "dm": STREAMER_DRUNKMERS,
    "fm": STREAMER_DRUNKMERS,
    "drunkmers": STREAMER_DRUNKMERS,
    "feetmers": STREAMER_DRUNKMERS,
    "cs": STREAMER_CUSTOM,
    "custom": STREAMER_CUSTOM
}

const tagsJSON = { "daym": "cmonBruh" };

class ReplyJob {
    constructor(item, url, comment, tags) {
        this.item = item;
        this.itemID = item.id;
        this.url = url;
        this.comment = comment;
        this.tags = tags;
    }
}

let replyQueue = [];

module.exports.parse = async (item, isPost = false) => {
    let psJobs = [],
        comment = ((isPost) ? item.title.trim() : item.body.trim()).split(/\s+/);

    // if comment doesn't have the playsound command
    // or if already replied to command
    if (!comment.includes("!playsound") || await checkCommented(item))
        return;

    // check if comment is already in replyQueue
    replyQueue.forEach((reply) => {
        if (reply.itemID == item.id)
            return;
    });

    // 1: find streamer name
    // 2: find playsound name
    // 3: find playsound speed
    let stage = 1,
        streamer = undefined,
        playsound = undefined,
        speed = 1,
        soundData = fs.readFileSync(playsoundJSONPath),
        sounds = JSON.parse(soundData);

    etc.log("Comment", `Processing: ${comment.join(" ")}`);

    // skips everything until playsound command is found
    while (comment[0] != "!playsound")
        comment.shift();
    // removes "!playsound"
    comment.shift();

    while (comment.length > 0 || (streamer != undefined && playsound != undefined && stage == 4)) {
        if (stage == 1) {
            //streamer defaults to buldog if it's none of the keys in sources json
            streamer = Object.keys(sources).includes(comment[0]) ? sources[comment.shift()] : STREAMER_BULLDOG;
            stage++;
        }

        else if (stage == 2) {
            playsound = comment.shift();

            // if playsound doesn't exist
            if (sounds[streamer][playsound] == undefined) {
                etc.log("Comment", `Playsound ${playsound} doesn't exist for ${streamer}`);
                return;
            }

            stage++;
        }

        else if (stage == 3) {
            if (isFloat(comment[0]))
                speed = parseFloat(comment.shift());
            stage++;
        }

        else if (stage == 4) {
            psJobs.push([streamer, playsound, speed]);

            // resets variables
            stage = speed = 1;
            streamer = playsound = undefined;
        }
    }

    if (streamer !== undefined && playsound !== undefined)
        psJobs.push([streamer, playsound, speed]);

    if (psJobs.length > 0) {
        generateReplyJob(item, sounds, psJobs);
    }
}


let generateReplyJob = async (item, sounds, ps) => {
    let url = "",
        dateTime = Date.now();

    if (ps.length == 1) {
        ps = ps[0];
        if (ps[0] == STREAMER_CUSTOM)
            url = customURL + ps[1] + ".ogg";
        else
            url = sounds[ps[0]][ps[1]]["url"];

        // directly comment with url if speed is 1
        if (ps[2] == 1) {
            pushReplyQueue(item, url, ps[1], tagsJSON[ps[1]]);
        }

        // download if custom speed is given
        else {
            await psHandler.download(url, ps[2], dateTime);

            let filename = url.split("/");
            filename = filename[filename.length - 1];
            filename = psHandler.newFilename(filename, dateTime, false);

            url = generatedURL + filename;
            pushReplyQueue(item, url, ps[1], tagsJSON[ps[1]]);
        }
    }

    // download playsounds if multiple and combine
    else {
        let files = [],
            names = [];

        while (ps.length > 0) {
            let tempPS = ps.shift();

            let url = (tempPS[0] != STREAMER_CUSTOM) ? sounds[tempPS[0]][tempPS[1]]["url"] :
                customURL + sounds[tempPS[0]][tempPS[1]]["filename"],
                filename = url.split("/");

            filename = filename[filename.length - 1];

            // waits for file to finish downloading
            await psHandler.download(url, tempPS[2], dateTime);

            // gets the downloaded filename and keeps it for later
            files.push(psHandler.newFilename(filename, dateTime, genPath = true));

            // same for the playsound name
            names.push(tempPS[1]);
        }
        combinePlaysounds(item, files, names);
    }
}


let combinePlaysounds = async (item, files, names) => {

    // combined filename of playsounds
    //let filename = getCombinedFilename(files);
    // using this for now, since filenames can be too long
    let filename = `xyz_ss_${Date.now()}.ogg`
    await psHandler.combine(files, filename);

    // generates reply and replies to playsound command
    let url = generatedURL + filename,
        comment = names.join(" "),
        tags = getTags(comment.split(" "));

    pushReplyQueue(item, url, comment, tags);
}


// returns combined filename of joint playsound
let getCombinedFilename = (files) => {
    let combinedFile = [];

    files.forEach((file) => {
        let f = file.split("/");
        f = f[f.length - 1].split("_ss_")[0];
        combinedFile.push(f);
    });

    return combinedFile.join("_") + "_ss_" + Date.now() + ".ogg";
}

// returns tags for the reply
let getTags = (sounds) => {
    let commentTags = [];

    Array.from(Object.keys(tagsJSON)).forEach((name) => {
        if (sounds.includes(name)) {
            commentTags.push(tagsJSON[name]);
        }
    });

    return commentTags.join(" ");
}


let pushReplyQueue = (item, url, comment, tags = "") => {
    let replyJob = new ReplyJob(item, url, comment, tags);
    replyQueue.push(replyJob);
    replyComment();
}


let replyComment = async () => {
    if (replyQueue.length == 0)
        return;

    let job = replyQueue.shift();
    try {
        // final comment check
        if (!await checkCommented(job.item)) {
            await job.item.reply(`${job.tags}[${job.comment}](${job.url})`);
            await job.item.upvote();

            etc.log("Comment", `Replied with "${job.tags}[${job.comment}](${job.url})"`);
            etc.actionlog("Comment", `Commented playsound(s) ${job.comment}`);
        }
    }

    catch (e) {
        replyQueue.unshift(job);

        console.error("Exception caught, probably comment rate limit");
        let delay = parseRateLimit(e.message);

        if (delay > 0)
            console.log("Delay is ", delay, "seconds");

        setTimeout(replyComment, delay * 1000);
    }
}


let parseRateLimit = (ex) => {
    let regex = /Take a break for [0-9.]{1,5} (minute[s]{0,1}|second[s]{0,1}){1} before trying again/gm;

    let found = ex.match(regex);

    // matching string found
    if (found.length == 1) {
        found = found[0];
        console.log(found);
        let time = found.replace(/[^\d-]/g, ''),
            denom = found.includes("second") ? 1 : 60;
        return time * denom;
    }

    else
        return -1;
};


let checkCommented = (item) => {
    let commented = false;
    return new Promise((res) => {
        item.expandReplies().then(c => {
            let replies = c.replies;
            // checks if bot has already commented.
            for (let i = 0; i < replies.length; i++) {
                let author = replies[i].author.name;
                if (author == creds["username"]) {
                    commented = true;
                    res(commented);
                }
            }
            // if hasn't commented, comments and returns false promise so program can continue
            res(commented);
        });
    });
};


let isFloat = (inputString) => {
    const parsed = parseFloat(inputString);

    //checks if length of input is same as output
    return !isNaN(parsed) && parsed.toString() === inputString;
}