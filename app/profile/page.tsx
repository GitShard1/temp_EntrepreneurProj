'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import Navbar from '@/components/Navbar'
import LoadingSpinner from '@/components/LoadingSpinner'
import { getAuthState, clearAuthState, getAuthHeader } from '@/lib/auth'

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:8000'

interface UserData {
  profile: {
    name: string
    username: string
    avatarUrl: string
    bio: string
  }
  skills: {
    ai_ml?: number
    web_development?: number
    mobile_development?: number
    cloud_devops?: number
    data_engineering?: number
    cybersecurity?: number
  }
  languages: {
    [key: string]: number
  }
  frameworks: { [key: string]: number } | null
  libraries: { [key: string]: number } | null
}

interface TransformedData {
  profile: UserData['profile']
  skillsRadar: Array<{ subject: string; score: number }>
  languagesArray: Array<{ name: string; percentage: number; color: string }>
  frameworksArray: string[]
  librariesArray: string[]
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<TransformedData | null>(null)
  const [loading, setLoading] = useState(true)
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<any>(null)
  const router = useRouter()

  // Language colors mapping (GitHub style)
  const languageColors: { [key: string]: string } = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Ruby: '#701516',
    PHP: '#4F5D95',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Go: '#00ADD8',
    Rust: '#dea584',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    Shell: '#89e051',
    Markdown: '#083fa1',
    JSON: '#292929',
    default: '#8b949e'
  }

  const transformData = (rawData: UserData): TransformedData => {
    // Transform skills object to radar array
    let skillsRadar = Object.entries(rawData.skills || {})
      .filter(([key]) => key !== 'radar') // Exclude if there's a 'radar' key
      .map(([key, value]) => ({
        subject: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        score: typeof value === 'number' ? value * 100 : 0
      }))

    // If no skills or all zero, create default skill set to show the spider web
    if (skillsRadar.length === 0 || skillsRadar.every(s => s.score === 0)) {
      skillsRadar = [
        { subject: 'AI/ML', score: 0 },
        { subject: 'Web Development', score: 0 },
        { subject: 'Mobile Development', score: 0 },
        { subject: 'Cloud/DevOps', score: 0 },
        { subject: 'Data Engineering', score: 0 },
        { subject: 'Cybersecurity', score: 0 }
      ]
    }

    // Transform languages object to array
    const languagesArray = Object.entries(rawData.languages || {})
      .map(([name, percentage]) => ({
        name,
        percentage: typeof percentage === 'number' ? Math.round(percentage) : 0,
        color: languageColors[name] || languageColors.default
      }))
      .sort((a, b) => b.percentage - a.percentage) // Sort by percentage descending

    // Transform frameworks object/null to array
    const frameworksArray = rawData.frameworks 
      ? Object.keys(rawData.frameworks).filter(key => rawData.frameworks![key] > 0)
      : []

    // Transform libraries object/null to array, sorted by frequency
    const librariesArray = rawData.libraries
      ? Object.entries(rawData.libraries)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 20) // Top 20 libraries
          .map(([name]) => name)
      : []

    return {
      profile: rawData.profile,
      skillsRadar,
      languagesArray,
      frameworksArray,
      librariesArray
    }
  }

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
    const { username, token, userId, isAuthenticated } = getAuthState()
    
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    try {
      // Build URL with user_id parameter if available
      const dataUrl = userId
        ? `${API_ENDPOINT}/get-translated-data/${username}?user_id=${userId}`
        : `${API_ENDPOINT}/get-translated-data/${username}`
      
      const res = await fetch(dataUrl, {
        headers: getAuthHeader()
      })
      
      if (res.ok) {
        const rawData: UserData = await res.json()
        console.log('Received raw data:', rawData)
        const transformed = transformData(rawData)
        console.log('Transformed data:', transformed)
        setUserData(transformed)
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
          // Set minimal user data with default spider web
          setUserData({
            profile: {
              name: githubUser.name || username || 'Unknown User',
              username: username || 'unknown',
              avatarUrl: githubUser.avatar_url || '',
              bio: githubUser.bio || 'No bio available'
            },
            skillsRadar: [
              { subject: 'AI/ML', score: 0 },
              { subject: 'Web Development', score: 0 },
              { subject: 'Mobile Development', score: 0 },
              { subject: 'Cloud/DevOps', score: 0 },
              { subject: 'Data Engineering', score: 0 },
              { subject: 'Cybersecurity', score: 0 }
            ],
            languagesArray: [],
            frameworksArray: [],
            librariesArray: []
          })
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderRadarChart = useCallback(() => {
    if (!chartRef.current || !userData) return
    
    // @ts-ignore - Chart.js loaded via CDN
    if (typeof Chart === 'undefined') return

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    // Destroy existing chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const labels = userData.skillsRadar?.map(s => s.subject) || []
    const values = userData.skillsRadar?.map(s => s.score) || []
    
    // Ensure we have at least some data points for the radar to render
    // If all values are 0, add a tiny value to make the web visible
    const displayValues = values.every(v => v === 0) 
      ? values.map(() => 1) // Show minimal spider web with value 1
      : values

    // @ts-ignore - Chart.js types
    chartInstanceRef.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Skills',
          data: displayValues,
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
            min: 0,
            max: 100,
            ticks: { 
              stepSize: 20, 
              color: '#8b949e', 
              backdropColor: 'transparent',
              display: true
            },
            grid: { 
              color: '#30363d',
              display: true
            },
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
  }, [userData])

  if (loading) {
    return (
      <>
        <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="beforeInteractive" />
        <Navbar />
        <LoadingSpinner message="Loading your profile..." />
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
      
      {/* Navigation */}
      <Navbar />

      <div className="profile-container">
        <div className="profile-grid">
          {/* 
            LEFT SIDEBAR: USER PROFILE
            Data from: userData.profile
            - avatarUrl: Profile picture URL
            - name: User's full name
            - username: GitHub username
            - bio: User biography
          */}
          <aside className="profile-sidebar">
            <div className="profile-card">
              <div className="profile-card-content">
                {/* Profile Picture */}
                <img 
                  src={userData.profile?.avatarUrl || '/default-avatar.png'} 
                  alt={userData.profile?.name || 'User'} 
                  className="profile-picture"
                  loading="eager"
                />
                {/* User's Full Name */}
                <h2 className="profile-name">{userData.profile?.name || 'Unknown'}</h2>
                {/* Username */}
                <p className="profile-username">@{userData.profile?.username || 'unknown'}</p>
                {/* Bio */}
                <p className="profile-bio">{userData.profile?.bio || 'No bio available'}</p>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT: Skills and Technologies */}
          <main className="profile-main">
            {/* 
              SKILLS RADAR CHART (SPIDER WEB)
              Data from: userData.skillsRadar[]
              Each skill has:
              - subject: Skill name (e.g., 'Ai Ml', 'Web Development')
              - score: Number 0-100
              Always displayed to show the spider web visualization
            */}
            <section className="skills-section">
              <h3>Skills Overview</h3>
              <h4>Chart of all the repositories into a comprehensive developer profile</h4>
              <div className="chart-container">
                {/* Chart populated by renderRadarChart() using Chart.js */}
                <canvas ref={chartRef} id="skillsChart" aria-label="Skills radar chart"></canvas>
              </div>
            </section>

            {/* 
              PROGRAMMING LANGUAGES
              Data from: userData.languagesArray[]
              Each language has:
              - name: Language name (e.g., 'JavaScript')
              - percentage: Usage percentage (e.g., 70)
              - color: Hex color code (e.g., '#f1e05a')
            */}
            {userData.languagesArray && userData.languagesArray.length > 0 && (
              <section className="languages-section">
                <h3>Programming Languages</h3>
                <h4>Percentage of usage in each language</h4>
                <div className="languages-grid" role="list">
                  {userData.languagesArray.map((lang, idx) => (
                    <div key={idx} className="language-item" role="listitem">
                      <span 
                        className="language-dot" 
                        style={{ backgroundColor: lang.color }}
                        aria-hidden="true"
                      ></span>
                      <span className="language-name">{lang.name}</span>
                      <span className="language-percentage">{lang.percentage}%</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 
              FRAMEWORKS
              Data from: userData.frameworksArray[]
              Array of framework name strings
              Example: ['Next.js', 'Express', 'FastAPI']
            */}
            {userData.frameworksArray && userData.frameworksArray.length > 0 && (
              <section className="frameworks-section">
                <h3>Frameworks</h3>
                <h4>Frameworks Frequency</h4>
                <div className="tags-container" role="list">
                  {userData.frameworksArray.map((fw, idx) => (
                    <span key={idx} className="tag tag-purple" role="listitem">{fw}</span>
                  ))}
                </div>
              </section>
            )}

            {/* 
              LIBRARIES
              Data from: userData.librariesArray[]
              Array of library name strings
              Example: ['Redux', 'React Query', 'Axios']
            */}
            {userData.librariesArray && userData.librariesArray.length > 0 && (
              <section className="libraries-section">
                <h3>Libraries</h3>
                <h4>Libraries & Tools use frequency</h4>
                <div className="tags-container" role="list">
                  {userData.librariesArray.map((lib, idx) => (
                    <span key={idx} className="tag tag-green" role="listitem">{lib}</span>
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