function newEvent() {
    var data = {};
    data.title = $('#event-name').val();
    data.start_date = $('#event-start').val();
    data.end_date = $('#event-end').val();
    data.resolve_conflict = $('#resolve-conflict')[0].checked;
    $.ajax({
            url: 'http://localhost:8887/events',
            method: 'post',
            data: data
        })
        .done(function(res) {
            console.log(res);
        })
        .error(function(err) {
            console.log(err);
        });
}

function displayEvents(data) {
    console.log(data);
}

function fetchEvents() {
    $.ajax({
            url: 'http://localhost:8887/events',
            method: 'get'
        })
        .done(function(res) {
            console.log(res);
        })
        .error(function(err) {
            console.log(err);
        });
}

function handleError(error) {
    console.log(error);
}
