const express = require('express')
const {spawn} = require('child_process');

const PORT = process.env.PORT || 3000

const app = express()
const http = require("http")
const WebSocket = require("ws")
const server = http.createServer(app);
const wss = new WebSocket.Server({server});
const fs = require('fs');
const dirName = '/tmp/'+Date.now()+'/';
const oneforallpath = process.env.ONEFORALLPATH;

function runScript(domain) {
    return spawn('python3', [oneforallpath+"oneforall.py", '--target', domain, '--format', 'json', '--alive', 'true', '--path', dirName, 'run']);
}

app.get('/', (req, res) => {
  res.send('OneForAll API is ready! 🚀')
})

app.get('/discover', function (req, res) {
    global.input_domain = req.query.domain
    if (input_domain == undefined || input_domain == '') {
      res.status(400).send('Missing domain query parameter')
      return
    }
    res.send(`<!doctype html>
  <html lang="en">
  <body onload="runWebsocket()">
  <pre id="outputWebsocket"></pre>
  
  <script>
    var outputWebsocket = document.getElementById("outputWebsocket")
    function runWebsocket() {
      outputWebsocket.innerText = ""
      openConnection(function (connection) {
        connection.send("run")
      })
    }
    function appendWSText(text) {
      outputWebsocket.innerText = text
    }
    var conn = {}
    function openConnection(cb) {
      // uses global 'conn' object
      if (conn.readyState === undefined || conn.readyState > 1) {
        conn = new WebSocket('ws://' + window.location.host + '/');
        conn.onopen = function () {
          if(typeof cb === "function"){
            cb(conn)
          }
        };
        conn.onmessage = function (event) {
          appendWSText(event.data)
        };
      } else if(typeof cb === "function"){
        cb(conn)
      }
    }
    if (window.WebSocket === undefined) {
      appendWSText("\\nSockets not supported")
    } else {
      openConnection();
    }
  </script>
  </body>
  </html>`)
  })
  
  function runScriptInWebsocket(id, ws) {
    const child = runScript(input_domain)
    child.stdout.on('data', (data) => {
        console.log(`${id}:${data}`);
      });
      child.stderr.on('data', (data) => {
        console.log(`${id}:error:${data}`);
      });
    child.stderr.on('close', () => {
        console.log(`${id}:done`);
      fs.readdir(dirName, function (err, files) {
        if (err) {
            ws.send(JSON.stringify({ status: 'failed' }));
            return console.log('Unable to fetch result: ' + err);
        } 
        files.forEach(function (file) {
            if (file.endsWith('.json')) {
            let rawdata = fs.readFileSync(dirName + file);
            let output = JSON.parse(rawdata);
            ws.send(JSON.stringify(output));
            return console.log(output);
            }
        });
        });
    });
  }
  
  let id = 1
  wss.on('connection', (ws) => {
    const thisId = id++;
    ws.on('message', (message) => {
      if ("run" === message) {
        ws.send(JSON.stringify({ status: 'running' }));
        runScriptInWebsocket(thisId, ws)
      }
    });
  });
  
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))