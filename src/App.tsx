import { useState, useEffect } from 'react'
import { Settings, Trash2, Plus, X } from 'lucide-react'
import './App.css'

interface CountdownSettings {
  id: string
  eventName: string
  targetDate: string
  backgroundImage: string | null
  backgroundColor: string
  backgroundOpacity: number
  backgroundType: 'color' | 'image'
  runOnStartup: boolean
}

const DEFAULT_PRESETS: CountdownSettings[] = [
  {
    id: '1',
    eventName: 'Forza Horizon 6',
    targetDate: '2026-05-19T00:00:00',
    backgroundImage: null,
    backgroundColor: '#0a0a0f',
    backgroundOpacity: 0.9,
    backgroundType: 'color',
    runOnStartup: false
  }
]

function App() {
  const isSettingsMode = new URLSearchParams(window.location.search).get('mode') === 'settings'

  const [presets, setPresets] = useState<CountdownSettings[]>(() => {
    const saved = localStorage.getItem('countdown-presets')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Migration for old presets
      return parsed.map((p: any) => ({
        ...p,
        backgroundColor: p.backgroundColor || '#0a0a0f',
        backgroundOpacity: p.backgroundOpacity ?? 0.9,
        backgroundType: p.backgroundType || (p.backgroundImage ? 'image' : 'color')
      }))
    }
    return DEFAULT_PRESETS
  })

  const [currentPresetId, setCurrentPresetId] = useState<string>(() => {
    const saved = localStorage.getItem('current-preset-id')
    const parsedPresets = JSON.parse(localStorage.getItem('countdown-presets') || '[]')
    return (saved && parsedPresets.find((p: any) => p.id === saved))
      ? saved 
      : (parsedPresets[0]?.id || DEFAULT_PRESETS[0].id)
  })

  const settings = presets.find(p => p.id === currentPresetId) || presets[0] || DEFAULT_PRESETS[0]

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  const [tempSettings, setTempSettings] = useState(settings)

  useEffect(() => {
    setTempSettings(settings)
  }, [settings])

  useEffect(() => {
    if (isSettingsMode) return

    const timer = setInterval(() => {
      const target = new Date(settings.targetDate).getTime()
      const now = new Date().getTime()
      const difference = target - now

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        })
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [settings.targetDate, isSettingsMode])

  useEffect(() => {
    if (!window.ipcRenderer) return

    const handleRefresh = () => {
      const saved = localStorage.getItem('countdown-presets')
      if (saved) {
        const updatedPresets = JSON.parse(saved)
        setPresets(updatedPresets)
        
        const savedId = localStorage.getItem('current-preset-id')
        if (savedId) setCurrentPresetId(savedId)
      }
    }

    window.ipcRenderer.on('refresh-settings', handleRefresh)
    return () => {
      window.ipcRenderer.off('refresh-settings', handleRefresh)
    }
  }, [])

  const saveSettings = () => {
    const updatedPresets = presets.map(p => p.id === tempSettings.id ? tempSettings : p)
    setPresets(updatedPresets)
    localStorage.setItem('countdown-presets', JSON.stringify(updatedPresets))
    localStorage.setItem('current-preset-id', tempSettings.id)
    
    // Notify main process about updates
    if (window.ipcRenderer) {
      window.ipcRenderer.send('settings-updated')
      window.ipcRenderer.send('set-run-on-startup', tempSettings.runOnStartup)
    }

    if (isSettingsMode) {
      window.close()
    }
  }

  const openSettingsWindow = () => {
    console.log('Attempting to open settings window...')
    if (window.ipcRenderer) {
      window.ipcRenderer.send('open-settings')
    } else {
      console.error('ipcRenderer is not available')
      alert('Error: ipcRenderer is not available. Please check the DevTools console.')
    }
  }

  const createNewPreset = () => {
    const newPreset: CountdownSettings = {
      id: Date.now().toString(),
      eventName: 'New Event',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      backgroundImage: null,
      backgroundColor: '#0a0a0f',
      backgroundOpacity: 0.9,
      backgroundType: 'color',
      runOnStartup: false
    }
    const updatedPresets = [...presets, newPreset]
    setPresets(updatedPresets)
    setCurrentPresetId(newPreset.id)
    setTempSettings(newPreset)
    localStorage.setItem('countdown-presets', JSON.stringify(updatedPresets))
    localStorage.setItem('current-preset-id', newPreset.id)
  }

  const deletePreset = (id: string) => {
    if (presets.length <= 1) return
    const updatedPresets = presets.filter(p => p.id !== id)
    setPresets(updatedPresets)
    
    if (currentPresetId === id) {
      const nextPreset = updatedPresets[0]
      setCurrentPresetId(nextPreset.id)
      setTempSettings(nextPreset)
      localStorage.setItem('current-preset-id', nextPreset.id)
    }
    localStorage.setItem('countdown-presets', JSON.stringify(updatedPresets))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setTempSettings({ ...tempSettings, backgroundImage: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const dateObj = new Date(settings.targetDate)
  const day = String(dateObj.getDate()).padStart(2, '0')
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const year = String(dateObj.getFullYear()).slice(-2)
  const formattedDate = `${day}/${month}/${year}`
  
  const formattedTime = dateObj.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  if (isSettingsMode) {
    return (
      <div className="settings-page">
        <div className="settings-modal standalone">
          <div className="settings-drag-handle"></div>
          <div className="settings-content-scroll">
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="new-preset-btn" onClick={createNewPreset}>
                <Plus size={16} />
                <span>New Preset</span>
              </button>
            </div>

            <div className="input-group">
              <label>Select Preset</label>
              <div className="preset-selector">
                <select 
                  value={tempSettings.id} 
                  onChange={(e) => {
                    const selected = presets.find(p => p.id === e.target.value)
                    if (selected) {
                      setTempSettings(selected)
                      setCurrentPresetId(selected.id)
                    }
                  }}
                >
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>{p.eventName}</option>
                  ))}
                </select>
                <button 
                  className="delete-preset-btn" 
                  onClick={() => deletePreset(tempSettings.id)}
                  disabled={presets.length <= 1}
                  title="Delete preset"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <hr />

            <div className="input-group">
              <label>Event Name</label>
              <input 
                type="text" 
                value={tempSettings.eventName} 
                onChange={(e) => setTempSettings({ ...tempSettings, eventName: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Target Date & Time</label>
              <input 
                type="datetime-local" 
                value={tempSettings.targetDate} 
                onChange={(e) => setTempSettings({ ...tempSettings, targetDate: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Background Style</label>
              <div className="bg-type-selector">
                <button 
                  className={tempSettings.backgroundType === 'color' ? 'active' : ''} 
                  onClick={() => setTempSettings({ ...tempSettings, backgroundType: 'color' })}
                >
                  Solid Color
                </button>
                <button 
                  className={tempSettings.backgroundType === 'image' ? 'active' : ''} 
                  onClick={() => setTempSettings({ ...tempSettings, backgroundType: 'image' })}
                >
                  Background Image
                </button>
              </div>

              <div className="bg-settings-container">
                <div 
                  className="bg-preview-large"
                  style={{
                    backgroundImage: (tempSettings.backgroundType === 'image' && tempSettings.backgroundImage) ? `url(${tempSettings.backgroundImage})` : 'none',
                    backgroundColor: tempSettings.backgroundColor,
                    opacity: tempSettings.backgroundOpacity
                  }}
                >
                  {(tempSettings.backgroundType === 'color' || !tempSettings.backgroundImage) && (
                    <span className="preview-label">Background Preview</span>
                  )}
                </div>
                
                <div className="bg-controls-stack">
                  {tempSettings.backgroundType === 'color' ? (
                    <div className="color-picker-group">
                      <input 
                        type="color" 
                        id="bgColor"
                        value={tempSettings.backgroundColor} 
                        onChange={(e) => setTempSettings({ ...tempSettings, backgroundColor: e.target.value })}
                      />
                      <div className="color-info">
                        <label htmlFor="bgColor">Background Color</label>
                        <span className="color-hex">{tempSettings.backgroundColor.toUpperCase()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="image-upload-group">
                      <div className="image-actions-row">
                        <input 
                          type="file" 
                          id="bgImage"
                          accept="image/*" 
                          className="hidden-file-input"
                          onChange={handleImageUpload} 
                        />
                        <label htmlFor="bgImage" className="file-label primary flex-1">
                          {tempSettings.backgroundImage ? 'Change Image' : 'Upload Image'}
                        </label>
                        {tempSettings.backgroundImage && (
                          <button 
                            className="remove-bg-btn" 
                            onClick={() => setTempSettings({ ...tempSettings, backgroundImage: null })}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="opacity-control">
                    <div className="opacity-header">
                      <label>Background Opacity</label>
                      <span>{Math.round(tempSettings.backgroundOpacity * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.05" 
                      max="1.0" 
                      step="0.05"
                      value={tempSettings.backgroundOpacity} 
                      onChange={(e) => setTempSettings({ ...tempSettings, backgroundOpacity: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="input-group checkbox">
              <input 
                type="checkbox" 
                id="startup"
                checked={tempSettings.runOnStartup} 
                onChange={(e) => setTempSettings({ ...tempSettings, runOnStartup: e.target.checked })}
              />
              <label htmlFor="startup">Run on startup</label>
            </div>
          </div>
          <div className="actions">
            <button onClick={() => window.close()}>
              <X size={16} />
              <span>Cancel</span>
            </button>
            <button className="save-btn" onClick={saveSettings}>
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="widget-container">
      <div 
        className="widget-bg"
        style={{ 
          backgroundImage: (settings.backgroundType === 'image' && settings.backgroundImage) ? `url(${settings.backgroundImage})` : 'none',
          backgroundColor: settings.backgroundColor,
          opacity: settings.backgroundOpacity
        }}
      />
      <div className="drag-region"></div>
      
      <button className="settings-trigger" onClick={openSettingsWindow}>
        <Settings size={18} />
      </button>

      <div className="content">
        <h1 className="event-name">{settings.eventName}</h1>
        <p className="target-date">{formattedDate} <span className="time">{formattedTime}</span></p>
        
        <div className="countdown-grid">
          <div className="time-unit">
            <span className="number">{timeLeft.days}</span>
            <span className="label">days</span>
          </div>
          <div className="time-unit">
            <span className="number">{timeLeft.hours}</span>
            <span className="label">hours</span>
          </div>
          <div className="time-unit">
            <span className="number">{timeLeft.minutes}</span>
            <span className="label">minutes</span>
          </div>
          <div className="time-unit">
            <span className="number">{timeLeft.seconds}</span>
            <span className="label">seconds</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
