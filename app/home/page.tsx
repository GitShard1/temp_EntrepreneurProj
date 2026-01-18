'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getAuthState, setAuthState, getAuthHeader } from '@/lib/auth'

const API_ENDPOINT = "http://localhost:8000"

interface UserData {
  profile: {
    avatar?: string
    nameUser?: string
    username?: string
  }
  statsHome: {
    totalProjects?: number
    totalRating?: number
    totalLanguages?: number
  }
  projects: {
    top?: Array<{
      nameTop: string
      descriptionTop: string
      languageTop: string
      languageColorTop?: string
      starsTop?: number
      forksTop?: number
    }>
    new?: Array<{
      nameNew: string
      descriptionNew: string
      languageNew: string
      languageColorNew?: string
      createdAtNew: string
      commitsNew?: number
    }>
  }
  recentWorks?: Array<{
    nameRecent: string
    projectRecent: string
    statusRecent: string
    priorityRecent: string
    lastUpdatedRecent: string
  }>
}

export default function HomePage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuth = () => {
      const tokenFromUrl = searchParams.get('token')
      const usernameFromUrl = searchParams.get('username')
      
      if (tokenFromUrl && usernameFromUrl) {
        setAuthState(usernameFromUrl, tokenFromUrl)
        router.replace('/home')
        return
      }
      
      fetchUserData()
    }

    handleAuth()
  }, [])

  const fetchUserData = async () => {
    const { username, token, isAuthenticated } = getAuthState()
    
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
        console.log('Received data:', data)
        setUserData(data)
      } else if (res.status === 401) {
        const { clearAuthState } = await import('@/lib/auth')
        clearAuthState()
        router.push('/')
      } else if (res.status === 404) {
        setUserData(null)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="home-container">Loading...</div>
      </>
    )
  }

  if (!userData) {
    return (
      <>
        <Navbar />
        <div className="home-container">
          <p>No data available. Please process your GitHub data first.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="home-container">
        {/* PROFILE SECTION */}
        <div className="profile-section">
          <div className="profile-header">
            <img 
              src={userData.profile?.avatar || '/default-avatar.png'} 
              alt={userData.profile?.nameUser || 'User'} 
              className="profile-avatar" 
            />
            <div className="profile-info">
              <h2>{userData.profile?.nameUser || 'Unknown User'}</h2>
              <p className="username">@{userData.profile?.username || 'unknown'}</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            {/* Total Projects */}
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </div>
                <span className="stat-label">Total Projects</span>
              </div>
              <p className="stat-value stat-value-projects">
                {userData.statsHome?.totalProjects || 0}
              </p>
            </div>

            {/* Rating */}
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon yellow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <span className="stat-label">Rating</span>
              </div>
              <p className="stat-value stat-value-rating">
                {userData.statsHome?.totalRating?.toFixed(1) || '0.0'}
              </p>
            </div>

            {/* Total Languages */}
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                </div>
                <span className="stat-label">Languages</span>
              </div>
              <p className="stat-value stat-value-languages">
                {userData.statsHome?.totalLanguages || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Left Column: Projects */}
          <div className="left-column">
            {/* TOP PROJECTS SECTION */}
            <div className="section-card">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <h3>Top Projects</h3>
              </div>
              <div className="projects-list">
                {userData.projects?.top && userData.projects.top.length > 0 ? (
                  userData.projects.top.map((project, idx) => (
                    <div key={idx} className="project-item">
                      <h4 className="project-name">{project.nameTop}</h4>
                      <p className="project-desc">{project.descriptionTop}</p>
                      <div className="project-meta">
                        <div className="meta-item">
                          <span 
                            className="language-dot" 
                            style={{ backgroundColor: project.languageColorTop || '#999' }}
                          ></span>
                          <span>{project.languageTop}</span>
                        </div>
                        {project.starsTop !== undefined && (
                          <div className="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            <span>{project.starsTop}</span>
                          </div>
                        )}
                        {project.forksTop !== undefined && (
                          <div className="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="6" y1="3" x2="6" y2="15"></line>
                              <circle cx="18" cy="6" r="3"></circle>
                              <circle cx="6" cy="18" r="3"></circle>
                              <path d="M18 9a9 9 0 0 1-9 9"></path>
                            </svg>
                            <span>{project.forksTop}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#8b949e', padding: '1rem' }}>No top projects available</p>
                )}
              </div>
            </div>

            {/* NEW PROJECTS SECTION */}
            <div className="section-card">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
                <h3>New Projects</h3>
              </div>
              <div className="projects-list">
                {userData.projects?.new && userData.projects.new.length > 0 ? (
                  userData.projects.new.map((project, idx) => (
                    <div key={idx} className="project-item">
                      <h4 className="project-name">{project.nameNew}</h4>
                      <p className="project-desc">{project.descriptionNew}</p>
                      <div className="project-meta">
                        <div className="meta-item">
                          <span 
                            className="language-dot" 
                            style={{ backgroundColor: project.languageColorNew || '#999' }}
                          ></span>
                          <span>{project.languageNew}</span>
                        </div>
                        <div className="meta-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span>{project.createdAtNew}</span>
                        </div>
                        {project.commitsNew !== undefined && (
                          <div className="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="4"></circle>
                              <line x1="1.05" y1="12" x2="7" y2="12"></line>
                              <line x1="17.01" y1="12" x2="22.96" y2="12"></line>
                            </svg>
                            <span>{project.commitsNew}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#8b949e', padding: '1rem' }}>No new projects available</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: RECENT WORKS */}
          <div className="right-column">
            <div className="section-card sticky">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <h3>Recent Works</h3>
              </div>
              <div className="works-list">
                {userData.recentWorks && userData.recentWorks.length > 0 ? (
                  userData.recentWorks.map((work, idx) => (
                    <div key={idx} className="work-item">
                      <div className="work-header">
                        <h4>{work.nameRecent}</h4>
                        <span className={`priority-badge ${work.priorityRecent.toLowerCase()}`}>
                          {work.priorityRecent}
                        </span>
                      </div>
                      <p className="work-project">{work.projectRecent}</p>
                      <div className="work-footer">
                        <span className={`status-badge ${work.statusRecent === 'In Progress' ? 'in-progress' : 'todo'}`}>
                          {work.statusRecent}
                        </span>
                        <span className="work-time">{work.lastUpdatedRecent}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#8b949e', padding: '1rem' }}>No recent works available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}