var express = require('express'),
    app     = express(),
    path    = require("path"),
    port    = process.env.PORT || 3020,
    api     = require("./routes/api"),
    status  = require("./routes/status"),
    sandbox  = require("./routes/allsandboxstatus");

app.use(express.static(__dirname + '/public'));
app.use(express.static(path.normalize(__dirname + '../../../../../../'))); // grab root dev-ops
app.use(express.static('/home/devops/'));
app.use(express.static('/home/devops/wem_files/helpers/'));
app.use(express.static('/home/devops/wem_files/'));

app.all('*', function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

// set up routes
app.get('/api/status/html',status.html_table);
app.get('/api/status',api.status);
app.get('/api/status/all',sandbox.status_all);

app.listen(port);

console.log('Server running on port ' + port);
