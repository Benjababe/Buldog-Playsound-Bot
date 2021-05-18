const etc = require("./etc"),
      express = require("express"),
      https = require("https"),
      path = require("path"),
      psHandler = require("./playsound_handler");

module.exports.init = () => {
    const app = express();
    const hostURL = "https://Buldog-Playsound-Bot.benjababe.repl.co";

    app.get("/", (req, res) => {
        let dateTime = etc.getDateTime();
        console.log(`${dateTime} Ping Received from ${req.ip}`);
        res.sendStatus(200);
        res.end();
    });

    app.get("/updateplaysound", (req, res) => {
        psHandler.updateCustom();
        psHandler.updatePlaysounds("buldog");
        psHandler.updatePlaysounds("lagari");

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

    app.use(express.static("public"));
    app.listen(3000);

    // pinging to keep the page up. not sure if it actually works
    setInterval(() => {
        https.get(hostURL + "/updateplaysound");
    }, 1800000); 
}