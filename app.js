const { CommentStream } = require("snoostorm");
const Snoowrap = require("snoowrap");

const fs = require("fs");

const creds = require("./credentials.json");
const playsoundPath = "./playsounds.json";

const client = new Snoowrap(creds);

const buldogPSRegex = /^!playsound [a-zA-Z0-9]+[ ]{0}/gi;
const lagariPSRegex = /^!playsound la[cg]ari [a-zA-Z0-9]+[ ]{0}/gi;

let jobQueue = [],
  lastJob = -1,
  //comment delay for 1 minute
  commentDelay = 60000;

let parseComment = (item) => {
  let soundData = fs.readFileSync(playsoundPath),
    sounds = JSON.parse(soundData),
    comment = item.body.trim(),
    //sets value depending on which regex matches
    streamer = (comment.match(buldogPSRegex)) ? "buldog" :
               (comment.match(lagariPSRegex)) ? "lagari" : undefined;

  if (streamer == undefined) return;

  //gets the regex approved format of whatever comment it was
  comment = (streamer == "buldog") ? comment.match(buldogPSRegex) :
                                     comment.match(lagariPSRegex);

  let splitComment = comment.toString().split(" "),
    //grabs last part; the playsound name
    soundName = splitComment[splitComment.length - 1].toLowerCase(),
    soundInfo = sounds[streamer][soundName];

  if (soundInfo !== undefined) {
    let reply = `[${soundName}](${soundInfo["url"]})`;
    //adds commenting job to queue
    jobQueue.push([item, reply, soundName, streamer]);
    console.log(`[${streamer}] Added ${soundName} to job queue`);
  } else {
    console.log(`[${streamer}] Playsound ${soundName} is not in ${streamer} playsound`);
  }
};

const comments = new CommentStream(client, {
  subreddit: "admiralbulldog",
  limit: 50,
  pollTime: 5000,
  continueAfterRatelimitError: true
});

comments.on("item", parseComment);

let checkCommented = job => {
  let commented = false;
  return new Promise((res) => {
    job[0].expandReplies().then(c => {
      let replies = c.replies;
      for (let i = 0; i < replies.length; i++) {
        let reply = replies[i],
          author = reply.author.name;
        if (author == "BuldogPlaysoundBot") {
          commented = true;
          res(commented);
        }
      }
      if (!commented) {
        comment(job);
        res(commented);
      }
    });
  });
};

let comment = () => {
  let replied = true,
    job = jobQueue.shift(),
    snooReply = job[0].reply(job[1]);

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
      if (replied) {
        console.log(`[${job[3]}] Successfully commented and removed ${job[2]} from queue`);
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
        console.log(`[${doneJob[3]}] Already commented with ${doneJob[2]}, removing...`);
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

app.listen(3000);

setInterval(() => {
  http.get(`http://Buldog-Playsound-Bot.benjababe.repl.co`);
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

  hour %= 12;
  return `[${date}/${month}/${year} - ${hour}:${min}:${sec} ${ampm}]`;
}

let dtFormat = (dt) => ("0" + dt).slice(-2);