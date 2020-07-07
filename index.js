const express = require('express')

const PORT = process.env.PORT || 3000

const app = express()
const http = require("http")
const server = http.createServer(app);

const Queue = require('bull');
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const workQueue = new Queue('work', REDIS_URL);

const regexDomain = /[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/

app.get('/', (req, res) => {
  res.send('OneForAll API is ready! 🚀')
})

app.get('/discover', async (req, res) => {
    let input_domain = req.query.domain
    if (input_domain == undefined || input_domain == '' || !input_domain.match(regexDomain)) {
      res.status(400).send('Missing domain query parameter or invalid domain')
      return
    }
  let job = await workQueue.add({ domain: input_domain });
  res.json({ id: job.id });
});

app.get('/discover/:id', async (req, res) => {
  let id = req.params.id;
  let job = await workQueue.getJob(id);
  let results = ""

  if (job === null) {
    res.status(404).end();
  } else {
    let state = await job.getState();
    if (state == "completed") { results = job.returnvalue.results; }
    let reason = job.failedReason;
    res.json({ id, state, reason, results });
  }
});
  
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))