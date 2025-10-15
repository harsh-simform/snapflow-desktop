import React, { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
// Note: fabric is loaded dynamically at runtime to avoid SSR issues
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function AnnotatePage() {
  const router = useRouter()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  // runtime library reference (loaded dynamically on the client)
  const fabricLibRef = useRef<any>(null)
  const fabricCanvasRef = useRef<any | null>(null)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [tool, setTool] = useState<'select' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'pen'>('select')
  const [color, setColor] = useState('#EF4444')
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadUser()

    // Dynamically import fabric on the client to avoid SSR issues
    let mounted = true
    import('fabric')
      .then((mod) => {
        const lib = (mod as any).fabric ?? mod
        if (!mounted) return
        fabricLibRef.current = lib

        // Initialize fabric canvas
        const canvas = new lib.Canvas('annotation-canvas', {
          isDrawingMode: false,
          backgroundColor: '#000',
        })
        fabricCanvasRef.current = canvas

        // If we already have a screenshot queued, load it
        if (screenshot) {
          loadImageOnCanvas(screenshot, canvas)
        }
      })
      .catch((err) => {
        console.error('Failed to load fabric library:', err)
      })

    // Listen for screenshot captured event
    const cleanup = window.api.onScreenshotCaptured((data: any) => {
      setScreenshot(data.dataUrl)
      // load image when fabric canvas is ready
      const canvas = fabricCanvasRef.current
      if (canvas) {
        loadImageOnCanvas(data.dataUrl, canvas)
      }
    })

    return () => {
      cleanup()
      const canvas = fabricCanvasRef.current
      if (canvas && typeof canvas.dispose === 'function') {
        canvas.dispose()
      }
      mounted = false
    }
  }, [])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    if (tool === 'pen') {
      canvas.isDrawingMode = true
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = color
        canvas.freeDrawingBrush.width = 3
      }
    } else {
      canvas.isDrawingMode = false
    }

    if (tool === 'select') {
      canvas.selection = true
      canvas.forEachObject((obj: any) => {
        obj.selectable = true
      })
    } else {
      canvas.selection = false
      if (typeof canvas.discardActiveObject === 'function') canvas.discardActiveObject()
      canvas.forEachObject((obj: any) => {
        obj.selectable = false
      })
    }
  }, [tool, color])

  const loadUser = async () => {
    const result = await window.api.getUser()
    if (result.success && result.data) {
      setCurrentUser(result.data)
    }
  }

  const loadImageOnCanvas = (dataUrl: string, canvas: any) => {
    const fabric = fabricLibRef.current
    if (!fabric) return

    fabric.Image.fromURL(dataUrl, (img: any) => {
      const containerWidth = canvasContainerRef.current?.clientWidth || 1200
      const maxWidth = containerWidth - 48
      const scale = Math.min(1, maxWidth / (img.width || 1))

      canvas.setWidth((img.width || 1200) * scale)
      canvas.setHeight((img.height || 800) * scale)

      img.scale(scale)
      img.selectable = false
      img.evented = false

      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas))
    })
  }

  const handleAddShape = () => {
  const canvas = fabricCanvasRef.current
  if (!canvas) return

  const fabric = fabricLibRef.current
  let shape: any = null

    switch (tool) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: 100,
          top: 100,
          width: 200,
          height: 100,
          fill: 'transparent',
          stroke: color,
          strokeWidth: 3,
        })
        break
      case 'circle':
        shape = new fabric.Circle({
          left: 100,
          top: 100,
          radius: 50,
          fill: 'transparent',
          stroke: color,
          strokeWidth: 3,
        })
        break
      case 'arrow':
        const line = new fabric.Line([50, 50, 200, 50], {
          stroke: color,
          strokeWidth: 3,
        })
        const triangle = new fabric.Triangle({
          left: 200,
          top: 50,
          width: 15,
          height: 20,
          fill: color,
          angle: 90,
          originX: 'center',
          originY: 'center',
        })
        const group = new fabric.Group([line, triangle], {
          left: 100,
          top: 100,
        })
        shape = group
        break
      case 'text':
        shape = new fabric.IText('Double click to edit', {
          left: 100,
          top: 100,
          fontSize: 24,
          fill: color,
          fontFamily: 'Inter, sans-serif',
        })
        break
    }

    if (shape) {
      canvas.add(shape)
      canvas.setActiveObject(shape)
      canvas.renderAll()
      setTool('select')
    }
  }

  useEffect(() => {
    if (tool !== 'select' && tool !== 'pen') {
      handleAddShape()
    }
  }, [tool])

  const handleDelete = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => canvas.remove(obj))
      canvas.discardActiveObject()
      canvas.renderAll()
    }
  }

  const handleUndo = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const objects = canvas.getObjects()
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1])
      canvas.renderAll()
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (!currentUser) {
      toast.error('User not found. Please login again.')
      router.push('/auth')
      return
    }

    setSaving(true)

    try {
      const canvas = fabricCanvasRef.current
      if (!canvas) {
        toast.error('Canvas not found')
        setSaving(false)
        return
      }

      // Export canvas to data URL
      const dataUrl = canvas.toDataURL({
        format: 'png',
        quality: 1,
      })

      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()

      // Generate a temporary issue ID
      const tempId = `SF-${Date.now()}`

      // Save the capture
      const saveResult = await window.api.saveCapture(tempId, arrayBuffer)
      if (!saveResult.success) {
        toast.error(`Failed to save screenshot: ${saveResult.error}`)
        setSaving(false)
        return
      }

      // Create the issue
      const issueResult = await window.api.createIssue(
        currentUser.id,
        title,
        'screenshot',
        saveResult.data.filePath,
        description || undefined,
        saveResult.data.thumbnailPath
      )

      if (issueResult.success) {
        toast.success('Screenshot saved successfully')
        router.push('/home')
      } else {
        toast.error(`Failed to create issue: ${issueResult.error}`)
      }
      setSaving(false)
    } catch (error) {
      console.error('Save error:', error)
      toast.error('An error occurred while saving')
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/home')
  }

  return (
    <>
      <Head>
        <title>Annotate Screenshot - SnapFlow</title>
      </Head>
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Toolbar */}
        <div className="bg-gray-900 border-b border-gray-800 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant={tool === 'select' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTool('select')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </Button>
              <Button
                variant={tool === 'pen' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTool('pen')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </Button>
              <Button
                variant={tool === 'arrow' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTool('arrow')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
              <Button
                variant={tool === 'rectangle' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTool('rectangle')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                </svg>
              </Button>
              <Button
                variant={tool === 'circle' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTool('circle')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
              <Button
                variant={tool === 'text' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTool('text')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </Button>

              <div className="h-8 w-px bg-gray-700 mx-2" />

              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-8 rounded border border-gray-700 cursor-pointer bg-gray-800"
                title="Choose color"
              />

              <div className="h-8 w-px bg-gray-700 mx-2" />

              <Button variant="ghost" size="sm" onClick={handleUndo} title="Undo">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete} title="Delete selected">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-950" ref={canvasContainerRef}>
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            {screenshot ? (
              <div className="rounded-lg overflow-hidden shadow-2xl border border-gray-800">
                <canvas id="annotation-canvas" />
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-16 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 font-medium">Waiting for screenshot...</p>
                  <p className="text-gray-600 text-sm">Use the system tray or capture page to take a screenshot</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details Panel */}
        <div className="bg-gray-900 border-t border-gray-800 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter issue title"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <Input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
