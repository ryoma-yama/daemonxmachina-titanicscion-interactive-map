const baseUrl = import.meta.env.BASE_URL || "/";

const normalize = (path) => {
	if (!path) {
		return path;
	}
	return path.startsWith("/") ? path.slice(1) : path;
};

export function getAssetPath(path) {
	const normalizedPath = normalize(path || "");
	if (!normalizedPath) {
		return baseUrl;
	}
	return baseUrl.endsWith("/")
		? `${baseUrl}${normalizedPath}`
		: `${baseUrl}/${normalizedPath}`;
}
