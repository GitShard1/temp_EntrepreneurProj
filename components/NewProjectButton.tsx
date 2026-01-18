'use client'

import { useState } from 'react'
import AddProjectModal from './AddProjectModal'
import styles from './NewProjectButton.module.css'

export default function NewProjectButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={styles.button}
      >
        + New Project
      </button>

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}