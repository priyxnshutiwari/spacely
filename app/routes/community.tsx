import type { Route } from "./+types/community";
import Navbar from "../../components/Navbar";
import {ArrowUpRight, Clock, Sparkles} from "lucide-react";
import {Link} from "react-router";
import {useEffect, useState} from "react";
import {getCommunityProjects} from "../../lib/puter.action";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Community | Spacely" },
    { name: "description", content: "Explore public spatial concepts shared by the Spacely community." },
  ];
}

export default function CommunityPage() {
  const [projects, setProjects] = useState<DesignItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const items = await getCommunityProjects();
      setProjects(items);
    };

    load();
  }, []);

  return (
    <div className="community-page">
      <Navbar />

      <section className="community-hero">
        <div className="community-shell">
          <div className="community-copy">
            <div className="eyebrow">
              <Sparkles className="icon" />
              <span>Community</span>
            </div>
            <h1>See what the world is imagining.</h1>
            <p>Browse public spatial concepts, mood boards, and design experiments shared by creators using Spacely.</p>
          </div>
        </div>
      </section>

      <section className="community-grid-section">
        <div className="section-inner">
          <div className="section-head">
            <div className="copy">
              <h2>Public work</h2>
              <p>Every published project becomes part of a shared gallery of ideas.</p>
            </div>
          </div>

          <div className="projects-grid">
            {projects.length > 0 ? projects.map((project) => {
              const {id, name, renderedImage, sourceImage, timestamp} = project;

              return (
                <Link
                  key={id}
                  to={`/visualizer/${id}`}
                  state={{ initialProject: project }}
                  className="project-card group"
                >
                  <div className="preview">
                    <img src={sourceImage || renderedImage} alt="Community project" />
                    <div className="badge">
                      <span>Community</span>
                    </div>
                  </div>

                  <div className="card-body">
                    <div>
                      <h3>{name}</h3>
                      <div className="meta">
                        <Clock size={12} />
                        <span>{new Date(timestamp).toLocaleDateString()}</span>
                        <span>Shared publicly</span>
                      </div>
                    </div>
                    <div className="arrow">
                      <ArrowUpRight size={18} />
                    </div>
                  </div>
                </Link>
              );
            }) : (
              <div className="empty">
                Nothing has been shared yet. Publish a project from the editor and it will appear here.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
