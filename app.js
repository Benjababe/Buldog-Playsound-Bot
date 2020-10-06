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