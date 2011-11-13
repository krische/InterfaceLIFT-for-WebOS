function TagsDetailAssistant(tagItem) {
	this.tagID = tagItem.tagID;
	this.tag = tagItem.tag;
	this.tagCount = tagItem.tagCount;
	this.baseURL = 'http://webos.interfacelift.com/feed/category.php?res=' +
	               InterfaceLIFT.resolution + 
	               '&id=' + 
	               this.tagID + 
	               '&start=';
	this.start = 0;
	this.stop = '&stop=15';
}

TagsDetailAssistant.prototype.setup = function() {
	// the application menu
	this.controller.setupWidget(Mojo.Menu.appMenu, InterfaceLIFT.MenuAttr, InterfaceLIFT.MenuModel);
	
	// Downloading Spinner
	this.controller.setupWidget("BigSpinner",
        this.BigSpinnerAttributes = {
            spinnerSize: "large"
        },
        this.BigSpinnerModel = {
            spinning: true 
        }
    );
	
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
	
	// load more button
	this.controller.setupWidget("loadMore",
         this.loadAttributes = {
             },
         this.loadModel = {
             label : "Load More",
             disabled: false
         }
     );
	
	// event listeners
	this.controller.listen(this.controller.get("wallpaperList"), Mojo.Event.listTap, this.listTap.bindAsEventListener(this));
	this.controller.listen(this.controller.get('loadMore'), Mojo.Event.tap, this.loadMore.bindAsEventListener(this));
	
	var pageURL = this.baseURL+this.start+this.stop;
	this.getPage(pageURL);
};

TagsDetailAssistant.prototype.getPage = function(url) {
	var request = new Ajax.Request(url, {
		method: 'get',
		evalJSON: 'false',
		onSuccess: this.parsePage.bind(this),
		onFailure: this.getFailure.bind(this)
	});
};

TagsDetailAssistant.prototype.parsePage = function(transport) {
	var titles = [], artists = [], artistIDs = [], descriptions = [], previews = [], previews_240x150 = [], downloads = [], dates = [];
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
		if (result.getElementsByTagName('description')[0].childNodes[0]) {
			description = result.getElementsByTagName('description')[0].childNodes[0].nodeValue;
		} else {
			description = 'none';
			Mojo.Log.info('blank', description);
		}
		previews[i] = result.getElementsByTagName('preview')[0].childNodes[0].nodeValue;
		previews_240x150[i] = result.getElementsByTagName('preview_240x150')[0].childNodes[0].nodeValue;
		downloads[i] = result.getElementsByTagName('download')[0].childNodes[0].nodeValue;
		dates[i] = result.getElementsByTagName('dateformat')[0].childNodes[0].nodeValue;
		i++;
		result=nodes.iterateNext();
	}
	
	Mojo.Log.info('this far');
	
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
	
	this.previewModel.listTitle = '\'' + this.tag + '\' wallpapers';
	
	this.controller.modelChanged(this.previewModel, this);
	
	if (this.previewModel.items.length >= this.tagCount)
		this.controller.get('loadMore').hide();
	
	this.controller.get("Scrim").hide();
	this.BigSpinnerModel.spinning = false;
	this.controller.modelChanged(this.BigSpinnerModel);
};

TagsDetailAssistant.prototype.loadMore = function(event) {
	this.controller.get("Scrim").show();
	this.BigSpinnerModel.spinning = true;
	this.controller.modelChanged(this.BigSpinnerModel);
	
	this.start += 15;
	var pageURL = this.baseURL+this.start+this.stop;
	this.getPage(pageURL);
};

TagsDetailAssistant.prototype.listTap = function(event) {
	this.controller.stageController.pushScene('wallpaper-detail', event.item);
};


TagsDetailAssistant.prototype.getFailure = function(transport) {
	// There has been a general HTTP failure
	Mojo.Controller.errorDialog("HTTP Failure: "+transport.status, this.controller.window);
};

TagsDetailAssistant.prototype.activate = function(event) {

};

TagsDetailAssistant.prototype.deactivate = function(event) {

};

TagsDetailAssistant.prototype.cleanup = function(event) {
	this.controller.stopListening(this.controller.get("wallpaperList"), Mojo.Event.listTap, this.listTap.bindAsEventListener(this));
	this.controller.stopListening(this.controller.get('loadMore'), Mojo.Event.tap, this.loadMore.bindAsEventListener(this));
};
