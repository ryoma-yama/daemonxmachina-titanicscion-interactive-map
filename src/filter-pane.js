import L from "leaflet";
import { getAssetPath } from "./asset-path.js";
import { colors } from "./constants.js";

function formatCategoryLabel(category) {
	if (typeof category !== "string" || !category.length) {
		return "Unknown";
	}
	if (category.toLowerCase() === "npc") {
		return "NPC";
	}
	return category
		.split(/[\s_-]+/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(" ");
}

function clampOpacity(value) {
	return Math.min(Math.max(value, 0), 1).toString();
}

export class FilterPane {
	constructor({ filterManager }) {
		this.filterManager = filterManager;
		this.isOpen = false;
		this.categoryElements = new Map();
		this.renderedCategories = [];
		this.rowOrder = [];

		this.container = document.getElementById("filter-pane");
		this.toggleButton = document.getElementById("filter-toggle");
		this.allButton = document.querySelector("[data-testid=filter-all]");
		this.noneButton = document.querySelector("[data-testid=filter-none]");
		this.listElement = this.container?.querySelector(".filter-pane__list");
		this.liveRegion = this.container?.querySelector(".filter-pane__live");

		if (
			!this.container ||
			!this.toggleButton ||
			!this.listElement ||
			!this.allButton ||
			!this.noneButton
		) {
			console.error("Filter pane markup is incomplete");
			return;
		}

		this.allButton.disabled = true;
		this.noneButton.disabled = true;

		this.toggleButton.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			if (this.isOpen) {
				this.close();
			} else {
				this.open();
			}
		});

		this.allButton.addEventListener("click", (event) => {
			event.preventDefault();
			this.filterManager?.selectAll();
			this.announce("All categories shown");
		});

		this.noneButton.addEventListener("click", (event) => {
			event.preventDefault();
			this.filterManager?.selectNone();
			this.announce("All categories hidden");
		});

		document.addEventListener("filter:changed", (event) => {
			const selected = event.detail?.selectedCategories ?? [];
			this.handleFilterChanged(selected);
		});

		if (this.filterManager?.isReady()) {
			this.renderCategories(this.filterManager.getAvailableCategories());
			this.updateCategoryStates(this.filterManager.getSelectedCategories());
		}

		L.DomEvent.disableClickPropagation(this.container);
		L.DomEvent.disableScrollPropagation(this.container);
		L.DomEvent.disableClickPropagation(this.toggleButton);
		L.DomEvent.disableScrollPropagation(this.toggleButton);

		this.close({ skipFocus: true });
	}

	open() {
		if (this.isOpen) {
			return;
		}

		this.isOpen = true;
		this.container.style.display = "flex";
		this.container.classList.add("filter-pane--open");
		this.container.removeAttribute("hidden");
		this.container.removeAttribute("aria-hidden");
		this.container.removeAttribute("inert");
		this.toggleButton.setAttribute("aria-expanded", "true");
		if (this.rowOrder.length) {
			this.rowOrder.forEach((row, index) => {
				row.setAttribute("tabindex", index === 0 ? "0" : "-1");
			});
			this.rowOrder[0].focus();
		}
	}

	close({ skipFocus = false } = {}) {
		this.isOpen = false;
		this.container.classList.remove("filter-pane--open");
		this.container.setAttribute("hidden", "");
		this.container.setAttribute("aria-hidden", "true");
		this.container.setAttribute("inert", "");
		this.container.style.display = "none";
		this.toggleButton.setAttribute("aria-expanded", "false");
		if (!skipFocus) {
			this.toggleButton.focus();
		}
	}

	handleFilterChanged(selectedCategories) {
		if (this.filterManager?.isReady()) {
			const available = this.filterManager.getAvailableCategories();
			if (!this.hasRenderedCategories(available)) {
				this.renderCategories(available);
			}
		}

		this.updateCategoryStates(selectedCategories);
		this.updateActionStates(selectedCategories);
	}

	hasRenderedCategories(categories) {
		if (this.renderedCategories.length !== categories.length) {
			return false;
		}
		return this.renderedCategories.every(
			(category, index) => category === categories[index],
		);
	}

	renderCategories(categories) {
		this.listElement.innerHTML = "";
		this.categoryElements.clear();
		this.rowOrder = [];
		this.renderedCategories = [...categories];

		categories.forEach((category) => {
			const item = document.createElement("li");
			item.className = "filter-pane__item";
			item.setAttribute("data-testid", `filter-item-${category}`);
			item.setAttribute("data-category", category);
			item.setAttribute("tabindex", "-1");

			const label = document.createElement("label");
			label.className = "filter-pane__control";
			label.setAttribute("for", `filter-checkbox-${category}`);

			const icon = document.createElement("span");
			icon.className = "filter-pane__icon";
			const iconUrl = getAssetPath(`/assets/icons/${category}.svg`);
			const color = colors[category] || "#ffffff";
			icon.style.backgroundColor = color;
			icon.style.mask = `url('${iconUrl}') center / contain no-repeat`;
			icon.style.webkitMask = `url('${iconUrl}') center / contain no-repeat`;

			const name = document.createElement("span");
			name.className = "filter-pane__label";
			name.textContent = formatCategoryLabel(category);

			const checkbox = document.createElement("input");
			checkbox.className = "filter-pane__checkbox";
			checkbox.type = "checkbox";
			checkbox.id = `filter-checkbox-${category}`;
			checkbox.setAttribute("data-category", category);
			checkbox.addEventListener("change", () => {
				const checked = checkbox.checked;
				this.filterManager?.toggleCategory(category);
				this.announce(
					`${formatCategoryLabel(category)} ${checked ? "shown" : "hidden"}`,
				);
			});
			checkbox.addEventListener("keydown", (event) => {
				this.handleRowKeydown(event, category);
			});

			item.addEventListener("keydown", (event) => {
				this.handleRowKeydown(event, category);
			});

			label.appendChild(icon);
			label.appendChild(name);
			label.appendChild(checkbox);
			item.appendChild(label);
			this.listElement.appendChild(item);

			this.categoryElements.set(category, {
				item,
				icon,
				label: name,
				checkbox,
			});
			this.rowOrder.push(item);
		});
	}

	handleRowKeydown(event, category) {
		if (!this.rowOrder.length) {
			return;
		}
		const currentIndex = this.rowOrder.findIndex(
			(row) => row.dataset.category === category,
		);
		if (currentIndex === -1) {
			return;
		}

		if (event.key === "ArrowDown") {
			event.preventDefault();
			const nextIndex = (currentIndex + 1) % this.rowOrder.length;
			this.rowOrder[currentIndex].setAttribute("tabindex", "-1");
			this.rowOrder[nextIndex].setAttribute("tabindex", "0");
			this.rowOrder[nextIndex].focus();
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			const prevIndex =
				(currentIndex - 1 + this.rowOrder.length) % this.rowOrder.length;
			this.rowOrder[currentIndex].setAttribute("tabindex", "-1");
			this.rowOrder[prevIndex].setAttribute("tabindex", "0");
			this.rowOrder[prevIndex].focus();
		} else if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			const elements = this.categoryElements.get(category);
			if (elements) {
				elements.checkbox.click();
				this.rowOrder[currentIndex].setAttribute("tabindex", "0");
				this.rowOrder[currentIndex].focus();
			}
		}
	}

	updateCategoryStates(selectedCategories) {
		const selectedSet = new Set(selectedCategories);
		this.categoryElements.forEach((elements, category) => {
			const isSelected = selectedSet.has(category);
			elements.checkbox.checked = isSelected;
			elements.icon.style.opacity = clampOpacity(isSelected ? 1 : 0.4);
			elements.item.classList.toggle(
				"filter-pane__item--disabled",
				!isSelected,
			);
			elements.label.classList.toggle(
				"filter-pane__label--disabled",
				!isSelected,
			);
		});
	}

	updateActionStates(selectedCategories) {
		const totalCategories = this.renderedCategories.length;
		const selectedCount = selectedCategories.length;
		const allActive = selectedCount === totalCategories && totalCategories > 0;
		const noneActive = selectedCount === 0;
		this.allButton.setAttribute("aria-pressed", allActive ? "true" : "false");
		this.noneButton.setAttribute("aria-pressed", noneActive ? "true" : "false");
		this.allButton.disabled = totalCategories === 0;
		this.noneButton.disabled = totalCategories === 0;
	}

	announce(message) {
		if (!this.liveRegion) {
			return;
		}
		this.liveRegion.textContent = message;
	}
}
