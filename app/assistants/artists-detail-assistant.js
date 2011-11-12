function ArtistsDetailAssistant(artistItem) {
	this.artistID = artistItem.artistID;
	this.artist = artistItem.artist;
	this.artistCount = artistItem.artistCount;
	
	// database stuff
	this.nullHandleCount = 0;
	this.db = null;
}

ArtistsDetailAssistant.prototype.setup = function() {
	// the application menu
	this.controller.setupWidget(Mojo.Menu.appMenu, InterfaceLIFT.MenuAttr, InterfaceLIFT.MenuModel);
	
	// main list
   	this.controller.setupWidget("wallpaperList",
      {
	  	 listTemplate: "lists/list-container",
         itemTemplate: "lists/list-item",
		 renderLimit: 50
      }, this.previewModel = {
			listTitle: '',
			items: []}
   	);
	
	// open the database
	try {
		this.db = openDatabase('ext:ILIFTdb', '', 'InterfaceLIFT Database', 3000000);
	} catch (e) {
		Mojo.Log.info("Database Open Error:", e);		
	}
	
	this.getWallpapers();
};

ArtistsDetailAssistant.prototype.getWallpapers = function(event) {
	var transactionString = "SELECT * FROM wallpapers WHERE artistID='" + this.artistID + "' ORDER BY title;;";
	
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
							this.previewModel.items.push({
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
						this.previewModel.listTitle = this.artist + '\'s wallpapers';
						this.controller.modelChanged(this.previewModel, this);
					}
					catch (e)
					{
						Mojo.Log.info("error", e);	
					} 
				}).bind(this),
				(function (transaction, error) {Mojo.Log.info('SQL Error', error.message);}).bind(this));
		}).bind(this));
};

ArtistsDetailAssistant.prototype.listTap = function(event) {
	this.controller.stageController.pushScene('wallpaper-detail', event.item);
};

ArtistsDetailAssistant.prototype.getFailure = function(transport) {
	// There has been a general HTTP failure
	Mojo.Controller.errorDialog("HTTP Failure: "+transport.status, this.controller.window);
};


ArtistsDetailAssistant.prototype.activate = function(event) {
	this.controller.listen(this.controller.get("wallpaperList"), Mojo.Event.listTap, this.listTap.bindAsEventListener(this));
};

ArtistsDetailAssistant.prototype.deactivate = function(event) {
	this.controller.stopListening(this.controller.get("wallpaperList"), Mojo.Event.listTap, this.listTap.bindAsEventListener(this));
};

ArtistsDetailAssistant.prototype.cleanup = function(event) {
};
