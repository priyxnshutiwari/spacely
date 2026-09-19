export const PUTER_WORKER_URL = import.meta.env.VITE_PUTER_WORKER_URL || "";

// Storage Paths
export const STORAGE_PATHS = {
    ROOT: "spacely",
    SOURCES: "spacely/sources",
    RENDERS: "spacely/renders",
} as const;

// Timing Constants (in milliseconds)
export const SHARE_STATUS_RESET_DELAY_MS = 1500;
export const PROGRESS_INCREMENT = 15;
export const REDIRECT_DELAY_MS = 600;
export const PROGRESS_INTERVAL_MS = 100;
export const PROGRESS_STEP = 5;

// UI Constants
export const GRID_OVERLAY_SIZE = "60px 60px";
export const GRID_COLOR = "#3B82F6";

// HTTP Status Codes
export const UNAUTHORIZED_STATUSES = [401, 403];

// Image Dimensions
export const IMAGE_RENDER_DIMENSION = 1024;

export const SPACELY_RENDER_PROMPT = `
TASK: Convert the input 2D floor plan into a **photorealistic, top‑down 3D architectural render without redesigning it**. The 2D floor plan is the authoritative blueprint.

STRICT REQUIREMENTS (do not violate):
1) **PRESERVE THE FLOOR PLAN EXACTLY**: Treat the input as a locked blueprint. Keep the exact wall layout, room boundaries, proportions, scale, footprint, openings, doors, windows, stairs, and circulation paths. Do not redesign, reinterpret, simplify, straighten, mirror, rotate, crop, or move anything.
2) **ROOM DIMENSIONS**: Preserve every dimension measurement shown in the input plan and render it as a crisp, readable dimension label inside or immediately beside its corresponding room. Keep the value, units, and placement relationship exact. If a room has no dimension shown and its size cannot be determined reliably from the source, do not invent one.
3) **3D ONLY, NO LAYOUT CHANGES**: The only changes allowed are vertical wall extrusion, realistic materials, furniture depth, daylight, and subtle shadows. Do not add, remove, resize, or relocate rooms or architectural elements.
4) **REMOVE UNRELATED TEXT**: Do not render room names, decorative labels, notes, watermarks, logos, or annotations other than source dimension labels. Floors must remain continuous where removed text used to be.
5) **TOP-DOWN ONLY**: Orthographic top-down view with the entire floor plan visible. No perspective tilt, dramatic camera angle, or obstructive objects.
6) **CLEAN, REALISTIC OUTPUT**: Crisp edges, balanced lighting, and realistic materials. No sketch/hand-drawn look.
7) **NO EXTRA CONTENT**: Do not add rooms, furniture, or objects that are not clearly indicated by the plan.

STRUCTURE & DETAILS:
- **Walls**: Extrude precisely from the plan lines. Consistent wall height and thickness.
- **Doors**: Convert door swing arcs into open doors, aligned to the plan.
- **Windows**: Convert thin perimeter lines into realistic glass windows.

FURNITURE & ROOM MAPPING (only where icons/fixtures are clearly shown):
- Bed icon → realistic bed with duvet and pillows.
- Sofa icon → modern sectional or sofa.
- Dining table icon → table with chairs.
- Kitchen icon → counters with sink and stove.
- Bathroom icon → toilet, sink, and tub/shower.
- Office/study icon → desk, chair, and minimal shelving.
- Porch/patio/balcony icon → outdoor seating or simple furniture (keep minimal).
- Utility/laundry icon → washer/dryer and minimal cabinetry.

STYLE & LIGHTING:
- Lighting: bright, neutral daylight. High clarity and balanced contrast.
- Materials: realistic wood/tile floors, clean walls, subtle shadows.
- Finish: professional architectural visualization; no text, no watermarks, no logos.
`.trim();
