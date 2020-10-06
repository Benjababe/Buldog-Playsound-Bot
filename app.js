const { CommentStream } = require("snoostorm");
const Snoowrap = require("snoowrap");

const cheerio = require("cheerio");
const request = require("request");
const fs = require("fs");

const creds = require("./credentials.json");
const playsoundPath = "./playsounds.json";

const client = new Snoowrap(creds);

const playsoundRegex = /^!playsound [a-zA-Z0-9]+[ ]{0}$/gi;

let jobQueue = [],
  lastJob = -1,
  commentDelay = 120000;

let parseComment = item => {
  let soundData = fs.readFileSync(playsoundPath),
    sounds = JSON.parse(soundData);

  //checks if comment matches playsound format.
  if (item.body.trim().match(playsoundRegex)) {
    let soundName = item.body.split(" ")[1].toLowerCase();
    if (sounds[soundName] !== undefined) {
      let reply = `[${soundName}](${sounds[soundName]["url"]})`;
      //adds commenting job to the job queue
      jobQueue.push([item, reply, soundName]);
      console.log(`Added ${soundName} to job queue`);
    } else {
      console.log(`Playsound ${soundName} is not in the json file`);
    }
  }
};

const comments = new CommentStream(client, {
  subreddit: "admiralbulldog",
  limit: 25,
  pollTime: 5000,
  continueAfterRatelimitError: true
});

comments.on("item", parseComment);

let checkCommented = job => {
  let commented = false;
  return new Promise(res => {
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
    repl = job[0].reply(job[1]);

  //error with commenting. probably comment limit of 10 minutes
  repl
    .catch(err => {
      console.log(err.message);
      jobQueue.unshift(job);
      replied = false;
      //tries again 60 seconds later
      lastJob = Date.now() - commentDelay + 60000;
    })
    .finally(() => {
      if (replied) {
        console.log(`Commented and removed ${job[2]} from queue`);
        lastJob = Date.now();
      }
    });
};

let runJob = async () => {
  if (jobQueue.length > 0) {
    //2 minutes passed since last job
    if (Date.now() - lastJob > commentDelay) {
      let commented = await checkCommented(jobQueue[0]);
      //stop if checkCommented return false, indicating there isn't a prior comment and it has made a new comment
      //and if the job queue is empty
      if (!commented || jobQueue.length == 0) return;
      else {
        console.log(`Already commented with ${jobQueue[0][2]}, removing...`);
        jobQueue.shift();
        runJob();
      }
    }
  }
};

setInterval(runJob, 5000);

//-------------------------RETRIEVING PLAYSOUNDS-------------------------//

let updatePlaysounds = () => {
  const siteURL = "https://chatbot.admiralbulldog.live/playsounds";
  console.log("Fetching playsounds...");
  request(siteURL, (err, res, body) => {
    if (!err && res.statusCode == 200) {
      let $ = cheerio.load(body);
      let tables = $("table");
      Array.from(tables).forEach(handlePlaysoundTable);
    } else {
      console.error(err);
    }
  });
};

let handlePlaysoundTable = table => {
  let soundData = fs.readFileSync(playsoundPath),
    sounds = JSON.parse(soundData);
  let $ = cheerio.load(table);
  let rows = $("tbody > tr");
  Array.from(rows).forEach(row => {
    let cells = cheerio.load(row)("td");
    let cellName = cells[0]["children"][0]["data"].trim().toLowerCase(),
      cellSound = cheerio
        .load(cells[5])("[data-volume]")
        .attr("data-link")
        .trim();

    if (sounds[cellName] == undefined) sounds[cellName] = { url: cellSound };
  });
  fs.writeFileSync(playsoundPath, JSON.stringify(sounds));
};

setInterval(updatePlaysounds, 86400000);
//updatePlaysounds();

//-------------------------GLITCH WEBSTUFF-------------------------//

console.log("Allo playsound bot is up and running");

const http = require("http"),
  express = require("express"),
  app = express();
app.get("/", (req, res) => {
  console.log(`${Date.now()} Ping Received`);
  res.sendStatus(200);
});

app.listen(3000);

setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);