$(function(){
	var shw = window.shw || {};

	var TEXT_TITLE = "地点一覧";
	var TEXT_RETURN = "<span class='mirror glyphicon glyphicon-share-alt' aria-hidden='true'></span>";//キャンセル
	var TEXT_ACTION = "<span class='glyphicon glyphicon-sort-by-attributes' aria-hidden='true'></span>";//add point
	var TEXT_ACTADD = "地点を追加";
	var TEXT_ACTMAP = "TODO:地図で見る";
	var TEXT_ACTREN = "名前を変更";
	var TEXT_ACTDEL = "削　除";
	var TEXT_ACTEXT = "キャンセル";
	var TEXT_BYNAME = "名前順";
	var TEXT_BYDATE = "登録順";
	var TEXT_BYDIST = "近い順";
	var TEXT_PROMPT = "名前を入力してください";
	var TEXT_DUPLCATE = "同じ名前があります";
	var TEXT_EMPTY = "名前が空です";
	var TEXT_TOOMUCH = "同時に選択できる地点は{%_LIMIT_%}箇所です";
	var POINT_LIMIT = 4;
	var pointList = {};
	
	pointList.getSelectedName = function(){
		return $('#SHW-PL-POINT').val();
	};
	pointList.toggle = function(point){
		var count = 0 + (point.selected ? 0 : 1);
		shw.common.storageAccessor(function(json){
			json.points.forEach(function(e){
				count += e.selected ? 1 : 0;
			});
			if(count > POINT_LIMIT){
				bootbox.alert(TEXT_TOOMUCH.replace("{%_LIMIT_%}", POINT_LIMIT));
			}else{
				json.points.forEach(function(e){
					if (e.name == point.name) {
						e.selected = !e.selected;
					}
				});
				setTimeout(pointList.refreshList, 0);
			}
		});	
	};
	pointList.refreshList = function(){
		var list = shw.common.bindValue.point_list;
		var visible = false;
		list.removeAll();
		shw.common.storageAccessor(function(json){
			json.points.forEach(function(point){
				list.push(point);
			});
		});
	};
	
	//init
	shw.common.setShowAction("point_list", pointList.refreshList);
	shw.common.setHideAction("point_list", function(){});
	var header = $("#SHW-LIST h1");
	var leftButton = $("#SHW-PL-BTN-L button");
	var rightButton = $("#SHW-PL-BTN-R button");
	var sortPoints = function(func){
		shw.common.storageAccessor(function(json){
			var points = json.points;
			points.sort(func);
			json.points = points;
		});
		pointList.refreshList();
	};
	var actions = {
		set: {el: $("#SHW-PL-BYMAP"), txt: TEXT_ACTMAP, func: function(){
			//TODO: show by map
			var name = pointList.getSelectedName(), point = {};
		}},
		ren: {el: $("#SHW-PL-RENAME"), txt: TEXT_ACTREN, func: function(){
			var org = pointList.getSelectedName();
			bootbox.prompt({
				title: TEXT_PROMPT, value: org,
				callback: function(name) {
					if (name === null){ return; }
					name = name.replace(/(^\s+|\s+$)/g, "");
					var inValidMessage = shw.selectPoint.isValidName(name);
					if(!inValidMessage){
						shw.common.storageAccessor(function(json){
							json.points.forEach(function(point){
								if(point.name == org){ point.name = name; }
							});
						});
						pointList.refreshList();
					} else { bootbox.alert(inValidMessage); }
				},
			});
		}},
		del: {el: $("#SHW-PL-REMOVE"), txt: TEXT_ACTDEL, func: function(){
			var name = pointList.getSelectedName();
			shw.common.storageAccessor(function(json){
				json.points = json.points.filter(function(point){
					return point.name != name ? true : false;//not equal
				});
			});
			pointList.refreshList();
		}},
		sort_by_name: {el: $("#SHW-PL-BYNAME"), txt: TEXT_BYNAME, func: function(){
			sortPoints(function(a, b){
				if(a.name < b.name){return -1;}
				if(a.name > b.name){return  1;}
				if(a.name == b.name){return 0;}
			});
		}},
		sort_by_date: {el: $("#SHW-PL-BYDATE"), txt: TEXT_BYDATE, func: function(){
			sortPoints(function(a, b){
				var ad = new Date(a.addat);
				var bd = new Date(b.addat);
				return ad - bd;
			});
		}},
		sort_by_dist: {el: $("#SHW-PL-BYDIST"), txt: TEXT_BYDIST, func: function(){
			shw.common.getLocation(function(point){
				sortPoints(function(a, b){
					var ad = geolib.getDistance(point, a.coords);
					var bd = geolib.getDistance(point, b.coords);
					return ad - bd;
				});
			});
		}},
		ex1: {el: $("#SHW-PL-CANCEL1"), txt: TEXT_ACTEXT, func: function(){}},
		ex2: {el: $("#SHW-PL-CANCEL2"), txt: TEXT_ACTEXT, func: function(){}},
	};
	$(header).html(TEXT_TITLE);
	$(leftButton).html(TEXT_RETURN);
	$(rightButton).html(TEXT_ACTION);
	$("#SHW-PL-ADD").html(TEXT_ACTADD);
	$(leftButton).on("click tap", function(){
		shw.common.popPage();
	});
	$(rightButton).on("click tap", function(){
		//TODO: sort
	});
	$("#SHW-PL-ADD").on("click tap", function(){
		shw.common.pushPage("select_point");
	});
	Object.keys(actions).forEach(function(name){
		var action = actions[name];
		$(action.el).html(action.txt).on("click tap", function(){
			action.func();
			$("#SHW-PL-LIST span.SHW-PL-NAME.active").removeClass("active");
		});
	});
	$("#SHW-PL-LIST").on("click tap", "span.SHW-PL-NAME", function(){
		$(this).addClass("active");
		$('#SHW-PL-POINT').val($(this).text());
	})

	shw.pointList = pointList;
});


