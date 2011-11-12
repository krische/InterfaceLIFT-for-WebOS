function PreferencesAssistant() {
}

PreferencesAssistant.prototype.setup = function() {
	// Reset Favorites button
	this.controller.setupWidget("reset-database", {},
		this.favoritesModel = {
             label : "Reset Database",
             disabled: false,
			 buttonClass: 'negative'
	});
	
	this.controller.listen(this.controller.get('reset-database'), Mojo.Event.tap, this.resetDatabase.bindAsEventListener(this));
};

PreferencesAssistant.prototype.resetDatabase = function(event) {
	InterfaceLIFT.Database.deleteDatabase();
};

PreferencesAssistant.prototype.activate = function(event) {
};

PreferencesAssistant.prototype.deactivate = function(event) {
};

PreferencesAssistant.prototype.cleanup = function(event) {
	this.controller.stopListening(this.controller.get('reset-database'), Mojo.Event.tap, this.resetDatabase);
};
