
import { getDateTime } from "./etc.js";
import * as psHandler from "./playsound_handler.js";
import express from "express";
import multer from "multer";
import path from "path";

const STREAMER_BULLDOG = "bulldog",
    STREAMER_LACARI = "lacari",
    STREAMER_DRUNKMERS = "drunkmers";


export const init = () => {
    const app = express();
    const hostURL = "https://Buldog-Playsound-Bot.benjababe.repl.co";

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, "./public/playsounds/uploads");
        },

        filename: function (req, file, cb) {
            cb(null, file.fieldname + path.extname(file.originalname));
        }
    });

    const audioFilter = (req, file, cb) => {
        if (!file.originalname.match(/\.(ogg|OGG|mp3|MP3)/)) {
            let err = "Only mp3 and ogg files are allowed";
            req.fileValidationError = err;
            return cb(new Error(err), false);
        }
        cb(null, true);
    }

    app.get("/", (req, res) => {
        let dateTime = getDateTime();
        console.log(`${dateTime} Ping Received from ${req.ip}`);
        res.sendStatus(200);
        res.end();
    });

    app.get("/updateplaysound", (req, res) => {
        psHandler.updatePajbotPlaysounds(STREAMER_BULLDOG);
        psHandler.updatePajbotPlaysounds(STREAMER_LACARI);
        psHandler.updateStreamElementsPlaysound(STREAMER_DRUNKMERS);
        psHandler.updateCustom();

        res.send("Updating playsounds...");
        res.end();
    });

    app.get("/custom", (req, res) => {
        res.sendFile(path.join(__dirname, "/public/web/custom_playsounds.html"), (err) => {
            if (err)
                res.status(err.status).end();
            else
                res.end();
        });
    });

    app.get("/upload", (req, res) => {
        res.sendFile(path.join(__dirname, "/public/web/upload_playsounds.html"), (err) => {
            if (err)
                res.status(err.status).end();
            else
                res.end();
        });
    });

    app.post("/uploadfiles", (req, res) => {
        let upload = multer({ storage: storage, fileFilter: audioFilter }).array("files", 10);

        upload(req, res, (err) => {
            if (req.fileValidationError)
                return res.send(req.fileValidationError);

            else if (!req.file)
                return res.send("No file uploaded");

            else if (err instanceof multer.MulterError)
                return res.send(err);

            else if (err)
                return res.send(err);

            res.send(`${req.files.length} files uploaded`);
        });
    });

    app.use(express.static("public"));
    app.listen(3000);

    // updates playsounds every 6 hours
    setInterval(() => {
        psHandler.updatePajbotPlaysounds(STREAMER_BULLDOG);
        psHandler.updatePajbotPlaysounds(STREAMER_LACARI);
        psHandler.updateStreamElementsPlaysound(STREAMER_DRUNKMERS);
        psHandler.updateCustom();
    }, 21600000);
}