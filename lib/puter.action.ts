import puter from "@heyputer/puter.js";
import {getOrCreateHostingConfig, uploadImageToHosting} from "./puter.hosting";
import {isHostedUrl} from "./utils";
import {PUTER_WORKER_URL} from "./constants";

const PROJECTS_STORAGE_KEY = "spacely.projects";
const LEGACY_PROJECTS_STORAGE_KEY = "roomify.projects";
const HAS_PUTER_CONFIG = Boolean(PUTER_WORKER_URL);

const getStoredProjects = (): DesignItem[] => {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        let raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);

        if (!raw) {
            raw = window.localStorage.getItem(LEGACY_PROJECTS_STORAGE_KEY);
            if (raw) {
                window.localStorage.setItem(PROJECTS_STORAGE_KEY, raw);
                window.localStorage.removeItem(LEGACY_PROJECTS_STORAGE_KEY);
            }
        }

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter((item): item is DesignItem => Boolean(item && typeof item === "object" && typeof item.id === "string" && typeof item.sourceImage === "string"));
    } catch {
        return [];
    }
};

const saveStoredProjects = (projects: DesignItem[]) => {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch {
        console.warn("Unable to persist projects locally.");
    }
};

const mergeProjects = (projects: DesignItem[]) => {
    const storedProjects = getStoredProjects();
    const combined = [...storedProjects, ...projects];

    const deduped = combined.reduce<DesignItem[]>((acc, project) => {
        if (!acc.some((item) => item.id === project.id)) {
            acc.push(project);
        }
        return acc;
    }, []);

    return deduped.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

export const signIn = async () => {
    if (!HAS_PUTER_CONFIG) {
        return false;
    }

    try {
        await puter.auth.signIn();
        return true;
    } catch {
        return false;
    }
};

export const signOut = async () => {
    if (!HAS_PUTER_CONFIG) {
        return false;
    }

    try {
        await puter.auth.signOut();
        return true;
    } catch {
        return false;
    }
};

export const getCurrentUser = async () => {
    if (!HAS_PUTER_CONFIG) {
        return null;
    }

    try {
        return await puter.auth.getUser();
    } catch {
        return null;
    }
}

export const createProject = async ({ item, visibility = "private" }: CreateProjectParams): Promise<DesignItem | null | undefined> => {
    const normalizedItem: DesignItem = {
        ...item,
        timestamp: item.timestamp || Date.now(),
        isPublic: visibility === "public" ? true : item.isPublic ?? false,
    };

    const fallbackProject = {
        ...normalizedItem,
        sourceImage: normalizedItem.sourceImage || "",
    };

    if(!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL; keeping the project locally for the Projects section.');
        saveStoredProjects(mergeProjects([fallbackProject]));
        return fallbackProject;
    }
    const projectId = normalizedItem.id;

    const hosting = await getOrCreateHostingConfig();

    const hostedSource = projectId ?
        await uploadImageToHosting({ hosting, url: normalizedItem.sourceImage, projectId, label: 'source', }) : null;

    const hostedRender = projectId && normalizedItem.renderedImage ?
        await uploadImageToHosting({ hosting, url: normalizedItem.renderedImage, projectId, label: 'rendered', }) : null;

    const resolvedSource = hostedSource?.url || (isHostedUrl(normalizedItem.sourceImage)
        ? normalizedItem.sourceImage
        : normalizedItem.sourceImage
    );

    const resolvedRender = hostedRender?.url
        ? hostedRender?.url
        : normalizedItem.renderedImage && isHostedUrl(normalizedItem.renderedImage)
            ? normalizedItem.renderedImage
            : normalizedItem.renderedImage;

    const {
        sourcePath: _sourcePath,
        renderedPath: _renderedPath,
        publicPath: _publicPath,
        ...rest
    } = normalizedItem;

    const payload = {
        ...rest,
        sourceImage: resolvedSource || normalizedItem.sourceImage,
        renderedImage: resolvedRender || normalizedItem.renderedImage,
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/save`, {
            method: 'POST',
            body: JSON.stringify({
                project: payload,
                visibility
            })
        });

        if(!response.ok) {
            console.error('failed to save the project', await response.text());
            saveStoredProjects(mergeProjects([payload]));
            return payload;
        }

        const data = (await response.json()) as { project?: DesignItem | null }
        const savedProject = data?.project ?? payload;
        saveStoredProjects(mergeProjects([savedProject]));

        return savedProject;
    } catch (e) {
        console.log('Failed to save project', e)
        saveStoredProjects(mergeProjects([payload]));
        return payload;
    }
}

export const getProjects = async () => {
    const locallyStoredProjects = getStoredProjects();

    if(!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL; using locally stored projects.');
        return mergeProjects(locallyStoredProjects);
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/list`, { method: 'GET' });

        if(!response.ok) {
            console.error('Failed to fetch history', await response.text());
            return mergeProjects(locallyStoredProjects);
        }

        const data = (await response.json()) as { projects?: DesignItem[] | null };
        const remoteProjects = Array.isArray(data?.projects) ? data.projects : [];
        const mergedProjects = mergeProjects(remoteProjects);

        if (mergedProjects.length > 0) {
            saveStoredProjects(mergedProjects);
            return mergedProjects;
        }

        return mergeProjects(locallyStoredProjects);
    } catch (e) {
        console.error('Failed to get projects', e);
        return mergeProjects(locallyStoredProjects);
    }
}

export const getCommunityProjects = async () => {
    const allProjects = await getProjects();
    return allProjects.filter((project) => project.isPublic);
};

export const getProjectById = async ({ id }: { id: string }) => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; using local project lookup.");
        return getStoredProjects().find((project) => project.id === id) ?? null;
    }

    console.log("Fetching project with ID:", id);

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
            { method: "GET" },
        );

        console.log("Fetch project response:", response);

        if (!response.ok) {
            console.error("Failed to fetch project:", await response.text());
            return getStoredProjects().find((project) => project.id === id) ?? null;
        }

        const data = (await response.json()) as {
            project?: DesignItem | null;
        };

        console.log("Fetched project data:", data);

        return data?.project ?? getStoredProjects().find((project) => project.id === id) ?? null;
    } catch (error) {
        console.error("Failed to fetch project:", error);
        return getStoredProjects().find((project) => project.id === id) ?? null;
    }
};
