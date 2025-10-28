import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const apiGatewayUrl = process.env.API_GATEWAY_URL

    if (!apiGatewayUrl) {
      return NextResponse.json(
        { error: "API_GATEWAY_URL environment variable is not set" },
        { status: 500 }
      )
    }

    const { imageData, prompt, style = "realistic" } = await request.json()

    console.log("Sending request to Lambda via API Gateway...")

    // Call Lambda via API Gateway
    const response = await fetch(apiGatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageData,
        style,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Lambda invocation failed:", errorText)
      return NextResponse.json(
        { error: "Failed to process image via Lambda" },
        { status: response.status }
      )
    }

    const result = await response.json()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Lambda processing failed" },
        { status: 500 }
      )
    }

    // Return the data from Lambda
    return NextResponse.json({
      prompt: result.data.prompt,
      image: result.data.imageBase64,
      s3Url: result.data.s3Url,
    })

  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}