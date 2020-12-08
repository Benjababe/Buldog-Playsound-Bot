const etc = require("./private/etc");
const { exec } = require("child_process");
const cheerio = require("cheerio");
const fs = require("fs");
const request = require("request");

const ffmpegPath = "./private/tools/ffmpeg";
const generatedPath = "./public/playsounds/generated/";

//downloads playsound for speed editing. regular playsounds can just be linked to its url
module.exports.download = (url, speed, dateTime) => {
  let filename = url.split("/").slice(-1)[0].trim();

  const https = require('https');
  const fs = require('fs');

  const file = fs.createWriteStream(generatedPath + filename);
  https.get(url, function(response) {
    response.pipe(file);
    file.on("finish", () => {
      file.close();
      setSpeed(filename, speed, dateTime);
    });
  });
}

let setSpeed = (track, speed, dateTime) => {
  //boldly assume every playsound has playback rate of 48KHz.
  //i would use ffprobe but it's troublesome
  let freq = 48000 * speed;
  let newTrack = newFileName(track, dateTime);

  exec(`${ffmpegPath} -i ${generatedPath + track} -filter:a 'asetrate=${freq}' -y ${generatedPath + newTrack}`, (err, stderr) => {
    if (err)  {
      console.log(err);
      process.exit(0);
    }
    else if (stderr)  console.log(stderr);
    else {
      //deletes downloaded file once frequency is changed
      fs.unlink(generatedPath + track, (err) => console.log);
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

const playsoundPath = "./private/playsounds.json",
      customPSPath = "./public/playsounds/custom/",
      changeLogPath = "./private/changelog.txt";

//TODO MAKE A FUNCTION TO CLEAN UP UNUSED PLAYSOUNDS IN JSON FILE

module.exports.updatePlaysounds = async (streamer = "buldog") => {
  const siteURL = 
  (streamer == "buldog") ? "https://chatbot.admiralbulldog.live/playsounds":
  (streamer == "lagari") ? "https://lacari.live/playsounds" : "";

  console.log(`Fetching ${streamer} playsounds...`);
  
  request(siteURL, (err, res, body) => {
    if (!err && res.statusCode == 200) {
      let $ = cheerio.load(body);
      let tables = $("table");
      Array.from(tables).forEach((table) => {
        handlePlaysoundTable(table, streamer);
      });
      console.log(`${streamer} playsounds updated`);
    } else {
      console.error(err);
    }
  });
};

let handlePlaysoundTable = (table, streamer = "buldog") => {
  let soundData = fs.readFileSync(playsoundPath),
      sounds = JSON.parse(soundData);

  let $ = cheerio.load(table),
      rows = $("tbody > tr");

  Array.from(rows).forEach(row => {
    let cells = cheerio.load(row)("td");
    let cellName = cells[0]["children"][0]["data"].trim().toLowerCase(),
      cellSound = cheerio
        .load(cells[5])("[data-volume]")
        .attr("data-link")
        .trim();

    if (sounds[streamer][cellName] == undefined) {
      sounds[streamer][cellName] = { url: cellSound };
      psMsg = `${etc.getDateTime()} (${streamer}) ` + 
              "Added playsound" +` ${cellName} into json file\n`;
      fs.appendFileSync(changeLogPath, psMsg);
    }
  });

  fs.writeFileSync(playsoundPath, JSON.stringify(sounds));
};

module.exports.updateCustom = () => {
  fs.readdir(customPSPath, (err, files) => {
    if (err)
      console.error(err);
    else {
      let soundData = fs.readFileSync(playsoundPath),
          sounds = JSON.parse(soundData);
      files.forEach((filename) => {
        let psName = filename.split(".")[0];
        if (sounds["custom"][psName] == undefined) {
          sounds["custom"][psName] = { "filename": filename };
          psMsg = `${etc.getDateTime()} (Custom) Added playsound ${psName} into json file\n`;
          fs.appendFileSync(changeLogPath, psMsg);
        }
      });
      fs.writeFileSync(playsoundPath, JSON.stringify(sounds));
      console.log("Custom playsounds updated");
    }
  });
};