/*************************************************************
	popup.js
	- contains controls for HTML5 audio
	- calls back to background.js to get current extension data
	  for display
		- current playing track
		- track download link (if available)
		- track purchase link (if available)
		- track playback time
		- track buffer time
		- full track list
		- comments (when called for)
/************************************************************/

// Global variables
var playing, child, view = "inc", initialized = false, looking = "inc", i, lastPosf = 0, lastPosi = 0, lastPosm = 0;

// Initialize data for display taking into account the listing request and action
function initialize(listing, action, extra) {
	var linkage;
	// If our listing is the same as our current view set action to act
	if (listing === view) { action = "act"; }
	$("#tracks").empty();
	$("#notification").empty();
	// Request current playing view from background
	chrome.extension.sendRequest({requestlist: "playview"}, function(response) {
		if (listing === "startup") {
			view = response.sendlist;
			looking = response.sendlist;
			linkage = response.sendlist;
			chrome.extension.sendRequest({requestlist: "loopStatus"}, function(response) { 
				$("#loop").text("Loop " + response.sendlist.substr(0,1).toUpperCase()+response.sendlist.substr(1,response.sendlist.length));
				if(response.sendlist !== "off"){ $("#loop").addClass("on"); }
				loopButton(); 
			});
			if (view === "inc") { $("#inc").addClass('selected'); }
			else if(view === "fav") { $("#fav").addClass('selected'); }
			else { chrome.extension.sendRequest({requestlist: "getproper"}, function(response) { $("<a href=\"#\" id=\"" + view + "\" class=\"selected\">" + response.sendlist + "</a>").appendTo('#tabs'); });	}
		}
		else { linkage = listing; }
		// Request current playing track from background
		chrome.extension.sendRequest({requestlist: "current"}, function(response) {
			playing = response.sendlist;
			// Request track list array and display them in the track list within the extension
			chrome.extension.sendRequest({requestlist: "give," + listing}, function(response) {
				if (response.sendlist && response.sendlist.length > 0) {
					for (i=0; i<response.sendlist.length; i++) {
						var eo;
						if (i%2 === 0) {
							eo = "even";
						}
						else {
							eo = "odd";
						}
						$("<li class=\"" + eo + "\">" + (i+1) + ". " + response.sendlist[i] + "</li>").appendTo("#tracks");
					}
					// Display more tracks link on bottom of list
					if (response.sendlist.length%2 === 0) {
						eo = "even";
					}
					else {
						eo = "odd";
					}
					$("<li id=\"moreTracks\" class=\"" + eo + "\"><a href=\"#\">Load More Tracks</a></li>").appendTo("#tracks");
					$("#moreTracks").click(function() { loadMore(); });
					actions(playing, linkage, action);
					if(linkage === "fav"){
						if(extra === "add"){
							$("#tracks").scrollTop(lastPosf*17);
						}
						lastPosf = i;
					}
					else if(linkage === "inc"){
						if(extra === "add"){
							$("#tracks").scrollTop(lastPosi*17);
						}
						lastPosi = i;
					}
					else{
						if(extra === "add"){
							$("#tracks").scrollTop(lastPosm*17);
						}
						lastPosm = i;
					}
				}
				else if(extra === "add"){
					$("<li class=\"loading\">Loading artist tracks...</li>").appendTo("#tracks");
				}
				// If no tracks are available display setup and possible connectivity issue message
				else {
					$("#tracklist").hide();
					$("#tabs").hide();
					$("#loop").hide();
					$("<div id=\"setup\"><h1>No SoundCloud Data Available</h1><p>If you haven't set up the SoundCloud Latest Tracks for Chrome extension then <a href=\"options.html\" target=\"_new\">do that now</a>.</p><p>If you've already completed the setup then double check and make sure your application token is correct. If your token is correct then there is a problem communicating with SoundCloud's server right now. Try opening this extension again later.</p></div>").appendTo("#track");
					chrome.extension.sendRequest({requestlist: "reset"});
				}
			});
		});
	});
	linkTabs();
}

// Set child reference and begin track and controller generation
function actions(inc, linkage, action) {
	child = parseInt(inc, 10) + 1;
	$("#tracks").show();
	$("#comment").hide();
	if (view === looking && action === "next") {
		action = "act";
	}
	if (view !== looking && action === "next") {
		chrome.extension.sendRequest({requestlist: "datastring"}, function(response) {
			var data = response.sendlist;
			$("#access").empty();
			$(data).appendTo("#access");
			generateTrack("#access a", linkage, 0, 1);
		});
	}
	if (action === "act") { 
		generateTrack("ol li:nth-child(" + child + ") a", linkage); 
	}
	$(".tLink").click(function() {
		child = $('ol li a').index($(this))+1;
		view = linkage;
		generateTrack(this, linkage, 1);
	});
}

// Create player display for current track
function generateTrack(track, linkage, click, override) {
	$("li").removeClass("active");
	$("#track").empty();
	playing = $(track).text();
	var playerData = $(track).attr("id").split(',');
	var badgeURL = playerData[2].replace("large", "badge");
	if (badgeURL === "null") { 
		badgeURL = "images/nobadge.png"; 
	}
	var tActions = "<a href=\"#\" class=\"remfav\" id=\"removeFavorite\">Remove from favorites</a><a href=\"#\" class=\"addfav\" id=\"saveFavorite\">Save to favorites</a>";
	if (playerData[3] !== "undefined") {
		tActions = tActions + "<a href=\"" + playerData[3] + "?client_id=2b161e5544f1f7f4cab5ff3c76c6c7b8\" target=\"_new\" class=\"download\">Download</a>";
	}
	if (playerData[4] !== "null") {
		tActions = tActions + "<a href=\"" + playerData[4] + "\" target=\"_new\" class=\"purchase\">Purchase</a>";
	}
	if (playerData[5] !== "") {
		tActions = tActions + "<div class=\"genre\"><a href=\"http://soundcloud.com/tags/" + playerData[5] + "\" target=\"_new\">" + playerData[5] + "</a></div>";
	}
	$("<div id=\"tInfo\"><img src=\"" + badgeURL + "\" alt=\"\" class=\"badge\"/><h3 id=\"title\"><a href=\"" + playerData[1] + "\" target=\"_new\">" + $(track).text().substr(0, $(track).text().length - 4 - playerData[8].length) + "</a> by <a href=\"" + playerData[7] + "\" id=\"artist\">" + playerData[8] + "</a></h3></div>").appendTo("#track");
	// Center single line of title text vertically
	if($("#title").height() <= 23){ $("#title").css("margin-top","12px"); }
	$("<div id=\"actions\">" + tActions + "</div><div id=\"player\"><div class=\"playPauseC\"><a href=\"#\" id=\"playPause\" class=\"play\"></a></div><div id=\"time\">0.00 / 0.00</div><div id=\"waveform\"><div id=\"buffering\"></div><img src=\"" + playerData[0] + "\" unselectable=\"on\" class=\"wavebg\"/><div id=\"progress\"><img src=\"images/progress.png\" unselectable=\"on\"/></div></div><a href=\"#\" id=\"comments\" class=\"hide\"></a></div>").appendTo("#track");
	if (!override) {
		$("ol li:nth-child(" + child + ")").addClass("active");	
	}
	if (click) { chrome.extension.sendRequest({requestlist: "changetracks," + linkage + "," + (child-1)}); }
	// Link artist to playlist generator
	$("#artist").click(function(e){
		e.preventDefault();
		commentReset();
		$("#tabs > a").removeClass("selected");
		if($("#tabs a:nth-child(3)")){ $("#tabs a:nth-child(3)").remove(); }
		$("<a href=\"#\" id=\"" + $(this).attr("href") + "\" class=\"selected\">" + $(this).text() + "</a>").appendTo('#tabs');
		initialize($(this).attr("href"), "look", "add");
		looking = $(this).attr("href");
		linkTabs();
		chrome.extension.sendRequest({requestlist: "proper," + $(this).text()});
	});
	generateController(playerData[6]);
	chrome.extension.sendRequest({requestlist: "forceshift"});
}

// Assign controls for active track
function generateController(commentable) {
	$("#playPause").click(function() {
		chrome.extension.sendRequest({requestlist: "playback"});
		chrome.extension.sendRequest({requestlist: "forceshift"});
	});			
	$("#waveform").click(function(e) {
		var wOff = $("#waveform").offset();
		var click = e.pageX - wOff.left;
		chrome.extension.sendRequest({requestlist: "scrub," + click});
	});
	if (commentable === "true") {
		$("#comments").show();
		$("#comments").click(function() {
			if ($("#comments").hasClass('hide')) {
				$("#comments").removeClass('hide');
				$("#comments").addClass('show');
				$("#comment").show();
				$("#tracks").hide();
			}
			else {
				$("#comments").removeClass('show');
				$("#comments").addClass('hide');
				$("#tracks").show();
				$("#comment").hide();
			}
		});
	}
	else {
		$("#comments").hide();
	}
	chrome.extension.sendRequest({requestlist: "favinfo"}, function(response) {
		var fav = response.sendlist;
		if (fav) {
			$("#removeFavorite").show();
			$("#saveFavorite").hide();
		}
		else {
			$("#saveFavorite").show();
			$("#removeFavorite").hide();
		}
	});
	$("#saveFavorite").click(function() {
		$("#removeFavorite").show();
		$("#saveFavorite").hide();
		chrome.extension.sendRequest({requestlist: "saveFavorite"});
	});
	$("#removeFavorite").click(function() {
		$("#saveFavorite").show();
		$("#removeFavorite").hide();
		chrome.extension.sendRequest({requestlist: "removeFavorite"});
	});
	initialized = true;
	fetchComments();
}

// Fetch current track comments for display
function fetchComments() {
	$("#comment").empty();
	chrome.extension.sendRequest({requestlist: "comments"}, function(response) {
		if (response.sendlist !== "") {
			$("#comment").html(response.sendlist);
			$("#postcomment").click(function() {
				if ($("#newcomment").val() !== "") {
					chrome.extension.sendRequest({requestlist: "postcomment," + $("#newcomment").val()}, function(response) {
						fetchComments();
					});
				}
			});
		}
	});
}

// Load more favorites into the playlist
function loadMore() {
	chrome.extension.sendRequest({requestlist: "loadmore" + looking});
}

// Run popup intialization on popup open
$(function(){ 
	initialize("startup", "act");
});

// Add loop buton handling
function loopButton() {
	$("#loop").click(function(e){
		e.preventDefault();
		if($(this).text() === "Loop Off"){
			$(this).text("Loop All");
			$(this).addClass("on");
			chrome.extension.sendRequest({requestlist: "loopAll"});
		}
		else if($(this).text() === "Loop All"){
			$(this).text("Loop One");
			chrome.extension.sendRequest({requestlist: "loopOne"});
		}
		else{
			$(this).text("Loop Off");
			$(this).removeClass();
			chrome.extension.sendRequest({requestlist: "loopNone"});
		}
	});
}

// Handle tab linking
function linkTabs() {
	$("#tabs > a").click(function(e){
		e.preventDefault();
		if(!$(this).hasClass("selected")){
			commentReset();
			$("#tabs > a").removeClass("selected");
			$(this).addClass("selected");
			initialize(this.id, "look");
			looking = this.id;
			lastPosi = 0;
			lastPosf = 0;
			lastPosm = 0;
		}
	});
}

// Reset comment button CSS
function commentReset() {
	if ($("#comments").hasClass('show')) {
		$("#comments").removeClass('show');
		$("#comments").addClass('hide');
	}
}

// Chrome extension listener
chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
		if (initialized === true) {
			var inc;
			// Fetch updates track list for display
			if (request.requestlist === "new") {
				initialize("startup", "act");
				sendResponse({});
			}
			// Update buffer amount, play progress, and playback timer
			else if (request.requestlist.substring(0,6) === "buffer") {
				inc = request.requestlist.split(',');
				$("#buffering").width(inc[1]);
				$("#progress").width(inc[2]);
				$("#time").html(inc[3]);
				sendResponse({});
			}
			// Update play/pause button with current state
			else if (request.requestlist.substring(0,9) === "playstate") {
				inc = request.requestlist.split(',');
				$("#playPause").removeClass("pause play");
				$("#playPause").addClass(inc[1]);
				sendResponse({});
			}
			// Highlight next track in the playlist
			else if (request.requestlist.substring(0,4) === "next") {
				inc = request.requestlist.split(',');
				actions(inc[1], view, "next");
				sendResponse({});
			}
			// If requested favorite tracks are ready
			else if (request.requestlist.substr(0,9) === "readymore") {
				if (request.requestlist.substr(9) === "fav") {
					initialize("fav", "look", "add");
				}
				else if (request.requestlist.substr(9) === "inc") {
					initialize("inc", "look", "add");
				}
				else {
					initialize($("#tabs a:nth-child(3)").attr("id"), "look", "add");
				}
			}
			// Catch unrecognized requests
			else {
				sendResponse({});
			}
		}
		// Catch for requests made before popup is initialized
		else {
			sendResponse({});
		}
	}
);