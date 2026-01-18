'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import AddProjectModal from '@/components/AddProjectModal'
import { getAuthState, clearAuthState, getAuthHeader } from '@/lib/auth'

const API_ENDPOINT = "http://localhost:8000"

interface Project {
  id: string
  name: string
  description: string
  stars: number
  forks: number
  url: string
  language: {
    name: string
    color: string
  }
  technologies: string[]
  skillsLearned: string[]
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { username, isAuthenticated } = getAuthState()
    
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    try {
      const res = await fetch(`${API_ENDPOINT}/get-filtered-data/${username}`, {
        headers: getAuthHeader()
      })
      
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects?.all || [])
      } else if (res.status === 401) {
        clearAuthState()
        router.push('/')
      } else if (res.status === 404) {
        // No data found yet
        setProjects([])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="projects-container">
        <div className="projects-header">
          <div>
            <h2>Projects</h2>
            <p>Showcase of GitHub projects with skills learned and technologies used</p>
          </div>
          <button 
            className="add-project-btn" 
            onClick={() => setShowModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Project
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e' }}>
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e' }}>
            <p>No projects yet. Create your first one!</p>
            <button 
              onClick={() => setShowModal(true)}
              style={{ 
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <article key={project.id} className="project-card">
                <div className="project-card-header">
                  <h3 className="project-title">{project.name}</h3>
                  {project.url && (
                    <a 
                      href={project.url} 
                      className="project-link" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  )}
                </div>

                <p className="project-description">{project.description}</p>

                <div className="project-stats">
                  <div className="stat-item">
                    <span 
                      className="language-dot" 
                      style={{ backgroundColor: project.language?.color || '#999999' }}
                    ></span>
                    <span>{project.language?.name || 'Unknown'}</span>
                  </div>
                  <div className="stat-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    <span>{project.stars || 0}</span>
                  </div>
                  <div className="stat-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="6" y1="3" x2="6" y2="15"></line>
                      <circle cx="18" cy="6" r="3"></circle>
                      <circle cx="6" cy="18" r="3"></circle>
                      <path d="M18 9a9 9 0 0 1-9 9"></path>
                    </svg>
                    <span>{project.forks || 0}</span>
                  </div>
                </div>

                <div className="project-technologies">
                  <p className="section-label">Technologies Used</p>
                  <div className="tech-tags">
                    {(project.technologies || []).map((tech, idx) => (
                      <span key={idx} className="tech-tag">{tech}</span>
                    ))}
                  </div>
                </div>

                <div className="project-skills">
                  <p className="section-label skills-label">Skills Learned</p>
                  <div className="skills-tags">
                    {(project.skillsLearned || []).map((skill, idx) => (
                      <span key={idx} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <AddProjectModal 
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          fetchProjects()
        }}
      />
    </>
  )
}