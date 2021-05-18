const etc = require("./etc");

const hostURL = "https://Buldog-Playsound-Bot.benjababe.repl.co";
const generatedURL = hostURL + "/playsounds/generated/";
const customURL = hostURL + "/playsounds/custom/";
const playsoundJSONPath = "./private/playsounds.json";

const sources = {
    "lacari": "lacari",
    "lagari": "lacari",
    "cs":     "custom",
    "custom": "custom"
}

const nsfw = ["daym"];


module.exports.parse = (item, comment, soundData) => {
    let ps = [],
        cmd = "!playsound ",
        speed = 1,
        sounds = JSON.parse(soundData);

    if (comment.indexOf(cmd) != -1) {
        comment = comment.substring(i + cmd.length).trim();
        // streamer defaults to buldog
        let streamer = "buldog",
            spl = comment.split(""),
            soundName = spl.shift().toLowerCase();

        // if playing sound from non-buldog source
        if (souces[s] != undefined) {
            streamer = sources[s];
            //soundName is now the playsound name
            soundName = spl.shift().toLowerCase();
        }

        // if a speed flag is given
        if (isFloat(spl[0]))
            speed = parseFloat(spl.shift());
        
        // 0.2 because any lower than that it becomes inelligible, 4 is ogg/mp3 format limit
        if (speed < 0.2) speed = 0.2;
        if (speed > 4) speed = 4;

        soundInfo = sounds[streamer][soundName];
    }
}

let isFloat = (inputString) => {
    const parsed = parseFloat(inputString);

    // checks if length of input is same as output
    return !isNaN(parsed) && parsed.toString() === inputString;
}