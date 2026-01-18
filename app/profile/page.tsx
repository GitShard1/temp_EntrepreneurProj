'use client'


import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Script from 'next/script'
import { getAuthState, clearAuthState, getAuthHeader } from '@/lib/auth'

const API_ENDPOINT = "http://localhost:8000"

interface UserData {
  profile: {
    name: string
    username: string
    avatarUrl: string
    bio: string
  }
  skills: {
    radar: Array<{ subject: string; score: number }>
  }
  languages: Array<{
    name: string
    percentage: number
    color: string
  }>
  frameworks: string[]
  libraries: string[]
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<any>(null)
  const router = useRouter()

  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
    if (userData && chartRef.current && typeof window !== 'undefined') {
      renderRadarChart()
    }
    
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
    }
  }, [userData])

  const fetchUserData = async () => {
    const { username, token, isAuthenticated } = getAuthState()
    
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    try {
      const res = await fetch(`${API_ENDPOINT}/get-translated-data/${username}`, {
        headers: getAuthHeader()
      })
      
      if (res.ok) {
        const data = await res.json()
        console.log('Received data:', data) // Debug log to see structure
        setUserData(data)
      } else if (res.status === 401) {
        clearAuthState()
        router.push('/')
      } else if (res.status === 404) {
        // No translated data available - try to get user info from GitHub
        const userRes = await fetch(`${API_ENDPOINT}/auth/github/user`, {
          headers: getAuthHeader()
        })
        if (userRes.ok) {
          const githubUser = await userRes.json()
          // Set minimal user data
          setUserData({
            profile: {
              name: githubUser.name || username || 'Unknown User',
              username: username || 'unknown',
              avatarUrl: githubUser.avatar_url || '',
              bio: githubUser.bio || 'No bio available'
            },
            skills: { radar: [] },
            languages: [],
            frameworks: [],
            libraries: []
          })
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderRadarChart = () => {
    if (!chartRef.current || !userData || !userData.skills?.radar) return
    
    // @ts-ignore - Chart.js loaded via CDN
    if (typeof Chart === 'undefined') return

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const labels = userData.skills.radar.map(s => s.subject)
    const values = userData.skills.radar.map(s => s.score)

    // @ts-ignore
    chartInstanceRef.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Skills',
          data: values,
          backgroundColor: 'rgba(46, 160, 67, 0.3)',
          borderColor: '#2ea043',
          borderWidth: 2,
          pointBackgroundColor: '#2ea043',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#2ea043',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { 
              stepSize: 20, 
              color: '#8b949e', 
              backdropColor: 'transparent' 
            },
            grid: { color: '#30363d' },
            pointLabels: { 
              color: '#8b949e', 
              font: { size: 12 } 
            },
          },
        },
        plugins: { 
          legend: { display: false } 
        },
      },
    })
  }

  if (loading) {
    return (
      <>
        <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="beforeInteractive" />
        <Navbar />
        <div className="profile-container">Loading...</div>
      </>
    )
  }

  if (!userData) {
    return (
      <>
        <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="beforeInteractive" />
        <Navbar />
        <div className="profile-container">
          <p>No profile data available. Please process your GitHub data first.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Script 
        src="https://cdn.jsdelivr.net/npm/chart.js" 
        strategy="beforeInteractive"
        onLoad={() => {
          if (userData && chartRef.current) {
            renderRadarChart()
          }
        }}
      />
      <Navbar />
      <div className="profile-container">
        <div className="profile-grid">
          {/* Sidebar */}
          <aside className="profile-sidebar">
            <div className="profile-card">
              <div className="profile-card-content">
                <img 
                  src={userData.profile?.avatarUrl || '/default-avatar.png'} 
                  alt={userData.profile?.name || 'User'} 
                  className="profile-picture" 
                />
                <h2 className="profile-name">{userData.profile?.name || 'Unknown'}</h2>
                <p className="profile-username">@{userData.profile?.username || 'unknown'}</p>
                <p className="profile-bio">{userData.profile?.bio || 'No bio available'}</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="profile-main">
            {/* Skills Radar */}
            {userData.skills?.radar && userData.skills.radar.length > 0 && (
              <section className="skills-section">
                <h3>Skills Overview</h3>
                <h4>Chart of all the repositories into a comprehensive developer profile</h4>
                <div className="chart-container">
                  <canvas ref={chartRef} id="skillsChart"></canvas>
                </div>
              </section>
            )}

            {/* Languages */}
            {userData.languages && userData.languages.length > 0 && (
              <section className="languages-section">
                <h3>Programming Languages</h3>
                <h4>Percentage of usage in each language</h4>
                <div className="languages-grid">
                  {userData.languages.map((lang, idx) => (
                    <div key={idx} className="language-item">
                      <span 
                        className="language-dot" 
                        style={{ backgroundColor: lang.color }}
                      ></span>
                      <span className="language-name">{lang.name}</span>
                      <span className="language-percentage">{lang.percentage}%</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Frameworks */}
            {userData.frameworks && userData.frameworks.length > 0 && (
              <section className="frameworks-section">
                <h3>Frameworks</h3>
                <h4>Frameworks Frequency</h4>
                <div className="tags-container">
                  {userData.frameworks.map((fw, idx) => (
                    <span key={idx} className="tag tag-purple">{fw}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Libraries */}
            {userData.libraries && userData.libraries.length > 0 && (
              <section className="libraries-section">
                <h3>Libraries</h3>
                <h4>Libraries & Tools use frequency</h4>
                <div className="tags-container">
                  {userData.libraries.map((lib, idx) => (
                    <span key={idx} className="tag tag-green">{lib}</span>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </>
  )
}