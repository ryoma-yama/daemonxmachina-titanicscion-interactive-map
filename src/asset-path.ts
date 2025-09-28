const baseUrl = import.meta.env.BASE_URL || "/";

const normalize = (path?: string | null): string => {
	if (!path) {
		return "";
	}
	return path.startsWith("/") ? path.slice(1) : path;
};

export function getAssetPath(path?: string | null): string {
	const normalizedPath = normalize(path);
	if (!normalizedPath) {
		return baseUrl;
	}
	return baseUrl.endsWith("/")
		? `${baseUrl}${normalizedPath}`
		: `${baseUrl}/${normalizedPath}`;
}
