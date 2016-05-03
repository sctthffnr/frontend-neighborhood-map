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
    this.infoWindowOpen = false;
    this.marker = new google.maps.Marker({
      position: {lat: this.latitude, lng: this.longitude},
      title: this.title(),
      animation: google.maps.Animation.DROP
    });
    this.infoWindow = new google.maps.InfoWindow({
      content: ''
    });
  };

  // These functions retrieve data from Wikipedia
  mapLocation.prototype.getWikipedia = function() {
    var self = this;
    var url = self.createWikipediaAPIURL();
    $.ajax({
      url: url,
      dataType: 'jsonp',
      success: function(data) {
        self.wikipediaHTML = self.wikipediaSuccess(data);
      },
      error: function() {
        self.wikipediaHTML = 'Unable to retrieve information from Wikipedia';
      },
      complete: function() {
        var header = '<h2>Wikipedia Entry</h2>';
        var content = '<p>' + self.wikipediaHTML + '</p>';
        ViewModel.renderContent(header, content);
      }
    });
  };

  mapLocation.prototype.createWikipediaAPIURL = function() {
    var wikipedia_query = 'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=&explaintext=&titles=';
    var url = wikipedia_query + this.title();
    return url;
  };

  mapLocation.prototype.wikipediaSuccess = function(data) {
    var id = data.query.pages;
    var text = id[Object.keys(id)[0]].extract;
    if (!text) {
      text = 'No Wikipedia entry for ' + this.title();
    }
    return text;
  };

  // These functions retrieve data from Flickr
  mapLocation.prototype.getFlickr = function() {
    var self = this;
    var url = self.createFlickerAPIURL();
    $.ajax({
      url: url,
      dataType: 'json',
      success: function(data) {
        self.flickrHTML = self.flickrSuccess(data);
      },
      error: function() {
        self.flickrHTML = 'Unable to retrieve information from Flickr';
      },
      complete: function() {
        var header = '<h2>Pictures from Flickr</h2>';
        ViewModel.renderContent(header, self.flickrHTML);
      }
    });
  };

  mapLocation.prototype.createFlickerAPIURL = function() {
    var base_url = 'https://api.flickr.com/services/rest/?method=flickr.photos.search';
    var api_key = '816dfffa932b12dc03313acf79610d73';
    var query = this.title() + ' ' + this.city + ' ' + this.state;
    var url = base_url + '&text=' + query + '&api_key=' + api_key + '&per_page=10&format=json&nojsoncallback=1';
    return url;
  };

  mapLocation.prototype.flickrSuccess = function(data) {
    var html = '';
    data.photos.photo.forEach(function(photo) {
      var img = 'https://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '.jpg';
      var img_entry = '<img src="' + img + '">';
      html += img_entry;
    });
    return html;
  };

  //
  // ViewModel Definition
  //

  var ViewModel = {

    locations: [
      new mapLocation(42.5750, -71.9826, 'The Big Chair'),
      new mapLocation(42.5740603, -71.9958973, 'City Hall'),
      new mapLocation(42.5741523, -71.9944446, 'Blue Moon Diner'),
      new mapLocation(42.593884, -71.985331, 'Mount Wachusett Community College'),
      new mapLocation(42.580153, -71.971216, 'Dunn State Park')
    ],

    filter: ko.observable(''),

    initMap: function() {
      ViewModel.renderMap();
      ViewModel.renderMarkers();
      ViewModel.listClickHandler();
    },

    renderMap: function() {
      ViewModel.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
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

    listClickHandler: function() {
      $('.list-item').click(function() {
        $(this).toggleClass('list-item-active');
      });
    },

    // Renders content from 3rd party apis in the infoWindow
    renderContent: function(header, content) {
      var $infoWindow = $('.infoWindow');
      $infoWindow.append(header);
      $infoWindow.append(content);
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

    toggleInfoWindow: function() {
      if (this.infoWindow.content === '') {
        this.infoWindow.setContent('<div class="infoWindow" style="height: 250px;"></div>');
        ViewModel.getInfo(this);
      }
      if (this.infoWindowOpen) {
        ViewModel.closeInfoWindow(this);
      } else {
        ViewModel.openInfoWindow(this);
      }
    },

    openInfoWindow: function(location) {
      location.infoWindow.open(ViewModel.map, location.marker);
      location.marker.setAnimation(google.maps.Animation.BOUNCE);
      location.infoWindowOpen = true;
    },

    closeInfoWindow: function(location) {
      location.infoWindow.close();
      location.marker.setAnimation(null);
      location.infoWindowOpen = false;
    },

    // Wrapper function for specific api calls
    getInfo: function(location) {
      location.getWikipedia();
      location.getFlickr();
    }

  };

  ko.applyBindings(ViewModel);
  ViewModel.initMap();
}
