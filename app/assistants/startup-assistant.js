function StartupAssistant() {
    this.totalRows = 0;
    this.averageSize = 1085;
    this.numToDownload = 0;
}

StartupAssistant.prototype.setup = function() {
    // the application menu
    this.controller.setupWidget(Mojo.Menu.appMenu, InterfaceLIFT.MenuAttr, InterfaceLIFT.MenuModel);

    this.controller.setupWidget("BigSpinner",
    this.BigSpinnerAttributes = {
        spinnerSize: "large"
    },
    this.BigSpinnerModel = {
        spinning: true
    }
    );

    this.controller.setupWidget("progressbar",
    {},
    this.progressModel = {
        value: 0
    }
    );

    var url = 'http://webos.interfacelift.com/feed/date.php?res=' + InterfaceLIFT.resolution + '&start=0&stop=0';
    var request = new Ajax.Request(url, {
        method: 'get',
        evalJSON: 'false',
        onSuccess: this.getRows.bind(this),
        onFailure: this.getFailure.bind(this)
    });
};

StartupAssistant.prototype.getRows = function(transport) {
    // Use responseText, not responseXML!! try: reponseJSON
    var xmlstring = transport.responseText;
    // Convert the string to an XML object
    var xmlobject = (new DOMParser()).parseFromString(xmlstring, "text/xml");
    // Use xpath to parse xml object
    var nodes = document.evaluate('channel/totalrows', xmlobject, null, XPathResult.ANY_TYPE, null);

    var result = nodes.iterateNext();
    this.totalRows = result.childNodes[0].nodeValue;
    this.numToDownload = this.totalRows - InterfaceLIFT.downloadedWallpapers;

    if (this.numToDownload == 0) {
        this.controller.get('status').update('downloading artists');
        this.controller.get('progress').hide();
        var url = 'http://webos.interfacelift.com/feed/artist_list.php?res=' + InterfaceLIFT.resolution + 'threshold=1'
        var request = new Ajax.Request(url, {
            method: 'get',
            evalJSON: 'false',
            onSuccess: this.getArtists.bind(this),
            onFailure: this.getFailure.bind(this)
        });
    } else {
        if (this.numToDownload == this.totalRows) {
            InterfaceLIFT.Database.deleteWallpapers();
        }

        var downloadURL = 'http://webos.interfacelift.com/feed/date.php?res=' +
        InterfaceLIFT.resolution +
        '&start=0&stop=' +
        this.numToDownload;

        this.controller.serviceRequest('palm://com.palm.downloadmanager/', {
            method: 'download',
            parameters: {
                target: downloadURL,
                mime: "application/xml",
                targetDir: "/media/internal/interfaceLIFT/",
                targetFilename: "data.xml",
                subscribe: true
            },
            onSuccess: this.downloadSuccess.bind(this),
            onFailure: this.downloadFailure.bind(this)
        });
    }
};

StartupAssistant.prototype.downloadSuccess = function(event) {
    if (event.completed)
    {
        // hide the progress stuff
        this.controller.get('progress').hide();
        this.controller.get('status').update('loading into database');

        var request = new Ajax.Request(event.target, {
            method: 'get',
            evalJSON: 'false',
            onSuccess: this.getWallpapers.bind(this),
            onFailure: this.getFailure.bind(this)
        });
    }
    else {
        // progress bar
        this.progressModel.value = event.amountReceived / (this.numToDownload * this.averageSize);
        this.controller.modelChanged(this.progressModel, this);

        // progress text
        var receivedPretty = Math.round(event.amountReceived / 1000) + 'KB';
        var totalPretty = Math.round((this.numToDownload * this.averageSize) / 1000) + 'KB';
        this.controller.get('downloaded').update(receivedPretty + '/' + totalPretty);
    }
};

StartupAssistant.prototype.getWallpapers = function(transport) {
    // Use responseText, not responseXML!! try: reponseJSON
    var xmlstring = transport.responseText;

    // Replace troublesome characters
    xmlstring = xmlstring.replace(/&/g, '&amp;');
    xmlstring = xmlstring.replace(/Ã¥/g, 'å');
    xmlstring = xmlstring.replace(/Ã­/g, 'í');
    xmlstring = xmlstring.replace(/Ã¼/g, 'ü');
    xmlstring = xmlstring.replace(/Ã¸/g, 'ø');
    xmlstring = xmlstring.replace(/Ã‰/g, 'É');
    xmlstring = xmlstring.replace(/Ã©/g, 'é');
    xmlstring = xmlstring.replace(/Ã¤/g, 'ä');
    xmlstring = xmlstring.replace(/Ã£/g, 'ã');
    xmlstring = xmlstring.replace(/Ã§/g, 'ç');
    xmlstring = xmlstring.replace(/Ã¶/g, 'ö');
    xmlstring = xmlstring.replace(/'/g, '&#39;');
    xmlstring = xmlstring.replace(/"/g, '&#39;');

    InterfaceLIFT.Database.loadWallpapers(xmlstring);
    InterfaceLIFT.wallpaperString = '';
    InterfaceLIFT.downloadedWallpapers += this.numToDownload;
    InterfaceLIFT.Cookie.storeCookie();

    this.controller.get('status').update('downloading artists');

    var url = 'http://webos.interfacelift.com/feed/artist_list.php?res=' +
              InterfaceLIFT.resolution +
              '&threshold=1';

    var request = new Ajax.Request(url, {
        method: 'get',
        evalJSON: 'false',
        onSuccess: this.getArtists.bind(this),
        onFailure: this.getFailure.bind(this)
    });
};

StartupAssistant.prototype.getArtists = function(transport) {
    // Use responseText, not responseXML!! try: reponseJSON
    var xmlstring = transport.responseText;

    // Replace troublesome characters
    xmlstring = xmlstring.replace(/&/g, '&amp;');
    xmlstring = xmlstring.replace(/Ã¥/g, 'å');
    xmlstring = xmlstring.replace(/Ã­/g, 'í');
    xmlstring = xmlstring.replace(/Ã¼/g, 'ü');
    xmlstring = xmlstring.replace(/Ã¸/g, 'ø');
    xmlstring = xmlstring.replace(/Ã‰/g, 'É');
    xmlstring = xmlstring.replace(/Ã©/g, 'é');
    xmlstring = xmlstring.replace(/Ã¤/g, 'ä');
    xmlstring = xmlstring.replace(/Ã£/g, 'ã');
    xmlstring = xmlstring.replace(/Ã§/g, 'ç');
    xmlstring = xmlstring.replace(/Ã¶/g, 'ö');
    xmlstring = xmlstring.replace(/'/g, '&#39;');
    xmlstring = xmlstring.replace(/"/g, '&#39;');

    InterfaceLIFT.artistString = xmlstring;
    InterfaceLIFT.Database.loadArtists();

    this.controller.get('status').update('downloading tags');

	var url = 'http://webos.interfacelift.com/feed/category_list.php?res=' +
			  InterfaceLIFT.resolution + 
	          '&threshold=1';
	
    var request = new Ajax.Request(url, {
        method: 'get',
        evalJSON: 'false',
        onSuccess: this.getTags.bind(this),
        onFailure: this.getFailure.bind(this)
    });
};

StartupAssistant.prototype.getTags = function(transport) {
    // Use responseText, not responseXML!! try: reponseJSON
    var xmlstring = transport.responseText;

    // Replace troublesome characters
    xmlstring = xmlstring.replace(/&/g, '&amp;');
    xmlstring = xmlstring.replace(/Ã¥/g, 'å');
    xmlstring = xmlstring.replace(/Ã­/g, 'í');
    xmlstring = xmlstring.replace(/Ã¼/g, 'ü');
    xmlstring = xmlstring.replace(/Ã¸/g, 'ø');
    xmlstring = xmlstring.replace(/Ã‰/g, 'É');
    xmlstring = xmlstring.replace(/Ã©/g, 'é');
    xmlstring = xmlstring.replace(/Ã¤/g, 'ä');
    xmlstring = xmlstring.replace(/Ã£/g, 'ã');
    xmlstring = xmlstring.replace(/Ã§/g, 'ç');
    xmlstring = xmlstring.replace(/Ã¶/g, 'ö');

    InterfaceLIFT.tagString = xmlstring;
    InterfaceLIFT.Database.loadTags();

    this.controller.stageController.swapScene('main');
};

StartupAssistant.prototype.downloadFailure = function(event) {
    // There has been a general download failure
    Mojo.Controller.errorDialog("Download Failure: " + event.completionStatusCode);
};

StartupAssistant.prototype.getFailure = function(transport) {
    // There has been a general HTTP failure
    Mojo.Controller.errorDialog("HTTP Failure: " + transport.status, this.controller.window);
};

StartupAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
};

StartupAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

StartupAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
};
