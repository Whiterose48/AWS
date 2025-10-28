"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Loader2, Eraser, Trash2, Download, Sparkles, Palette } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState("#ffffff")
  const [brushSize, setBrushSize] = useState(5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  const [isEraser, setIsEraser] = useState(false)
  const [imageStyle, setImageStyle] = useState("realistic")

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = 800
    canvas.height = 600

    // Fill with black background
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (ctx) {
      ctx.beginPath()
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== "mousedown") return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    ctx.lineWidth = brushSize
    ctx.lineCap = "round"
    ctx.strokeStyle = isEraser ? "#000000" : color

    if (e.type === "mousedown") {
      ctx.beginPath()
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setGeneratedImage(null)
    setGeneratedPrompt(null)
  }

  const downloadImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement("a")
    link.download = "drawing.png"
    link.href = canvas.toDataURL()
    link.click()
  }

  const generateImage = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsGenerating(true)
    setGeneratedImage(null)
    setGeneratedPrompt(null)

    try {
      // Convert canvas to base64 - Remove the data:image prefix
      const imageData = canvas.toDataURL("image/png").split(",")[1]

      console.log("=== FRONTEND DEBUG ===")
      console.log("Image data length:", imageData.length)
      console.log("Selected style:", imageStyle)
      console.log("First 50 chars:", imageData.substring(0, 50))

      const payload = {
        imageData,
        style: imageStyle,
      }

      console.log("Sending payload:", payload)

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      console.log("Response status:", response.status)
      const data = await response.json()
      console.log("Response data:", data)

      if (data.error) {
        console.error("API Error:", data.error)
        alert(`Error: ${data.error}`)
      } else {
        if (data.image) {
          setGeneratedImage(data.image)
        }
        if (data.prompt) {
          setGeneratedPrompt(data.prompt)
        }
      }
    } catch (error) {
      console.error("Error generating image:", error)
      alert("Failed to generate. Please check your API configuration.")
    } finally {
      setIsGenerating(false)
    }
  }

  const colorPresets = [
    "#ffffff",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ff00ff",
    "#00ffff",
    "#ff8800",
    "#8800ff",
    "#00ff88",
  ]

  return (
    <div className="grid lg:grid-cols-[400px_1fr] gap-6 max-w-7xl mx-auto">
      {/* Controls Panel */}
      <div className="space-y-4">
        <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Drawing Tools</h2>
            </div>

            {/* Brush Color */}
            <div className="space-y-3">
              <Label className="text-foreground font-medium">Brush Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value)
                    setIsEraser(false)
                  }}
                  className="w-14 h-14 rounded-xl cursor-pointer border-2 border-border hover:border-primary transition-colors"
                />
                <div className="grid grid-cols-5 gap-2 flex-1">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setColor(c)
                        setIsEraser(false)
                      }}
                      className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                        color === c && !isEraser ? "border-primary ring-2 ring-primary/20" : "border-border"
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Brush Size */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-medium">Brush Size</Label>
                <span className="text-sm text-muted-foreground font-mono">{brushSize}px</span>
              </div>
              <Slider
                value={[brushSize]}
                onValueChange={(value) => setBrushSize(value[0])}
                min={1}
                max={50}
                step={1}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setIsEraser(!isEraser)}
                variant={isEraser ? "default" : "outline"}
                className="w-full"
                size="lg"
              >
                <Eraser className="w-4 h-4 mr-2" />
                {isEraser ? "Erasing" : "Eraser"}
              </Button>
              <Button onClick={clearCanvas} variant="outline" className="w-full bg-transparent" size="lg">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>

            <Button onClick={downloadImage} variant="outline" className="w-full bg-transparent" size="lg">
              <Download className="w-4 h-4 mr-2" />
              Download Generated Pic
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">AI Generation</h2>
            </div>

            {/* Image Style */}
            <div>
              <Label htmlFor="style" className="text-foreground font-medium">
                Image Style
              </Label>
              <Select value={imageStyle} onValueChange={setImageStyle}>
                <SelectTrigger className="mt-2 bg-background/50 border-border text-foreground">
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realistic">Realistic</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                  <SelectItem value="cartoon">Cartoon</SelectItem>
                  <SelectItem value="oil-painting">Oil Painting</SelectItem>
                  <SelectItem value="watercolor">Watercolor</SelectItem>
                  <SelectItem value="sketch">Sketch</SelectItem>
                  <SelectItem value="3d-render">3D Render</SelectItem>
                  <SelectItem value="pixel-art">Pixel Art</SelectItem>
                  <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                  <SelectItem value="fantasy">Fantasy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              onClick={generateImage}
              disabled={isGenerating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate with Gemini AI
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Canvas and Output Panel */}
      <div className="space-y-4">
        <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
          <Label className="text-foreground font-medium mb-3 block">Drawing Canvas</Label>
          <div className="relative">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full border-2 border-border rounded-lg cursor-crosshair bg-black shadow-lg"
              style={{ maxWidth: "100%", height: "auto", aspectRatio: "4/3" }}
            />
            {isEraser && (
              <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                Eraser Mode
              </div>
            )}
          </div>
        </Card>

        {generatedImage && (
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <Label className="text-foreground font-semibold text-lg">AI Generated Image</Label>
              </div>

              {/* {generatedPrompt && (
                <div className="bg-background/80 backdrop-blur rounded-lg p-4 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1 font-medium">Prompt used:</p>
                  <p className="text-foreground leading-relaxed text-sm">{generatedPrompt}</p>
                </div>
              )} */}

              <div className="bg-background/80 backdrop-blur rounded-lg p-4 border border-border/50">
                <img
                  src={generatedImage}  // ✅ CORRECT - already has prefix from Lambda
                  alt="AI Generated"
                  className="w-full rounded-lg shadow-lg"
                />
              </div>

              <Button
                onClick={() => {
                  const link = document.createElement("a")
                  link.download = "ai-generated-image.png"
                  link.href = generatedImage  // ✅ CORRECT
                  link.click()
                }}
                variant="default"
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Generated Image
              </Button>
            </div>
          </Card>
        )}

        {!generatedImage && !isGenerating && (
          <Card className="p-8 bg-card/30 backdrop-blur border-dashed border-2 border-border/50">
            <div className="text-center space-y-2">
              <Sparkles className="w-12 h-12 text-muted-foreground/50 mx-auto" />
              <p className="text-muted-foreground">
                Draw something and click "Generate with Gemini AI" to create an AI-generated image
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
