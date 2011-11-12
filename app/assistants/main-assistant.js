function MainAssistant() {
	this.baseURL = 'http://webos.interfacelift.com/feed/';
	this.sort = 'date.php';
	this.sortTitle = 'Most Recent';
	this.resolution = '?res=320x480&start=';
	this.start = 0;
	this.stop = '&stop=15';
	
	// database stuff
	this.nullHandleCount = 0;
	this.db = null;
}

MainAssistant.prototype.setup = function() {
	// the application menu
	this.controller.setupWidget(Mojo.Menu.appMenu, InterfaceLIFT.MenuAttr, InterfaceLIFT.MenuModel);
	
	/*
	 * Search Menu when user taps header
	 */
	// menu panel
	this.menupanel = this.controller.sceneElement.querySelector('div[x-mojo-menupanel]');
	this.menuScrim = this.controller.sceneElement.querySelector('div[x-mojo-menupanel-scrim]');

	this.menuPanelVisibleTop = this.menupanel.offsetTop;
	this.menupanel.style.top = (0 - this.menupanel.offsetHeight - this.menupanel.offsetTop)+'px';
	this.menuPanelHiddenTop = this.menupanel.offsetTop;
	
	this.menuScrim.hide();
	this.menuScrim.style.opacity = 0;
	this.menuPanelOff();
	
	// menu panel search text field
	this.controller.setupWidget('searchBox', {
			hintText: 'search...',
			focus: true, 
			focusMode: Mojo.Widget.focusSelectMode,
			requiresEnterKey: true,
			textCase: Mojo.Widget.steModeLowerCase}, {});
	
	// menu panel search button
	this.controller.setupWidget("searchButton",{}, {
		label : "Search",
		disabled: false});
	
	this.controller.setupWidget("BigSpinner",
        this.BigSpinnerAttributes = {
            spinnerSize: "large"
        },
        this.BigSpinnerModel = {
            spinning: true 
        }
    );
	
	// favorites
   	this.controller.setupWidget("favorites",
      {
	  	 listTemplate: "lists/scrollList-Container",
         itemTemplate: "lists/scrollList-Item",
		 renderLimit: 50
      },
      this.favoritesModel = {items: []}
   	);
	this.controller.setupWidget("scrollerId", {}, {mode: 'horizontal-snap'});
	this.controller.get('no-favorites').hide();
	this.controller.get('fav-left').hide();
	this.controller.get('fav-right').hide();
	
	// main list
   	this.previewModel = {items: []};
   	this.controller.setupWidget("menuList",
      {
	  	 listTemplate: "lists/list-container",
         itemTemplate: "lists/list-item",
		 renderLimit: 50
      },
      this.previewModel
   	);
	
	// View Menu
	this.commandMenu = {
		
		visible: true,
		items: [
			{items: [{label: $L('Sort'), command: 'sort'}]},
			{},
			{toggleCmd: 'go-wallpapers', items: [
				{icon: 'menu-artists',command:'go-artists'},
				{icon: 'menu-tags', command:'go-tags'},
				{icon: 'menu-wallpapers', command:'go-wallpapers'}]}
		]
	};
 
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenu);
	
	// load more button
	this.controller.setupWidget("loadMore",
         this.loadAttributes = {
             },
         this.loadModel = {
             label : "Load More",
             disabled: false
         }
     );
	 
	 // open the database
	try {
		this.db = openDatabase('ext:ILIFTdb', '', 'InterfaceLIFT Database', 3000000);
	} catch (e) {
		Mojo.Log.info("Database Open Error:", e);		
	}
	
	var pageURL = this.baseURL+this.sort+this.resolution+this.start+this.stop;
	this.getPage(pageURL);
	
	// search related listeners
	this.controller.listen(this.controller.get('search'), Mojo.Event.tap, this.toggleMenuPanel.bindAsEventListener(this));
	this.controller.listen(this.menuScrim, Mojo.Event.tap, this.toggleMenuPanel.bindAsEventListener(this));
	this.controller.listen(this.controller.get("searchBox"), Mojo.Event.propertyChange, this.getSearch.bindAsEventListener(this));
	this.controller.listen(this.controller.get('searchButton'), Mojo.Event.tap, this.getSearch.bindAsEventListener(this));
	
	// other listeners
	this.controller.listen(this.controller.get("favorites"), Mojo.Event.listTap, this.favoriteTap.bindAsEventListener(this));
	this.controller.listen(this.controller.get("menuList"), Mojo.Event.listTap, this.listTap.bindAsEventListener(this));
	this.controller.listen(this.controller.get('loadMore'), Mojo.Event.tap, this.loadMore.bindAsEventListener(this));
	
};

MainAssistant.prototype.animateMenuPanel = function(panel, reverse, callback) {
	Mojo.Animation.animateStyle(panel, 'top', 'bezier', {
		from: this.menuPanelHiddenTop,
		to: this.menuPanelVisibleTop,
		duration: .25,
		curve:'over-easy',
		reverse:reverse,
		onComplete:callback
		});
};

MainAssistant.prototype.menuPanelOn = function(){
	var animateMenuCallback;
	var that = this;
	that.panelOpen = true;
	this.menuScrim.style.opacity = 0;
	this.menuScrim.show();
	animateMenuCallback = function(){
		that.menupanel.show();
		that.animateMenuPanel(that.menupanel, false, Mojo.doNothing);
	};
	Mojo.Animation.Scrim.animate(this.menuScrim, 0, 1, animateMenuCallback);
	Mojo.View.makeFocusable(this.controller.get('searchBox'));
	this.controller.get('searchBox').mojo.focus();
};
	
MainAssistant.prototype.menuPanelOff = function(){
	var animateMenuCallback;
	var that = this;
	that.panelOpen = false;
	animateMenuCallback = function(){
		that.menupanel.hide();
		Mojo.Animation.Scrim.animate(that.menuScrim, 1, 0, that.menuScrim.hide.bind(that.menuScrim));
	};
	this.animateMenuPanel(this.menupanel, true, animateMenuCallback);
};
	
MainAssistant.prototype.toggleMenuPanel = function(e){
	if(this.panelOpen){
		this.menuPanelOff();
	}else{
		this.menuPanelOn();
	}
};

MainAssistant.prototype.getPage = function(url) {
	var request = new Ajax.Request(url, {
		method: 'get',
		evalJSON: 'false',
		onSuccess: this.parsePage.bind(this),
		onFailure: this.getFailure.bind(this)
	});
};

MainAssistant.prototype.parsePage = function(transport) {
	var titles = [], artists = [], artistIDs = [], descriptions = [], previews = [], previews_240x150 = [], downloads = [], dates = [];
	// Use responseText, not responseXML!! try: reponseJSON 
	var xmlstring = transport.responseText;
	// Convert the string to an XML object
	var xmlobject = (new DOMParser()).parseFromString(xmlstring, "text/xml");
	
	// Use xpath to parse xml object
	var nodes = document.evaluate('channel/item', xmlobject, null, XPathResult.ANY_TYPE, null);
	
	var result = nodes.iterateNext();
	var i = 0;
	while (result)
	{
	  	titles[i] = result.getElementsByTagName('title')[0].childNodes[0].nodeValue;
		artists[i] = result.getElementsByTagName('artistname')[0].childNodes[0].nodeValue;
		artistIDs[i] = result.getElementsByTagName('artistid')[0].childNodes[0].nodeValue;
		descriptions[i] = result.getElementsByTagName('description')[0].childNodes[0].nodeValue;
		previews[i] = result.getElementsByTagName('preview')[0].childNodes[0].nodeValue;
		previews_240x150[i] = result.getElementsByTagName('preview_240x150')[0].childNodes[0].nodeValue;
		downloads[i] = result.getElementsByTagName('download')[0].childNodes[0].nodeValue;
		dates[i] = result.getElementsByTagName('dateformat')[0].childNodes[0].nodeValue;
		i++;
		result=nodes.iterateNext();
	}
	
	//push everything into the list model
	for (var i = 0; i < titles.length; i++) {
		this.previewModel.items.push({
			title: titles[i],
			artist: artists[i],
			artistID: artistIDs[i],
			description: descriptions[i],
			preview: previews[i],
			preview_240x150: previews_240x150[i],
			download: downloads[i],
			date: dates[i]
		});
	}
	
	this.previewModel.listTitle = this.sortTitle + ' wallpapers';
	this.controller.modelChanged(this.previewModel, this);
	
	this.controller.get("Scrim").hide();
	this.BigSpinnerModel.spinning = false;
	this.controller.modelChanged(this.BigSpinnerModel);
};

MainAssistant.prototype.getSearch = function(event) {
	if (this.controller.get('searchBox').mojo.getValue().length > 2) {
		this.controller.stageController.pushScene('search', this.controller.get('searchBox').mojo.getValue());
	} else {
		Mojo.Controller.errorDialog('Please enter a minimum of 3 characters for a search.', this.controller.window);
	}
};

MainAssistant.prototype.getFailure = function(transport) {
	// There has been a general HTTP failure
	Mojo.Controller.errorDialog("HTTP Failure: "+transport.status, this.controller.window);
};

MainAssistant.prototype.loadMore = function(event) {
	this.start += 15;
	this.controller.get("Scrim").show();
	this.BigSpinnerModel.spinning = true;
	this.controller.modelChanged(this.BigSpinnerModel);
	var pageURL = this.baseURL+this.sort+this.resolution+this.start+this.stop;
	this.getPage(pageURL);
};

MainAssistant.prototype.getFavorites = function(event) {
	var transactionString = "SELECT * FROM favorites;";
	
	this.db.transaction(
	    (function (transaction) {
			transaction.executeSql(
				transactionString,
				[],
				(function (transaction, results) {
					try {
						var title = [], artist = [], artistID = [], description = [], preview = [], preview_240x150 = [], download = [], date = [];
						for (var i = 0; i < results.rows.length; i++) {
							var row = results.rows.item(i);
							var name;
							for (name in row)
							{
								if (typeof row[name] !== 'function')
								{
									switch (name) {
										case 'title':
											title[i] = row[name];
											break;
										case 'artist':
											artist[i] = row[name];
											break;
										case 'artistID':
											artistID[i] = row[name];
											break;
										case 'description':
											description[i] = row[name];
											break;
										case 'preview':
											preview[i] = row[name];
											break;
										case 'preview240x150':
											preview_240x150[i] = row[name];
											break;
										case 'download':
											download[i] = row[name];
											break;
										case 'date':
											date[i] = row[name];
											break;
									}
								}
							}
						}
						//push everything into the list model
						for (var i = 0; i < title.length; i++) {
							this.favoritesModel.items.push({
								title: title[i],
								artist: artist[i],
								artistID: artistID[i],
								description: description[i],
								preview: preview[i],
								preview_240x150: preview_240x150[i],
								download: download[i],
								date: date[i]
							});
						}
						this.controller.modelChanged(this.favoritesModel, this);
						
						if(this.favoritesModel.items.length == 0) {
							this.controller.get('no-favorites').show();
							this.controller.get('fav-left').hide();
							this.controller.get('fav-right').hide();
						} else {
							this.controller.get('no-favorites').hide();
							this.controller.get('fav-left').show();
							this.controller.get('fav-right').show();
						}
					}
					catch (e)
					{
						Mojo.Log.info("error", e);	
					} 
				}).bind(this),
				(function (transaction, error) {Mojo.Log.info('SQL Error', error.message);}).bind(this));
		}).bind(this));
};

MainAssistant.prototype.listTap = function(event) {
	this.controller.stageController.pushScene('wallpaper-detail', event.item);
};

MainAssistant.prototype.favoriteTap = function(event) {
	this.controller.stageController.pushScene('wallpaper-detail', event.item);
};

MainAssistant.prototype.handleCommand = function(event) {
	if(event.type == Mojo.Event.command) {
		switch(event.command) {
			case "sort":
				if (this.sort == 'date.php') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [{
							label: 'Date',
							command: 'sort-date',
							icon: 'checkmark'
						}, {
							label: 'Downloads',
							command: 'sort-downloads'
						}, {
							label: 'Random',
							command: 'sort-random'
						}]
					});
				} else if (this.sort == 'popular.php') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [{
							label: 'Date',
							command: 'sort-date'
						}, {
							label: 'Downloads',
							command: 'sort-downloads',
							icon: 'checkmark'
						}, {
							label: 'Random',
							command: 'sort-random'
						}]
					});
				} else if (this.sort == 'random.php') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [{
							label: 'Date',
							command: 'sort-date'
						}, {
							label: 'Downloads',
							command: 'sort-downloads'
						}, {
							label: 'Random',
							command: 'sort-random',
							icon: 'checkmark'
						}]
					});
				}
				break;
			case 'go-artists':
				this.controller.stageController.swapScene('artists-list', 'alphabetically');
				break;
			case 'go-tags':
				this.controller.stageController.swapScene('tags-list', 'Color', 'alphabetically');
				break;
		}
	}
};

MainAssistant.prototype.popupMenu = function(command) {
	switch(command) {
		case "sort-date":
			this.sort = 'date.php';
			this.sortTitle = 'Most Recent';
			this.start=0;
			this.previewModel.items.length = 0;
			this.controller.get("Scrim").show();
			this.BigSpinnerModel.spinning = true;
			this.controller.modelChanged(this.BigSpinnerModel);
			this.controller.getSceneScroller().mojo.scrollTo(0,0);
			var pageURL = this.baseURL+this.sort+this.resolution+this.start+this.stop;
			this.getPage(pageURL);
			break;
		case 'sort-downloads':
			this.sort = 'popular.php';
			this.sortTitle = 'Most Popular';
			this.previewModel.items.length = 0;
			this.start=0;
			this.controller.get("Scrim").show();
			this.BigSpinnerModel.spinning = true;
			this.controller.modelChanged(this.BigSpinnerModel);
			this.controller.getSceneScroller().mojo.scrollTo(0,0);
			var pageURL = this.baseURL+this.sort+this.resolution+this.start+this.stop;
			this.getPage(pageURL);
			break;
		case 'sort-random':
			this.sort = 'random.php';
			this.sortTitle = 'Random';
			this.previewModel.items.length = 0;
			this.controller.get("Scrim").show();
			this.BigSpinnerModel.spinning = true;
			this.controller.modelChanged(this.BigSpinnerModel);
			this.start=0;
			this.controller.getSceneScroller().mojo.scrollTo(0,0);
			var pageURL = this.baseURL+this.sort+this.resolution+this.start+this.stop;
			this.getPage(pageURL);
			break;
	}
};

MainAssistant.prototype.activate = function(event) {
	this.favoritesModel.items.length = 0;
	this.controller.modelChanged(this.favoritesModel, this);
	this.getFavorites();	
};

MainAssistant.prototype.deactivate = function(event) {
};

MainAssistant.prototype.cleanup = function(event) {
	// search related
	this.controller.stopListening(this.controller.get('search'), Mojo.Event.tap, this.toggleMenuPanel);
	this.controller.stopListening(this.menuScrim, Mojo.Event.tap, this.toggleMenuPanel);
	this.controller.stopListening(this.controller.get("searchBox"), Mojo.Event.propertyChange, this.getSearch);
	this.controller.stopListening(this.controller.get('searchButton'), Mojo.Event.tap, this.getSearch);
	
	// everything else
	this.controller.stopListening(this.controller.get("menuList"), Mojo.Event.listTap, this.listTap);
	this.controller.stopListening(this.controller.get("loadMore"), Mojo.Event.tap, this.listTap);
};