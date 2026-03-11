import { useStore } from '../../store'

export function WelcomeScreen() {
  const { setVaultPath, loadNodes } = useStore()

  const handleChooseVault = async () => {
    const path = await window.electronAPI.vault.choose()
    if (path) {
      await window.electronAPI.vault.setPath(path)
      setVaultPath(path)
      await loadNodes(path)
    }
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">Aurelius</h1>
        <p className="welcome-subtitle">Notes with superpowers</p>
        <button className="welcome-btn" onClick={handleChooseVault}>
          Choose vault folder
        </button>
        <p className="welcome-hint">
          Your notes are stored as local .md files — readable anywhere.
        </p>
      </div>
    </div>
  )
}
