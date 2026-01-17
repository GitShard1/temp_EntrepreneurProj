'use client'

import { useState } from 'react'
import styles from './AddProjectModal.module.css'

interface AddProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddProjectModal({ isOpen, onClose }: AddProjectModalProps) {
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [mode, setMode] = useState<'solo' | 'collab'>('solo')
  const [repoOption, setRepoOption] = useState<'new' | 'existing'>('new')
  const [existingRepoUrl, setExistingRepoUrl] = useState('')

  const handleSubmit = async () => {
    const payload = {
      name,
      goal,
      dueDate,
      mode,
      teamMembers: [],
      repoOption,
      existingRepoUrl
    }

    try {
      const response = await fetch('http://localhost:8000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await response.json()
      console.log('Response:', data)
      alert(`Project created! ID: ${data.projectId}`)
      
      setName('')
      setGoal('')
      setDueDate('')
      setMode('solo')
      setRepoOption('new')
      setExistingRepoUrl('')
      onClose()
      
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to create project')
    }
  }

  if (!isOpen) return null

  const isValid = name && goal && dueDate

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      
      <div className={styles.container}>
        <div className={styles.modal}>
          
          <h2 className={styles.title}>New Project</h2>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Goal *</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What are you building?"
              rows={2}
              className={styles.textarea}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Due Date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Mode</label>
            <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={() => setMode('solo')}
                className={`${styles.modeButton} ${mode === 'solo' ? styles.active : styles.inactive}`}
              >
                Solo
              </button>
              <button
                type="button"
                onClick={() => setMode('collab')}
                className={`${styles.modeButton} ${mode === 'collab' ? styles.active : styles.inactive}`}
              >
                Team
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Repository</label>
            <div className={styles.buttonStack}>
              <button
                type="button"
                onClick={() => setRepoOption('new')}
                className={`${styles.repoButton} ${repoOption === 'new' ? styles.active : styles.inactive}`}
              >
                Create New
              </button>
              <button
                type="button"
                onClick={() => setRepoOption('existing')}
                className={`${styles.repoButton} ${repoOption === 'existing' ? styles.active : styles.inactive}`}
              >
                Link Existing
              </button>
            </div>
          </div>

          {repoOption === 'existing' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Repo URL</label>
              <input
                type="url"
                value={existingRepoUrl}
                onChange={(e) => setExistingRepoUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className={styles.input}
              />
            </div>
          )}

          <div className={styles.footer}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid}
              className={`${styles.submitButton} ${isValid ? styles.enabled : styles.disabled}`}
            >
              Continue →
            </button>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </>
  )
}