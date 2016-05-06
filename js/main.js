// The Google Map
var map;

// This will be populated when the Google maps library is available
var Model;
//
// Constructor for mapLocation object
//

var MapLocation = function(lat, lng, title) {
  "use strict";

  this.city = 'Gardner';
  this.state = 'Massachusetts';
  this.latitude = lat;
  this.longitude = lng;
  this.title = title;
  this.show = ko.observable(true);
  this.infoWindowActive = ko.observable(false);
  this.marker = new google.maps.Marker({
    position: {lat: this.latitude, lng: this.longitude},
    title: this.title,
    animation: google.maps.Animation.DROP
  });
};

//
// ViewModel Definition
//

function ViewModel() {
  "use strict";

  var self = this;

  // All map locations share the same info window.
  self.infoWindow = new google.maps.InfoWindow({
    content: '',
    maxWidth: window.innerWidth * 0.6
  });

  // This keeps track of the previously selected map location so that we can
  // stop animations for the location object's marker and toggle styling for
  // the list class
  self.currentLocation = null;

  // This holds the current value in the search filter
  self.filter = ko.observable('');

  // Renders the markers on the map
  self.renderMarkers = function() {
    Model.forEach(function(location) {
      if (location.show()) {
        location.marker.setMap(map);
      } else {
        location.marker.setMap(null);
      }
    });
  };

  // Adds a click handler to each marker to match the behavior for when a list
  // item gets clicked.
  self.setMarkerClickHandler = function() {
    Model.forEach(function(location) {
      location.marker.addListener('click', self.toggleInfoWindow.bind(location));
    });
  };

  // Renders content from 3rd party apis in the infoWindow
  self.renderContent = function(div, header, content) {
    var $infoWindow = $('.infoWindow');
    $infoWindow.append('<div class="' + div + '"></div>');
    var $apiDiv = $('.' + div);
    $apiDiv.append(header);
    $apiDiv.append(content);
  };

  // Compares the value from the input box to the location's title. If the title
  // does not match any part of the input, don't show it on the map or in the list
  self.filterLocations = function() {
    var input = new RegExp(self.filter(), 'i');
    Model.forEach(function(location) {
      if (location.title.match(input)) {
        location.show(true);
      } else {
        location.show(false);
      }
    });
    self.renderMarkers();
  };

  // This function toggles the Google Maps info window's visibility
  self.toggleInfoWindow = function() {

    // Attach a div to the info window so we can control where to put
    // the content later.
    function setupInfoWindow(location) {
      self.infoWindow.setContent('<div class="infoWindow" style="height: 250px;"></div>');
      getInfo(location);
      openInfoWindow(location);
    }

    // Sets the location as active, opens the info windows, and animates the marker.
    // It also adds a click hander to make sure that the list highlighting goes
    // away and the animation stops when the info window itself is closed
    function openInfoWindow(location) {
      location.infoWindowActive(true);
      self.infoWindow.open(map, location.marker);
      location.marker.setAnimation(google.maps.Animation.BOUNCE);
      self.infoWindow.addListener('closeclick', function () {
        location.infoWindowActive(false);
        closeInfoWindow(location);
      });
    }

    // Sets the location as inactive, closes the windows, stop the animation
    // of the marker and clears out the info window content for the next
    // location.
    function closeInfoWindow(location) {
      location.infoWindowActive(false);
      self.infoWindow.close();
      location.marker.setAnimation(null);
      self.infoWindow.setContent('');
    }

    // Wrapper function for specific api calls
    function getInfo(location) {
      self.getWikipedia(location);
      self.getFlickr(location);
    }

    // Toggling can occur under three scenarios:
    // 1. No location has ever been clicked.
    // 2. The location for the current info window has been clicked again, closing
    //    the info window and deselecting the location.
    // 3. A new location is clicked, deselecting any prevous items and opening an
    //   info window for the new item.
    if (self.currentLocation === null) {
      self.currentLocation = this;
      setupInfoWindow(this);
    } else if (self.currentLocation === self && this.infoWindowActive()) {
      closeInfoWindow(this);
    } else {
      self.currentLocation.infoWindowActive(false);
      self.currentLocation.marker.setAnimation(null);
      self.currentLocation = this;
      setupInfoWindow(this);
    }
  };

  // This function retrives information from the Wikipedia API
  self.getWikipedia = function(location) {

    var wikipediaHTML;
    var url = createWikipediaAPIURL(location);

    function createWikipediaAPIURL() {
      var wikipedia_query = 'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=&explaintext=&titles=';
      var url = wikipedia_query + location.title;
      return url;
    }

    // Returns the opening extract from the Wikipedia article
    function wikipediaSuccess(data) {
      var id = data.query.pages;
      var text = id[Object.keys(id)[0]].extract;
      if (!text) {
        text = 'No Wikipedia entry for ' + location.title;
      }
      return text;
    }

    $.ajax({
      url: url,
      dataType: 'jsonp',
      success: function(data) {
        wikipediaHTML = wikipediaSuccess(data);
      },
      error: function() {
        wikipediaHTML = 'Unable to retrieve information from Wikipedia';
      },
      complete: function() {
        var header = '<h2>Wikipedia Entry</h2>';
        var content = '<p>' + wikipediaHTML + '</p>';
        self.renderContent('wikipedia', header, content);
      }
    });
  };

  // This function retrives data from the Flickr api
  self.getFlickr = function(location) {

    function createFlickerAPIURL() {
      var base_url = 'https://api.flickr.com/services/rest/?method=flickr.photos.search';
      var api_key = '816dfffa932b12dc03313acf79610d73';
      var query = location.title + ' ' + location.city + ' ' + location.state;
      var url = base_url + '&text=' + query + '&api_key=' + api_key + '&per_page=10&format=json&nojsoncallback=1';
      return url;
    }

    function flickrSuccess(data) {
      var html = '';
      data.photos.photo.forEach(function(photo) {
        var img = 'https://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '.jpg';
        // Styling needs to be set in the html since stylesheets are not parsed when
        // the infoWindows are created
        var img_entry = '<img style="max-width: 100%;" src="' + img + '">';
        html += img_entry;
      });
      return html;
    }

    var flickrHTML;
    var url = createFlickerAPIURL();

    $.ajax({
      url: url,
      dataType: 'json',
      success: function(data) {
        flickrHTML = flickrSuccess(data);
      },
      error: function() {
        flickrHTML = 'Unable to retrieve information from Flickr';
      },
      complete: function() {
        var header = '<h2>Pictures from Flickr</h2>';
        self.renderContent('flickr', header, flickrHTML);
      }
    });
  };
}

function googleSuccess() {
  "use strict";

  map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      center: {lat: 42.5751, lng: -71.9981}
  });

  // Our fabulous locations
  Model = [
    new MapLocation(42.5750, -71.9826, 'The Big Chair'),
    new MapLocation(42.5740603, -71.9958973, 'City Hall'),
    new MapLocation(42.5741523, -71.9944446, 'Blue Moon Diner'),
    new MapLocation(42.593884, -71.985331, 'Mount Wachusett Community College'),
    new MapLocation(42.580153, -71.971216, 'Dunn State Park')
  ];

  var vm = new ViewModel();
  ko.applyBindings(vm);
  vm.renderMarkers();
  vm.setMarkerClickHandler();
}

function googleError() {
  "use strict";

  alert('Unable to load Google Map. Please try again later.');
}
