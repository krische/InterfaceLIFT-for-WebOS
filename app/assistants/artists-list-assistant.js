function ArtistsListAssistant(sort) {
	this.artistSort = sort;
	this.start = 0;
	this.stop = 100;
	
	this.nullHandleCount = 0;
	this.db = null;
}

ArtistsListAssistant.prototype.setup = function() {
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
		
	// search related listeners
	this.controller.listen(this.controller.get('search'), Mojo.Event.tap, this.toggleMenuPanel.bindAsEventListener(this));
	this.controller.listen(this.menuScrim, Mojo.Event.tap, this.toggleMenuPanel.bindAsEventListener(this));
	this.controller.listen(this.controller.get("searchBox"), Mojo.Event.propertyChange, this.getSearch.bindAsEventListener(this));
	this.controller.listen(this.controller.get('searchButton'), Mojo.Event.tap, this.getSearch.bindAsEventListener(this));
	
	
	// View Menu
	this.commandMenu = {
		visible: true,
		items: [
			{items: [{label: $L('Sort'), command:'artist-sort'}]},
			{},
			{toggleCmd: 'go-artists', items: [
				{icon: 'menu-artists',command:'go-artists'},
				{icon: 'menu-tags', command:'go-tags'},
				{icon: 'menu-wallpapers', command:'go-wallpapers'}]}]
	};
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenu);
	
	// Artists List
   	this.controller.setupWidget("artistList",
		{
			listTemplate: "lists/tagsList-container",
			itemTemplate: "lists/tagsList-item",
			renderLimit: 100
      }, this.artistModel = {
			listTitle: 'All Artists',
			items: []});
	this.controller.listen(this.controller.get("artistList"), Mojo.Event.listTap, this.artistTap.bindAsEventListener(this));
	
	// load more button
	this.controller.setupWidget("loadMore",
         this.loadAttributes = {
             },
         this.loadModel = {
             label : "Load More",
             disabled: false
         }
     );
	this.controller.listen(this.controller.get('loadMore'), Mojo.Event.tap, this.loadMore.bindAsEventListener(this));
	
	// open the database
	try {
		this.db = openDatabase('ext:ILIFTdb', '', 'InterfaceLIFT Database', 3000000);
	} catch (e) {
		Mojo.Log.info("Database Open Error:", e);		
	}
	
	this.loadArtists();
};

ArtistsListAssistant.prototype.animateMenuPanel = function(panel, reverse, callback) {
	Mojo.Animation.animateStyle(panel, 'top', 'bezier', {
		from: this.menuPanelHiddenTop,
		to: this.menuPanelVisibleTop,
		duration: .25,
		curve:'over-easy',
		reverse:reverse,
		onComplete:callback
		});
};

ArtistsListAssistant.prototype.menuPanelOn = function(){
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
	
ArtistsListAssistant.prototype.menuPanelOff = function(){
	var animateMenuCallback;
	var that = this;
	that.panelOpen = false;
	animateMenuCallback = function(){
		that.menupanel.hide();
		Mojo.Animation.Scrim.animate(that.menuScrim, 1, 0, that.menuScrim.hide.bind(that.menuScrim));
	};
	this.animateMenuPanel(this.menupanel, true, animateMenuCallback);
};
	
ArtistsListAssistant.prototype.toggleMenuPanel = function(e){
	if(this.panelOpen){
		this.menuPanelOff();
	}else{
		this.menuPanelOn();
	}
};

ArtistsListAssistant.prototype.getSearch = function(event) {
	if (this.controller.get('searchBox').mojo.getValue().length > 2) {
		this.controller.stageController.pushScene('search', this.controller.get('searchBox').mojo.getValue());
	} else {
		Mojo.Controller.errorDialog('Please enter a minimum of 3 characters for a search.', this.controller.window);
	}
};

ArtistsListAssistant.prototype.loadArtists = function(event) {
	// Query artists tables
	if (this.artistSort == 'alphabetically')
		var transactionString = 'SELECT name, id, count FROM artists ORDER BY name;';
	else if (this.artistSort == 'numerically')
		var transactionString = 'SELECT name, id, count FROM artists ORDER BY count DESC;';
	
	this.db.transaction(
	    (function (transaction) {
			transaction.executeSql(
				transactionString,
				[],
				(function (transaction, results) {
					try {
						var artistName = [], artistID = [], artistCount = [];
						for (var i = 0; i < results.rows.length; i++) {
							var row = results.rows.item(i);
							var name;
							for (name in row)
							{
								if (typeof row[name] !== 'function')
								{
									switch (name) {
										case 'name':
											artistName[i] = row[name];
											break;
										case 'id':
											artistID[i] = row[name];
											break;
										case 'count':
											artistCount[i] = row[name];
											break;
									}
								}
							}
						}
						this.artistModel.listTitle = 'All ' + artistName.length + ' artists';
						
						//push everything into the list model
						for (var i = this.start; (i < this.stop) && (i < artistName.length); i++) {
							this.artistModel.items.push({
								artist: artistName[i],
								artistID: artistID[i],
								artistCount: artistCount[i]
							});
						}
						this.controller.modelChanged(this.artistModel, this);
						
						if (this.artistModel.items.length >= artistName.length)
							this.controller.get('loadMore').hide();
					}
					catch (e)
					{
						Mojo.Log.info("error", e);	
					} 
				}).bind(this),
				(function (transaction, error) {Mojo.Log.info('SQL Error', error.message);}).bind(this));
		}).bind(this));
};

ArtistsListAssistant.prototype.artistTap = function(event) {
	this.controller.stageController.pushScene('artists-detail', event.item);
};

ArtistsListAssistant.prototype.loadMore = function(event) {
	this.start += 100;
	this.stop += 100;
	this.loadArtists();
};

ArtistsListAssistant.prototype.handleCommand = function(event){
	if (event.type == Mojo.Event.command) {
		switch (event.command) {
			case 'artist-sort':
				if (this.artistSort == 'alphabetically') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [{
							label: $L('Alphabetically'),
							command: 'sort-alphabetically',
							icon: 'checkmark'
						}, {
							label: $L('Numerically'),
							command: 'sort-numerically'
						}]
					});
				}
				else 
					if (this.artistSort == 'numerically') {
						this.controller.popupSubmenu({
							onChoose: this.popupMenu,
							placeNear: event.originalEvent.target,
							items: [{
								label: $L('Alphabetically'),
								command: 'sort-alphabetically'
							}, {
								label: $L('Numerically'),
								command: 'sort-numerically',
								icon: 'checkmark'
							}]
						});
					}
				break;
			case 'go-tags':
				this.controller.stageController.swapScene('tags-list', 'Color', 'alphabetically');
				break;
			case 'go-wallpapers':
				this.controller.stageController.swapScene('main');
				break;
		}
	}
};

ArtistsListAssistant.prototype.popupMenu = function(command) {
	switch(command) {
		case 'sort-alphabetically':
			this.controller.stageController.swapScene('artists-list', 'alphabetically');
			break;
		case 'sort-numerically':
			this.controller.stageController.swapScene('artists-list', 'numerically');
			break;
	}
};

ArtistsListAssistant.prototype.activate = function(event) {

};

ArtistsListAssistant.prototype.deactivate = function(event) {

};

ArtistsListAssistant.prototype.cleanup = function(event) {
	// search related
	this.controller.stopListening(this.controller.get('search'), Mojo.Event.tap, this.toggleMenuPanel);
	this.controller.stopListening(this.menuScrim, Mojo.Event.tap, this.toggleMenuPanel);
	this.controller.stopListening(this.controller.get("searchBox"), Mojo.Event.propertyChange, this.getSearch);
	this.controller.stopListening(this.controller.get('searchButton'), Mojo.Event.tap, this.getSearch);
	
	// others
	this.controller.stopListening(this.controller.get("artistList"), Mojo.Event.listTap, this.artistTap.bindAsEventListener(this));
	this.controller.stopListening(this.controller.get('loadMore'), Mojo.Event.tap, this.loadMore.bindAsEventListener(this));
};
