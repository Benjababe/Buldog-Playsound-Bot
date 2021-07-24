const etc = require("./etc"),
      web = require("./web"),
      cmHandler = require("./comment_handler"),
      psHandler = require("./playsound_handler"),
      fs = require("fs");

// global variable declaration

let deleteQueue = [],
    // 5 days in ms
    deleteDelay = 432000000;


// checks if comment includes playsound command
let parseComment = (item, sub = false) => {
    cmHandler.parse(item);
};


// parses any errors from snoowrap
let parseError = cmHandler.parseError;


let pushDeleteQueue = (filename, dateTime) => {

    // 5 days after generation
    let expiry = dateTime + deleteDelay,
        filepath = `./public/playsounds/generated/${filename}`;
        deleteJob = new etc.DeleteJob(filepath, expiry);
    deleteQueue.push(deleteJob);

    // sorts queue in increasing order by deletion time
    deleteQueue.sort((x, y) => {
        return x.expiryTime - y.expiryTime;
    });
};


let deleteJob = () => {
    if (deleteQueue.length > 0) {
        let job = deleteQueue[0];
        
        // while first item in queue has expired
        if (job.expiryTime < Date.now() && fs.existsSync(job.filepath)) {
            console.log(`Deleting ${job.filepath}...`);
            fs.unlink(job.filepath, (err) => console.error);
            deleteQueue.shift();

            // updating action log
            etc.actionlog("Delete", `Deleted playsound ${job.filepath}`);
        }
    }
}

let initDeleteJobs = () => {
    fs.readdir("./public/playsounds/generated", (err, files) => {
        if (err)
            return console.error("Error with initialising delete jobs");
            
        // only adds custom playsounds to delete queue
        files.forEach((file) => {
            if (file.includes("_ss_")) {
                let dateTime = parseInt(file.split("_ss_")[1].split(".")[0]),
                    delTime = ((deleteDelay + dateTime - Date.now())/3600000).toFixed(1);

                etc.log("isetup", `Added ${file} to delete queue`);
                etc.log("", `File will be deleted in ${delTime} hours`);
                pushDeleteQueue(file, dateTime);
            }
        });
    })
}


//------------------------INITIAL SETUP-------------------------//

// cleans up playsound json of unused custom playsounds
// TODO maybe do one for buldog and lagari
psHandler.cleanCustomPlaysounds();

// starts listening to reddit comments in specified subreddits
setInterval(() => {
    etc.listenComments(parseComment);
}, 30000);

// populates deleteQueue with any generated playsounds
initDeleteJobs();

// checks for any delete jobs in queue every 5 seconds
setInterval(deleteJob, 5000);


//-------------------------REPLIT STUFF-------------------------//

// sets up the url handlers
web.init();