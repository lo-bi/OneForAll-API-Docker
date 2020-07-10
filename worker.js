const throng = require('throng');
const Queue = require("bull");
const fs = require('fs');
const child = require('child_process')

const oneforallpath = process.env.ONEFORALLPATH;

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const workers = process.env.WEB_CONCURRENCY || 2;

function start() {
    let workQueue = new Queue('work', REDIS_URL);

    workQueue.process(function(job, done) {
        let dirName = '/tmp/'+Date.now()+'/';
        console.log(`starting job ${job.id} for domain ${job.data.domain}`)
        let cmd = child.exec(`python3 ${oneforallpath}oneforall.py --target ${job.data.domain} --format json --alive true --path ${dirName} run`)
        cmd.stderr.on('close', function() {
            fs.readdir(dirName, function (err, files) {
                if (err) {
                    done(null, { results: 'Unable to fetch result: ' + err });
                } 
                files.forEach(function (file) {
                    if (file.endsWith('.json')) {
                    let rawdata = fs.readFileSync(dirName + file);
                    let output = JSON.parse(rawdata);
                    console.log(`ending job ${job.id} for domain ${job.data.domain}`)
                    done(null, { results: output });
                    }
                });
            });
        })
    });
}

throng({ workers, start });