// Application entry point - Dependency assembly and initialization only
import "leaflet/dist/leaflet.css";
import { AppController } from "./app-controller.js";
import "./styles.css";

function init(): void {
	// Hide loading screen and show app
	const loadingElement = document.getElementById("loading");
	const appElement = document.getElementById("app");

	if (loadingElement) {
		loadingElement.style.display = "none";
	}
	if (appElement) {
		appElement.style.display = "block";
	}

	// Initialize application after all CSS is loaded
	new AppController();
	console.log("Multi-map system initialized successfully");
}

window.addEventListener("load", init);
