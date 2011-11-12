function HelpAssistant() {
}

HelpAssistant.prototype.setup = function() {
	this.controller.listen(this.controller.get('legal'), Mojo.Event.tap, this.goLegal.bindAsEventListener(this));
	this.controller.listen(this.controller.get('website'), Mojo.Event.tap, this.goWebsite.bindAsEventListener(this));
	this.controller.listen(this.controller.get('email'), Mojo.Event.tap, this.goEmail.bindAsEventListener(this));
};

HelpAssistant.prototype.goLegal = function(event) {
	this.controller.serviceRequest("palm://com.palm.applicationManager", {
		method: "open",
		parameters:  {
		   id: 'com.palm.app.browser',
		   params: {
		       target: "http://interfacelift.com/website/copyright_policy.php"
		   }
		}
	});
}

HelpAssistant.prototype.goWebsite = function(event) {
	this.controller.serviceRequest("palm://com.palm.applicationManager", {
		method: "open",
		parameters:  {
		   id: 'com.palm.app.browser',
		   params: {
		       target: "http://www.krischeonline.com/category/webos/interfacelift"
		   }
		}
	});
};

HelpAssistant.prototype.goEmail = function(event) {
	this.controller.serviceRequest(
	"palm://com.palm.applicationManager", {
	    method: 'open',
	    parameters: {
	        id: "com.palm.app.email",
	        params: {
	            summary: "InterfaceLIFT for WebOS Issue",
	            recipients: [{
	            	contactDisplay: "InterfaceLIFT for WebOS",
	                type:"email",
	                role:1,
	                value:"krische+webos@gmail.com"
	            }]
	        }
	    }
	}); 
};

HelpAssistant.prototype.activate = function(event) {
};

HelpAssistant.prototype.deactivate = function(event) {
};

HelpAssistant.prototype.cleanup = function(event) {
	this.controller.stopListening(this.controller.get('website'), Mojo.Event.tap, this.goWebsite);
	this.controller.stopListening(this.controller.get('email'), Mojo.Event.tap, this.goEmail);
};
