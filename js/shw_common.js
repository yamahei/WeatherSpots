(function(g){

	var PAGES = {
		forecast: $("#SHW-PAGE-FORECAST").hide(),
		point_list: $("#SHW-PAGE-POINT-LIST").hide(),
		select_point: $("#SHW-PAGE-SELECT-POINT").hide(),
		weather_map: $("#SHW-PAGE-SELECT-POINT").hide(),
	};
	var DEFAULT_PAGE = 'forecast';//'select_point';
	var ShowActions = {};
	var HideActions = {};
	var STORAGE_KEY = "SinkoHokoWeather-StorageKey2";
	var GPS_TIMEOUT_MSEC = 10 * 1000;
	var GPS_CACHE_LIFE_MSEC = 5 * 60 * 1000;

	var defaultData = JSON.stringify({
		pagestack: [],
		position: {//To gps cache
			coords: { latitude: null, longitude: null },
			gotat: null,
		},
		forecasts: {
			active: false,
			cache: [/*{
				coords: { latitude: null, longitude: null },
				forecast: [{ time: null, weather: null, id: null }],
				gotat: null,
			}*/],
			timeline: [/*{
				time: null,//Date YYYY/MM/DDTHH:00:00
				name: "",//"00:00"
				icon: "",//icon class of clock
			}*/],
			matrix: [/*{
				name: "",
				coords: { latitude: null, longitude: null },
				timeline: [{
					time: null,//Date YYYY/MM/DDTHH:00:00
					icon: "",//icon class of weather
					weather: "",//weather name
				}],
			}*/],
		},
		points: [/*{//To point list
			coords: { latitude: null, longitude: null },
			name: "", addat: Date, selected: false,
		}*/],
	});//TODO: default data

	var common = {};
	common.bindValue = {/*
	*/};
	common.setShowAction = function(name, action){
		ShowActions[name] = action;
	};
	common.setHideAction = function(name, action){
		HideActions[name] = action;
	};
	common.storageAccessor = function(callback){
		var storage = g.localStorage;
		var json = JSON.parse(storage.getItem(STORAGE_KEY) || defaultData);
		callback(json);
		storage.setItem(STORAGE_KEY, JSON.stringify(json));
		//debug
		common.debugJson = json;
	};
	common.removeStorge = function(){
		//debug
		var storage = g.localStorage;
		storage.removeItem(STORAGE_KEY);
		location.reload()
	};
	common.getLocation = function(callback){
		var gotat = null, now = new Date();
		var success = function(result){
			if(result !== null){
				shw.common.storageAccessor(function(json){
					json.position.coords.latitude = result.latitude;
					json.position.coords.longitude = result.longitude;
					json.position.gotat = gotat;
				});
				callback(result);
			}else{ throw new Error("faild to get location."); }
		};
		shw.common.storageAccessor(function(json){
			var latest = json.position.gotat || new Date(0);
			gotat = new Date(latest);
		});
		if((now.getTime()-gotat.getTime()) < GPS_CACHE_LIFE_MSEC){
			//get from cache.
			console.log("got from cache.");
			var position = null;
			shw.common.storageAccessor(function(json){
				position = json.position;
			});
			success({
				latitude: position.coords.latitude,
				longitude: position.coords.longitude,
			});
		} else if (false){
			//TODO: GPS(cordova technology)
			//gotat = new Date();
			//success(lat, lon);
		} else if (navigator.geolocation) {
			//get from geolocation(html5 technology)
			navigator.geolocation.getCurrentPosition(
				function(position){
					gotat = new Date();
					success({
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
					});
				}, function(error){
					throw new Error({
						1: "Denied.",
						2: "Device not found.",
						3: "Timeout.",
					}[error.code]);
				}, {
					enableHighAccuracy: true,
					timeout : GPS_TIMEOUT_MSEC, 
					maximumAge: GPS_CACHE_LIFE_MSEC,
				}
			);
		} else { throw new Error('disabled.'); }
	};
	common.getCurrentPage = function(){
		return common._getPagestackByPostIndex(0);
	};
	common.getPreviousPage = function(){
		return common._getPagestackByPostIndex(1);
	};
	common._getPagestackByPostIndex = function(postindex){
		var page = null;
		common.storageAccessor(function(json){
			var length = json.pagestack.length;
			var index = length - postindex - 1;
			if(length > postindex){ page = json.pagestack[index]; }
		});
		return page;
	};
	common.stackPage = function(next){
		var page = common.getCurrentPage();
		if(next != page){
			common.storageAccessor(function(json){
				json.pagestack.push(next);
			});
		}else{ throw new Error("current page is same: " + page);}
	};
	common.pushPage = function(next){
		if(!PAGES[next]){ throw new Error("unknown page: " + next); }
		var page = common.getCurrentPage();
		common.stackPage(next);
		if(page){ common._pageAnimate({ 
			from: {marginLeft: "0%"}, to: {marginLeft: "-100%"}, 
			el: PAGES[page], action: HideActions[page], visible: false,
		}); }
		common._pageAnimate({ 
			from: {marginLeft: "100%"}, to: {marginLeft: "0%"}, 
			el: PAGES[next], action: ShowActions[next], visible: true,
		});
	};
	common.popPage = function(){
		var page = common.getCurrentPage();
		var prev = common.getPreviousPage();
		common.storageAccessor(function(json){
			json.pagestack.pop();
		});
		if(!page){ throw new Error("page is nothing."); }
		if(page){ common._pageAnimate({ 
			from: {marginLeft: "0%"}, to: {marginLeft: "100%"}, 
			el: PAGES[page], action: HideActions[page], visible: false, 
		}); }
		if(prev){ common._pageAnimate({ 
			from: {marginLeft: "-100%"}, to: {marginLeft: "0%"}, 
			el: PAGES[prev], action: ShowActions[prev], visible: true,
		}); }
		return page;
	};
	common._pageAnimate = function(page){
		$(page.el).css(page.from).animate(page.to, {
			duration: "fast", 
			easing: "linear",
			complete: function(){
				if(!page.visible){ $(page.el).hide(); }
				if(page.action){ page.action(); }
				if(page.visible){ $(page.el).show(); }
			}
		});
	};
	common.startShw = function(){
		var page = common.getCurrentPage();
		if(!page){ page = DEFAULT_PAGE; }
		else{ common.storageAccessor(function(json){
			page = json.pagestack.pop();
		}); }
		window.shw.common.pushPage(page);
	};
	common.isSetTable = function(){
		var flg = true;
		flg &= common.bindValue.forecast_head().length <= 0 ? false : true;
		flg &= common.bindValue.forecast_body().length <= 0 ? false : true;
		return flg;
	};

	g.shw = g.shw || {};
	g.shw.common = common;

})(window);

//TODO: DeviceInit
window.onload = function(){
	var viewModel = {
		point_list: ko.observableArray(),
		forecast_head: ko.observableArray(),
		forecast_body: ko.observableArray(),
	};
	window.shw.common.bindValue = viewModel;
	ko.applyBindings(window.shw.common.bindValue);
	window.shw.common.startShw();
};
