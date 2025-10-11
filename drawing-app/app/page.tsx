import DrawingCanvas from "@/components/drawing-canvas"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-10 text-center space-y-3">
          <h1 className="text-5xl md:text-6xl font-bold text-balance bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
            AI Drawing Studio
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto text-pretty">
            Draw your sketch and let Gemini AI analyze and transform your artwork with intelligent insights
          </p>
        </div>
        <DrawingCanvas />
      </div>
    </main>
  )
}
