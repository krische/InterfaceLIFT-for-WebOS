/*  Cookie
    
    Handler for cookieData, a stored version of preferences.
    Will load or create cookieData, migrate preferences and update cookieData
    when called.
        
    Functions:
    initialize - loads or creates Cookie; updates global preferences with contents
        of stored cookieData and migrates any preferences due version changes
    store - updates stored cookieData with current global preferences
*/  

InterfaceLIFT.Cookie = ({
        
    initialize: function()  {
		Mojo.Log.info("Cookie Initialized");
        // Update globals with preferences or create it.
        this.cookieData = new Mojo.Model.Cookie("interfaceLIFT");
        var oldData = this.cookieData.get();
        if (oldData && oldData.versionString) {
            // Create cookie or update globals if they already exists
            if (oldData.versionString == InterfaceLIFT.versionString)    {
				InterfaceLIFT.downloadedWallpapers = oldData.downloadedWallpapers;
				InterfaceLIFT.currentWallpaper = oldData.currentWallpaper;
			} else {
				// migrate old preferences here on updates of app     
				switch (oldData.versionString) {
					// a switch for what to do from an upgrade on each previous version
					case "0.1.0" :
						break;
				}
			}
        }
        this.storeCookie();
    },
    
    //  store - function to update stored cookie with global values
    storeCookie: function() {
        this.cookieData.put(    {                                            
            versionString: InterfaceLIFT.versionString,
            downloadedWallpapers: InterfaceLIFT.downloadedWallpapers,
            currentWallpaper: InterfaceLIFT.currentWallpaper
        });
		Mojo.Log.info("Cookie Stored");
    }
});