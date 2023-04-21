const etc = require("./etc"),
    { exec } = require("child_process"),
    cheerio = require("cheerio"),
    fs = require("fs"),
    https = require("https"),
    request = require("request");

const STREAMER_BULLDOG = "bulldog",
    STREAMER_LACARI = "lacari",
    STREAMER_CUSTOM = "custom";

const ffmpegPath = "./private/tools/ffmpeg",
    generatedPath = "./public/playsounds/generated/";

// downloads playsound for speed editing. regular playsounds can just be linked to its url
module.exports.download = async (url, speed, dateTime) => {

    return new Promise((res) => {
        let filename = url.split("/").slice(-1)[0].trim();

        const file = fs.createWriteStream(generatedPath + filename);
        https.get(url, function(response) {
            response.pipe(file);
            file.on("finish", async () => {
                file.close();
                await setSpeed(filename, speed, dateTime);
                res(true);
            });
        });
    });

}

// combines playsounds in generated folder into one then delete the individual files

// all playsounds need to be in ogg and encoded with opus codec since that's what buldog playsounds use by default.

module.exports.combine = (files, filename) => {

    return new Promise((res) => {

        // edge case
        if (files.length == 0)
            res(false);

        let outPath = generatedPath + filename;

        exec(`${ffmpegPath} -i "concat:${files.join("|")}" ${outPath}`, (err, stderr) => {
            if (err) {
                console.error(err);
            }
            else if (stderr) console.error;
            else {
                // when playsounds are concat, delete them all
                files.forEach((file) => {
                    fs.unlink(file, err => console.error);
                });
            }
            res(true);
        });
    });
}

let setSpeed = (track, speed, dateTime) => {
    return new Promise((res) => {

        // boldly assume every playsound has playback rate of 48KHz.
        // i would use ffprobe but it's troublesome
        let freq = 48000 * speed;
        let newTrack = newFileName(track, dateTime);

        // be sure to use libopus as codec
        exec(`${ffmpegPath} -i ${generatedPath + track} -c:a libopus -filter:a 'asetrate=${freq}' -y ${generatedPath + newTrack}`, (err, stderr) => {
            if (err) {
                console.log(err);
            }
            else if (stderr) console.log(stderr);
            else {
                // deletes downloaded file once frequency is changed
                fs.unlink(generatedPath + track, (err) => console.log);
            }
            res(true);
        });
    });
}

let newFileName = (track, dateTime, genPath = false) => {
    let trackSpl = track.split(".");
    let newTrack = `${trackSpl[0]}_ss_${dateTime}.ogg`;
    return ((genPath) ? __dirname + generatedPath.substring(1) : "") + newTrack;
}

// returns generated filename by datetime
module.exports.newFilename = newFileName;

//--------------PLAYSOUND FILE---------------

const playsoundPath = "./private/playsounds.json",
    customPSPath = "./public/playsounds/custom",
    changeLogPath = "./private/changelog.txt",
    webPagePath = "./public/web/custom_playsounds.html",
    hostURL = "https://Buldog-Playsound-Bot.benjababe.repl.co",
    customURL = hostURL + "/playsounds/custom/";


// removes any unused custom playsounds
module.exports.cleanCustomPlaysounds = () => {
    let soundData = fs.readFileSync(playsoundPath),
        sounds = JSON.parse(soundData);

    fs.readdir(customPSPath, (err, files) => {
        if (err)
            console.error(err);
        else {
            let changes = false,
                keys = Array.from(Object.keys(sounds[STREAMER_CUSTOM]));

            keys.forEach((key) => {
                // if playsound exists in json but the file doesn't
                // remove playsound from json
                if (!files.includes(key + ".ogg")) {
                    changes = true;
                    delete sounds[STREAMER_CUSTOM][key];
                }
            });

            // only rewrite the json file if changes were made
            if (changes)
                fs.writeFileSync(playsoundPath, JSON.stringify(sounds));
        }
    });
}

// update playsounds for buldog/lagari/self
module.exports.updatePajbotPlaysounds = (streamer) => {
    const siteURL =
        (streamer == STREAMER_BULLDOG) ? "https://chatbot.admiralbulldog.live/playsounds" :
            (streamer == STREAMER_LACARI) ? "https://lacari.live/playsounds" : "";

    request(siteURL, (err, res, body) => {
        if (!err && res.statusCode == 200 && body) {
            try {
                let $ = cheerio.load(body.toString());
                let tables = $("table");
                Array.from(tables).forEach((table) => {
                    handlePajbotTable(table, streamer);
                });
                console.log(`${streamer} playsounds updated`);
            } catch (ex) {
                console.log(`Error while updating ${streamer} using ${siteURL}\n${ex}`);
            }
        }

        else
            console.error(err);
    });
};

// parses playsound table from the sites
let handlePajbotTable = (table, streamer) => {
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
            sounds[streamer][cellName] = { "url": cellSound };
            psMsg = `${etc.getDateTime()} (${streamer}) ` +
                "Added playsound" + ` ${cellName} into json file\n`;
            fs.appendFileSync(changeLogPath, psMsg);
        }
    });

    fs.writeFileSync(playsoundPath, JSON.stringify(sounds));
};


module.exports.updateStreamElementsPlaysound = (streamer) => {
    let streamerURL = `https://api.streamelements.com/kappa/v2/channels/${streamer}`;

    request(streamerURL, (err, res, body) => {
        if (err && res.statusCode != 200)
            return;

        let json = JSON.parse(body),
            streamerID = json["_id"],
            storeURL = `https://api.streamelements.com/kappa/v2/store/${streamerID}/items`;

        request(storeURL, (err, res, body) => {
            if (err && res.statusCode != 200)
                return;

            let data = JSON.parse(body);
            handleStreamElementsArray(streamer, data);
            console.log(`${streamer} playsounds updated`);
        });

    });
}


let handleStreamElementsArray = (streamer, array) => {
    let soundData = fs.readFileSync(playsoundPath),
        sounds = JSON.parse(soundData);

    array.forEach((item) => {
        let psName = item["name"].trim().toLowerCase(),
            psURL = item["alert"]["audio"]["src"];

        while (psName.includes(" ")) {
            psName = psName.replace(" ", "_");
        }

        if (sounds[streamer][psName] == undefined) {
            sounds[streamer][psName] = { "url": psURL };
            psMsg = `${etc.getDateTime()} (${streamer}) ` +
                "Added playsound" + ` ${psName} into json file\n`;
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

            clearWebPage();

            files.forEach((filename) => {
                let psName = filename.split(".")[0];
                appendWebPage(filename);

                if (sounds[STREAMER_CUSTOM][psName] == undefined) {
                    sounds[STREAMER_CUSTOM][psName] = { "filename": filename };
                    psMsg = `${etc.getDateTime()} (custom) Added playsound ${psName} into json file\n`;
                    fs.appendFileSync(changeLogPath, psMsg);
                }
            });

            fs.writeFileSync(playsoundPath, JSON.stringify(sounds));
            console.log("Custom playsounds updated");
        }
    });
};


// clear all playsounds on custom webpage
let clearWebPage = () => {
    let lines = fs.readFileSync(webPagePath, 'utf-8').split("\n");

    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes("playsound-link"))
            lines.splice(i, 1);
    }

    fs.writeFileSync(webPagePath, lines.join("\n"));
}


// adds entry to custom webpage
let appendWebPage = (filename) => {
    let elem = `<a id="${filename}" class="playsound-link" href="${customURL}${filename}">${filename.split(".")[0]}</a><br>\n`;

    fs.appendFileSync(webPagePath, elem);
}