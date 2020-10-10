const { exec } = require("child_process");
const fs = require("fs");

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