function init() {
  "use strict";

  // This is the constructor for a map location. The constructor includes
  // ajax calls to populate the infoWindow of the object's Google maps marker.
  var mapLocation = function(lat, lng, title) {
    var self = this;

    self.city = 'Gardner';
    self.state = 'Massachusetts';
    self.latitude = lat;
    self.longitude = lng;
    self.title = ko.observable(title);
    self.show = ko.observable(true);
    self.marker = new google.maps.Marker({
      position: {lat: this.latitude, lng: this.longitude},
      title: this.title()
    });
    self.infoWindow = new google.maps.InfoWindow({
      content: ''
    });

    self.getWikipedia = function() {
      var wikipedia_query = 'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=&explaintext=&titles=';
      $.ajax({
        url: wikipedia_query + self.title(),
        dataType: 'jsonp',
        success: function(data) {
          self.wikipediaCallback(data);
        }
      });
    }();

    self.wikipediaCallback = function(data) {
      var id = data.query.pages;
      var text = id[Object.keys(id)[0]].extract;
      if (!text) {
        text = 'No Wikipedia entry for ' + self.title();
      }
      self.formatWikipedia(text);
    };

    self.formatWikipedia = function(text) {
      var header = '<h2>Wikipedia Entry</h2>';
      text = '<p>' + text + '</p>';
      var html = header + text;
      self.updateInfoWindow(html);
    };

    self.getFlickr = function() {
      var url = 'https://api.flickr.com/services/rest/?method=flickr.photos.search';
      var api_key = '816dfffa932b12dc03313acf79610d73';
      var query = self.title() + ' ' + self.city + ' ' + self.state;
       $.ajax({
        url: url + '&text=' + query + '&api_key=' + api_key + '&per_page=10&format=json&nojsoncallback=1',
        dataType: 'json',
        success: function(data) {
          self.flickrCallback(data);
        }
      });
    }();

    self.flickrCallback = function(data) {
      self.updateInfoWindow('<h2>Pictures from Flickr</h2>');
      data.photos.photo.forEach(function(photo) {
        var img = 'https://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '.jpg';
        var html = '<img src="' + img + '">';
        self.updateInfoWindow(html);
      });
    };

    self.updateInfoWindow = function(data) {
      var updated = self.infoWindow.content + data;
      self.infoWindow = new google.maps.InfoWindow({
        content: updated
      });
      self.marker.addListener('click', function() {
        self.infoWindow.open(ViewModel.map, self.marker);
      });
    };
  };

  var ViewModel = {

    locations: [
      new mapLocation(42.5750, -71.9826, 'The Big Chair'),
      new mapLocation(42.5740603, -71.9958973, 'City Hall'),
      new mapLocation(42.5741523, -71.9944446, 'Blue Moon Diner')
    ],

    filter: ko.observable(''),

    renderMap: function() {
      ViewModel.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: {lat: 42.5751, lng: -71.9981}
      });
    },

    renderMarkers: function() {
      ViewModel.locations.forEach(function(location) {
        if (location.show()) {
          location.marker.setMap(ViewModel.map);
        } else {
          location.marker.setMap(null);
        }
      });
    },

    initMap: function() {
      ViewModel.renderMap();
      ViewModel.renderMarkers();
    },

    // Compare the value from the input box to the location's title. If the title
    // does not match any part of the input, don't show it on the map.
    filterLocations: function() {
      var input = new RegExp(ViewModel.filter(), 'i');
      ViewModel.locations.forEach(function(location) {
        if (location.title().match(input)) {
          location.show(true);
        } else {
          location.show(false);
        }
      });
      ViewModel.renderMarkers();
    }
  };

  ko.applyBindings(ViewModel);
  ViewModel.initMap();
}
