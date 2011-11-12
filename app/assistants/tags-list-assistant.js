function TagsListAssistant(type, sort) {
	this.tagType = type;
	this.tagSort = sort;
	
	this.start = 0;
	this.stop = 100;
	
	this.nullHandleCount = 0;
	this.db = null;
}

TagsListAssistant.prototype.setup = function() {
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
			{items: [
				{label: $L('Type'), command:'tag-type'},
				{label: $L('Sort'), command:'tag-sort'}]},
			{},
			{toggleCmd: 'go-tags', items: [
				{icon: 'menu-artists',command:'go-artists'},
				{icon: 'menu-tags', command:'go-tags'},
				{icon: 'menu-wallpapers', command:'go-wallpapers'}]}]
	};
 
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.commandMenu);
	
	// Tags List
	this.tagItems = [];
   	this.controller.setupWidget("tagList",
		{
			listTemplate: "lists/tagsList-container",
			itemTemplate: "lists/tagsList-item",
			renderLimit: 100
      }, this.tagsModel = {
			listTitle: this.tagType + ' tags',
			items: []});
	this.controller.listen(this.controller.get("tagList"), Mojo.Event.listTap, this.tagTap.bindAsEventListener(this));
	
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

	this.loadTags();
};

TagsListAssistant.prototype.animateMenuPanel = function(panel, reverse, callback) {
	Mojo.Animation.animateStyle(panel, 'top', 'bezier', {
		from: this.menuPanelHiddenTop,
		to: this.menuPanelVisibleTop,
		duration: .25,
		curve:'over-easy',
		reverse:reverse,
		onComplete:callback
		});
};

TagsListAssistant.prototype.menuPanelOn = function(){
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
	
TagsListAssistant.prototype.menuPanelOff = function(){
	var animateMenuCallback;
	var that = this;
	that.panelOpen = false;
	animateMenuCallback = function(){
		that.menupanel.hide();
		Mojo.Animation.Scrim.animate(that.menuScrim, 1, 0, that.menuScrim.hide.bind(that.menuScrim));
	};
	this.animateMenuPanel(this.menupanel, true, animateMenuCallback);
};
	
TagsListAssistant.prototype.toggleMenuPanel = function(e){
	if(this.panelOpen){
		this.menuPanelOff();
	}else{
		this.menuPanelOn();
	}
};

TagsListAssistant.prototype.getSearch = function(event) {
	if (this.controller.get('searchBox').mojo.getValue().length > 2) {
		this.controller.stageController.pushScene('search', this.controller.get('searchBox').mojo.getValue());
	} else {
		Mojo.Controller.errorDialog('Please enter a minimum of 3 characters for a search.', this.controller.window);
	}
};

TagsListAssistant.prototype.loadTags = function(event) {
	// Query tags tables
	if (this.tagSort == 'alphabetically')
		var transactionString = 'SELECT name, id, count FROM tags WHERE type="' + this.tagType + '" ORDER BY name;';
	else if (this.tagSort == 'numerically')
		var transactionString = 'SELECT name, id, count FROM tags WHERE type="' + this.tagType + '" ORDER BY count DESC;';
	
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
						for (var i = this.start; (i < this.stop) && (i < tagName.length); i++) {
							this.tagsModel.items.push({
								tag: tagName[i],
								tagID: tagID[i],
								tagCount: tagCount[i]
							});
						}
						this.controller.modelChanged(this.tagsModel, this);
						
						if (this.tagsModel.items.length >= tagName.length)
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

TagsListAssistant.prototype.tagTap = function(event) {
	this.controller.stageController.pushScene('tags-detail', event.item);
};

TagsListAssistant.prototype.loadMore = function(event) {
	this.start += 100;
	this.stop += 100;
	this.loadTags();
};

TagsListAssistant.prototype.handleCommand = function(event){
	if (event.type == Mojo.Event.command) {
		switch (event.command) {
			case "tag-type":
				if (this.tagType == 'Color') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [
							{label: $L('Color'), command: 'color', icon: 'checkmark'},
							{label: $L('Event'), command: 'event'},
							{label: $L('Equipment'), command: 'equipment'},
							{label: $L('Location'), command: 'location'},
							{label: $L('Medium'), command: 'medium'},
							{label: $L('Scene'), command: 'scene'},
							{label: $L('Subject'),command: 'subject'}]});
				} else if (this.tagType == 'Event') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [
							{label: $L('Color'), command: 'color'},
							{label: $L('Event'), command: 'event', icon: 'checkmark'},
							{label: $L('Equipment'), command: 'equipment'},
							{label: $L('Location'), command: 'location'},
							{label: $L('Medium'), command: 'medium'},
							{label: $L('Scene'), command: 'scene'},
							{label: $L('Subject'), command: 'subject'}]});
				} else if (this.tagType == 'Equipment') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [
							{label: $L('Color'), command: 'color'},
							{label: $L('Event'), command: 'event'},
							{label: $L('Equipment'), command: 'equipment',icon: 'checkmark'},
							{label: $L('Location'), command: 'location'},
							{label: $L('Medium'), command: 'medium'},
							{label: $L('Scene'), command: 'scene'},
							{label: $L('Subject'), command: 'subject'}]});
				} else if (this.tagType == 'Location') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [{label: $L('Color'), command: 'color'},
						{label: $L('Event'), command: 'event'},
						{label: $L('Equipment'), command: 'equipment'},
						{label: $L('Location'), command: 'location', icon: 'checkmark'},
						{label: $L('Medium'), command: 'medium'},
						{label: $L('Scene'), command: 'scene'},
						{label: $L('Subject'), command: 'subject'}]});
				} else if (this.tagType == 'Medium') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [
							{label: $L('Color'), command: 'color'},
							{label: $L('Event'), command: 'event'},
							{label: $L('Equipment'), command: 'equipment'},
							{label: $L('Location'), command: 'location'},
							{label: $L('Medium'), command: 'medium', icon: 'checkmark'},
							{label: $L('Scene'), command: 'scene'},
							{label: $L('Subject'), command: 'subject'}]});
				} else if (this.tagType == 'Scene') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [
							{label: $L('Color'), command: 'color'},
							{label: $L('Event'), command: 'event'},
							{label: $L('Equipment'), command: 'equipment'},
							{label: $L('Location'), command: 'location'},
							{label: $L('Medium'), command: 'medium'},
							{label: $L('Scene'), command: 'scene', icon: 'checkmark'},
							{label: $L('Subject'), command: 'subject'}]});
				} else if (this.tagType == 'Subject') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [
							{label: $L('Color'), command: 'color'},
							{label: $L('Event'), command: 'event'},
							{label: $L('Equipment'), command: 'equipment'},
							{label: $L('Location'), command: 'location'},
							{label: $L('Medium'), command: 'medium'},
							{label: $L('Scene'), command: 'scene'},
							{label: $L('Subject'), command: 'subject', icon: 'checkmark'}]});
				}
				break;
			case 'tag-sort':
				if (this.tagSort == 'alphabetically') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [
							{label: $L('Alphabetically'), command: 'sort-alphabetically', icon: 'checkmark'},
							{label: $L('Numerically'), command: 'sort-numerically'}]});
				} else if (this.tagSort == 'numerically') {
					this.controller.popupSubmenu({
						onChoose: this.popupMenu,
						placeNear: event.originalEvent.target,
						items: [
							{label: $L('Alphabetically'), command: 'sort-alphabetically'},
							{label: $L('Numerically'), command: 'sort-numerically', icon: 'checkmark'}]});
				}
				break;
			case 'go-artists':
				this.controller.stageController.swapScene('artists-list', 'alphabetically');
				break;
			case 'go-wallpapers':
				this.controller.stageController.swapScene('main');
				break;
		}
	}
};

TagsListAssistant.prototype.popupMenu = function(command) {
	switch(command) {
		case "color":
			this.controller.stageController.swapScene('tags-list', 'Color', 'alphabetically');
			break;
		case 'event':
			this.controller.stageController.swapScene('tags-list', 'Event', 'alphabetically');
			break;
		case 'equipment':
			this.controller.stageController.swapScene('tags-list', 'Equipment', 'alphabetically');
			break;
		case 'location':
			this.controller.stageController.swapScene('tags-list', 'Location', 'alphabetically');
			break;
		case 'medium':
			this.controller.stageController.swapScene('tags-list', 'Medium', 'alphabetically');
			break;
		case 'scene':
			this.controller.stageController.swapScene('tags-list', 'Scene', 'alphabetically');
			break;
		case 'subject':
			this.controller.stageController.swapScene('tags-list', 'Subject', 'alphabetically');
			break;
		case 'sort-alphabetically':
			this.controller.stageController.swapScene('tags-list', this.tagType, 'alphabetically');
			break;
		case 'sort-numerically':
			this.controller.stageController.swapScene('tags-list', this.tagType, 'numerically');
			break;
	}
};

TagsListAssistant.prototype.activate = function(event) {
};

TagsListAssistant.prototype.deactivate = function(event) {
};

TagsListAssistant.prototype.cleanup = function(event) {
	// search related
	this.controller.stopListening(this.controller.get('search'), Mojo.Event.tap, this.toggleMenuPanel);
	this.controller.stopListening(this.menuScrim, Mojo.Event.tap, this.toggleMenuPanel);
	this.controller.stopListening(this.controller.get("searchBox"), Mojo.Event.propertyChange, this.getSearch);
	this.controller.stopListening(this.controller.get('searchButton'), Mojo.Event.tap, this.getSearch);
	
	this.controller.stopListening(this.controller.get("tagList"), Mojo.Event.listTap, this.tagTap.bindAsEventListener(this));
	this.controller.stopListening(this.controller.get('loadMore'), Mojo.Event.tap, this.loadMore.bindAsEventListener(this));
};
