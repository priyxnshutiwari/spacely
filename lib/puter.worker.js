const PROJECT_PREFIX = 'spacely_project_';
const LEGACY_PROJECT_PREFIX = 'roomify_project_';

const getProjectKey = (id) => `${PROJECT_PREFIX}${id}`;
const getLegacyProjectKey = (id) => `${LEGACY_PROJECT_PREFIX}${id}`;

const jsonError = (status, message, extra = {}) => {
    return new Response(JSON.stringify({  error: message, ...extra }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    })
}

const getUserId = async (userPuter) => {
    try {
        const user = await userPuter.auth.getUser();

        return user?.uuid || null;
    } catch {
        return null;
    }
}

router.post('/api/projects/save', async ({ request, user }) => {
    try {
        const userPuter = user.puter;

        if(!userPuter) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const project = body?.project;

        if(!project?.id || !project?.sourceImage) return jsonError(400, 'Project ID and source image are required');

        const payload = {
            ...project,
            updatedAt: new Date().toISOString(),
        }

        const userId = await getUserId(userPuter);
        if(!userId) return jsonError(401, 'Authentication failed');

        const key = getProjectKey(project.id);
        await userPuter.kv.set(key, payload);

        return { saved: true, id: project.id, project: payload }
    } catch (e) {
        return jsonError(500, 'Failed to save project', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/projects/list', async ({ user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const newProjects = (await userPuter.kv.list(PROJECT_PREFIX, true))
            .map(({value}) => ({ ...value, isPublic: true }));
        const legacyProjects = (await userPuter.kv.list(LEGACY_PROJECT_PREFIX, true))
            .map(({value}) => ({ ...value, isPublic: true }));

        const seen = new Set();
        const projects = [...newProjects, ...legacyProjects].filter((project) => {
            if (!project?.id || seen.has(project.id)) {
                return false;
            }
            seen.add(project.id);
            return true;
        });

        return { projects };
    } catch (e) {
        return jsonError(500, 'Failed to list projects', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/projects/get', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return jsonError(400, 'Project ID is required');

        let project = await userPuter.kv.get(getProjectKey(id));
        if (!project) {
            project = await userPuter.kv.get(getLegacyProjectKey(id));
        }

        if (!project) return jsonError(404, 'Project not found');

        return { project };
    } catch (e) {
        return jsonError(500, 'Failed to get project', { message: e.message || 'Unknown error' });
    }
})
