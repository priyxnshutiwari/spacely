import type { Route } from "./+types/home";
import Navbar from "../../components/Navbar";
import {ArrowRight, ArrowUpRight, Clock, Layers} from "lucide-react";
import Button from "../../components/ui/Button";
import Upload from "../../components/Upload";
import {Link, useNavigate} from "react-router";
import {useEffect, useRef, useState} from "react";
import {createProject, getProjects} from "../../lib/puter.action";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Spacely" },
    { name: "description", content: "Spacely turns architectural floor plans into spatial concepts and visual narratives." },
  ];
}

export default function Home() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<DesignItem[]>([]);
    const isCreatingProjectRef = useRef(false);

    const handleUploadComplete = async (base64Image: string) => {
        try {

            if(isCreatingProjectRef.current) return false;
            isCreatingProjectRef.current = true;
            const newId = Date.now().toString();
            const name = `Residence ${newId}`;

            const newItem: DesignItem = {
                id: newId,
                name,
                sourceImage: base64Image,
                renderedImage: undefined,
                timestamp: Date.now(),
            };

            const saved = await createProject({ item: newItem, visibility: 'private' });
            const projectToUse = saved ?? newItem;

            setProjects((prev) => {
                const existing = prev.filter((item) => item.id !== projectToUse.id);
                return [projectToUse, ...existing];
            });

            navigate(`/visualizer/${newId}`, {
                state: {
                    initialProject: projectToUse,
                    initialImage: projectToUse.sourceImage,
                    initialRendered: projectToUse.renderedImage || null,
                    name,
                }
            });

            return true;
        } finally {
            isCreatingProjectRef.current = false;
        }
    }

    useEffect(() => {
        const fetchProjects = async () => {
            const items = await getProjects();

            setProjects(items);
        }

        fetchProjects();
    }, []);

  return (
      <div className="home">
          <Navbar />

          <section className="hero">
              <h1>See Beyond the Blueprint.</h1>

              <p className="subtitle">
                  Spacely helps architects and designers explore layouts, mood, and material direction with a faster, calmer creative workflow.
              </p>

              <div className="actions">
                  <a href="#upload" className="cta">
                      Explore Your Space <ArrowRight className="icon" />
                  </a>
              </div>

              <div id="upload" className="upload-shell">
                <div className="grid-overlay" />

                  <div className="upload-card">
                      <div className="upload-head">
                          <div className="upload-icon">
                              <Layers className="icon" />
                          </div>

                          <h3>Drop in a floor plan</h3>
                          <p>PNG or JPG up to 10MB</p>
                      </div>

                      <Upload onComplete={handleUploadComplete} />
                  </div>
              </div>
          </section>

          <section id="projects" className="projects">
              <div className="section-inner">
                  <div className="section-head">
                      <div className="copy">
                          <h2>Recent Work</h2>
                          <p>A living gallery of your concept boards and spatial experiments.</p>
                      </div>
                  </div>

                  <div className="projects-grid">
                      {projects.map((project) => {
                          const {id, name, renderedImage, sourceImage, timestamp, isPublic} = project;

                          return (
                              <Link
                                  key={id}
                                  to={`/visualizer/${id}`}
                                  state={{ initialProject: project }}
                                  className="project-card group"
                              >
                              <div className="preview">
                                  <img src={sourceImage || renderedImage} alt="Project" />

                                  <div className="badge">
                                      <span>{isPublic ? "Community" : "Concept"}</span>
                                  </div>
                              </div>

                              <div className="card-body">
                                  <div>
                                      <h3>{name}</h3>

                                      <div className="meta">
                                          <Clock size={12} />
                                          <span>{new Date(timestamp).toLocaleDateString()}</span>
                                          <span>{isPublic ? "Shared publicly" : "By Spacely"}</span>
                                      </div>
                                  </div>
                                  <div className="arrow">
                                      <ArrowUpRight size={18} />
                                  </div>
                              </div>
                          </Link>
                          );
                      })}
                  </div>
              </div>
          </section>

      </div>
  )
}
