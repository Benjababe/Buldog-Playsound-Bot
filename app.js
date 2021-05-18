const etc = require("./etc"),
      web = require("./web"),
      cmParser = require("./comment_parser"),
      psHandler = require("./playsound_handler"),
      creds = require("./private/credentials.json"),
      fs = require("fs");

const Snoowrap = require("snoowrap"),
      client = new Snoowrap(creds);

const playsoundJSONPath = "./private/playsounds.json";


const buldogSpeedRegex = /!playsound [a-zA-Z0-9_-]+ [0-9.]{1,4}/gi
const lagariSpeedRegex = /!playsound la[cg]ari [a-zA-Z0-9_-]+ [0-9.]{1,4}/gi;
const customSpeedRegex = /!playsound (cs|custom) [a-zA-Z0-9_-]+ [0-9.]{1,4}/gi;

const buldogPSRegex = /!playsound [a-zA-Z0-9_-]+[ ]{0}/gi;
const lagariPSRegex = /!playsound la[cg]ari [a-zA-Z0-9_-]+[ ]{0}/gi;
const customPSRegex = /!playsound (cs|custom) [a-zA-Z0-9_-]+[ ]{0}/gi;

// global variable declaration

const hostURL = "https://Buldog-Playsound-Bot.benjababe.repl.co";
const generatedURL = hostURL + "/playsounds/generated/";
const customURL = hostURL + "/playsounds/custom/";
const actionLogPath = "./private/actionlog.txt";

const nsfw = ["daym"]

let jobQueue = [],
    lastJob = -1,
    // comment delay for 10 seconds
    commentDelay = 10000,
    // queue of generated playsounds to delete
    deleteQueue = [],
    // 5 days in ms
    deleteDelay = 432000000,
    lastPSUpdate = -1;

// checks if comment includes playsound command
let parseComment = (item, sub = false) => {
    let soundData = fs.readFileSync(playsoundJSONPath),
    sounds = JSON.parse(soundData),
    speed = 1,
    comment = (sub) ? item.title.trim() : item.body.trim();

    // optimise this code
    // code below extracts the output speed of playsound from command
    if (comment.match(buldogSpeedRegex)) {
    let splMatched = comment.match(buldogSpeedRegex).toString().split(" ");
    speed = parseFloat(splMatched[splMatched.length - 1]);
    }
    if (comment.match(lagariSpeedRegex)) {
    let splMatched = comment.match(lagariSpeedRegex).toString().split(" ");
    speed = parseFloat(splMatched[splMatched.length - 1]);
    }
    if (comment.match(customSpeedRegex)) {
    let splMatched = comment.match(customSpeedRegex).toString().split(" ");
    speed = parseFloat(splMatched[splMatched.length - 1]);
    }

    // honestly idk the audio sample limit for mp3 or ogg
    // only putting these by trial and error
    // 0.2 because any lower than that it becomes inelligible, 4 is ogg/mp3 format limit
    if (speed < 0.2) speed = 0.2;
    if (speed > 4) speed = 4;
    
    // sets value depending on which regex matches
    let streamer = (comment.match(lagariPSRegex)) ? "lagari" : 
                (comment.match(customPSRegex)) ? "custom" : 
                (comment.match(buldogPSRegex)) ? "buldog" : undefined;

    // returns if command doesn't match any streamers
    if (streamer == undefined) return;

    // gets the regex approved format of whatever comment it was
    let matched = (streamer == "buldog") ? comment.match(buldogPSRegex) : 
                (streamer == "custom") ? comment.match(customPSRegex) :               (streamer == "lagari") ? comment.match(lagariPSRegex) : undefined;

    let splitMatched = matched.toString().split(" "),
    // grabs last part; the playsound name
    soundName = splitMatched[splitMatched.length - 1].toLowerCase(),
    soundInfo = sounds[streamer][soundName];

    if (soundInfo !== undefined) {
        // make custom json compatible with regular ones
        if (streamer == "custom")
            soundInfo["url"] = customURL + soundInfo["filename"];

        // if playsound contains possible bannable words
        let reply = `[${(nsfw.includes(soundName) ? "[Trigger Warning] " : "")}${soundName}](${soundInfo["url"]}) ${(streamer == "custom") ? `\n***\n^(List of my own custom playsounds can be found) ^[here](${hostURL}/custom)` : ""}`;

        // adds commenting job to queue
        let job = new etc.CommentJob(item, reply, soundInfo["url"], soundName, speed, streamer, sub);
        jobQueue.push(job);
        etc.log(streamer, `Added ${soundName} to job queue` + ((speed != 1) ? `(x${speed} speed)` : ""));
    } 

    else 
        etc.log(streamer, `Playsound ${soundName} is not in ${streamer} playsound`);
};

let checkCommented = (job) => {
    let commented = false;
    return new Promise((res) => {
        job.item.expandReplies().then(c => {
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
            if (!commented) {
                comment(job);
                res(commented);
            }
        });
    });
};

let comment = () => {
    let replied = true,
        job = jobQueue.shift();

    // sound is in range (0,inf), \{1}
    // intercepts reply process, changing regular url with new speed changed url.
    if (((job.speed > 0) && (job.speed < 1)) || (job.speed > 1)) {
        let dateTime = Date.now(),
            newFilename = psHandler.newFilename(job.soundURL, dateTime);
        psHandler.download(job.soundURL, job.speed, dateTime);
        job.speedURL = generatedURL + newFilename;
        job.reply = job.reply.replace(job.soundURL, job.speedURL);
        // adds file to delete queue for deletion after a week
        pushDeleteQueue(newFilename, dateTime);
    }

    let item = job.item,
        snooReply = item.reply(job.reply);

    // error with commenting. probably comment limit of 10 minutes
    snooReply
    .catch((err) => {
        console.error(err.message);
        // adds job back to queue
        jobQueue.unshift(job);
        replied = false;
        // tries again 5 seconds later
        lastJob = Date.now() - commentDelay + 5000;
    })
    .finally(() => {
        if (replied == true) {
            etc.log(job.streamer, `Successfully commented and removed ${job.soundName} from queue`);
            lastJob = Date.now();
        }
    });
};

let runJob = async () => {
    if (jobQueue.length > 0) {
    // checks time between now and last comment
        if (Date.now() - lastJob > commentDelay) {
            let commented = await checkCommented(jobQueue[0]);
            // stop if checkCommented return false, indicating there isn't a prior comment and it has made a new comment
            // and if the job queue is empty
            if (!commented || jobQueue.length == 0) return;
            else {
                let doneJob = jobQueue.shift();
                etc.log(`${etc.getDateTime()} (${doneJob.streamer})`, `Already commented with ${doneJob.soundName}, removing from job queue...`, bracket = false);

                // updating action log
                let postMsg = `${etc.getDateTime()} (Post) Posted playsound ${doneJob.soundName}\n`;
                fs.appendFileSync(actionLogPath, postMsg);

                runJob();
            }
        }
    }
};

let pushDeleteQueue = (filename, dateTime) => {
    // 5 days after generation
    let expiry = dateTime + deleteDelay,
        filepath = `./public/playsounds/generated/${filename}`;
        deleteJob = new etc.DeleteJob(filepath, expiry);
    deleteQueue.push(deleteJob);
    // sorts queue in increasing order by deletion time
    deleteQueue.sort((x, y) => {
    return x.expiryTime - y.expiryTime;
    });
};

let deleteJob = () => {
    if (deleteQueue.length > 0) {
        let job = deleteQueue[0];
    // while first item in queue has expired
        if (job.expiryTime < Date.now()) {
            console.log(`Deleting ${job.filepath}...`);
            fs.unlink(job.filepath, (err) => console.error);
            deleteQueue.shift();

            // updating action log
            let delMsg = `${etc.getDateTime()} (Delete) Deleted playsound ${job.filepath}\n`;
            fs.appendFileSync(actionLogPath, delMsg);
        }
    }
}

let initDeleteJobs = () => {
    fs.readdir("./public/playsounds/generated", (err, files) => {
    if (err)
        return console.error("Error with initialising delete jobs");
    // only adds custom playsounds to delete queue
    files.forEach((file) => {
        if (file.includes("_ss_")) {
            let dateTime = parseInt(file.split("_ss_")[1].split(".")[0]);
            etc.log("isetup", `Added ${file} to delete queue`);
            pushDeleteQueue(file, dateTime);
        }
    });
    })
}

//------------------------INITIAL SETUP-------------------------//

etc.listenComments(client, parseComment);
initDeleteJobs();
// checks for any jobs in queue every 5 seconds
setInterval(runJob, 5000);
// checks for any delete jobs in queue every 30 seconds
setInterval(deleteJob, 30000);


//-------------------------REPLIT STUFF-------------------------//

web.init();