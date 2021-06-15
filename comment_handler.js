const etc = require("./etc"),
      psHandler = require("./playsound_handler"),
      creds = require("./private/credentials.json");

const hostURL = "https://Buldog-Playsound-Bot.benjababe.repl.co",
      generatedURL = hostURL + "/playsounds/generated/",
      customURL = hostURL + "/playsounds/custom/",
      playsoundJSONPath = "./private/playsounds.json";

const fs = require("fs");

const sources = {
    "lacari": "lagari",
    "lagari": "lagari",
    "cs":     "custom",
    "custom": "custom"
}

const tags = { "daym": "cmonBruh" };

module.exports.parse = async (item, isPost = false) => {
    let psJobs = [],
        comment = ((isPost) ? item.title.trim() : item.body.trim()).split(" ");

    // 1: find streamer name
    // 2: find playsound name
    // 3: find playsound speed
    let stage = 1,
        streamer = undefined,
        playsound = undefined,
        speed = 1,
        soundData = fs.readFileSync(playsoundJSONPath),
        sounds = JSON.parse(soundData);

    // if comment doesn't have the playsound command
    // or if already replied to command
    let commented = await checkCommented(item);
    if (!comment.includes("!playsound") || commented)
        return;

    while (comment[0] != "!playsound")
        comment.shift();
    comment.shift();

    while (comment.length > 0 || 
           (streamer != undefined && playsound != undefined && stage == 4)) {
        if (stage == 1) {
            //streamer defaults to buldog
            streamer = Object.keys(sources).includes(comment[0]) ? sources[comment.shift()] : "buldog";
            stage++;
        }

        else if (stage == 2) {
            playsound = comment.shift();

            // if playsound doesn't exist
            if (sounds[streamer][playsound] == undefined) {
                playsound = undefined
                break;
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
        
    processPlaysoundJobs(item, sounds, psJobs);
}

// item = comment item
// sounds = sound json
// ps = [ streamer, playsound name, playsound speed ]
let processPlaysoundJobs = async (item, sounds, ps) => {
    let url = "",
        dateTime = Date.now();

    if (ps.length == 1) {
        ps = ps[0];

        if (ps[0] == "custom")
            url = customURL + ps[1];
        else
            url = sounds[ps[0]][ps[1]]["url"];

        // directly comment with url if speed is 1
        if (ps[2] == 1)
            replyComment(item, url, comment = ps[1]);

        // download if custom speed is given
        else {
            await psHandler.download(url, ps[2], dateTime);

            let filename = url.split("/");
            filename = filename[filename.length-1];
            filename = psHandler.newFilename(filename, dateTime, false);

            url = generatedURL + filename;
            replyComment(item, url, ps[1]);
        }
    }

    // download playsounds if multiple and combine
    else {
        let files = [],
            names = [];

        while (ps.length > 0) {
            let tempPS = ps.shift();

            let url = (tempPS[0] != "custom") ? sounds[tempPS[0]][tempPS[1]]["url"]:
                      customURL + sounds[tempPS[0]][tempPS[1]]["filename"],
                filename = url.split("/");

            filename = filename[filename.length - 1];

            // waits for file to finish downloading
            await psHandler.download(url, tempPS[2], dateTime);

            // gets the downloaded filename and keeps it for later
            files.push(psHandler.newFilename(filename, dateTime, true));
            names.push(tempPS[1]);
        }
        
        combinePlaysounds(item, files, names);
    }
}


let combinePlaysounds = async (item, files, names) => {

    // combined filename of playsounds
    let filename = getCombinedFilename(files);
    await psHandler.combine(files, filename);

    // generates reply and replies to playsound command
    let reply = names.join(" "),
        tags = getTags(reply.split(" ")),
        url = generatedURL + filename;

    replyComment(item, url, comment = reply, tags = tags);
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

    Array.from(Object.keys(tags)).forEach((name) => {
        if (sounds.includes(name)) {
            commentTags.push(tags[name]);
        }
    });

    return commentTags.join(" ");
}


let replyComment = (item, url, comment = "", tags = "") => {
    if (comment == "")
        comment = "Your order";

    if (tags != "")
        tags = `[${tags}] `;

    item.reply(`[${tags}${comment}](${url})`);

    etc.log("Comment", `Replied with "[${tags}${comment}](${url})"`);
    etc.actionlog("Comment", `Commented playsound(s) ${comment}`);
}

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