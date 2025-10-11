import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3Client =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      })
    : null

async function uploadToS3(imageBuffer: Buffer, filename: string): Promise<string | null> {
  if (!s3Client || !process.env.S3_BUCKET_NAME) {
    console.log("S3 not configured, skipping upload")
    return null
  }

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `generated-images/${filename}`,
      Body: imageBuffer,
      ContentType: "image/png",
    })

    await s3Client.send(command)
    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/generated-images/${filename}`
    console.log("Image uploaded to S3:", s3Url)
    return s3Url
  } catch (error) {
    console.error("Error uploading to S3:", error)
    return null
  }
}

async function invokeLambdaViaApiGateway(payload: any): Promise<any> {
  const apiGatewayUrl = process.env.API_GATEWAY_URL

  if (!apiGatewayUrl) {
    console.log("API Gateway not configured, skipping Lambda invocation")
    return null
  }

  try {
    const response = await fetch(apiGatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.API_GATEWAY_API_KEY && {
          "x-api-key": process.env.API_GATEWAY_API_KEY,
        }),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error("Lambda invocation failed:", await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("Error invoking Lambda:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY environment variable is not set" }, { status: 500 })
    }

    const { imageData, prompt, style = "realistic" } = await request.json()

    if (process.env.API_GATEWAY_URL) {
      console.log("Attempting Lambda processing via API Gateway")
      const lambdaResult = await invokeLambdaViaApiGateway({
        imageData,
        prompt,
        style,
        apiKey,
      })

      if (lambdaResult && lambdaResult.success) {
        console.log("Lambda processing successful")
        return NextResponse.json(lambdaResult.data)
      }

      console.log("Lambda processing failed or not available, falling back to direct processing")
    }

    const analysisResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze this drawing and create a detailed, artistic prompt for image generation in ${style} style. Describe what you see, the style, mood, colors, and composition. Make it vivid and descriptive for creating a beautiful ${style} image. Keep it 2-3 sentences.`,
                },
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: imageData,
                  },
                },
              ],
            },
          ],
        }),
      },
    )

    const analysisData = await analysisResponse.json()

    if (!analysisResponse.ok) {
      console.error("Gemini Analysis error:", analysisData)
      return NextResponse.json(
        { error: analysisData.error?.message || "Failed to analyze drawing" },
        { status: analysisResponse.status },
      )
    }

    const imagePrompt = analysisData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!imagePrompt) {
      return NextResponse.json({ error: "Failed to generate prompt from drawing" }, { status: 500 })
    }

    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt + ` in ${style} style`)}?width=1024&height=1024&nologo=true&enhance=true`

    // Fetch the image
    const imageResponse = await fetch(pollinationsUrl)

    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
    }

    // Convert to base64
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")

    const filename = `${Date.now()}-${style}.png`
    const s3Url = await uploadToS3(Buffer.from(imageBuffer), filename)

    return NextResponse.json({
      prompt: imagePrompt,
      image: base64Image,
      s3Url: s3Url,
    })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
