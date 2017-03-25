var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var path = require('path');

var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
var TOKEN_DIR = './.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';
var calendar = google.calendar('v3');
var credentials;
var auth = new googleAuth();
var oauth2Client;
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    // Authorize a client with the loaded credentials
    credentials = JSON.parse(content);
    oauth2Client = new auth.OAuth2(credentials.installed.client_id, credentials.installed.client_secret, credentials.installed.redirect_uris[0]);
});

var token;

var appRouter = function(app) {
    app.get("/", function(req, res) {
        res.sendFile(path.join(__dirname + '/../index.html'));
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
                res.sendStatus(400);
                return;
            }
            oauth2Client.credentials = token;
            res.sendStatus(200);
        });
    });

    app.get("/events", function(req, res, next) {
        listEvents(function(err, cal) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return next(err);
            }
            return res.send(cal.items);
        });
    });

    function listEvents(callback) {
        return calendar.events.list({
            auth: oauth2Client,
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime'
        }, callback);
    }

    function createEvent(auth, title, start, end, resolveConflict, callback) {
        calendar.events.insert({
            auth: oauth2Client,
            calendarId: 'primary',
            description: title,
            start: {
                dateTime : start
            },
            end: {
                dateTime : end
            }
        }, function(err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return;
            }
            var events = response.items;
            if (events.length === 0) {
                console.log('No upcoming events found.');
            } else {
                console.log('Upcoming 10 events:');
                for (var i = 0; i < events.length; i++) {
                    var event = events[i];
                    var start = event.start.dateTime || event.start.date;
                    console.log('%s - %s', start, event.summary);
                }
            }
        });
    }
};

module.exports = appRouter;
