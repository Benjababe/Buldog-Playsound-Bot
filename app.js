const creds = require("./credentials.json");
const playsoundPath = "./playsounds.json";

const { CommentStream } = require("snoostorm");
const Snoowrap = require("snoowrap");
const client = new Snoowrap(creds);

const fs = require("fs");

const coomments = require("./coomments");
const psHandler = require("./playsound_handler");

const buldogSpeedRegex = /!playsound [a-zA-Z0-9]+ [0-9.]{1,3}/gi
const lagariSpeedRegex = /!playsound la[cg]ari [a-zA-Z0-9]+ [0-9.]{1,3}/gi;

const buldogPSRegex = /!playsound [a-zA-Z0-9]+[ ]{0}/gi;
const lagariPSRegex = /!playsound la[cg]ari [a-zA-Z0-9]+[ ]{0}/gi;

const hostURL = "http://Buldog-Playsound-Bot.benjababe.repl.co";

let jobQueue = [],
  lastJob = -1,
  //comment delay for 1 minute
  commentDelay = 60000;

let parseComment = (item) => {
  let soundData = fs.readFileSync(playsoundPath),
    sounds = JSON.parse(soundData),
    comment = item.body.trim(),
    speed = 1;


  //optimise this code maybe
  if (comment.match(buldogSpeedRegex)) {
    let splMatched = comment.match(buldogSpeedRegex).toString().split(" ");
    speed = parseFloat(splMatched[splMatched.length - 1]);
  }
  if (comment.match(lagariSpeedRegex)) {
    let splMatched = comment.match(lagariSpeedRegex).toString().split(" ");
    speed = parseFloat(splMatched[splMatched.length - 1]);
  }

  //sets value depending on which regex matches
  let streamer = (comment.match(lagariPSRegex)) ? "lagari" :
               (comment.match(buldogPSRegex)) ? "buldog" : undefined;

  if (streamer == undefined) return;

  //gets the regex approved format of whatever comment it was
  let matched = (streamer == "buldog") ? comment.match(buldogPSRegex) :
                                         comment.match(lagariPSRegex);

  let splitMatched = matched.toString().split(" "),
    //grabs last part; the playsound name
    soundName = splitMatched[splitMatched.length - 1].toLowerCase(),
    soundInfo = sounds[streamer][soundName];

  if (soundInfo !== undefined) {
    let reply = `[${soundName}](${soundInfo["url"]})`;
    //adds commenting job to queue
    let job = new coomments.CommentJob(item, reply, soundInfo["url"], soundName, speed, streamer);
    jobQueue.push(job);
    console.log(`[${streamer}] Added ${soundName} to job queue`);
  } else {
    console.log(`[${streamer}] Playsound ${soundName} is not in ${streamer} playsound`);
  }
};

coomments.listenComments(client, parseComment);

let checkCommented = (job) => {
  let commented = false;
  return new Promise((res) => {
    job.item.expandReplies().then(c => {
      let replies = c.replies;
      //checks if bot has already commented.
      for (let i = 0; i < replies.length; i++) {
        let reply = replies[i],
          author = reply.author.name;
        if (author == "BuldogPlaysoundBot") {
          commented = true;
          res(commented);
        }
      }
      //if hasn't commented, comments and returns promise so program can continue
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

  //sound is within (0,inf), \{1}
  //intercepts reply process, changing regular url with new speed changed url.
  if (((job.speed > 0) && (job.speed < 1)) || (job.speed > 1)) {
    let dateTime = Date.now(),
      newFilename = psHandler.newFilename(job.soundURL, dateTime);
    psHandler.download(job.soundURL, job.speed, dateTime);
    job.speedURL = hostURL + `/playsounds/${newFilename}`;
    job.reply = job.reply.replace(job.soundURL, job.speedURL);
  }

  let item = job.item,
    snooReply = item.reply(job.reply);

  //error with commenting. probably comment limit of 10 minutes
  snooReply
    .catch((err) => {
      console.log(err.message);
      jobQueue.unshift(job);
      replied = false;
      //tries again 15 seconds later
      lastJob = Date.now() - commentDelay + 15000;
    })
    .finally(() => {
      if (replied == true) {
        console.log(`[${job.streamer}] Successfully commented and removed ${job.soundName} from queue`);
        lastJob = Date.now();
      }
    });
};

let runJob = async () => {
  if (jobQueue.length > 0) {
    //checks time between now and last comment
    if (Date.now() - lastJob > commentDelay) {
      let commented = await checkCommented(jobQueue[0]);
      //stop if checkCommented return false, indicating there isn't a prior comment and it has made a new comment
      //and if the job queue is empty
      if (!commented || jobQueue.length == 0) return;
      else {
        let doneJob = jobQueue.shift();
        console.log(`[${doneJob.streamer}] Already commented with ${doneJob.soundName}, removing...`);
        runJob();
      }
    }
  }
};

setInterval(runJob, 5000);

//-------------------------PINGING STUFF-------------------------//

const http = require("http"),
  express = require("express"),
  app = express();

app.get("/", (req, res) => {
  let dateTime = getDateTime();
  console.log(`${dateTime} Ping Received from ${req.ip}`);
  res.sendStatus(200);
});

app.use(express.static("public"));

app.listen(3000);

setInterval(() => {
  http.get(hostURL);
}, 240000); 

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

  //changing 24 hour to 12 hour format
  hour = dtFormat(hour % 12);
  //eg. [25/10/2020 - 11:18:54 PM]
  return `[${date}/${month}/${year} - ${hour}:${min}:${sec} ${ampm}]`;
}

let dtFormat = (dt) => ("0" + dt).slice(-2);