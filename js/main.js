function init() {
  "use strict";

  // Constructor for mapLocation object
  var mapLocation = function(lat, lng, title) {

    this.city = 'Gardner';
    this.state = 'Massachusetts';
    this.latitude = lat;
    this.longitude = lng;
    this.title = ko.observable(title);
    this.show = ko.observable(true);
    this.infoWindowOpen = false;
    this.marker = new google.maps.Marker({
      position: {lat: this.latitude, lng: this.longitude},
      title: this.title(),
      animation: google.maps.Animation.DROP
    });
    this.infoWindow = new google.maps.InfoWindow({
      position: {lat: 42.5751, lng: -71.9981},
      content: ''
    });
  };

  // Prototype definitions for mapLocation class
  mapLocation.prototype.getWikipedia = function() {
    var wikipedia_query = 'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=&explaintext=&titles=';
    var self = this;
    $.ajax({
      url: wikipedia_query + self.title(),
      dataType: 'jsonp',
      success: function(data) {
        self.wikipediaCallback(data);
      }
    });
  };

  mapLocation.prototype.wikipediaCallback = function(data) {
    var id = data.query.pages;
    var text = id[Object.keys(id)[0]].extract;
    if (!text) {
      text = 'No Wikipedia entry for ' + this.title();
    }
    this.formatWikipedia(text);
  };

  mapLocation.prototype.formatWikipedia = function(text) {
    var header = '<h2>Wikipedia Entry</h2>';
    text = '<p>' + text + '</p>';
    var html = header + text;
    this.updateInfoWindow(html);
  };

  mapLocation.prototype.getFlickr = function() {
    var self = this;
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
  };

  mapLocation.prototype.flickrCallback = function(data) {
    var self = this;
    self.updateInfoWindow('<h2>Pictures from Flickr</h2>');
    data.photos.photo.forEach(function(photo) {
      var img = 'https://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '.jpg';
      var html = '<img src="' + img + '">';
      self.updateInfoWindow(html);
    });
  };

  mapLocation.prototype.toggleInfoWindow = function() {
    if (this.infoWindow.content === '') {
      this.getInfo();
    }
    if (this.infoWindowOpen) {
      this.closeInfoWindow();
    } else {
      this.openInfoWindow();
    }
  };

  mapLocation.prototype.getInfo = function() {
    this.getWikipedia();
    this.getFlickr();
  };

  mapLocation.prototype.closeInfoWindow = function() {
    this.infoWindow.close();
    this.marker.setAnimation(null);
    this.infoWindowOpen = false;
  };

  mapLocation.prototype.openInfoWindow = function() {
    this.infoWindow.open(ViewModel.map, this.marker);
    this.marker.setAnimation(google.maps.Animation.BOUNCE);
    this.infoWindowOpen = true;
  };

  mapLocation.prototype.updateInfoWindow = function(data) {
    var updated = this.infoWindow.content + data;
    this.infoWindow.setContent(updated);
  };

  var ViewModel = {

    locations: [
      new mapLocation(42.5750, -71.9826, 'The Big Chair'),
      new mapLocation(42.5740603, -71.9958973, 'City Hall'),
      new mapLocation(42.5741523, -71.9944446, 'Blue Moon Diner')
    ],

    filter: ko.observable(''),

    initMap: function() {
      ViewModel.renderMap();
      ViewModel.renderMarkers();
    },

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
        location.marker.addListener('click', location.toggleInfoWindow.bind(location));
      });
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
    },
  };

  ko.applyBindings(ViewModel);
  ViewModel.initMap();
}
