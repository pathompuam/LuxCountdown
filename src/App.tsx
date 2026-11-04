import React, { useState, useEffect } from 'react'
import { Settings, Trash2, Plus, X, Move, Save, Undo, Redo, AlignCenterHorizontal, AlignCenterVertical, Maximize, Calendar, Image as ImageIcon, Layout, Layers, Settings2, Clock, CircleHelp } from 'lucide-react'
import './App.css'

interface ElementPosition {
  x: number
  y: number
  scale: number
  color: string
  fontFamily: string
  width?: number
}

interface CountdownSettings {
  id: string
  eventName: string
  targetDate: string
  backgroundImage: string | null
  backgroundColor: string
  backgroundOpacity: number
  backgroundType: 'color' | 'image'
  runOnStartup: boolean
  timeFormat?: '12h' | '24h'
  layout?: {
    eventName?: ElementPosition
    targetDate?: ElementPosition
    countdown?: ElementPosition
  }
}

const FONTS = [
  'system-ui',
  "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  "'Courier New', Courier, monospace",
  "'Georgia', serif",
  "'Impact', Charcoal, sans-serif",
  "'Comic Sans MS', cursive, sans-serif"
]

const DEFAULT_LAYOUT = {
  eventName: { x: 50, y: 35, scale: 1, color: '#ffffff', fontFamily: 'system-ui', width: 90 },
  targetDate: { x: 50, y: 45, scale: 1, color: '#ffffff', fontFamily: 'system-ui', width: 90 },
  countdown: { x: 50, y: 65, scale: 1, color: '#ffffff', fontFamily: 'system-ui', width: 90 }
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
    runOnStartup: false,
    timeFormat: '24h',
    layout: DEFAULT_LAYOUT
  }
]

const PresetPreview = ({ preset }: { preset: CountdownSettings }) => {
  const dateObj = new Date(preset.targetDate)
  const day = String(dateObj.getDate()).padStart(2, '0')
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const year = String(dateObj.getFullYear()).slice(-2)
  const formattedDate = `${day}/${month}/${year}`
  
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: preset.timeFormat === '12h'
  })

  return (
    <div className="preset-thumbnail">
      <div 
        className="thumbnail-bg"
        style={{ 
          backgroundImage: (preset.backgroundType === 'image' && preset.backgroundImage) ? `url(${preset.backgroundImage})` : 'none',
          backgroundColor: preset.backgroundColor,
          opacity: preset.backgroundOpacity
        }}
      />
      <div className="thumbnail-content">
        <div 
          className="thumb-element thumb-name"
          style={{
            left: `${preset.layout?.eventName?.x}%`,
            top: `${preset.layout?.eventName?.y}%`,
            color: preset.layout?.eventName?.color || '#ffffff',
            fontFamily: preset.layout?.eventName?.fontFamily || 'inherit',
            transform: 'translate(-50%, -50%)',
            fontSize: '6px'
          }}
        >
          {preset.eventName}
        </div>
        <div 
          className="thumb-element thumb-date"
          style={{
            left: `${preset.layout?.targetDate?.x}%`,
            top: `${preset.layout?.targetDate?.y}%`,
            color: preset.layout?.targetDate?.color || '#ffffff',
            fontFamily: preset.layout?.targetDate?.fontFamily || 'inherit',
            transform: 'translate(-50%, -50%)',
            fontSize: '4px'
          }}
        >
          {formattedDate} {formattedTime}
        </div>
        <div 
          className="thumb-element thumb-countdown"
          style={{
            left: `${preset.layout?.countdown?.x}%`,
            top: `${preset.layout?.countdown?.y}%`,
            color: preset.layout?.countdown?.color || '#ffffff',
            fontFamily: preset.layout?.countdown?.fontFamily || 'inherit',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            gap: '2px',
            fontSize: '8px'
          }}
        >
          <span>00</span><span>00</span><span>00</span>
        </div>
      </div>
    </div>
  )
}

function App() {
  const queryParams = new URLSearchParams(window.location.search)
  const isSettingsMode = queryParams.get('mode') === 'settings'
  const isLayoutMode = queryParams.get('mode') === 'layout'
  const widgetWidth = parseInt(queryParams.get('w') || '600')
  const widgetHeight = parseInt(queryParams.get('h') || '400')

  const [presets, setPresets] = useState<CountdownSettings[]>(() => {
    const saved = localStorage.getItem('countdown-presets')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Migration for old presets
      return parsed.map((p: any) => ({
        ...p,
        backgroundColor: p.backgroundColor || '#0a0a0f',
        backgroundOpacity: p.backgroundOpacity ?? 0.9,
        backgroundType: p.backgroundType || (p.backgroundImage ? 'image' : 'color'),
        timeFormat: p.timeFormat || '24h',
        layout: {
          eventName: { ...DEFAULT_LAYOUT.eventName, ...p.layout?.eventName },
          targetDate: { ...DEFAULT_LAYOUT.targetDate, ...p.layout?.targetDate },
          countdown: { ...DEFAULT_LAYOUT.countdown, ...p.layout?.countdown }
        }
      }))
    }
    return DEFAULT_PRESETS
  })

  const previewAreaRef = React.useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(1)

  useEffect(() => {
    if (!isLayoutMode || !previewAreaRef.current) return
    
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect
        // Calculate scale to fit with 80px padding (40px each side)
        const scaleX = (width - 80) / widgetWidth
        const scaleY = (height - 80) / widgetHeight
        // Only scale down, never up
        setPreviewScale(Math.min(1, scaleX, scaleY))
      }
    })
    
    resizeObserver.observe(previewAreaRef.current)
    return () => resizeObserver.disconnect()
  }, [isLayoutMode, widgetWidth, widgetHeight])

  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [draggingElement, setDraggingElement] = useState<string | null>(null)
  
  // Pan & Zoom state
  const [userZoom, setUserZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  // Undo / Redo History
  const [layoutHistory, setLayoutHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)

  const [currentPresetId, setCurrentPresetId] = useState<string>(() => {
    const presetIdParam = queryParams.get('presetId')
    const saved = localStorage.getItem('current-preset-id')
    const parsedPresets = JSON.parse(localStorage.getItem('countdown-presets') || '[]')
    
    if (presetIdParam && parsedPresets.find((p: any) => p.id === presetIdParam)) {
      return presetIdParam
    }

    return (saved && parsedPresets.find((p: any) => p.id === saved))
      ? saved 
      : (parsedPresets[0]?.id || DEFAULT_PRESETS[0].id)
  })

  const settings = presets.find(p => p.id === currentPresetId) || presets[0] || DEFAULT_PRESETS[0]

  const [tempSettings, setTempSettings] = useState(settings)

  const pushToHistory = (newLayout: any) => {
    setLayoutHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(JSON.parse(JSON.stringify(newLayout)))
      return newHistory
    })
    setHistoryIndex(prev => prev + 1)
  }

  useEffect(() => {
    if (!isLayoutMode || !selectedElement || !tempSettings.layout) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const step = e.shiftKey ? 5 : 1
        const layout = tempSettings.layout as any
        const current = layout[selectedElement]
        
        let newX = current.x
        let newY = current.y

        if (e.key === 'ArrowUp') newY = Math.max(0, current.y - step)
        if (e.key === 'ArrowDown') newY = Math.min(100, current.y + step)
        if (e.key === 'ArrowLeft') newX = Math.max(0, current.x - step)
        if (e.key === 'ArrowRight') newX = Math.min(100, current.x + step)

        if (newX !== current.x || newY !== current.y) {
          const newLayout = {
            ...layout,
            [selectedElement]: { ...current, x: newX, y: newY }
          }
          setTempSettings({ ...tempSettings, layout: newLayout })
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        pushToHistory(tempSettings.layout)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isLayoutMode, selectedElement, tempSettings, pushToHistory])

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setTempSettings({ ...tempSettings, layout: layoutHistory[newIndex] })
    }
  }

  const redo = () => {
    if (historyIndex < layoutHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setTempSettings({ ...tempSettings, layout: layoutHistory[newIndex] })
    }
  }

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

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
      if (!window.ipcRenderer) return;
                                      
      const handleRefresh = () => {
        const saved = localStorage.getItem('countdown-presets');
        if (saved) {                                            
          const updatedPresets = JSON.parse(saved);
          setPresets(updatedPresets);              
                                     
          const savedId = localStorage.getItem('current-preset-id');
          if (savedId) {                                            
            setCurrentPresetId(savedId);
            // Find the preset that includes the latest layout and load it
            const preset = updatedPresets.find((p: any) => p.id === savedId);
            if (preset) setTempSettings(preset);                             
          }                                     
        }   
      };  
        
      window.ipcRenderer.on('refresh-settings', handleRefresh);
      return () => {                                           
        window.ipcRenderer.off('refresh-settings', handleRefresh);
      };                                                          
    }, []);

  const handleMouseDown = (e: React.MouseEvent, element: string) => {
    if (!isLayoutMode) return
    e.stopPropagation()
    e.preventDefault() // Prevent text selection
    setDraggingElement(element)
    setSelectedElement(element)
  }

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (!isLayoutMode) return
    if ((e.target as HTMLElement).classList.contains('layout-preview-area') || (e.target as HTMLElement).classList.contains('preview-widget-wrapper')) {
      setIsPanning(true)
      setSelectedElement(null)
    } else {
      setSelectedElement(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isLayoutMode) return

    if (isPanning) {
      setPanOffset(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }))
      return
    }

    if (!draggingElement || !tempSettings.layout) return
    
    const previewArea = document.querySelector('.widget-container.layout-mode')
    if (!previewArea) return

    const rect = previewArea.getBoundingClientRect()
    
    // Calculate percentage relative to the widget container
    const x = Math.min(Math.max(Math.round(((e.clientX - rect.left) / rect.width) * 100), 0), 100)
    const y = Math.min(Math.max(Math.round(((e.clientY - rect.top) / rect.height) * 100), 0), 100)
    
    setTempSettings({
      ...tempSettings,
      layout: {
        ...tempSettings.layout,
        [draggingElement]: { 
          ...(tempSettings.layout as any)[draggingElement],
          x, y 
        }
      }
    })
  }

  const handleMouseUp = () => {
    if (draggingElement && historyIndex >= 0) {
      const lastLayout = layoutHistory[historyIndex]
      if (lastLayout && JSON.stringify(lastLayout) !== JSON.stringify(tempSettings.layout)) {
        pushToHistory(tempSettings.layout)
      }
    }
    setDraggingElement(null)
    setIsPanning(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (!isLayoutMode) return
    // Allow zooming with wheel when hovering the preview area
    if (e.deltaY !== 0) {
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1
      setUserZoom(z => Math.max(0.2, Math.min(5, +(z + zoomDelta).toFixed(1))))
    }
  }

  const saveSettings = () => {                                                                                   
      // Persist the current tempSettings (including layout) to localStorage
      const updatedPresets = presets.map(p =>                               
        p.id === tempSettings.id ? tempSettings : p,
      );                                            
      setPresets(updatedPresets);
      localStorage.setItem('countdown-presets', JSON.stringify(updatedPresets));
      localStorage.setItem('current-preset-id', tempSettings.id);               
                                                                 
      // Notify other windows/electron processes
      if (window.ipcRenderer) {                 
        window.ipcRenderer.send('settings-updated');
        window.ipcRenderer.send('set-run-on-startup', tempSettings.runOnStartup);
      }                                                                          
        
      // Close the settings window (or layout editor) after saving
      if (isSettingsMode || isLayoutMode) {                       
        window.close();                    
      }                
    };  

  const openSettingsWindow = () => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('open-settings')
    }
  }

  const openLayoutEditor = () => {
    // Save current unsaved settings to localStorage first so layout editor sees them
    const updatedPresets = presets.map(p => p.id === tempSettings.id ? tempSettings : p)
    localStorage.setItem('countdown-presets', JSON.stringify(updatedPresets))
    localStorage.setItem('current-preset-id', tempSettings.id)
    
    if (window.ipcRenderer) {
      window.ipcRenderer.send('open-layout-editor', tempSettings.id)
    }
  }

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
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
      runOnStartup: false,
      timeFormat: '24h',
      layout: DEFAULT_LAYOUT
    }
    const updatedPresets = [...presets, newPreset]
    setPresets(updatedPresets)
    setCurrentPresetId(newPreset.id)
    setTempSettings(newPreset)
    localStorage.setItem('countdown-presets', JSON.stringify(updatedPresets))
    localStorage.setItem('current-preset-id', newPreset.id)
    showToast('New preset created successfully!')
  }

  const confirmDelete = () => {
    if (!deleteConfirm) return
    const id = deleteConfirm
    const updatedPresets = presets.filter(p => p.id !== id)
    setPresets(updatedPresets)
    
    if (currentPresetId === id) {
      const nextPreset = updatedPresets[0]
      setCurrentPresetId(nextPreset.id)
      setTempSettings(nextPreset)
      localStorage.setItem('current-preset-id', nextPreset.id)
    }
    localStorage.setItem('countdown-presets', JSON.stringify(updatedPresets))
    showToast('Preset deleted', 'success')
    setDeleteConfirm(null)
  }

  const deletePreset = (id: string) => {
    if (presets.length <= 1) return
    setDeleteConfirm(id)
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

  const activeSettings = isSettingsMode || isLayoutMode ? tempSettings : settings
  const dateObj = new Date(activeSettings.targetDate)
  const day = String(dateObj.getDate()).padStart(2, '0')
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const year = String(dateObj.getFullYear()).slice(-2)
  const formattedDate = `${day}/${month}/${year}`
  
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: activeSettings.timeFormat === '12h'
  })

  const handleTimeChange = (h24: number, m: string) => {
    const datePart = tempSettings.targetDate.split('T')[0] || new Date().toISOString().split('T')[0]
    const hh = String(h24).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    setTempSettings({ ...tempSettings, targetDate: `${datePart}T${hh}:${mm}` })
  }

  const datePart = tempSettings.targetDate.split('T')[0] || ''
  const timePart = tempSettings.targetDate.split('T')[1] || '00:00'
  const [hourStr, minuteStr] = timePart.split(':')
  const hour24 = parseInt(hourStr || '0', 10)
  const minute = minuteStr || '00'
  
  const isPM = hour24 >= 12
  const hour12 = hour24 % 12 || 12
  const ampm = isPM ? 'PM' : 'AM'

  if (isSettingsMode) {
    return (
      <div className="settings-page">
        <div className="settings-modal standalone">
          <div className="settings-drag-handle">
            <span>Lux Countdown Settings</span>
          </div>
          
          <div className="settings-content-scroll">
            {/* Section: Presets */}
            <div className="settings-section">
              <div className="section-header">
                <div className="section-title">
                  <Layers size={18} />
                  <h3>Presets</h3>
                  <div className="info-tooltip-wrapper">
                    <CircleHelp size={14} className="info-icon" />
                    <div className="info-tooltip">
                      Thumbnails serve as visual guides for elements and backgrounds; actual scale and positioning will adapt to your widget's dimensions.
                    </div>
                  </div>
                </div>
                <button className="new-preset-btn mini" onClick={createNewPreset}>
                  <Plus size={14} />
                  <span>New</span>
                </button>
              </div>
              <div className="preset-scroll-container">
                <div className="preset-grid horizontal">
                  {presets.map(p => (
                    <div 
                      key={p.id} 
                      className={`preset-card ${tempSettings.id === p.id ? 'active' : ''}`}
                      onClick={() => {
                        setTempSettings(p)
                        setCurrentPresetId(p.id)
                        localStorage.setItem('current-preset-id', p.id)
                      }}                    >
                      <PresetPreview preset={p} />
                      <div className="preset-card-info">
                        <span className="preset-name">{p.eventName}</span>
                        <button 
                          className="preset-delete-icon" 
                          onClick={(e) => {
                            e.stopPropagation()
                            deletePreset(p.id)
                          }}
                          disabled={presets.length <= 1}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section: Event Details */}
            <div className="settings-section">
              <div className="section-header">
                <div className="section-title">
                  <Calendar size={18} />
                  <h3>Event Details</h3>
                </div>
              </div>
              
              <div className="settings-card">
                <div className="input-group">
                  <label>Event Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter event name..."
                    value={tempSettings.eventName} 
                    onChange={(e) => setTempSettings({ ...tempSettings, eventName: e.target.value })}
                  />
                </div>
                
                <div className="input-group">
                  <label>Target Date & Time</label>
                  <div className="custom-datetime-picker">
                    <input 
                      type="date" 
                      value={datePart} 
                      onChange={(e) => setTempSettings({ ...tempSettings, targetDate: `${e.target.value}T${timePart}` })}
                    />
                    
                    <div className="time-select-group">
                      <Clock size={14} className="input-icon" />
                      {tempSettings.timeFormat === '12h' ? (
                        <>
                          <select 
                            value={hour12} 
                            onChange={(e) => {
                              let h = parseInt(e.target.value)
                              if (ampm === 'PM' && h !== 12) h += 12
                              if (ampm === 'AM' && h === 12) h = 0
                              handleTimeChange(h, minute)
                            }}
                          >
                            {Array.from({length: 12}, (_, i) => i + 1).map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
                          </select>
                          <span className="separator">:</span>
                          <select 
                            value={minute}
                            onChange={(e) => handleTimeChange(hour24, e.target.value)}
                          >
                            {Array.from({length: 60}, (_, i) => i).map(m => <option key={m} value={String(m).padStart(2, '0')}>{String(m).padStart(2, '0')}</option>)}
                          </select>
                          <select 
                            className="ampm-select"
                            value={ampm}
                            onChange={(e) => {
                              const newAmPm = e.target.value
                              let h = hour12
                              if (newAmPm === 'PM' && h !== 12) h += 12
                              if (newAmPm === 'AM' && h === 12) h = 0
                              handleTimeChange(h, minute)
                            }}
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <select 
                            value={hour24} 
                            onChange={(e) => handleTimeChange(parseInt(e.target.value), minute)}
                          >
                            {Array.from({length: 24}, (_, i) => i).map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
                          </select>
                          <span className="separator">:</span>
                          <select 
                            value={minute}
                            onChange={(e) => handleTimeChange(hour24, e.target.value)}
                          >
                            {Array.from({length: 60}, (_, i) => i).map(m => <option key={m} value={String(m).padStart(2, '0')}>{String(m).padStart(2, '0')}</option>)}
                          </select>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="input-group">
                  <label>Time Format</label>
                  <div className="toggle-group">
                    <button 
                      className={tempSettings.timeFormat === '24h' ? 'active' : ''} 
                      onClick={() => setTempSettings({ ...tempSettings, timeFormat: '24h' })}
                    >
                      24-Hour
                    </button>
                    <button 
                      className={tempSettings.timeFormat === '12h' ? 'active' : ''} 
                      onClick={() => setTempSettings({ ...tempSettings, timeFormat: '12h' })}
                    >
                      12-Hour
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Appearance */}
            <div className="settings-section">
              <div className="section-header">
                <div className="section-title">
                  <ImageIcon size={18} />
                  <h3>Appearance</h3>
                </div>
              </div>

              <div className="settings-card">
                <div className="input-group">
                  <label>Background Type</label>
                  <div className="toggle-group">
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
                      Image
                    </button>
                  </div>
                </div>

                <div className="appearance-config-vertical">
                  <div 
                    className="bg-preview-full"
                    style={{
                      backgroundImage: (tempSettings.backgroundType === 'image' && tempSettings.backgroundImage) ? `url(${tempSettings.backgroundImage})` : 'none',
                      backgroundColor: tempSettings.backgroundColor,
                      opacity: tempSettings.backgroundOpacity
                    }}
                  >
                    {!tempSettings.backgroundImage && tempSettings.backgroundType === 'image' && <span>No Image Selected</span>}
                  </div>
                  
                  <div className="appearance-controls-main">
                    {tempSettings.backgroundType === 'color' ? (
                      <div className="color-field-row">
                        <label>Choose Color</label>
                        <div className="color-picker-wrapper">
                          <input 
                            type="color" 
                            value={tempSettings.backgroundColor} 
                            onChange={(e) => setTempSettings({ ...tempSettings, backgroundColor: e.target.value })}
                          />
                          <span className="hex-code">{tempSettings.backgroundColor.toUpperCase()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="image-field-row">
                        <input 
                          type="file" 
                          id="bgImage"
                          accept="image/*" 
                          className="hidden-file-input"
                          onChange={handleImageUpload} 
                        />
                        <div className="image-buttons">
                          <label htmlFor="bgImage" className="btn btn-primary flex-1">
                            <ImageIcon size={16} />
                            <span>{tempSettings.backgroundImage ? 'Change Image' : 'Select Image'}</span>
                          </label>
                          {tempSettings.backgroundImage && (
                            <button 
                              className="btn-danger-outline" 
                              onClick={() => setTempSettings({ ...tempSettings, backgroundImage: null })}
                              title="Remove Image"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="opacity-slider-group">
                      <div className="slider-label">
                        <span>Background Opacity</span>
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
            </div>

            {/* Section: Layout */}
            <div className="settings-section">
              <div className="section-header">
                <div className="section-title">
                  <Layout size={18} />
                  <h3>Layout</h3>
                </div>
              </div>
              <button className="layout-editor-btn" onClick={openLayoutEditor}>
                <Move size={16} />
                <span>Open Layout Editor</span>
              </button>
            </div>

            {/* Section: Advanced */}
            <div className="settings-section">
              <div className="section-header">
                <div className="section-title">
                  <Settings2 size={18} />
                  <h3>Preferences</h3>
                </div>
              </div>
              <div className="settings-card">
                <div className="checkbox-field">
                  <input 
                    type="checkbox" 
                    id="startup"
                    checked={tempSettings.runOnStartup} 
                    onChange={(e) => setTempSettings({ ...tempSettings, runOnStartup: e.target.checked })}
                  />
                  <label htmlFor="startup">Launch Lux Countdown at startup</label>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-actions">
            <button className="btn btn-ghost" onClick={() => window.close()}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveSettings}>
              Save Changes
            </button>
          </div>

          {toast && (
            <div className={`toast ${toast.type}`}>
              <span>{toast.message}</span>
            </div>
          )}

          {deleteConfirm && (
            <div className="custom-modal-overlay">
              <div className="custom-confirm-modal">
                <div className="modal-icon-danger">
                  <Trash2 size={24} />
                </div>
                <h3>Delete Preset?</h3>
                <p>Are you sure you want to delete <strong>"{presets.find(p => p.id === deleteConfirm)?.eventName}"</strong>? This action cannot be undone.</p>
                <div className="modal-footer-actions">
                  <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                  <button className="btn btn-danger" onClick={confirmDelete}>Delete Preset</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }


  const updateLayoutProperty = (element: string, property: string, value: any, saveHistory = false) => {
    if (!tempSettings.layout) return
    const newLayout = {
      ...tempSettings.layout,
      [element]: {
        ...(tempSettings.layout as any)[element],
        [property]: value
      }
    }
    setTempSettings({
      ...tempSettings,
      layout: newLayout
    })
    if (saveHistory) {
      pushToHistory(newLayout)
    }
  }

  const resetLayout = () => {
    if (window.confirm('Are you sure you want to reset the layout to defaults?')) {
      setTempSettings({
        ...tempSettings,
        layout: DEFAULT_LAYOUT
      })
      pushToHistory(DEFAULT_LAYOUT)
      setSelectedElement(null)
    }
  }

  if (isLayoutMode) {
    const selectedLayout = selectedElement ? (tempSettings.layout as any)[selectedElement] : null

    return (
      <div className="layout-editor-window">
        {/* Sidebar Controls */}
        <div className="layout-sidebar">
          <div className="sidebar-header">
            <div className="badge">
              <Move size={14} />
              <span>Layout Editor</span>
            </div>
            <div className="window-actions">
              <button 
                className="sidebar-btn" 
                onClick={undo} 
                disabled={historyIndex <= 0} 
                title="Undo"
                style={{ opacity: historyIndex <= 0 ? 0.3 : 1, cursor: historyIndex <= 0 ? 'default' : 'pointer' }}
              >
                <Undo size={14} />
              </button>
              <button 
                className="sidebar-btn" 
                onClick={redo} 
                disabled={historyIndex >= layoutHistory.length - 1} 
                title="Redo"
                style={{ opacity: historyIndex >= layoutHistory.length - 1 ? 0.3 : 1, cursor: historyIndex >= layoutHistory.length - 1 ? 'default' : 'pointer' }}
              >
                <Redo size={14} />
              </button>
              <button className="sidebar-btn cancel" onClick={() => window.close()} title="Cancel">
                <X size={16} />
              </button>
              <button className="sidebar-btn save" onClick={saveSettings} title="Save Changes">
                <Save size={16} />
              </button>
            </div>
          </div>

          <div className="sidebar-content">
            {selectedElement ? (
              <div className="element-editor">
                <div className="editor-title">
                  <h3>Editing: {selectedElement.replace(/([A-Z])/g, ' $1').trim()}</h3>
                  <button className="clear-selection" onClick={() => setSelectedElement(null)}>Clear</button>
                </div>
                
                <div className="editor-group">
                  <label>Scale ({selectedLayout.scale || 1}x)</label>
                  <input 
                    type="range" min="0.2" max="4" step="0.1" 
                    value={selectedLayout.scale || 1} 
                    onChange={e => updateLayoutProperty(selectedElement, 'scale', parseFloat(e.target.value))}
                    onMouseUp={() => pushToHistory(tempSettings.layout)}
                    onTouchEnd={() => pushToHistory(tempSettings.layout)}
                  />
                </div>

                <div className="editor-group">
                  <label>Text Color</label>
                  <div className="color-input-wrapper">
                    <input 
                      type="color" 
                      value={selectedLayout.color || '#ffffff'} 
                      onChange={e => updateLayoutProperty(selectedElement, 'color', e.target.value)}
                      onBlur={() => pushToHistory(tempSettings.layout)}
                    />
                    <span>{selectedLayout.color || '#ffffff'}</span>
                  </div>
                </div>

                <div className="editor-group">
                  <label>Font Family</label>
                  <select 
                    value={selectedLayout.fontFamily || 'system-ui'} 
                    onChange={e => updateLayoutProperty(selectedElement, 'fontFamily', e.target.value, true)}
                  >
                    {FONTS.map(f => <option key={f} value={f} style={{fontFamily: f}}>{f.split(',')[0].replace(/'/g, '')}</option>)}
                  </select>
                </div>

                <div className="editor-group">
                  <label>Width ({selectedLayout.width || 90}%)</label>
                  <input 
                    type="range" min="10" max="100" step="1" 
                    value={selectedLayout.width || 90} 
                    onChange={e => updateLayoutProperty(selectedElement, 'width', parseInt(e.target.value))}
                    onMouseUp={() => pushToHistory(tempSettings.layout)}
                    onTouchEnd={() => pushToHistory(tempSettings.layout)}
                  />
                </div>

                <div className="editor-group">
                  <label>Alignment</label>
                  <div className="alignment-buttons">
                    <button 
                      className="align-btn"
                      onClick={() => updateLayoutProperty(selectedElement!, 'x', 50, true)} 
                      title="Center Horizontally"
                    >
                      <AlignCenterHorizontal size={16} />
                      <span>Horizontal</span>
                    </button>
                    <button 
                      className="align-btn"
                      onClick={() => updateLayoutProperty(selectedElement!, 'y', 50, true)} 
                      title="Center Vertically"
                    >
                      <AlignCenterVertical size={16} />
                      <span>Vertical</span>
                    </button>
                    <button 
                      className="align-btn"
                      onClick={() => {
                        const newLayout = {
                          ...tempSettings.layout,
                          [selectedElement!]: {
                            ...(tempSettings.layout as any)[selectedElement!],
                            x: 50,
                            y: 50
                          }
                        }
                        setTempSettings({ ...tempSettings, layout: newLayout })
                        pushToHistory(newLayout)
                      }} 
                      title="Center Both"
                    >
                      <Maximize size={16} />
                      <span>Center Both</span>
                    </button>
                  </div>
                </div>

                <div className="editor-info">
                  <p>Position: {selectedLayout.x}%, {selectedLayout.y}%</p>
                  <p className="hint">Drag the element in the preview to move it.</p>
                </div>
              </div>
            ) : (
              <div className="empty-sidebar">
                <p>Click an element in the preview to start editing its properties.</p>
                <button className="reset-layout-btn" onClick={resetLayout}>
                  <Trash2 size={14} />
                  <span>Reset to Defaults</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="sidebar-footer">
            <p>Layouts are saved per preset</p>
          </div>
        </div>

        {/* Preview Area */}
        <div 
          ref={previewAreaRef}
          className="layout-preview-area"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseDown={handleBackgroundMouseDown}
          onWheel={handleWheel}
        >
          <div className="preview-label">Live Preview (Pan & Zoom)</div>
          
          <div className="zoom-controls">
            <button onClick={() => setUserZoom(z => Math.min(5, +(z + 0.1).toFixed(1)))} title="Zoom In">+</button>
            <button onClick={() => { setUserZoom(1); setPanOffset({x: 0, y: 0}) }} title="Reset View">Reset</button>
            <button onClick={() => setUserZoom(z => Math.max(0.2, +(z - 0.1).toFixed(1)))} title="Zoom Out">-</button>
          </div>

          {/* Wrapper to maintain actual size */}
          <div 
            className="preview-widget-wrapper" 
            style={{ 
              width: widgetWidth, 
              height: widgetHeight,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${previewScale * userZoom})`
            }}
          >
            <div className="widget-container layout-mode">
              <div 
                className="widget-bg"
                style={{ 
                  backgroundImage: (tempSettings.backgroundType === 'image' && tempSettings.backgroundImage) ? `url(${tempSettings.backgroundImage})` : 'none',
                  backgroundColor: tempSettings.backgroundColor,
                  opacity: tempSettings.backgroundOpacity
                }}
              />
              
              <div className="content layout-editable">
                <h1 
                  className={`event-name draggable ${selectedElement === 'eventName' ? 'selected' : ''}`}
                  onMouseDown={(e) => handleMouseDown(e, 'eventName')}
                  style={{ 
                    position: 'absolute', 
                    left: `${tempSettings.layout?.eventName?.x}%`, 
                    top: `${tempSettings.layout?.eventName?.y}%`,
                    width: `${tempSettings.layout?.eventName?.width || 90}%`,
                    translate: '-50% -50%',
                    scale: `${tempSettings.layout?.eventName?.scale || 1}`,
                    margin: 0,
                    color: tempSettings.layout?.eventName?.color || '#ffffff',
                    fontFamily: tempSettings.layout?.eventName?.fontFamily || 'inherit',
                    cursor: draggingElement === 'eventName' ? 'grabbing' : 'grab',
                    zIndex: selectedElement === 'eventName' ? 10 : 1,
                    border: selectedElement === 'eventName' ? '2px solid #4a90e2' : '1px solid transparent'
                  }}
                >
                  {tempSettings.eventName}
                </h1>
                
                <p 
                  className={`target-date draggable ${selectedElement === 'targetDate' ? 'selected' : ''}`}
                  onMouseDown={(e) => handleMouseDown(e, 'targetDate')}
                  style={{ 
                    position: 'absolute', 
                    left: `${tempSettings.layout?.targetDate?.x}%`, 
                    top: `${tempSettings.layout?.targetDate?.y}%`,
                    width: `${tempSettings.layout?.targetDate?.width || 90}%`,
                    translate: '-50% -50%',
                    scale: `${tempSettings.layout?.targetDate?.scale || 1}`,
                    margin: 0,
                    color: tempSettings.layout?.targetDate?.color || '#ffffff',
                    fontFamily: tempSettings.layout?.targetDate?.fontFamily || 'inherit',
                    cursor: draggingElement === 'targetDate' ? 'grabbing' : 'grab',
                    zIndex: selectedElement === 'targetDate' ? 10 : 1,
                    border: selectedElement === 'targetDate' ? '2px solid #4a90e2' : '1px solid transparent'
                  }}
                >
                  {formattedDate} <span className="time">{formattedTime}</span>
                </p>
                
                <div 
                  className={`countdown-grid draggable ${selectedElement === 'countdown' ? 'selected' : ''}`}
                  onMouseDown={(e) => handleMouseDown(e, 'countdown')}
                  style={{ 
                    position: 'absolute', 
                    left: `${tempSettings.layout?.countdown?.x}%`, 
                    top: `${tempSettings.layout?.countdown?.y}%`,
                    width: `${tempSettings.layout?.countdown?.width || 90}%`,
                    translate: '-50% -50%',
                    scale: `${tempSettings.layout?.countdown?.scale || 1}`,
                    margin: 0,
                    color: tempSettings.layout?.countdown?.color || '#ffffff',
                    fontFamily: tempSettings.layout?.countdown?.fontFamily || 'inherit',
                    cursor: draggingElement === 'countdown' ? 'grabbing' : 'grab',
                    zIndex: selectedElement === 'countdown' ? 10 : 1,
                    border: selectedElement === 'countdown' ? '2px solid #4a90e2' : '1px solid transparent'
                  }}
                >
                  <div className="time-unit">
                    <span className="number" style={{color: 'inherit'}}>{timeLeft.days}</span>
                    <span className="label" style={{color: 'inherit'}}>days</span>
                  </div>
                  <div className="time-unit">
                    <span className="number" style={{color: 'inherit'}}>{timeLeft.hours}</span>
                    <span className="label" style={{color: 'inherit'}}>hours</span>
                  </div>
                  <div className="time-unit">
                    <span className="number" style={{color: 'inherit'}}>{timeLeft.minutes}</span>
                    <span className="label" style={{color: 'inherit'}}>minutes</span>
                  </div>
                  <div className="time-unit">
                    <span className="number" style={{color: 'inherit'}}>{timeLeft.seconds}</span>
                    <span className="label" style={{color: 'inherit'}}>seconds</span>
                  </div>
                </div>
              </div>
            </div>
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
        <h1 
          className="event-name"
          style={settings.layout?.eventName ? {
            position: 'absolute',
            left: `${settings.layout.eventName.x}%`,
            top: `${settings.layout.eventName.y}%`,
            width: `${settings.layout.eventName.width || 90}%`,
            translate: '-50% -50%',
            scale: `${settings.layout.eventName.scale || 1}`,
            margin: 0,
            color: settings.layout.eventName.color || '#ffffff',
            fontFamily: settings.layout.eventName.fontFamily || 'inherit'
          } : {}}
        >
          {settings.eventName}
        </h1>
        <p 
          className="target-date"
          style={settings.layout?.targetDate ? {
            position: 'absolute',
            left: `${settings.layout.targetDate.x}%`,
            top: `${settings.layout.targetDate.y}%`,
            width: `${settings.layout.targetDate.width || 90}%`,
            translate: '-50% -50%',
            scale: `${settings.layout.targetDate.scale || 1}`,
            margin: 0,
            color: settings.layout.targetDate.color || '#ffffff',
            fontFamily: settings.layout.targetDate.fontFamily || 'inherit'
          } : {}}
        >
          {formattedDate} <span className="time">{formattedTime}</span>
        </p>
        
        <div 
          className="countdown-grid"
          style={settings.layout?.countdown ? {
            position: 'absolute',
            left: `${settings.layout.countdown.x}%`,
            top: `${settings.layout.countdown.y}%`,
            width: `${settings.layout.countdown.width || 90}%`,
            translate: '-50% -50%',
            scale: `${settings.layout.countdown.scale || 1}`,
            margin: 0,
            color: settings.layout.countdown.color || '#ffffff',
            fontFamily: settings.layout.countdown.fontFamily || 'inherit'
          } : {}}
        >
          <div className="time-unit">
            <span className="number" style={{color: 'inherit'}}>{timeLeft.days}</span>
            <span className="label" style={{color: 'inherit'}}>days</span>
          </div>
          <div className="time-unit">
            <span className="number" style={{color: 'inherit'}}>{timeLeft.hours}</span>
            <span className="label" style={{color: 'inherit'}}>hours</span>
          </div>
          <div className="time-unit">
            <span className="number" style={{color: 'inherit'}}>{timeLeft.minutes}</span>
            <span className="label" style={{color: 'inherit'}}>minutes</span>
          </div>
          <div className="time-unit">
            <span className="number" style={{color: 'inherit'}}>{timeLeft.seconds}</span>
            <span className="label" style={{color: 'inherit'}}>seconds</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
