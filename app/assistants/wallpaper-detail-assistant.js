function WallpaperDetailAssistant(info) {
	this.details = info;
	// database stuff
	this.nullHandleCount = 0;
	this.db = null;
}

WallpaperDetailAssistant.prototype.setup = function() {
	// the application menu
	this.controller.setupWidget(Mojo.Menu.appMenu, InterfaceLIFT.MenuAttr, InterfaceLIFT.MenuModel);
	
	this.controller.get('no-more').hide();
	this.controller.get('more-left').hide();
	this.controller.get('more-right').hide();
	
	var preview = '<img src=\'' + this.details.preview_240x150 + '\'></img>';
	this.controller.get('preview').update(preview);
	this.controller.get('title').update(this.details.title);
	this.controller.get('description').update(this.details.description);
	this.controller.get('more-by-artist').update('More by: ' + this.details.artist);
	
	// Add Favorite button
	this.controller.setupWidget("add-favorite", {},
		this.favoritesModel = {
             label : "Add to Favorites",
             disabled: false,
			 buttonClass: 'affirmative'
		});
	
	// more images drawer
	this.controller.setupWidget("drawer", {},
        this.drawerModel = {
            open: true
        });
	
	// more images list
   	this.controller.setupWidget("moreList",
      {
	  	 listTemplate: "lists/scrollList-Container",
         itemTemplate: "lists/scrollList-Item",
		 renderLimit: 50
      },
      this.moreModel = {items: []}
   	);
	this.controller.setupWidget("scrollerId", {}, {mode: 'horizontal-snap'});
	
	// open the database
	try {
		this.db = openDatabase('ext:ILIFTdb', '', 'InterfaceLIFT Database', 3000000);
	} catch (e) {
		Mojo.Log.info("Database Open Error:", e);		
	}
	
	// listeners
	this.controller.listen(this.controller.get('preview'), Mojo.Event.tap, this.previewTap.bindAsEventListener(this));
	this.controller.listen(this.controller.get('add-favorite'), Mojo.Event.tap, this.addFavorite.bindAsEventListener(this));
	this.controller.listen(this.controller.get('drawer-button'), Mojo.Event.tap, this.toggleDrawer.bindAsEventListener(this));
	this.controller.listen(this.controller.get("moreList"), Mojo.Event.listTap, this.scrollListTap.bindAsEventListener(this));
	
	this.getMore();
	this.getFavorite();
};

WallpaperDetailAssistant.prototype.getMore = function(event) {
	var transactionString = "SELECT * FROM wallpapers WHERE artistID='" + this.details.artistID + "';";
	
	this.db.transaction(
	    (function (transaction) {
			transaction.executeSql(
				transactionString,
				[],
				(function (transaction, results) {
					try {
						var title = [], artist = [], artistID = [], description = [], preview = [], preview_240x150 = [], download = [], date = [];
						Mojo.Log.info('rows', results.rows.length);
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
							if (preview_240x150[i] != this.details.preview_240x150) {
								this.moreModel.items.push({
									title: title[i],
									artist: artist[i],
									artistID: artistID[i],
									description: description[i],
									preview_240x150: preview_240x150[i],
									download: download[i],
									date: date[i]
								});
							}
						}
						this.controller.modelChanged(this.moreModel, this);
						
						if(this.moreModel.items.length == 0) {
							this.controller.get('no-more').show();
							this.controller.get('drawer').mojo.setOpenState(false);
							this.controller.get('more-arrow').removeClassName('palm-arrow-expanded').addClassName('palm-arrow-closed');
						} else {
							this.controller.get('more-left').show();
							this.controller.get('more-right').show();
							this.controller.get('drawer').mojo.setOpenState(true);
							this.controller.get('more-arrow').removeClassName('palm-arrow-closed').addClassName('palm-arrow-expanded');
						}
						
						this.controller.getSceneScroller().mojo.scrollTo(0,0);
					}
					catch (e)
					{
						Mojo.Log.info("error", e);	
					} 
				}).bind(this),
				(function (transaction, error) {Mojo.Log.info('SQL Error', error.message);}).bind(this));
		}).bind(this));
};

WallpaperDetailAssistant.prototype.getFavorite = function(event) {
	var transactionString = "SELECT * FROM favorites WHERE preview='" + this.details.preview + "';";
	this.db.transaction(
	    (function (transaction) {
			transaction.executeSql(
				transactionString,
				[],
				(function (transaction, results) {
					try {
						if (results.rows.length == 0) { // it's not a favorite
							this.favoritesModel.label = 'Add to Favorites';
							this.favoritesModel.buttonClass = 'affirmative';
						} else { // it is a favorite
							this.favoritesModel.label = 'Remove from Favorites';
							this.favoritesModel.buttonClass = 'negative';
						}
						this.controller.modelChanged(this.favoritesModel, this);
					}
					catch (e)
					{
						Mojo.Log.info("error", e);	
					} 
				}).bind(this),
				(function (transaction, error) {Mojo.Log.info('SQL Error', error.message);}).bind(this));
		}).bind(this));
};

WallpaperDetailAssistant.prototype.previewTap = function(event) {
	this.controller.stageController.pushScene('image-viewer', this.details.download);
};

WallpaperDetailAssistant.prototype.scrollListTap = function(event) {
	this.controller.stageController.swapScene('wallpaper-detail', event.item);
};

WallpaperDetailAssistant.prototype.addFavorite = function(event) {
	if (this.favoritesModel.buttonClass == 'affirmative') {
		//add as a favorite
		InterfaceLIFT.Database.loadFavorite(this.details);
		this.favoritesModel.label = 'Remove from Favorites';
		this.favoritesModel.buttonClass = 'negative';
		this.controller.modelChanged(this.favoritesModel, this);
	} else {
		//remove favorite
		InterfaceLIFT.Database.removeFavorite(this.details);
		this.favoritesModel.label = 'Add to Favorites';
		this.favoritesModel.buttonClass = 'affirmative';
		this.controller.modelChanged(this.favoritesModel, this);
	}
};

WallpaperDetailAssistant.prototype.toggleDrawer = function(event) {
	this.controller.get('drawer').mojo.toggleState();
	if (this.controller.get('drawer').mojo.getOpenState() == true) {
		this.controller.get('more-arrow').removeClassName('palm-arrow-closed').addClassName('palm-arrow-expanded');
	} else {
		this.controller.get('more-arrow').removeClassName('palm-arrow-expanded').addClassName('palm-arrow-closed');
	}
};

WallpaperDetailAssistant.prototype.activate = function(event) {
};

WallpaperDetailAssistant.prototype.deactivate = function(event) {
	
};

WallpaperDetailAssistant.prototype.cleanup = function(event) {
	this.controller.stopListening(this.controller.get('preview'), Mojo.Event.tap, this.previewTap);
	this.controller.stopListening(this.controller.get('add-favorite'), Mojo.Event.tap, this.addFavorite);
	this.controller.stopListening(this.controller.get('drawer-button'), Mojo.Event.tap, this.toggleDrawer);
	this.controller.stopListening(this.controller.get("moreList"), Mojo.Event.listTap, this.scrollListTap);
};
