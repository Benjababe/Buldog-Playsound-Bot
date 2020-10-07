const cheerio = require("cheerio");
const fs = require("fs");
const request = require("request");

const playsoundPath = "./playsounds.json"

let updatePlaysounds = (streamer = "buldog") => {
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

updatePlaysounds("buldog");
updatePlaysounds("lagari");