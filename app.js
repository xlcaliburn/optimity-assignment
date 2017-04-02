var express = require("express");
var bodyParser = require("body-parser");
var app = express();

app.use(bodyParser.json());
//app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

var routes = require("./routes/routes.js")(app);

var server = app.listen(8887, function () {
    console.log("Listening on port %s...", server.address().port);
});
