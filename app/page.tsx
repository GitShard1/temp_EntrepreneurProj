import NewProjectButton from '@/components/NewProjectButton'
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Divergence</h1>
          <p className={styles.subtitle}>AI-Powered Project Management</p>
        </div>
        
        <NewProjectButton />
      </div>
    </div>
  )
}