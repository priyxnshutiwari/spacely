import { useLocation, useNavigate, useOutletContext, useParams} from "react-router";
import {useEffect, useRef, useState} from "react";
import {generate3DView} from "../../lib/ai.action";
import {Download, RefreshCcw, Share2, Sparkles, X} from "lucide-react";
import Button from "../../components/ui/Button";
import {createProject, getProjectById} from "../../lib/puter.action";
import {ReactCompareSlider, ReactCompareSliderImage} from "react-compare-slider";

const VisualizerId = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { userId } = useOutletContext<AuthContext>()

    const hasInitialGenerated = useRef(false);

    const [project, setProject] = useState<DesignItem | null>(null);
    const [isProjectLoading, setIsProjectLoading] = useState(true);

    const [isProcessing, setIsProcessing] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);
    const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

    const handleBack = () => navigate('/');
    const handleExport = () => {
        if (!currentImage) return;

        const link = document.createElement('a');
        link.href = currentImage;
        link.download = `spacely-${id || 'design'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handleShare = async () => {
        if (!id) return;

        const shareUrl = `${window.location.origin}/visualizer/${id}`;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setShareStatus('copied');
            window.setTimeout(() => setShareStatus('idle'), 1500);
        } catch {
            window.prompt('Copy this project link:', shareUrl);
        }
    }

    const handlePublishToggle = async () => {
        if (!project || !id) return;

        try {
            setIsPublishing(true);
            const nextVisibility = project.isPublic ? 'private' : 'public';
            const updatedProject = {
                ...project,
                isPublic: nextVisibility === 'public',
                timestamp: Date.now(),
            };

            const saved = await createProject({ item: updatedProject, visibility: nextVisibility });
            if (saved) {
                setProject(saved);
            }
        } finally {
            setIsPublishing(false);
        }
    }

    const runGeneration = async (item: DesignItem) => {
        if(!id || !item.sourceImage) return;

        try {
            setIsProcessing(true);
            setGenerationError(null);

            const result = await Promise.race([
                generate3DView({ sourceImage: item.sourceImage }),
                new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error("Generation timed out after 90 seconds.")), 90_000);
                }),
            ]);

            if(result.renderedImage) {
                setCurrentImage(result.renderedImage);

                const updatedItem = {
                    ...item,
                    renderedImage: result.renderedImage,
                    renderedPath: result.renderedPath,
                    timestamp: Date.now(),
                    ownerId: item.ownerId ?? userId ?? null,
                    isPublic: item.isPublic ?? false,
                }

                const saved = await createProject({ item: updatedItem, visibility: "private" })

                if(saved) {
                    setProject(saved);
                    setCurrentImage(saved.renderedImage || result.renderedImage);
                }
            }
        } catch (error) {
            console.error('Generation failed: ', error);
            const message = error instanceof Error ? error.message : 'Unable to generate the 3D preview right now.';
            setGenerationError(message);
        } finally {
            setIsProcessing(false);
        }
    }

    useEffect(() => {
        let isMounted = true;

        const loadProject = async () => {
            if (!id) {
                setIsProjectLoading(false);
                return;
            }

            setIsProjectLoading(true);
            setGenerationError(null);

            const fetchedProject = await getProjectById({ id });
            const initialProject = (location.state as { initialProject?: DesignItem | null } | undefined)?.initialProject;
            const resolvedProject = fetchedProject ?? (initialProject?.id === id ? initialProject : null);

            if (!isMounted) return;

            setProject(resolvedProject);
            setCurrentImage(resolvedProject?.renderedImage || null);
            setIsProjectLoading(false);
            setHasAttemptedGeneration(false);
            hasInitialGenerated.current = false;
        };

        loadProject();

        return () => {
            isMounted = false;
        };
    }, [id, location.state]);

    useEffect(() => {
        if (
            isProjectLoading ||
            hasInitialGenerated.current ||
            !project?.sourceImage
        )
            return;

        if (project.renderedImage) {
            setCurrentImage(project.renderedImage);
            hasInitialGenerated.current = true;
            return;
        }

        if (hasAttemptedGeneration) {
            return;
        }

        hasInitialGenerated.current = true;
        setHasAttemptedGeneration(true);
        void runGeneration(project);
    }, [project, isProjectLoading, hasAttemptedGeneration]);

    return (
        <div className="visualizer">
            <nav className="topbar">
                <div className="brand">
                    <div className="logo-mark" aria-hidden="true">
                        <span className="logo-s">S</span>
                        <Sparkles className="logo-spark" />
                    </div>

                    <span className="name">spacely</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
                    <X className="icon" /> Exit Editor
                </Button>
            </nav>

            <section className="content">
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Project</p>
                            <h2>{project?.name || `Residence ${id}`}</h2>
                            <p className="note">Created by You</p>
                        </div>

                        <div className="panel-actions">
                            <Button
                                size="sm"
                                onClick={handlePublishToggle}
                                className="publish"
                                disabled={isPublishing}
                            >
                                {isPublishing ? 'Saving...' : project?.isPublic ? 'Unpublish' : 'Publish to Community'}
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleExport}
                                className="export"
                                disabled={!currentImage}
                            >
                                <Download className="w-4 h-4 mr-2" /> Export
                            </Button>
                            <Button size="sm" onClick={handleShare} className="share">
                                <Share2 className="w-4 h-4 mr-2" />
                                {shareStatus === 'copied' ? 'Copied' : 'Share'}
                            </Button>
                        </div>
                    </div>

                    <div className={`render-area ${isProcessing ? 'is-processing': ''}`}>
                        {currentImage ? (
                            <img src={currentImage} alt="AI Render" className="render-img" />
                        ) : (
                            <div className="render-placeholder">
                                {project?.sourceImage && (
                                    <img src={project?.sourceImage} alt="Original" className="render-fallback" />
                                )}
                            </div>
                        )}

                        {isProcessing && (
                            <div className="render-overlay">
                                <div className="rendering-card">
                                    <RefreshCcw className="spinner" />
                                    <span className="title">Rendering...</span>
                                    <span className="subtitle">Generating your 3D visualization</span>
                                </div>
                            </div>
                        )}

                        {generationError && !currentImage && (
                            <div className="render-overlay">
                                <div className="rendering-card">
                                    <span className="title">Generation issue</span>
                                    <span className="subtitle">{generationError}</span>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                <div className="panel compare">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Comparison</p>
                            <h3>Before and After</h3>
                        </div>
                        <div className="hint">Drag to compare</div>
                    </div>

                    <div className="compare-stage">
                        {project?.sourceImage && currentImage ? (
                            <ReactCompareSlider
                                defaultValue={50}
                                style={{ width: '100%', height: 'auto' }}
                                itemOne={
                                    <ReactCompareSliderImage src={project?.sourceImage} alt="before" className="compare-img" />
                                }
                                itemTwo={
                                    <ReactCompareSliderImage src={currentImage || project?.renderedImage} alt="after" className="compare-img" />
                                }
                            />
                        ) : (
                            <div className="compare-fallback">
                                {project?.sourceImage && (
                                    <img src={project.sourceImage} alt="Before" className="compare-img" />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}
export default VisualizerId
