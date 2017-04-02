window.onload = init;

function init() {
  fetchEvents();
}

function newEvent() {
  var data = {
    event_name: $('#event-name').val(),
    start_date: $('#event-start').val(),
    end_date: $('#event-end').val()
  };

  $.ajax({
    url: 'http://localhost:8887/events',
    method: 'post',
    data: data
  })
  .done(fetchEvents.bind(null))
  .error(handleError.bind(null, err));
}

function clearFields() {
  $('#event-name').val('');
  $('#event-start').val('');
  $('#event-end').val('');
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
