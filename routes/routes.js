var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var path = require('path');
var Moment = require('moment');
var MomentRange = require('moment-range');
var moment = MomentRange.extendMoment(Moment);

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
        res.sendFile(path.join(__dirname + '/../public'));
        if(req.query.code)
        {
            oauth2Client.getToken(req.query.code, function(err, token) {
                console.log("token received");
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
            // TODO: Get a GET call to userinfo to get info from the OAuth2 bearer token
            oauth2Client.credentials = token;
            res.sendStatus(200);
        });
    });

    app.get("/events", function(req, res, next) {
        listEvents(new Date(), null, function(err, response) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return res.sendStatus(400);
            }
            return res.send(response.items);
        });
    });

    app.post("/events", function(req, res) {
        createEvent("BRAND NEW EVENT", '2017-04-05T12:00:00-04:00', '2017-04-05T14:00:00-04:00', true, function(err, response) {
            if (err) {
                console.log(err);
                return res.status(err.code).json(err.message);
            }
            return res.send(response);
        });
    });

    // timeMin: lower bound for an event's end time
    // timeMax: upper bound for an event's start time
    function listEvents(timeMin, timeMax, callback) {
        var parameters = {
            auth: oauth2Client,
            calendarId: 'primary',
            singleEvents: true,
            orderBy: 'startTime',
            timeMin: timeMin ? timeMin.toISOString() : (new Date()).toISOString()
        };
        if (timeMax) { parameters.timeMax = timeMax.toISOString(); }
        return calendar.events.list(parameters, callback);
    }

    function createEvent(title, start, end, resolveConflict, callback) {
        if (resolveConflict) {
            // Get events where min end time > start
            var new_range = moment().range(start, end);
            listEvents(moment(start), moment(end).endOf('day'), function(err, response) {
                if (err) {
                    console.log(err);
                    return res.status(err.code).json(err.message);
                }
                if (response.items) {
                    var existing_events = [];
                    var temp_range;
                    for (var i = 0; i < response.items.length; i++)
                    {
                        temp_range = moment().range(response.items[i].start.dateTime, response.items[i].end.dateTime);
                        existing_events.push(temp_range);
                    }
                    var next_available_range = findNextAvailability(new_range, existing_events);
                    new_range.start = moment(next_available_range.start);
                    new_range.end = moment(next_available_range.end);

                    return calendar.events.insert({
                        auth: oauth2Client,
                        calendarId: 'primary',
                        resource: {
                            summary: title,
                            start: {
                              dateTime: moment(new_range.start).toISOString()
                            },
                            end: {
                              dateTime: moment(new_range.end).toISOString()
                            }
                        },
                    }, callback);                }
            });
        }
        else {
            return calendar.events.insert({
                auth: oauth2Client,
                calendarId: 'primary',
                resource: {
                    summary: title,
                    start: {
                      dateTime: start
                    },
                    end: {
                      dateTime: end
                    }
                },
            }, callback);
        }
    }

    // Find for the next searchValue availability in the searchRange minus the existingEvents
    // Assuming the existing Events are in sorted order
    function findNextAvailability(initialSearchRange, existingEvents)
    {
        var new_range = initialSearchRange;
        var next;
        for (var i = 0; i < existingEvents.length; i++)
        {
            next = nextRangeStart(new_range, existingEvents);
            if (next)
            {
                new_range = moment.range(next, moment(next).add(initialSearchRange.valueOf(), 'ms'));
            }
            else
            {
                return new_range;
            }
        }
        return new_range;
    }

    // Find if the submitted range overlaps with any of the existingEvents, and if yes,
    // return the end time of the event. Otherwise, return nothing
    function nextRangeStart(range, existingEvents)
    {
        for (var j = 0; j < existingEvents.length; j++)
        {
            if (range.overlaps(existingEvents[j]))
            {
                return moment(existingEvents[j].end);
            }
        }
        return null;
    }
};

module.exports = appRouter;
