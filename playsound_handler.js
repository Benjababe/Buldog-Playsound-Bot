import { getDateTime } from "./etc.js";
import { exec } from "node:child_process";
import fs from "node:fs";
import cheerio from "cheerio";
import https from "https"
import fetch from "node-fetch";

const STREAMER_BULLDOG = "bulldog",
    STREAMER_LACARI = "lacari",
    STREAMER_CUSTOM = "custom";

const ffmpegPath = "./private/tools/ffmpeg",
    generatedPath = "./public/playsounds/generated/";

// downloads playsound for speed editing. regular playsounds can just be linked to its url
export const download = async (url, speed, dateTime) => {

    return new Promise((res) => {
        let filename = url.split("/").slice(-1)[0].trim();

        const file = fs.createWriteStream(generatedPath + filename);
        https.get(url, function (response) {
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

export const combine = (files, filename) => {

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

const setSpeed = (track, speed, dateTime) => {
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

export const newFileName = (track, dateTime, genPath = false) => {
    let trackSpl = track.split(".");
    let newTrack = `${trackSpl[0]}_ss_${dateTime}.ogg`;
    return ((genPath) ? __dirname + generatedPath.substring(1) : "") + newTrack;
}

//--------------PLAYSOUND FILE---------------

const playsoundPath = "./private/playsounds.json",
    customPSPath = "./public/playsounds/custom",
    changeLogPath = "./private/changelog.txt",
    webPagePath = "./public/web/custom_playsounds.html",
    hostURL = "https://Buldog-Playsound-Bot.benjababe.repl.co",
    customURL = hostURL + "/playsounds/custom/";


// removes any unused custom playsounds
export const cleanCustomPlaysounds = () => {
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
export const updatePajbotPlaysounds = async (streamer) => {
    const siteURL =
        (streamer == STREAMER_BULLDOG) ? "https://chatbot.admiralbulldog.live/playsounds" :
            (streamer == STREAMER_LACARI) ? "https://lacari.live/playsounds" : "";

    try {
        const response = await fetch(siteURL);
        const data = await response.text();
        const $ = cheerio.load(data);

        const tables = $("table").toArray();

        for (let i = 0; i < tables.length; i++) {
            handlePajbotTable(tables[i], streamer);
        }

        console.log(`${streamer} playsounds updated`);
    } catch (ex) {
        console.error(`Error while updating ${streamer}\n${ex}`);
    }
};

// parses playsound table from the sites
const handlePajbotTable = (table, streamer) => {
    const playsoundCol = (streamer === STREAMER_BULLDOG) ? 5 :
        (streamer === STREAMER_LACARI) ? 3 : 0;

    let soundData = fs.readFileSync(playsoundPath),
        sounds = JSON.parse(soundData);

    let $ = cheerio.load(table),
        rows = $("tbody > tr").toArray();

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let cells = cheerio.load(row)("td");
        let cellName = cells[0]["children"][0]["data"].trim().toLowerCase(),
            cellSound = cheerio
                .load(cells[playsoundCol])("[data-volume]")
                .attr("data-link")
                .trim();

        if (sounds[streamer][cellName] == undefined) {
            sounds[streamer][cellName] = { "url": cellSound };
            const psMsg = `${getDateTime()} (${streamer}) Added playsound ${cellName} into json file\n`;
            fs.appendFileSync(changeLogPath, psMsg);
        }
    }

    fs.writeFileSync(playsoundPath, JSON.stringify(sounds));
};


export const updateStreamElementsPlaysound = async (streamer) => {
    let streamerURL = `https://api.streamelements.com/kappa/v2/channels/${streamer}`;

    try {
        let response = await fetch(streamerURL);
        let data = await response.json();
        const streamerId = data["_id"];
        const storeURL = `https://api.streamelements.com/kappa/v2/store/${streamerId}/items`;

        response = await fetch(storeURL);
        data = await response.json();
        handleStreamElementsArray(streamer, data);
        console.log(`${streamer} playsounds updated`);
    } catch (ex) {
        console.error(`Error while updating ${streamer}\n${ex}`);
    }
}


const handleStreamElementsArray = (streamer, array) => {
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
            psMsg = `${getDateTime()} (${streamer}) ` +
                "Added playsound" + ` ${psName} into json file\n`;
            fs.appendFileSync(changeLogPath, psMsg);
        }
    });

    fs.writeFileSync(playsoundPath, JSON.stringify(sounds));
};


export const updateCustom = () => {
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
                    psMsg = `${getDateTime()} (custom) Added playsound ${psName} into json file\n`;
                    fs.appendFileSync(changeLogPath, psMsg);
                }
            });

            fs.writeFileSync(playsoundPath, JSON.stringify(sounds));
            console.log("Custom playsounds updated");
        }
    });
};


// clear all playsounds on custom webpage
const clearWebPage = () => {
    let lines = fs.readFileSync(webPagePath, 'utf-8').split("\n");

    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes("playsound-link"))
            lines.splice(i, 1);
    }

    fs.writeFileSync(webPagePath, lines.join("\n"));
}


// adds entry to custom webpage
const appendWebPage = (filename) => {
    let elem = `<a id="${filename}" class="playsound-link" href="${customURL}${filename}">${filename.split(".")[0]}</a><br>\n`;

    fs.appendFileSync(webPagePath, elem);
}