chrome.runtime.sendMessage({type: 'showPageAction'});

var lastTitle = "";

function getInfo(title, episodeNode, callback) {
	var info = {};
	if (title) {
		info["title"] = title;
	}
	if (episodeNode) {
		var text = episodeNode.textContent;
		var regex = /\D*(\d+)\D*(\d+)/
		var match = regex.exec(text);
		info["season"] = match[1];
		info["episode"] = match[2];
	}
	callback(info);
}

function getRatings(title, season, episode, callback) {
	if (title.length && !lastTitle || lastTitle == title || !title.endsWith(lastTitle)) {
		lastTitle = title;
		fetchRatings(title, season, episode, function(ratings) {
			callback(ratings);
		});
	}
}

function getInfoAndRatings(title, episodeNode, callback) {
	getInfo(title, episodeNode, function(info) {
		getRatings(info["title"], info["season"], info["episode"], callback);
	})
}

MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

var observerOptions = {
	childList: true,
	subtree: true
}

var jawBoneContentObserver = new MutationObserver(function(mutations, observer) {
	var node = mutations[mutations.length - 1].target;
	var headerNode = node.querySelector(".jawBone > h3");
	if (headerNode) {
		var titleNode = headerNode.querySelector(".title");
		var title;
		if (titleNode.querySelector("img")) {
			title = titleNode.querySelector("img").alt;
		} else {
			title = titleNode.textContent;
		}
		if (title) {
			getInfoAndRatings(title, null, function(ratings) {
				injectRatings(node.querySelector(".meta"), ratings);
			});
		}
	}
});

var titleCardObserver = new MutationObserver(function(mutations, observer) {
	var node = mutations[mutations.length - 1].target;
	var titleNode = node.querySelector(".bob-title");
	if (titleNode && titleNode.textContent) {
		getInfoAndRatings(titleNode.textContent, null, function(ratings) {
			injectRatings(node.querySelector(".meta"), ratings);
		});
	}
});

function addTitleObserver(node) {
	node.querySelectorAll(".jawBoneContent").forEach(function(node) {
		if (!node.hasAttribute("observed")) {
			jawBoneContentObserver.observe(node, observerOptions);
			node.setAttribute("observed", "true");
		};
	});
	node.querySelectorAll(".title-card-container > div > span").forEach(function(node) {
		if (!node.hasAttribute("observed")) {
			titleCardObserver.observe(node, observerOptions);
			node.setAttribute("observed", "true");
		};
	});
}

var rowObserver = new MutationObserver(function(mutations, observer) {
	mutations.forEach(function(mutation) {
		if (mutation.addedNodes) {
			mutation.addedNodes.forEach(function(node) {
				if (node.nodeType === 1) {
					addTitleObserver(node);
				}
			});
		}
	});
});

var mainObserver = new MutationObserver(function(mutations, observer) {
	var mainView = document.querySelector(".mainView");
	if (mainView) {
		observer.disconnect();
		rowObserver.observe(mainView, observerOptions);
		addTitleObserver(mainView);
		addFeaturedInfo(mainView);
	}
});

function addFeaturedInfo(node) {
	var jawBoneNode = node.querySelector(".jawBoneContainer > .jawBone");
	if (jawBoneNode) {
		var titleNode = jawBoneNode.querySelector(".title");
		if (titleNode) {
			if (img = titleNode.querySelector("img")) {
				title = img.alt;
			} else {
				title = titleNode.textContent;
			}
			getInfoAndRatings(title, null, function(ratings) {
				injectRatings(node.querySelector(".meta"), ratings);
			});
		}
	}
}

var playerObserver = new MutationObserver(function(mutations, observer) {
	var playerTitle = document.querySelector(".player-status-main-title");
	if (playerTitle && playerTitle.textContent && playerTitle.textContent.length > 0) {
		observer.disconnect();
		addPlayerInfo(playerTitle);
	}
});

function addPlayerInfo(playerTitleNode) {
	if (playerTitleNode) {
		var infoNode = playerTitleNode.parentNode;
		var episodeSpan;
		Array.prototype.some.call(infoNode.getElementsByTagName('span'), function(span) {
			if (span.classList.length == 0) {
				episodeSpan = span;
				return true;
			}
		});
		getInfoAndRatings(playerTitleNode.textContent, episodeSpan, function(ratings) {
			injectRatings(infoNode, ratings);
		});
	}
}

var lastSeason = "";

var episodeContainerObserver = new MutationObserver(function(mutations, observer) {
	var episodeListContainer = document.querySelector(".episode-list-container");
	if (episodeListContainer) {
		addEpisodeInfo(episodeListContainer);
	}
});

function addEpisodeInfo(episodeListContainer) {
	var title = document.querySelector(".player-status-main-title").textContent;
	var seasonNode = episodeListContainer.querySelector(".seasons-title");
	var season = extractSeasonNumber(seasonNode.textContent);
	if (season && season != lastSeason) {
		lastSeason = season;
		var episodes = episodeListContainer.querySelectorAll(".episode-list-index");
		episodes.forEach(function(episode) {
			if (title) {
				getRatings(title, season, episode.textContent, function(ratings) {
					injectRatings(episode.parentNode, ratings);
				});
			}
		});
	}
}

function extractSeasonNumber(text) {
	var regex = /(S|s)eason (\d+)/
	var match = regex.exec(text);
	if (match) {
		return match[2];
	}
	return null;
}

if (mainView = document.querySelector(".mainView")) {
	rowObserver.observe(mainView, observerOptions);
	addTitleObserver(mainView);
	addFeaturedInfo(mainView);
} else if (playerTitle = document.querySelector(".player-status-main-title")) {
	console.log("Found player title");
	if (playerTitle && playerTitle.textContent && playerTitle.textContent.length > 0) {
		addPlayerInfo(playerTitle);
	}
} else {
	mainObserver.observe(document, observerOptions);
	playerObserver.observe(document, observerOptions);
	episodeContainerObserver.observe(document, observerOptions);
}