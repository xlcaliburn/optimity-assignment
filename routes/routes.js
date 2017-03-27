var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var path = require('path');
var moment = require('moment');

var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var calendar = google.calendar('v3');
var credentials;
var auth = new googleAuth();
var oauth2Client;
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    // Authorize a client with the loaded credentials
    credentials = JSON.parse(content);
    oauth2Client = new auth.OAuth2(credentials.web.client_id, credentials.web.client_secret, credentials.web.redirect_uris[0]);
});

var token;

var appRouter = function(app) {
    app.get("/", function(req, res) {
        res.sendFile(path.join(__dirname + '/../index.html'));
        if(req.query.code)
        {
            oauth2Client.getToken(req.query.code, function(err, token) {
                oauth2Client.credentials = token;
            });
        }
    });

    // Endpoint to get google authentication url
    app.get("/credentials", function(req, res) {
        // Load client secrets from a local file.
        res.send({url : oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES
            })
        });
    });

    // Store oauth token on server
    app.post("/credentials", function(req, res) {
        console.log("Code received: " +  req.body.code);
        oauth2Client.getToken(req.body.code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return res.sendStatus(400);

            }
            oauth2Client.credentials = token;
            res.sendStatus(200);
        });
    });

    app.get("/events", function(req, res, next) {
        listEvents(null, null, function(err, response) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return res.sendStatus(400);
            }
            return res.send(response.items);
        });
    });

    app.post("/events", function(req, res) {
        createEvent("asdf", '2017-03-29T12:00:00-04:00', '2017-03-29T14:00:00-04:00', function() {}, function(err, response) {
            if (err) {
                console.log(err);
                return res.status(err.code).json(err.message);
            }
            return res.send(response);
        });
    });

    function listEvents(timeMin, timeMax, callback) {
        var parameters = {
            auth: oauth2Client,
            calendarId: 'primary',
            singleEvents: true,
            orderBy: 'startTime'
        };
        parameters.timeMin = timeMin ? timeMin : (new Date()).toISOString();
        if (timeMax) { parameters.timeMax = timeMax; }
        return calendar.events.list(parameters, callback);
    }

    function createEvent(title, new_start, new_end, resolveConflict, callback) {
        // Dates should be moment js
        var new_range = moment.range(new_start, new_end);
        if (callback)
        {
            // Get events where min end time > new_start
            listEvents(new_start, null, function(err, response) {
                if (err) {
                    console.log('Error while trying to retrieve access token', err);
                    return res.sendStatus(400);
                }
                return res.send(response.items);
            });
        }
        return calendar.events.insert({
            auth: oauth2Client,
            calendarId: 'primary',
            resource: {
                summary: title,
                start: {
                  dateTime: startTime
                },
                end: {
                  dateTime: endTime
                }
            },
        }, callback);
    }

    function isConflict(start, end) {
        // Moment.js should be used here for date
        listEvents(moment(end).subtract(1, 'second'), moment(start), function (err, response) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return res.sendStatus(400);
            }
            return response.items !== [];
        });
    }
};

module.exports = appRouter;
