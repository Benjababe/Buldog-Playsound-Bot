const { exec } = require("child_process");
const cheerio = require("cheerio");
const fs = require("fs");
const request = require("request");

const ffmpegDir = "./private/tools/ffmpeg";

module.exports.download = (url, speed, dateTime) => {
  let filename = url.split("/").slice(-1)[0].trim();

  const https = require('https');
  const fs = require('fs');

  const file = fs.createWriteStream(`./public/playsounds/${filename}`);
  https.get(url, function(response) {
    response.pipe(file);
    file.on("finish", () => {
      file.close();
      setSpeed(filename, speed, dateTime);
    });
  });
}

let setSpeed = (track, speed, dateTime) => {
  //boldly assume every playsound has playback rate of 44100Hz.
  //i would use ffprobe but it's troublesome
  let freq = 44100 * speed;
  let newTrack = newFileName(track, dateTime);

  exec(`${ffmpegDir} -i ./public/playsounds/${track} -filter:a 'asetrate=${freq}' -y ./public/playsounds/${newTrack}`, (err, stderr) => {
    if (err)  {
      console.log(err);
      process.exit(0);
    }
    else if (stderr)  console.log(stderr);
    else {
      //deletes downloaded file once frequency is changed
      fs.unlink(`./public/playsounds/${track}`, (err) => console.log);
    }
  });
}

let newFileName = (track, dateTime) => {
  let trackSpl = track.split(".");
  let newTrack = `${trackSpl[0]}_${dateTime}.${trackSpl[1]}`;
  return newTrack;
}

module.exports.newFilename = (url, dateTime) => {
  let fn = url.split("/").slice(-1)[0].trim();
  return newFileName(fn, dateTime);
}

//--------------PLAYSOUND FILE---------------

const playsoundPath = "./private/playsounds.json"

module.exports.updatePlaysounds = (streamer = "buldog") => {
  const siteURL = 
  (streamer == "buldog") ? "https://chatbot.admiralbulldog.live/playsounds":
  (streamer == "lagari") ? "https://lacari.live/playsounds" : "";

  console.log("Fetching playsounds...");
  request(siteURL, (err, res, body) => {
    if (!err && res.statusCode == 200) {
      let $ = cheerio.load(body);
      let tables = $("table");
      Array.from(tables).forEach((table) => {
        handlePlaysoundTable(table, streamer);
      });
    } else {
      console.error(err);
    }
  });
};

let handlePlaysoundTable = (table, streamer = "buldog") => {
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

    if (sounds[streamer][cellName] == undefined) 
      sounds[streamer][cellName] = { url: cellSound };
  });

  fs.writeFileSync(playsoundPath, JSON.stringify(sounds));
};