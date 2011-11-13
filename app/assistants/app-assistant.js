/*  AppAssistant

    Responsible for app startup, handling launch points and updating news feeds.
    Major components:
    - setup; app startup including preferences
    - handleLaunch; launch entry point for initial launch
    - handleCommand; handles app menu selections

    Data structures:
    - globals; set of persistant data used throughout app

    App architecture:

*/

//  ---------------------------------------------------------------
//    GLOBALS
//  ---------------------------------------------------------------
//  InterfaceLIFT namespace
InterfaceLIFT = {};

// Constants
InterfaceLIFT.versionString = "3.0.0";
InterfaceLIFT.MainStageName = "main";
InterfaceLIFT.firstRun = true;

// Temporary per session
InterfaceLIFT.tagString = '';
InterfaceLIFT.artistString = '';
InterfaceLIFT.downloadedWallpapers = 0;
InterfaceLIFT.currentWallpaper = 'none';

// Setup App Menu for all scenes; all menu actions handled in
//  AppAssistant.handleCommand()
InterfaceLIFT.MenuAttr = {
    omitDefaultItems: true,
};

InterfaceLIFT.MenuModel = {
    visible: true,
    items: [
    {
        label: "About",
        command: "do-about"
    },
    {
        label: "Preferences",
        command: "do-prefs"
    },
    {
        label: "Help",
        command: "do-help"
    }
    ]
};

InterfaceLIFT.resolution = "320x480";

function AppAssistant(appController) {
  if (Mojo.Environment.DeviceInfo.modelNameAscii.match(/Pre3/)) {
    InterfaceLIFT.resolution = "480x800";
  }
}

//  -------------------------------------------------------
//  setup - all startup actions:
//    - Setup globals with preferences
//    - Set up application menu; used in every scene
//    - Open Depot and use contents for feedList
//    - Initiate alarm for first feed update
AppAssistant.prototype.setup = function() {
    // load preferences and globals from saved cookie
    InterfaceLIFT.Cookie.initialize();

    // initialize the database
    InterfaceLIFT.Database.initialize();

    //Instantiate Metrix Library
    InterfaceLIFT.Metrix = new Metrix();

    //Post the data to Metrix
    InterfaceLIFT.Metrix.postDeviceData();
};

//  -------------------------------------------------------
//  handleLaunch - called by the framework when the application is asked to launch
//    - First launch; create card stage and first first scene
//
AppAssistant.prototype.handleLaunch = function(launchParams) {
    Mojo.Log.info("ReLaunch");

    var cardStageController = this.controller.getStageController(InterfaceLIFT.MainStageName);
    var appController = Mojo.Controller.getAppController();

    if (!launchParams) {
        // FIRST LAUNCH
        // Look for an existing main stage by name.
        if (cardStageController) {
            // If it exists, just bring it to the front by focusing its window.
            Mojo.Log.info("Main Stage Exists");
            cardStageController.focus();
        } else {
            // Create a callback function to set up the new main stage
            // once it is done loading. It is passed the new stage controller
            // as the first parameter.
            var pushMainScene = function(stageController) {
                stageController.pushScene("startup");
            };
            Mojo.Log.info("Create Main Stage");
            var stageArguments = {
                name: InterfaceLIFT.MainStageName,
                lightweight: true
            };
            this.controller.createStageWithCallback(stageArguments, pushMainScene.bind(this), "card");
        }
    }
};

// -----------------------------------------
// handleCommand - called to handle app menu selections
//
AppAssistant.prototype.handleCommand = function(event) {
    var stageController = this.controller.getActiveStageController();
    var currentScene = stageController.activeScene();

    if (event.type == Mojo.Event.command) {
        switch (event.command) {

        case "do-about":
            currentScene.showAlertDialog({
                onChoose:
                function(value) {},
                title: "InterfaceLIFT for WebOS",
                message: "Version: #{version}<br/>Application Copyright 2011, krischeonline.com".interpolate({
                    version: InterfaceLIFT.versionString
                }),
                choices: [
                {
                    label: "OK",
                    value: ""
                }],
                allowHTMLMessage: true
            });
            break;

        case "do-prefs":
            stageController.pushScene("preferences");
            break;

        case "do-help":
            stageController.pushScene("help");
            break;
        }
    }
};
