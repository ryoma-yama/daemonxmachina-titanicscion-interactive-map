// Application entry point - Dependency assembly and initialization only
import "leaflet/dist/leaflet.css";
import { AppController } from "./app-controller.js";
import "./styles.css";

function init() {
	// Initialize application after all CSS is loaded
	new AppController();
	console.log("Multi-map system initialized successfully");
}

window.addEventListener("load", init);
