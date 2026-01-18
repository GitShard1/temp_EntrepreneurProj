'use client'

import { useCallback } from 'react'
import Script from 'next/script'
import './globals.css'

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:8000'

const FEATURES = [
  'Track your skills',
  'Showcase projects',
  'Learning patterns',
  'Team\'s Capabilities'
] as const

export default function LandingPage() {
  const handleGitHubLogin = useCallback(() => {
    window.location.href = `${API_ENDPOINT}/auth/github`
  }, [])

  return (
    <>
      <Script 
        type="module" 
        src="https://unpkg.com/@splinetool/viewer@1.12.36/build/spline-viewer.js"
        strategy="beforeInteractive"
      />
      
      <header className="SignInPage">
        <spline-viewer 
          url="https://prod.spline.design/Jem9KqgJRAICKvqw/scene.splinecode"
          style={{ pointerEvents: 'none' }}
          aria-hidden="true"
        />
        
        <h1>Divergence</h1>
        <p>An identity-aware AI project manager that knows how you build</p>

        <div className="HERO">
          <button 
            className="button" 
            onClick={handleGitHubLogin}
            type="button"
            aria-label="Connect with GitHub"
          >
            Connect with GitHub
          </button>

          <p>Sign in with your GitHub account to showcase your skills and projects</p>
          
          <div className="grid" role="list">
            {FEATURES.map((feature) => (
              <div key={feature} className="container" role="listitem">
                ✓ {feature}
              </div>
            ))}
          </div>
        </div>
      </header>
    </>
  )
}