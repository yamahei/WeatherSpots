$(function(){
	var shw = window.shw || {};
	
	var OWM_URL = "http://api.openweathermap.org/data/2.5/forecast";
	var OWM_APPID = "2e69b11dd0afebf5af2f6d5345ad0f50";

	var TEXT_TITLE = "天気予報";
	var TEXT_ACTION = "<span class='glyphicon glyphicon-menu-hamburger' aria-hidden='true'></span>";
	var TEXT_ACTREL = "更　新";
	var TEXT_ACTMAP = "地図で見る";
	var TEXT_ACTSET = "観測点を設定";
	var TEXT_ACTEXT = "キャンセル";
	var TEXT_NOGOAL = "現在地";
	
	var POINTS_LENGTH = 5;
	var POINT_MIN_DISTANCE = 5 * 1000;//km
	var FORECAST_LENGTH = 8;// 3 * 8 = 24h
	var FORECAST_CACHE_LIFE = 1 * 60 * 60 * 1000;//1h
	var POINT_AS_SAME = 2.5 * 1000;//km
	
	var forecast = {};
	var timeToIconClass = function(time){
		var num = (time.getHours() % 12) || 12;
		return "wi-time-" + num;
	};
	var weatherToIconClass = function(id){
		return id ? "wi-owm-" + id : "wi-na";
	};
	var timeToString = function(time){
		return [
			("0"+time.getHours()).slice(-2),
			("0"+time.getMinutes()).slice(-2),
		].join(":");
	};
	var roundDatePerHour = function(date, per){
		var d = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
			date.getHours()+1
		);
		while(d.getHours() % per != 0){
			d.setHours(d.getHours() + 1);
		}
		return d;
	};


	forecast.isActive = function(){
		var active = null;
		shw.common.storageAccessor(function(json){
			active = json.forecasts.active;
		});
		return active;
	};
	forecast.activate = function(){
		shw.common.storageAccessor(function(json){
			json.forecasts.active = true;
		});
		forecast.setPoints(forecast.update);
	};
	forecast.inActivate = function(){
		shw.common.storageAccessor(function(json){
			json.forecasts.active = false;
		});
	};
	forecast.setPoints = function(callback){
		console.log("setPoints");
		var points = [];
		shw.common.storageAccessor(function(json){
			points = json.points.filter(function(e){
				return e.selected;
			});
		});
		shw.common.getLocation(function(point){
			points.unshift({
				coords: point,
				name: TEXT_NOGOAL,
				addat: new Date(),
				selected: true,
			});
			forecast._setMatrix(points, callback);
		});
	};
	forecast._setMatrix = function(points, callback){
		console.log("_setMatrix");
		var _timeline = [], time = new Date();
		for(var i=0; i<FORECAST_LENGTH; i++){
			time = roundDatePerHour(time, 3);
			_timeline.push(time);
		}
		var timeline = _timeline.map(function(time){
			return {
				time: time, 
				name: timeToString(time),
				icon: timeToIconClass(time),
			};
		});
		var matrix = points.map(function(point){
			var timeline = _timeline.map(function(time){
				return {
					time: time, 
					name: timeToString(time),
					icon: weatherToIconClass(null),
				};
			});
			return {
				coords: {
					latitude: point.coords.latitude,
					longitude: point.coords.longitude,
				},
				name: point.name,
				timeline: timeline,
			};
		});
		shw.common.storageAccessor(function(json){
			json.forecasts.timeline = timeline;
			json.forecasts.matrix = matrix;
		});
		console.log(points);
		console.log(timeline);
		console.log(matrix);
		callback();
	};
	forecast.update = function(){
		console.log("update");
		var active = false;
		var timeline, matrix;
		shw.common.storageAccessor(function(json){
			timeline = json.forecasts.timeline;
			matrix = json.forecasts.matrix;
		});

		var delay = 0;
		for(var i=0; i<matrix.length; i++){
			var site = forecast.setFromCache(matrix[i]);
			if(site){
				matrix[i] = site;
			} else {
				delay += 1000 + Math.floor(Math.random() * 500);
				forecast.callApi(matrix[i], delay);
			}
		}
		shw.common.storageAccessor(function(json){
			json.forecasts.matrix = matrix;
		});
		console.log(matrix);
		forecast.refreshTable(timeline, matrix);
	};
	forecast.setFromCache = function(site){
		console.log("setFromCache");
		var now = new Date(), candies = [];
		shw.common.storageAccessor(function(json){
			json.forecasts.cache = json.forecasts.cache.filter(function(e){
				var gotat = new Date(e.gotat);
				return (
					(now.getTime()-gotat.getTime()) < FORECAST_CACHE_LIFE
				) ? true : false;
			});
			candies = json.forecasts.cache.concat();
		});
		candies.sort(function(a, b){
			var distanceA = geolib.getDistance(site.coords, a.coords);
			var distanceB = geolib.getDistance(site.coords, b.coords);
			return distanceA - distanceB;
		});
		if(candies.length <= 0){ return null; }
		var cache = candies[0];
		var distance = geolib.getDistance(site.coords, cache.coords);
		if(distance >= POINT_AS_SAME){ return null; }
		
		for(var i=0; i<site.timeline.length; i++){
			var at = site.timeline[i];
			var forecast = cache.forecast.filter(function(e){
				return (
					e.time.toString() == at.time.toString()
				) ? true : false;
			});
			if(forecast.length > 0){
				at.icon = weatherToIconClass(forecast[0].id);
				at.weather = forecast[0].weather;
				site.timeline[i] = at;
			}
		}
		return site;
	};
	forecast.callApi = function(site, delay){
		console.log("callApi");
		var params = {
			lat: site.coords.latitude,
			lon: site.coords.longitude,
			appid: OWM_APPID, 
		};
		var func = function(){
			$.getJSON(
				OWM_URL, params,
				function(data, textStatus, jqXHR){
					forecast.respondApi(site, data);
				}
			);
		};
		setTimeout(func, delay);
	};
	forecast.respondApi = function(site, data){
		if(!site || !data){ return; }
		console.log("respondApi");
		var coord = data.city.coord;
		var list = data.list;
		var _cache = {
			coords: site.coords,
			forecast: [],
			gotat: new Date(),
		};
		var timeline, matrix;
		shw.common.storageAccessor(function(json){
			timeline = json.forecasts.timeline;
			matrix = json.forecasts.matrix;
			var cache = json.forecasts.cache;
			matrix = json.forecasts.matrix;
			var _matrix = matrix.filter(function(_site){
				var distance = geolib.getDistance(site.coords, _site.coords);
				return (distance < POINT_AS_SAME) ? true : false;
			})
			_matrix.forEach(function(_site){
				var _timeline = _site.timeline;
				_timeline.forEach(function(at){
					var time = new Date(at.time);
					var msec = time.getTime();
					list.forEach(function(forecast){
						if(msec == forecast.dt * 1000){
							at.weather = forecast.weather[0].description;
							at.icon = weatherToIconClass(forecast.weather[0].id);
							_cache.forecast.push({
								time: time,
								weather: forecast.weather[0].description,
								id: forecast.weather[0].id
							});
						}
					});
				});
				_site.timeline = _timeline;
			});
			if(_cache.forecast.length > 0){
				cache.push(_cache);
			}
			//json.forecasts.cache = cache;
			//json.forecasts.matrix = matrix;
		});
		forecast.refreshTable(timeline, matrix);
	};
	forecast.refreshTable = function(timeline, matrix){
		console.log("refreshTable");
		var head = shw.common.bindValue.forecast_head;
		var body = shw.common.bindValue.forecast_body;
		head.removeAll();
		body.removeAll();

		head.push("");
		timeline.forEach(function(at){
			head.push("<i class='wi "+at.icon+"'></i>");
		});
		matrix.forEach(function(site){
			var line = [];
			line.push(site.name);
			site.timeline.forEach(function(at){
				line.push(
					"<i class='wi "+at.icon+"' title='"+at.weather+"'></i>"
				);
			});
			body.push(line);
		});
		console.log(head());
		console.log(body());
		scrollReset();
	};

	//init
	shw.common.setShowAction("forecast", forecast.activate);
	shw.common.setHideAction("forecast", forecast.inActivate);
	var header = $("#SHW-FORECAST h1");
	var rightButton = $("#SHW-FC-BTN-R button");
	var actions = {
		rel: {el: $("#SHW-FC-RELOAD"), txt: TEXT_ACTREL, func: function(){
			forecast.setPoints(forecast.update);
		}},
		uns: {el: $("#SHW-FC-BYMAP"), txt: TEXT_ACTMAP, func: function(){
			shw.common.pushPage("weather_map");
		}},
		set: {el: $("#SHW-FC-ASSIGN"), txt: TEXT_ACTSET, func: function(){
			shw.common.pushPage("point_list");
		}},
		ext: {el: $("#SHW-FC-CANCEL"), txt: TEXT_ACTEXT, func: function(){}},
	};
	$(header).html(TEXT_TITLE);
	$(rightButton).html(TEXT_ACTION);
	Object.keys(actions).forEach(function(name){
		var action = actions[name];
		$(action.el).html(action.txt).on("click tap", function(){
			action.func();
		});
	});
	var scrollReset = function(){
		setTimeout(function(){
			$("#SHW-FORECAST").find("div.table-responsive").trigger('scroll');
		}, 0);
	};
	//TODO: resume and suspend
	//$(window).on("focus", forecast.activate);
	//$(window).on("blur", forecast.inActivate);

	shw.forecast = forecast;
});
