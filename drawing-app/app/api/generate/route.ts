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

    // Parse body
    const body = await request.json()
    const { imageData, style = "realistic" } = body

    console.log("=== API ROUTE DEBUG ===")
    console.log("Received body keys:", Object.keys(body))
    console.log("imageData exists?", !!imageData)
    console.log("imageData length:", imageData?.length || 0)
    console.log("imageData type:", typeof imageData)
    console.log("style:", style)
    console.log("First 50 chars:", imageData?.substring(0, 50))

    // Validate imageData
    if (!imageData || imageData.length === 0) {
      console.error("ERROR: No imageData in request body")
      return NextResponse.json(
        { error: "No image data received from client" },
        { status: 400 }
      )
    }

    // Prepare payload for Lambda
    const lambdaPayload = {
      imageData,
      style,
    }

    console.log("=== SENDING TO LAMBDA ===")
    console.log("Lambda payload keys:", Object.keys(lambdaPayload))
    console.log("Lambda payload stringified length:", JSON.stringify(lambdaPayload).length)

    // Call Lambda via API Gateway
    const response = await fetch(apiGatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lambdaPayload),
    })

    console.log("Lambda response status:", response.status)
    console.log("Lambda response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Lambda invocation failed:", errorText)
      return NextResponse.json(
        { error: "Failed to process image via Lambda", details: errorText },
        { status: response.status }
      )
    }

    const responseData = await response.json()
    console.log("=== LAMBDA RESPONSE ===")
    console.log("Response type:", typeof responseData)
    console.log("Response keys:", Object.keys(responseData))
    console.log("Full response:", JSON.stringify(responseData, null, 2))

    // Parse body if it's a string (API Gateway format)
    let result = responseData
    if (responseData.body && typeof responseData.body === 'string') {
      console.log("Parsing body string...")
      result = JSON.parse(responseData.body)
    }

    console.log("Parsed result:", result)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Lambda processing failed" },
        { status: 500 }
      )
    }

    // Return data
    return NextResponse.json({
      prompt: result.data.prompt,
      image: result.data.imageBase64,
      s3Url: result.data.s3Url,
    })

  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}