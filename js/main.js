function init() {
  "use strict";

  //
  // Constructor for mapLocation object
  //

  var mapLocation = function(lat, lng, title) {

    this.city = 'Gardner';
    this.state = 'Massachusetts';
    this.latitude = lat;
    this.longitude = lng;
    this.title = ko.observable(title);
    this.show = ko.observable(true);
    this.infoWindowActive = ko.observable(false);
    this.marker = new google.maps.Marker({
      position: {lat: this.latitude, lng: this.longitude},
      title: this.title(),
      animation: google.maps.Animation.DROP
    });
  };


  //
  // ViewModel Definition
  //

  var ViewModel = {

    // Our fabulous locations
    locations: [
      new mapLocation(42.5750, -71.9826, 'The Big Chair'),
      new mapLocation(42.5740603, -71.9958973, 'City Hall'),
      new mapLocation(42.5741523, -71.9944446, 'Blue Moon Diner'),
      new mapLocation(42.593884, -71.985331, 'Mount Wachusett Community College'),
      new mapLocation(42.580153, -71.971216, 'Dunn State Park')
    ],

    // All map locations share the same info window.
    infoWindow: new google.maps.InfoWindow({
      content: '',
      maxWidth: window.innerWidth * 0.6
    }),

    // This keeps track of the previously selected map location so that we can
    // stop animations for the location object's marker and toggle styling for
    // the list class
    currentLocation: null,

    // This holds the current value in the search filter
    filter: ko.observable(''),


    initMap: function() {
      ViewModel.renderMap();
      ViewModel.renderMarkers();
    },

    renderMap: function() {
      ViewModel.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: {lat: 42.5751, lng: -71.9981}
      });
    },

    // Renders the markers on the map and adds a click handler to the markers
    // so they will open an infoWindow when clicked.
    renderMarkers: function() {
      ViewModel.locations.forEach(function(location) {
        if (location.show()) {
          location.marker.setMap(ViewModel.map);
        } else {
          location.marker.setMap(null);
        }
        location.marker.addListener('click', ViewModel.toggleInfoWindow.bind(location));
      });
    },

    // Renders content from 3rd party apis in the infoWindow
    renderContent: function(div, header, content) {
      var $infoWindow = $('.infoWindow');
      $infoWindow.append('<div class="' + div + '"></div>');
      var $apiDiv = $('.' + div);
      $apiDiv.append(header);
      $apiDiv.append(content);
    },

    // Compares the value from the input box to the location's title. If the title
    // does not match any part of the input, don't show it on the map or in the list
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

    // This function toggles the Google Maps info window's visibility
    toggleInfoWindow: function() {

      // Attach a div to the info window so we can control where to put
      // the content later.
      function setupInfoWindow(location) {
        ViewModel.infoWindow.setContent('<div class="infoWindow" style="height: 250px;"></div>');
        getInfo(location);
        openInfoWindow(location);
      }

      // Sets the location as active, opens the info windows, and animates the marker.
      // It also adds a click hander to make sure that the list highlighting goes
      // away and the animation stops when the info window itself is closed
      function openInfoWindow(location) {
        location.infoWindowActive(true);
        ViewModel.infoWindow.open(ViewModel.map, location.marker);
        location.marker.setAnimation(google.maps.Animation.BOUNCE);
        ViewModel.infoWindow.addListener('closeclick', function () {
          location.infoWindowActive(false);
          closeInfoWindow(location);
        });
      }

      // Sets the location as inactive, closes the windows, stop the animation
      // of the marker and clears out the info window content for the next
      // location.
      function closeInfoWindow(location) {
        location.infoWindowActive(false);
        ViewModel.infoWindow.close();
        location.marker.setAnimation(null);
        ViewModel.infoWindow.setContent('');
      }

      // Wrapper function for specific api calls
      function getInfo(location) {
        ViewModel.getWikipedia(location);
        ViewModel.getFlickr(location);
      }

      // Toggling can occur under three scenarios:
      // 1. No location has ever been clicked.
      // 2. The location for the current info window has been clicked again, closing
      //    the info window and deselecting the location.
      // 3. A new location is clicked, deselecting any prevous items and opening an
      //   info window for the new item.
      if (ViewModel.currentLocation === null) {
        ViewModel.currentLocation = this;
        setupInfoWindow(this);
      } else if (ViewModel.currentLocation === this && this.infoWindowActive()) {
        closeInfoWindow(this);
      } else {
        ViewModel.currentLocation.infoWindowActive(false);
        ViewModel.currentLocation.marker.setAnimation(null);
        ViewModel.currentLocation = this;
        setupInfoWindow(this);
      }
    },

    // This function retrives information from the Wikipedia API
    getWikipedia: function(location) {
      var wikipediaHTML;
      var url = createWikipediaAPIURL(location);

      function createWikipediaAPIURL() {
        var wikipedia_query = 'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=&explaintext=&titles=';
        var url = wikipedia_query + location.title();
        return url;
      }

      // Returns the opening extract from the Wikipedia article
      function wikipediaSuccess(data) {
        var id = data.query.pages;
        var text = id[Object.keys(id)[0]].extract;
        if (!text) {
          text = 'No Wikipedia entry for ' + location.title();
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
          ViewModel.renderContent('wikipedia', header, content);
        }
      });
    },

    // This function retrives data from the Flickr api
    getFlickr: function(location) {

      function createFlickerAPIURL() {
        var base_url = 'https://api.flickr.com/services/rest/?method=flickr.photos.search';
        var api_key = '816dfffa932b12dc03313acf79610d73';
        var query = location.title() + ' ' + location.city + ' ' + location.state;
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
          ViewModel.renderContent('flickr', header, flickrHTML);
        }
      });
    }
  };

  // Finally, here are the expressions for the init function (remember that way at
  // the top?). This applies the knockout bindings and initializes the Google map.

  ko.applyBindings(ViewModel);
  ViewModel.initMap();
}
