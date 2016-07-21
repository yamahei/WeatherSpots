$(function(){

	var shw = window.shw || {};

	var TEXT_OK = "<span class='glyphicon glyphicon-hand-down' aria-hidden='true'></span>";//ここに決定
	var TEXT_CANCEL = "<span class='mirror glyphicon glyphicon-share-alt' aria-hidden='true'></span>";//キャンセル
	var TEXT_PROMPT = "名前を入力してください";
	var TEXT_DUPLCATE = "同じ名前があります";
	var TEXT_EMPTY = "名前が空です";
	var DEFAULT_SCALE = 14;
	var config_on = [
		"scrollWheelZoom",
		"doubleClickZoom",
	];
	var map_controls = [
		Y.ScaleControl,
		Y.SliderZoomControlVertical,
	];

	var setBodyFull = function(){
		$("#SHW-MAP").height($(window).height());
	};
	var ymap = new Y.Map("SHW-MAP");

	var selectPoint = {};
	selectPoint.initMap = function(){
		var latlng = new Y.LatLng(0, 0);
		setBodyFull();
		ymap.drawMap(latlng, 1, Y.LayerSetId.NORMAL);
		config_on.forEach(function(config){
			ymap.setConfigure(config, true);
		});
		map_controls.forEach(function(control){
			ymap.addControl(new control());
		});
		ymap.updateSize();
		$("#SHW-MAP div.yolp-noprint").last().css("top", "48px");
		$(window).on("orientationchange resize",function(){
			setBodyFull();
			ymap.updateSize();
		});
	};
	selectPoint.setMap = function(coords, scale){
		var latlng = new Y.LatLng(coords.latitude, coords.longitude);
		ymap.panTo(latlng, false);
		ymap.setZoom(scale);
	};
	selectPoint.getMapPoint = function(){
		var center = ymap.getCenter();
		console.log(center);
		return {
			latitude: center.Lat,
			longitude: center.Lon,
		};
	};
	selectPoint.isValidName = function(name){//#=>inValidMessage
		var ret = null;
		if(name.match(/^\s*$/)){ ret = TEXT_EMPTY; }
		else{ shw.common.storageAccessor(function(json){
			var dups = json.points.filter(function(point){
				return point.name == name ? true : false;
			});
			ret = dups.length <= 0 ? null : TEXT_DUPLCATE;
		}); }
		return ret;
	};
	selectPoint.addPointList = function(name, point){
		shw.common.storageAccessor(function(json){
			json.points.push({
				coords: point, name: name, addat: new Date(), selected: false,
			});
		});	
	};

	//init
	var isCenterMarkShown = false;
	var centerMark = new Y.CenterMarkControl();
	var mapObjects = [];
	var removeObjects = function(){
		while(mapObjects.length > 0){
			var obj = mapObjects.shift();
			ymap.removeFeature(obj);
		}
	};
	var setHere = function(){
		shw.common.getLocation(function(coords){
			selectPoint.setMap(coords, DEFAULT_SCALE);
			setTimeout(function(){
				$(window).trigger('resize');		
			}, 500);
		});
	};
	shw.common.setShowAction("select_point", function(){
		removeObjects();
		if(!isCenterMarkShown){
			ymap.addControl(centerMark);
			isCenterMarkShown = true;
		}
		ymap.setConfigure("weatherOverlay", false);
		$(rightButton).show();
		setHere();
	});
	shw.common.setHideAction("select_point", function(){});
	shw.common.setShowAction("weather_map", function(){
		var points = [];
		shw.common.storageAccessor(function(json){
			points = json.points;
		});	
		shw.common.getLocation(function(coords){
			points.push({
				coords: coords, 
				selected: true
			});
			removeObjects();
			points.forEach(function(p){
				if(p.selected){
					console.log(p);
					var marker = new Y.Marker(new Y.LatLng(
						p.coords.latitude, 
						p.coords.longitude
					));
					ymap.addFeature(marker);
					mapObjects.push(marker);
				}
			});
		});
		if(isCenterMarkShown){
			ymap.removeControl(centerMark);
			isCenterMarkShown = true;
		}
		ymap.setConfigure("weatherOverlay", true);
		$(rightButton).hide();
		setHere();
	});
	shw.common.setHideAction("weather_map", function(){});
	var leftButton = $("#SHW-SP-BTN-L button");
	var rightButton = $("#SHW-SP-BTN-R button");
	$(leftButton).html(TEXT_CANCEL);
	$(rightButton).html(TEXT_OK);
	$(leftButton).on("click tap", function(){
		shw.common.popPage();
	});
	$(rightButton).on("click tap", function(){
		var point = selectPoint.getMapPoint();
		bootbox.prompt(TEXT_PROMPT, function(name) {
			if (name === null){ return; }
			name = name.replace(/(^\s+|\s+$)/g, "");
			var inValidMessage = selectPoint.isValidName(name);
			if(!inValidMessage){
				selectPoint.addPointList(name, point);
				shw.common.popPage();
				} else { bootbox.alert(inValidMessage); }
		});
	});

	selectPoint.initMap();
	shw.selectPoint = selectPoint;

});


