function ImageViewerAssistant(url) {
	this.imageURL = url;
	this.newWallpaper = '';
}

ImageViewerAssistant.prototype.setup = function() {
	// the application menu
	this.controller.setupWidget(Mojo.Menu.appMenu, InterfaceLIFT.MenuAttr, InterfaceLIFT.MenuModel);
	
	this.controller.setupWidget("Spinner",
        this.spinnerAttributes = {
            spinnerSize: "large"
        },
        this.spinnerModel = {
            spinning: true 
        }
    );
	
	this.controller.setupWidget("image-viewer",
        this.viewerAttributes = {
            noExtractFS: true,
			limitZoom: true
        },
        this.viwerModel = {}
    );
	
	this.controller.setupWidget("setWallpaper",
         this.setWallpaperAttributes = {},
         this.setWallpaperModel = {
             label : "Set As Wallpaper",
             disabled: false
         }
     );
	this.controller.listen(this.controller.get('setWallpaper'), Mojo.Event.tap, this.setWallpaper.bindAsEventListener(this));
	
	this.controller.get('image-viewer').observe(Mojo.Event.imageViewChanged, this.changedImage.bind(this));
};

ImageViewerAssistant.prototype.changedImage = function(event) {
	if (event.error) {
		Mojo.Log.error("Failed to load image!");
		return;
	}
	
	this.controller.get("Scrim").hide();
	this.spinnerModel.spinning = false;
	this.controller.modelChanged(this.spinnerModel);
};

ImageViewerAssistant.prototype.setWallpaper = function(event) {
	this.controller.get("Scrim").show();
	this.spinnerModel.spinning = true;
	this.controller.modelChanged(this.spinnerModel);
	
	this.controller.serviceRequest('palm://com.palm.downloadmanager/', {
		method: 'download', 
		parameters: 
		{
			target: this.imageURL,
			mime : "application/jpg",
			targetDir : "/media/internal/interfaceLIFT/wallpapers/",
			subscribe: true
		},
		onSuccess : this.downloadSuccess.bind(this),
		onFailure : this.downloadFailure.bind(this)
	});
};

ImageViewerAssistant.prototype.downloadSuccess = function(event) {
	if (event.completed)
	{
		this.controller.serviceRequest('palm://com.palm.systemservice/wallpaper', {
  			method:"importWallpaper",
    		parameters:{
        		"target": event.target,
        		"focusX": 0.5,
        		"focusY": 0.5,
        		"scale": 1.0
    		},
   			onSuccess: this.importSuccess.bind(this),
    		onFailure: this.setFailure.bind(this)
		});  
	}
};

ImageViewerAssistant.prototype.downloadFailure = function(event) {
	Mojo.Controller.errorDialog("Download Error. Please try again.", this.controller.window);
};

ImageViewerAssistant.prototype.importSuccess = function (event) {
	this.newWallpaper = event.wallpaper.wallpaperName;
	this.controller.serviceRequest('palm://com.palm.systemservice', {
    	method:"setPreferences",
    	parameters: {"wallpaper": event.wallpaper},
    	onSuccess: this.deleteOld.bind(this),
    	onFailure: this.setFailure.bind(this)
	});
};

ImageViewerAssistant.prototype.deleteOld = function (event) {
	// delete the old wallpaper
	if(InterfaceLIFT.currentWallpaper) {
		this.controller.serviceRequest('palm://com.palm.systemservice/wallpaper', {
    		method:"deleteWallpaper",
		    parameters:{"wallpaperName": InterfaceLIFT.currentWallpaper},
		    onSuccess: this.done.bind(this),
		    onFailure: this.setFailure.bind(this)
		}); 
	} else {
		this.done({"returnValue": true});
	}
};

ImageViewerAssistant.prototype.done = function (event) {
	if (event.returnValue) {
		InterfaceLIFT.currentWallpaper = this.newWallpaper;
		InterfaceLIFT.Cookie.storeCookie();
		this.controller.stageController.popScene();
	}
};

ImageViewerAssistant.prototype.setFailure = function(event) {
	Mojo.Controller.errorDialog("Error Setting Wallpaper", this.controller.window);
};

ImageViewerAssistant.prototype.activate = function(event) {
	this.controller.get('image-viewer').mojo.manualSize(this.controller.window.innerWidth, this.controller.window.innerHeight);
	this.controller.get("image-viewer").mojo.centerUrlProvided(this.imageURL);
};

ImageViewerAssistant.prototype.deactivate = function(event) {
};

ImageViewerAssistant.prototype.cleanup = function(event) {
	this.controller.stopListening(this.controller.get("setWallpaper"), Mojo.Event.tap, this.setWallpaper.bindAsEventListener(this));
};
