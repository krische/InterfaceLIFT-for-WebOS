function SearchAssistant(query) {
	this.searchQuery = query;
	
	this.nullHandleCount = 0;
	this.db = null;
}

SearchAssistant.prototype.setup = function() {
	// the application menu
	this.controller.setupWidget(Mojo.Menu.appMenu, InterfaceLIFT.MenuAttr, InterfaceLIFT.MenuModel);
	
	//search results drawers
	// - Artists
	this.controller.setupWidget('artists-drawer',
		this.artistsDrawerAttributes = {
			modelProperty: 'open',
			unstyled: true
		},
		this.artistsDrawerModel = {
			open: true
		}
	);
	this.artistsDrawer = this.controller.get('artists-drawer');
	// - Wallpapers
	this.controller.setupWidget('wallpapers-drawer',
		this.wallpapersDrawerAttributes = {
			modelProperty: 'open',
			unstyled: true
		},
		this.wallpapersDrawerModel = {
			open: true
		}
	);
	this.wallpapersDrawer = this.controller.get('wallpapers-drawer');
	// - Tags
	this.controller.setupWidget('tags-drawer',
		this.tagsDrawerAttributes = {
			modelProperty: 'open',
			unstyled: true
		},
		this.tagsDrawerModel = {
			open: true
		}
	);
	this.tagsDrawer = this.controller.get('tags-drawer');
	
	//search results lists
	// - Artists
	this.artistsModel = {items: []};
	this.controller.setupWidget("artists-list",
		{
			listTemplate: "lists/searchList-container",
			itemTemplate: "lists/searchList-item"
		},
		this.artistsModel
	);
	// - Wallpapers
	this.wallpapersModel = {items: []};
	this.controller.setupWidget('wallpapers-list',
		{
			listTemplate: "lists/searchList-container",
			itemTemplate: "lists/list-item"
		},
		this.wallpapersModel
	);
	// - Tags
	this.tagsModel = {items: []};
	this.controller.setupWidget('tags-list',
		{
			listTemplate: "lists/searchList-container",
			itemTemplate: "lists/searchList-item"
		},
		this.tagsModel
	);
	
	//spinners
	this.controller.setupWidget('artists-spinner', {}, {spinning: true});
	this.controller.setupWidget('tags-spinner', {}, {spinning: true});
	this.controller.setupWidget('wallpapers-spinner', {}, {spinning: true});
	
	// open the database
	try {
		this.db = openDatabase('ext:ILIFTdb', '', 'InterfaceLIFT Database', 3000000);
	} catch (e) {
		Mojo.Log.info("Database Open Error:", e);		
	}
	
	// get artists
	this.loadArtists();
	
	// get tags
	this.loadTags();
	
	// get wallpapers
	this.loadWallpapers();
	
	this.controller.listen(this.controller.get('artists-divider'), Mojo.Event.tap, this.toggleArtistsDrawer.bindAsEventListener(this));
	this.controller.listen(this.controller.get('wallpapers-divider'), Mojo.Event.tap, this.toggleWallpapersDrawer.bindAsEventListener(this));
	this.controller.listen(this.controller.get('tags-divider'), Mojo.Event.tap, this.toggleTagsDrawer.bindAsEventListener(this));
	this.controller.listen(this.controller.get('artists-list'), Mojo.Event.listTap, this.artistsTap.bindAsEventListener(this));
	this.controller.listen(this.controller.get('wallpapers-list'), Mojo.Event.listTap, this.wallpapersTap.bindAsEventListener(this));
	this.controller.listen(this.controller.get('tags-list'), Mojo.Event.listTap, this.tagsTap.bindAsEventListener(this));
};

SearchAssistant.prototype.loadArtists = function(event) {
	var transactionString = "SELECT name, id, count FROM artists WHERE name LIKE '%" + this.searchQuery + "%';";
	
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
						//push everything into the list model
						for (var i = 0; i < artistName.length; i++) {
							this.artistsModel.items.push({
								artist: artistName[i],
								artistID: artistID[i],
								artistCount: artistCount[i]
							});
						}
						this.controller.modelChanged(this.artistsModel, this);
						
						this.controller.get('artists-label').update('Artists (' + artistName.length + ')');
	
						this.controller.get("searching-artists").hide();
						
						if(artistName.length == 0)
							this.toggleArtistsDrawer();
					}
					catch (e)
					{
						Mojo.Log.info("error", e);	
					} 
				}).bind(this),
				(function (transaction, error) {Mojo.Log.info('SQL Error', error.message);}).bind(this));
		}).bind(this));
};

SearchAssistant.prototype.loadTags = function(event) {
	var transactionString = "SELECT name, id, count FROM tags WHERE name LIKE '%" + this.searchQuery + "%';";
	
	this.db.transaction(
	    (function (transaction) {
			transaction.executeSql(
				transactionString,
				[],
				(function (transaction, results) {
					try {
						var tagName = [], tagID = [], tagCount = [];
						for (var i = 0; i < results.rows.length; i++) {
							var row = results.rows.item(i);
							var name;
							for (name in row)
							{
								if (typeof row[name] !== 'function')
								{
									switch (name) {
										case 'name':
											tagName[i] = row[name];
											break;
										case 'id':
											tagID[i] = row[name];
											break;
										case 'count':
											tagCount[i] = row[name];
											break;
									}
								}
							}
						}
						this.tagsModel.listTitle = this.tagType + ' tags (' + tagName.length + ' tags)';
						
						//push everything into the list model
						for (var i = 0; i < tagName.length; i++) {
							this.tagsModel.items.push({
								tag: tagName[i],
								tagID: tagID[i],
								tagCount: tagCount[i]
							});
						}
						this.controller.modelChanged(this.tagsModel, this);
	
						this.controller.get('tags-label').update('Tags (' + tagName.length + ')');
	
						this.controller.get("searching-tags").hide();
						
						if(tagName.length == 0)
							this.toggleTagsDrawer();
					}
					catch (e)
					{
						Mojo.Log.info("error", e);	
					} 
				}).bind(this),
				(function (transaction, error) {Mojo.Log.info('SQL Error', error.message);}).bind(this));
	    }).bind(this));
};

SearchAssistant.prototype.loadWallpapers = function(event) {
	var transactionString = "SELECT * FROM wallpapers WHERE title LIKE '%" + this.searchQuery + "%' ORDER BY title;";
	
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
							this.wallpapersModel.items.push({
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
						this.controller.modelChanged(this.wallpapersModel, this);
						
						this.controller.get('wallpapers-label').update('wallpapers (' + title.length + ')');
	
						this.controller.get("searching-wallpapers").hide();
						
						if(title.length == 0)
							this.toggleWallpapersDrawer();
					}
					catch (e)
					{
						Mojo.Log.info("error", e);	
					} 
				}).bind(this),
				(function (transaction, error) {Mojo.Log.info('SQL Error', error.message);}).bind(this));
		}).bind(this));
};

SearchAssistant.prototype.artistsTap = function(event) {
	this.controller.stageController.pushScene('artists-detail', event.item);
};

SearchAssistant.prototype.wallpapersTap = function(event) {
	this.controller.stageController.pushScene('wallpaper-detail', event.item);
};

SearchAssistant.prototype.tagsTap = function(event) {
	this.controller.stageController.pushScene('tags-detail', event.item);
};

SearchAssistant.prototype.toggleArtistsDrawer = function(event) {
	this.artistsDrawer.mojo.toggleState();
	if (this.artistsDrawer.mojo.getOpenState() == true) {
		this.controller.get('artists-arrow').removeClassName('palm-arrow-closed').addClassName('palm-arrow-expanded');
	} else {
		this.controller.get('artists-arrow').removeClassName('palm-arrow-expanded').addClassName('palm-arrow-closed');
	}
};

SearchAssistant.prototype.toggleWallpapersDrawer = function(event) {
	this.wallpapersDrawer.mojo.toggleState();
	if (this.wallpapersDrawer.mojo.getOpenState() == true) {
		this.controller.get('wallpapers-arrow').removeClassName('palm-arrow-closed').addClassName('palm-arrow-expanded');
	} else {
		this.controller.get('wallpapers-arrow').removeClassName('palm-arrow-expanded').addClassName('palm-arrow-closed');
	}
};

SearchAssistant.prototype.toggleTagsDrawer = function(event) {
	this.tagsDrawer.mojo.toggleState();
	if (this.tagsDrawer.mojo.getOpenState() == true) {
		this.controller.get('tags-arrow').removeClassName('palm-arrow-closed').addClassName('palm-arrow-expanded');
	} else {
		this.controller.get('tags-arrow').removeClassName('palm-arrow-expanded').addClassName('palm-arrow-closed');
	}
};

SearchAssistant.prototype.activate = function(event) {
};

SearchAssistant.prototype.deactivate = function(event) {
};

SearchAssistant.prototype.cleanup = function(event) {
	this.controller.stopListening(this.controller.get('artists-list'), Mojo.Event.listTap, this.artistsTap);
	this.controller.stopListening(this.controller.get('wallpapers-list'), Mojo.Event.listTap, this.wallpapersTap);
	this.controller.stopListening(this.controller.get('tags-list'), Mojo.Event.listTap, this.tagsTap);
	this.controller.stopListening(this.controller.get('artists-divider'), Mojo.Event.tap, this.toggleArtistsDrawer);
	this.controller.stopListening(this.controller.get('wallpapers-divider'), Mojo.Event.tap, this.toggleWallpapersDrawer);
	this.controller.stopListening(this.controller.get('tags-divider'), Mojo.Event.tap, this.toggleTagsDrawer);
};
