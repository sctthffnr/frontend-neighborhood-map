var mapLocation = function(lat, lng, title) {
  this.latitude = lat;
  this.longitude = lng;
  this.title = ko.observable(title);
  this.visible = true;
};

var ViewModel = {
  locations: [
    new mapLocation(42.5750, -71.9826, 'The Big Chair'),
    new mapLocation(42.5740603, -71.9958973, 'City Hall'),
    new mapLocation(42.5741523, -71.9944446, 'Blue Moon Diner')
  ]
};

var View = {
  renderMarkers: function() {
    ViewModel.locations.forEach(function(location) {
      location.marker.setMap(ViewModel.map);
    });
  }
};

function initMap() {
  ViewModel.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 13,
    center: {lat: 42.5751, lng: -71.9981}
  });

  ViewModel.locations.forEach(function(location) {
    location.marker = new google.maps.Marker({
      position: {lat: location.latitude, lng: location.longitude},
      title: location.title()
    });
  });

  View.renderMarkers();
}


ko.applyBindings(ViewModel);
