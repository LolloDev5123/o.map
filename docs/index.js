"use strict";

let step = 0.001;
let current_lng;
let current_lat;
let current_alt;
let altitude;
let current_heading;

//to store device loaction
let device_lat;
let device_lng;

let zoom_level;
let current_zoom_level;
let new_lat = 0;
let new_lng = 0;
let curPos = 0;
let myMarker = "";
let windowOpen;
let message_body = "";
let tabIndex = 0;
let debug = false;

let tilesLayer;
let tileLayer;
let tilesUrl;
let savesearch = false;

let search_current_lng;
let search_current_lat;

let open_url = false;
let marker_latlng = false;

let json_modified = false;

let markers_group = new L.FeatureGroup();

let save_mode; // to check save geojson or update json

let caching_time = 86400000;
let zoom_depth = 4;

let settings_data = settings.load_settings();
let setting = {
  export_path: localStorage.getItem("export-path"),
  owm_key: localStorage.getItem("owm-key"),
  cache_time: localStorage.getItem("cache-time"),
  cache_zoom: localStorage.getItem("cache-zoom"),
  last_location: JSON.parse(localStorage.getItem("last_location")),
  openweather_api: localStorage.getItem("owm-key"),
};

console.log(JSON.stringify(setting));

if (!navigator.geolocation) {
  toaster("Your device does't support geolocation!", 2000);
}

document.querySelector("div#message div").innerText = "Welcome";

//leaflet add basic map
let map = L.map("map-container", {
  zoomControl: false,
  dragging: false,
  keyboard: true,
}).fitWorld();

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    document.querySelector("div#message").style.display = "none";

    //get location if not an activity open url
    if (open_url === false) {
      build_menu();
      getLocation("init");

      toaster("Press 3 to open the menu", 5000);

      setTimeout(function () {
        document.querySelector(".leaflet-control-attribution").style.display =
          "none";
      }, 8000);
    }
    ///set default map
    maps.opentopo_map();
    windowOpen = "map";
  }, 4000);

  L.control
    .scale({
      position: "topright",
      metric: true,
      imperial: false,
    })
    .addTo(map);

  map.addLayer(markers_group);

  let build_menu = function () {
    document.querySelector("div#tracksmarkers").innerHTML = "";
    document.querySelector("div#maps").innerHTML = "";
    document.querySelector("div#layers").innerHTML = "";

    let el = document.querySelector("div#maps");

    el.insertAdjacentHTML(
      "afterend",
      '<div class="item" data-map="toner">Toner <i>Map</i></div>'
    );
    el.insertAdjacentHTML(
      "afterend",
      '<div class="item" data-map="osm">OSM <i>Map</i></div>'
    );

    el.insertAdjacentHTML(
      "afterend",
      '<div class="item" data-map="otm">OpenTopo <i>Map</i></div>'
    );

    el.insertAdjacentHTML(
      "afterend",
      '<div class="item" data-map="moon">Moon <i>Map</i></div>'
    );

    document
      .querySelector("div#layers")
      .insertAdjacentHTML(
        "afterend",
        '<div class="item" data-map="weather">Weather <i>Layer</i></div>'
      );

    document
      .querySelector("div#layers")
      .insertAdjacentHTML(
        "afterend",
        '<div class="item" data-map="earthquake">Earthquake <i>Layer</i></div>'
      );

    document
      .querySelector("div#layers")
      .insertAdjacentHTML(
        "afterend",
        '<div class="item" data-map="railway">Railway <i>Layer</i></div>'
      );

    if (settings_data[0]) {
      document
        .querySelector("div#layers")
        .insertAdjacentHTML(
          "afterend",
          '<div class="item" data-map="owm">Open Weather <i>Layer</i></div>'
        );
    }

    find_gpx();
    find_geojson();
  };

  //////////////////////////////////
  //READ GPX////////////////////////
  /////////////////////////////////
  let find_gpx = function () {
    //search gpx
    let finder_gpx = new Applait.Finder({
      type: "sdcard",
      debugMode: false,
    });

    finder_gpx.search(".gpx");
    finder_gpx.on("searchComplete", function (needle, filematchcount) {});

    finder_gpx.on("fileFound", function (file, fileinfo, storageName) {
      document
        .querySelector("div#tracksmarkers")
        .insertAdjacentHTML(
          "afterend",
          '<div class="item" data-map="gpx">' + fileinfo.name + "</div>"
        );
    });
  };

  //////////////////////////////////
  //READ GEOJSON////////////////////////
  /////////////////////////////////

  let find_geojson = function () {
    //search geojson
    let finder = new Applait.Finder({
      type: "sdcard",
      debugMode: false,
    });
    finder.search(".geojson");

    finder.on("searchComplete", function (needle, filematchcount) {});
    finder.on("fileFound", function (file, fileinfo, storageName) {
      document
        .querySelector("div#tracksmarkers")
        .insertAdjacentHTML(
          "afterend",
          '<div class="item" data-map="geojson">' + fileinfo.name + "</div>"
        );
    });
  };

  //////////////////////////////////
  ///MENU//////////////////////////
  /////////////////////////////////

  let finder_tabindex = function () {
    //set tabindex
    let t = -1;
    let items = document.querySelectorAll(".item");
    let items_list = [];
    for (let i = 0; i < items.length - 1; i++) {
      if (items[i].parentNode.style.display == "block") {
        items_list.push(items[i]);
        t++;
        items_list[items_list.length - 1].setAttribute("tabIndex", t);
        items_list[0].focus();
      }
    }
    document.querySelector("div#finder").style.display = "block";
  };

  let show_finder = function () {
    finder_tabindex();
    document.querySelector("div#finder").style.display = "block";
    finder_navigation("start");
    windowOpen = "finder";
  };

  /////////////////////////
  /////Load GPX///////////
  ///////////////////////
  function loadGPX(filename) {
    let finder = new Applait.Finder({
      type: "sdcard",
      debugMode: false,
    });
    finder.search(filename);

    finder.on("fileFound", function (file, fileinfo, storageName) {
      //file reader

      let reader = new FileReader();

      reader.onerror = function (event) {
        toaster("can't read file", 3000);
        reader.abort();
      };

      reader.onloadend = function (event) {
        var gpx = event.target.result; // URL to your GPX file or the GPX itself

        new L.GPX(gpx, {
          async: true,
        })
          .on("loaded", function (e) {
            map.fitBounds(e.target.getBounds());
          })
          .addTo(map);

        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      };

      reader.readAsText(file);
    });
  }

  ////////////////////
  ////GEOLOCATION/////
  ///////////////////
  //////////////////////////
  ////MARKER SET AND UPDATE/////////
  /////////////////////////

  function getLocation(option) {
    marker_latlng = false;

    if (option == "init" || option == "update_marker" || option == "share") {
      toaster("seeking position", 3000);
    }

    let options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    function success(pos) {
      let crd = pos.coords;
      current_lat = crd.latitude;
      current_lng = crd.longitude;
      current_alt = crd.altitude;
      current_heading = crd.heading;

      //to store device loaction
      device_lat = crd.latitude;
      device_lng = crd.longitude;

      if (option == "share") {
        mozactivity.share_position();
      }

      //store location as fallout
      let b = [crd.latitude, crd.longitude];
      localStorage.setItem("last_location", JSON.stringify(b));

      if (option == "init") {
        myMarker = L.marker([current_lat, current_lng]).addTo(markers_group);
        myMarker._icon.classList.add("marker-1");

        map.setView([current_lat, current_lng], 12);
        zoom_speed();
        document.querySelector("div#message div").innerText = "";
        return true;
      }

      if (option == "update_marker" && current_lat != "") {
        myMarker.setLatLng([current_lat, current_lng]).update();
        map.flyTo(new L.LatLng(current_lat, current_lng));
        zoom_speed();
      }
    }

    function error(err) {
      toaster("Position not found, load last known position", 4000);

      current_lat = setting.last_location[0];
      current_lng = setting.last_location[1];
      current_alt = 0;

      map.setView([current_lat, current_lng], 12);
      zoom_speed();
      document.querySelector("div#message div").innerText = "";
      return false;
    }

    navigator.geolocation.getCurrentPosition(success, error, options);
  }

  ///////////
  //watch position
  //////////
  let watchID;
  let state_geoloc = false;

  function geolocationWatch() {
    marker_latlng = false;

    let geoLoc = navigator.geolocation;

    if (state_geoloc == false) {
      toaster("watching postion started", 2000);
      state_geoloc = true;

      function showLocation(position) {
        let crd = position.coords;

        current_lat = crd.latitude;
        current_lng = crd.longitude;
        current_alt = crd.altitude;
        current_heading = crd.heading;

        //store device location
        device_lat = crd.latitude;
        device_lng = crd.longitude;

        //store location as fallout
        let b = [crd.latitude, crd.longitude];
        localStorage.setItem("last_location", JSON.stringify(b));

        map.flyTo(
          new L.LatLng(position.coords.latitude, position.coords.longitude)
        );
        myMarker.setLatLng([current_lat, current_lng]).update();
      }

      function errorHandler(err) {
        if (err.code == 1) {
          toaster("Error: Access is denied!", 2000);
        } else if (err.code == 2) {
          toaster("Error: Position is unavailable!", 2000);
        }
      }

      let options = {
        timeout: 60000,
      };
      watchID = geoLoc.watchPosition(showLocation, errorHandler, options);
      return true;
    }

    if (state_geoloc == true) {
      geoLoc.clearWatch(watchID);
      state_geoloc = false;
      toaster("watching postion stopped", 2000);
      console.log(state_geoloc);

      return true;
    }
  }

  /////////////////////////
  /////MENU///////////////
  ////////////////////////

  function addMapLayers(param) {
    if (document.activeElement.className == "item" && windowOpen == "finder") {
      //switch online maps
      let item_value = document.activeElement.getAttribute("data-map");

      if (item_value == "weather") {
        maps.weather_map();
        document.querySelector("div#finder").style.display = "none";
      }

      if (item_value == "toner") {
        map.removeLayer(tilesLayer);
        maps.toner_map();
        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "osm") {
        map.removeLayer(tilesLayer);
        maps.osm_map();
        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "moon") {
        map.removeLayer(tilesLayer);
        maps.moon_map();
        document.querySelector("div#finder").style.display = "none";
        map.setZoom(4);
        windowOpen = "map";
      }

      if (item_value == "otm") {
        map.removeLayer(tilesLayer);
        maps.opentopo_map();
        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "owm") {
        maps.owm_layer();
        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "railway") {
        maps.railway_layer();
        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "earthquake") {
        maps.earthquake_layer();
        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "share") {
        mozactivity.share_position();
        return true;
      }

      if (item_value == "autoupdate-geolocation") {
        windowOpen = "map";
        document.querySelector("div#finder").style.display = "none";
        geolocationWatch();
      }

      if (item_value == "update-position") {
        getLocation("update_marker");
      }

      if (item_value == "search") {
        windowOpen = "map";
        document.querySelector("div#finder").style.display = "none";
        showSearch();
      }

      if (item_value == "coordinations") {
        coordinations("show");
      }

      if (item_value == "savelocation") {
        document.querySelector("div#finder").style.display = "none";
        save_mode = "geojson-single";
        user_input("open");
      }

      if (item_value == "export") {
        document.querySelector("div#finder").style.display = "none";
        save_mode = "geojson-collection";
        user_input("open");
      }

      if (item_value == "add-marker-icon") {
        toaster("please close the menu and press key 9 to set a marker.", 3000);
      }

      if (item_value == "photo") {
        mozactivity.photo();
      }

      //add geoJson data
      if (item_value == "geojson") {
        let finder = new Applait.Finder({
          type: "sdcard",
          debugMode: false,
        });
        finder.search(document.activeElement.innerText);

        finder.on("fileFound", function (file, fileinfo, storageName) {
          //file reader

          let geojson_data = "";
          let reader = new FileReader();

          reader.onerror = function (event) {
            reader.abort();
          };

          reader.onloadend = function (event) {
            //check if json valid
            try {
              geojson_data = JSON.parse(event.target.result);
            } catch (e) {
              toaster("Json is not valid", 2000);
              return false;
            }

            //if valid add layer
            //to do if geojson is marker add to  marker_array[]
            //https://blog.codecentric.de/2018/06/leaflet-geojson-daten/
            L.geoJSON(geojson_data, {
              // Marker Icon
              pointToLayer: function (feature, latlng) {
                let t = L.marker(latlng);
                t.addTo(markers_group);
                map.flyTo(latlng);
                windowOpen = "map";
                json_modified = true;
              },

              // Popup
              onEachFeature: function (feature, layer) {
                console.log(feature);
              },
            }).addTo(map);
            document.querySelector("div#finder").style.display = "none";

            windowOpen = "map";
          };

          reader.readAsText(file);
        });
      }

      //add gpx data
      if (item_value == "gpx") {
        loadGPX(document.activeElement.innerText);
      }
    }

    top_bar("", "", "");
  }

  //qr scan listener
  const qr_listener = document.querySelector("input#owm-key");
  let qrscan = false;
  qr_listener.addEventListener("focus", (event) => {
    bottom_bar("", "qr", "");
    qrscan = true;
  });

  qr_listener.addEventListener("blur", (event) => {
    qrscan = false;
    bottom_bar("", "", "");
  });

  ////////////////////////////////////////
  ////COORDINATIONS PANEL/////////////////
  ///////////////////////////////////////
  let corr_toogle = false;
  function coordinations() {
    windowOpen = "coordinations";
    let update_view;
    if (!corr_toogle) {
      corr_toogle = true;
      document.querySelector("div#finder").style.display = "none";
      document.querySelector("div#coordinations").style.display = "block";

      if (setting.openweather_api && setting.openweather_api != undefined) {
        document.querySelector("div#coordinations div#weather").style.display =
          "block";

        function openweather_callback(some) {
          document.getElementById("temp").innerText =
            some.list[0].main.temp + " °C";
          document.getElementById("icon").src =
            "https://openweathermap.org/img/w/" +
            some.list[0].weather[0].icon +
            ".png";
        }

        let c = map.getCenter();

        weather.openweather_call(
          c.lat,
          c.lng,
          setting.openweather_api,
          openweather_callback
        );
      }

      update_view = setInterval(() => {
        if (current_lat != "" && current_lng != "") {
          //when marker is loaded from menu

          let f = map.getCenter();

          document.querySelector("div#coordinations div#distance").innerText =
            "Distance: " +
            module.calc_distance(device_lat, device_lng, f.lat, f.lng) +
            " km";

          document.querySelector("div#coordinations div#lat").innerText =
            "Lat " + current_lat.toFixed(5);
          document.querySelector("div#coordinations div#lng").innerText =
            "Lng " + current_lng.toFixed(5);
          if (current_alt) {
            document.querySelector(
              "div#coordinations div#altitude"
            ).style.display = "block";
            document.querySelector("div#coordinations div#altitude").innerText =
              "alt " + current_alt;
          } else {
            document.querySelector(
              "div#coordinations div#altitude"
            ).style.display = "none";
          }
          if (current_heading) {
            document.querySelector(
              "div#coordinations div#heading"
            ).style.display = "block";
            document.querySelector("div#coordinations div#heading").innerText =
              "heading " + current_heading;
          } else {
            document.querySelector(
              "div#coordinations div#heading"
            ).style.display = "none";
          }
        }
      }, 1000);

      return true;
    }

    if (corr_toogle) {
      document.querySelector("div#coordinations").style.display = "none";
      windowOpen = "map";
      clearInterval(update_view);
      corr_toogle = false;
    }
  }

  //////////////////////////
  ////SEARCH BOX////////////
  /////////////////////////

  function showSearch() {
    bottom_bar("close", "select", "");
    document.querySelector("div#search-box").style.display = "block";
    document.querySelector("div#search-box input").focus();
    document.querySelector("div#bottom-bar").style.display = "block";
    windowOpen = "search";
  }

  function hideSearch() {
    document.querySelector("div#bottom-bar").style.display = "none";
    document.querySelector("div#search-box").style.display = "none";
    document.querySelector("div#search-box input").value = "";
    document.querySelector("div#search-box input").blur();
    document.querySelector("div#olc").style.display = "none";
    windowOpen = "map";
  }

  /////////////////////
  ////ZOOM MAP/////////
  ////////////////////

  function ZoomMap(in_out) {
    let current_zoom_level = map.getZoom();

    if (
      windowOpen == "map" ||
      (windowOpen == "coordinations" &&
        window.getComputedStyle(document.querySelector("div#search-box"))
          .display == "none")
    ) {
      if (in_out == "in") {
        map.setZoom(current_zoom_level + 1);
      }

      if (in_out == "out") {
        map.setZoom(current_zoom_level - 1);
      }

      zoom_speed();
    }
  }

  function zoom_speed() {
    zoom_level = map.getZoom();

    if (zoom_level < 6) {
      step = 1;
      return step;
    }
    if (zoom_level > 6) {
      step = 0.1;
    }

    if (zoom_level > 11) {
      step = 0.001;
    }

    if (zoom_level > 14) {
      step = 0.0001;
    }

    return step;
  }

  /////////////////////
  //MAP NAVIGATION//
  /////////////////////

  function MovemMap(direction) {
    //if (!marker_latlng) {
    if (windowOpen == "map" || windowOpen == "coordinations") {
      let n = map.getCenter();

      current_lat = n.lat;
      current_lng = n.lng;

      if (direction == "left") {
        zoom_speed();

        current_lng = n.lng - step;
        map.panTo(new L.LatLng(current_lat, current_lng));
      }

      if (direction == "right") {
        zoom_speed();

        current_lng = n.lng + step;
        map.panTo(new L.LatLng(current_lat, current_lng));
      }

      if (direction == "up") {
        zoom_speed();

        current_lat = n.lat + step;
        map.panTo(new L.LatLng(current_lat, current_lng));
      }

      if (direction == "down") {
        zoom_speed();

        current_lat = n.lat - step;
        map.panTo(new L.LatLng(current_lat, current_lng));
      }
    }
  }

  //////////////////////
  //FINDER NAVIGATION//
  /////////////////////

  let finder_panels = ["mapstracks", "settings", "shortcuts", "impressum"];
  let count = 0;

  let finder_navigation = function (dir) {
    tabIndex = 0;
    bottom_bar("", "", "");

    let d = document.querySelectorAll("div.panel");
    for (let b = 0; b < d.length; b++) {
      d[b].style.display = "none";
    }

    if (dir == "start") {
      document.getElementById(finder_panels[count]).style.display = "block";
      finder_tabindex();
    }

    if (dir == "+1") {
      count++;
      if (count > finder_panels.length - 1) count = finder_panels.length - 1;
      document.getElementById(finder_panels[count]).style.display = "block";
      finder_tabindex();
    }
    if (dir == "-1") {
      count--;
      if (count < 0) count = 0;
      document.getElementById(finder_panels[count]).style.display = "block";
      finder_tabindex();
    }

    top_bar("◀", finder_panels[count], "▶");
  };

  function nav(move) {
    if (windowOpen == "finder") {
      //get items from current pannel
      let items = document.querySelectorAll(".item");
      let items_list = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].parentNode.style.display == "block") {
          items_list.push(items[i]);
        }
      }

      if (move == "+1") {
        if (tabIndex < items_list.length) {
          tabIndex++;
          items_list[tabIndex].focus();
          document.activeElement.scrollIntoView({
            block: "end",
          });
        }
      }

      if (move == "-1") {
        if (tabIndex > 0) {
          tabIndex--;
          items_list[tabIndex].focus();
          document.activeElement.scrollIntoView({
            block: "end",
          });
        }
      }
    }
  }

  //////////////////////////////
  ////MOZ ACTIVITY////////////
  //////////////////////////////

  if (navigator.mozSetMessageHandler) {
    navigator.mozSetMessageHandler("activity", function (activityRequest) {
      var option = activityRequest.source;
      //gpx
      if (option.name == "open") {
        loadGPX(option.data.url);
      }
      //link
      if (option.name == "view") {
        open_url = true;
        const url_split = option.data.url.split("/");
        current_lat = url_split[url_split.length - 2];
        current_lng = url_split[url_split.length - 1];

        //remove !numbers
        current_lat = current_lat.replace(/[A-Za-z?=&]+/gi, "");
        current_lng = current_lng.replace(/[A-Za-z?=&]+/gi, "");
        current_lat = Number(current_lat);
        current_lng = Number(current_lng);

        myMarker = L.marker([current_lat, current_lng]).addTo(map);
        map.setView([current_lat, current_lng], 13);
        zoom_speed();
      }
    });
  }

  //////////////////////////////
  ////KEYPAD HANDLER////////////
  //////////////////////////////

  let longpress = false;
  const longpress_timespan = 1000;
  let timeout;

  function repeat_action(param) {
    switch (param.key) {
      case "ArrowUp":
        MovemMap("up");
        break;

      case "ArrowDown":
        MovemMap("down");
        break;

      case "ArrowLeft":
        MovemMap("left");
        break;

      case "ArrowRight":
        MovemMap("right");
        break;

      case "Enter":
        break;
    }
  }

  //////////////
  ////LONGPRESS
  /////////////

  function longpress_action(param) {
    switch (param.key) {
      case "0":
        if (windowOpen == "finder") {
          addMapLayers("delete-marker");
          return false;
        }

        if (windowOpen == "map") {
          maps.weather_map();
          return false;
        }
        break;

      case "Backspace":
        if (windowOpen == "map") {
          windowOpen = "";
          window.goodbye();
        }
        break;
    }
  }

  ///////////////
  ////SHORTPRESS
  //////////////

  function shortpress_action(param) {
    switch (param.key) {
      case "Backspace":
        if (windowOpen == "finder") {
          top_bar("", "", "");
          bottom_bar("", "", "");

          document.querySelector("div#finder").style.display = "none";
          windowOpen = "map";

          break;
        }

        if (windowOpen == "coordinations") {
          coordinations("hide");
          break;
        }

        if (windowOpen == "scan") {
          qr.stop_scan();
          windowOpen = "setting";
          break;
        }

        break;

      case "SoftLeft":
        if (windowOpen == "search") {
          hideSearch();
          break;
        }

        if (windowOpen == "map") {
          ZoomMap("in");
          break;
        }

        if (windowOpen == "user-input") {
          user_input("close");
          save_mode = "";
          break;
        }

        break;

      case "SoftRight":
        if (windowOpen == "map") {
          ZoomMap("out");
          break;
        }

        if (windowOpen == "user-input" && save_mode == "geojson-single") {
          console.log(setting.export_path + user_input("return") + ".geojson");
          geojson.save_geojson(
            setting.export_path + user_input("return") + ".geojson",
            "single"
          );
          save_mode = "";
          break;
        }

        if (windowOpen == "user-input" && save_mode == "geojson-collection") {
          geojson.save_geojson(user_input("return") + ".geojson", "collection");
          save_mode = "";
          break;
        }

        if (windowOpen == "user-input" && save_mode != "geojson") {
          filename = user_input("return");
          //save_delete_marker("save_marker");
          break;
        }

        break;

      case "Enter":
        if (windowOpen == "search") {
          L.marker([olc_lat_lng[0], olc_lat_lng[1]]).addTo(map);
          map.setView([olc_lat_lng[0], olc_lat_lng[1]], 13);

          hideSearch();

          current_lat = Number(olc_lat_lng[0]);
          current_lng = Number(olc_lat_lng[1]);

          toaster("press 5 to save the marker", 2000);
          break;
        }

        if (document.activeElement == document.getElementById("clear-cache")) {
          maps.delete_cache();
          break;
        }

        if (
          document.activeElement == document.getElementById("save-settings")
        ) {
          settings.save_settings();
          break;
        }
        if (windowOpen == "finder" && qrscan == true) {
          windowOpen = "scan";

          qr.start_scan(function (callback) {
            let slug = callback;
            document.getElementById("owm-key").value = slug;
          });

          break;
        }

        if (windowOpen == "finder") {
          addMapLayers("add-marker");

          break;
        }

        break;

      case "1":
        if (windowOpen == "map") getLocation("update_marker");
        break;

      case "2":
        if (windowOpen == "map") showSearch();
        break;

      case "3":
        console.log(windowOpen);

        if (windowOpen == "map") {
          show_finder();
        }

        break;

      case "4":
        if (windowOpen == "map") {
          geolocationWatch();
          screenWakeLock("lock");
        }

        break;

      case "5":
        if (windowOpen == "map") {
          save_mode = "geojson-single";
          user_input("open", now());
          document.getElementById("user-input-description").innerText =
            "save this marker as geojson file";
          break;
        }
        break;

      case "6":
        if (windowOpen == "map") coordinations("show");
        break;

      case "7":
        if (windowOpen == "map") module.ruler_toggle();
        break;

      case "8":
        if (windowOpen == "map") {
          save_mode = "geojson-collection";
          user_input("open", now());
          document.getElementById("user-input-description").innerText =
            "Export all markers as geojson file";
        }

        break;

      case "9":
        if (windowOpen == "map")
          L.marker([current_lat, current_lng]).addTo(markers_group);
        break;

      case "0":
        if (windowOpen == "map") mozactivity.share_position();
        break;

      case "*":
        module.jump_to_layer();

        break;

      case "#":
        if (windowOpen == "map") maps.caching_tiles();
        break;

      case "ArrowRight":
        MovemMap("right");

        if (windowOpen == "finder") {
          finder_navigation("+1");
        }
        break;

      case "ArrowLeft":
        MovemMap("left");
        if (windowOpen == "finder") {
          finder_navigation("-1");
        }
        break;

      case "ArrowUp":
        MovemMap("up");
        nav("-1");
        break;

      case "ArrowDown":
        MovemMap("down");
        nav("+1");
        break;
    }
  }

  /////////////////////////////////
  ////shortpress / longpress logic
  ////////////////////////////////

  function handleKeyDown(evt) {
    if (evt.key == "Backspace" && !$("input").is(":focus"))
      evt.preventDefault();
    if (!evt.repeat) {
      //evt.preventDefault();
      longpress = false;
      timeout = setTimeout(() => {
        longpress = true;
        longpress_action(evt);
      }, longpress_timespan);
    }

    if (evt.repeat) {
      longpress = false;
      repeat_action(evt);
    }
  }

  function handleKeyUp(evt) {
    //evt.preventDefault();
    if (evt.key == "Backspace") evt.preventDefault();

    clearTimeout(timeout);
    if (!longpress) {
      shortpress_action(evt);
    }
  }

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
});
