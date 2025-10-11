# AWS Lambda + API Gateway Setup Guide

## Overview
This guide explains how to deploy the image generation Lambda function and connect it via API Gateway.

## Prerequisites
- AWS Account
- AWS CLI configured
- Python 3.9+ for Lambda

## Step 1: Create Lambda Function

1. Go to AWS Lambda Console
2. Click "Create function"
3. Choose "Author from scratch"
4. Function name: `image-generation-lambda`
5. Runtime: Python 3.11
6. Architecture: x86_64
7. Click "Create function"

## Step 2: Configure Lambda

1. Copy the code from `scripts/lambda_function.py` to the Lambda function editor
2. Add environment variables:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `S3_BUCKET_NAME`: (Optional) Your S3 bucket name
   - `AWS_REGION`: (Optional) Your AWS region

3. Add Lambda Layer for dependencies:
   - Create a layer with: `requests`, `boto3`
   - Or use AWS Lambda Powertools

4. Increase timeout to 30 seconds (Configuration → General configuration)
5. Increase memory to 512 MB or higher

## Step 3: Create API Gateway

1. Go to API Gateway Console
2. Click "Create API"
3. Choose "REST API" (not private)
4. Click "Build"
5. API name: `image-generation-api`
6. Click "Create API"

## Step 4: Configure API Gateway

1. Click "Actions" → "Create Resource"
   - Resource Name: `generate`
   - Click "Create Resource"

2. Select the `/generate` resource
3. Click "Actions" → "Create Method"
4. Choose "POST"
5. Integration type: Lambda Function
6. Lambda Function: `image-generation-lambda`
7. Click "Save"

## Step 5: Enable CORS

1. Select the `/generate` resource
2. Click "Actions" → "Enable CORS"
3. Check all methods
4. Click "Enable CORS and replace existing CORS headers"

## Step 6: Deploy API

1. Click "Actions" → "Deploy API"
2. Deployment stage: `[New Stage]`
3. Stage name: `prod`
4. Click "Deploy"

## Step 7: Get API Gateway URL

1. After deployment, you'll see the "Invoke URL"
2. Your full endpoint will be: `https://[api-id].execute-api.[region].amazonaws.com/prod/generate`

## Step 8: Configure Next.js App

Add these environment variables to your Next.js project:

\`\`\`env
API_GATEWAY_URL=https://[your-api-id].execute-api.[region].amazonaws.com/prod/generate
API_GATEWAY_API_KEY=[optional-if-you-set-api-key]
\`\`\`

## Optional: Add API Key Authentication

1. In API Gateway, go to "API Keys"
2. Click "Actions" → "Create API Key"
3. Name it and save
4. Go to "Usage Plans"
5. Create a usage plan and associate it with your API and API key
6. Add the API key to your environment variables

## Testing

Test your Lambda function directly:
\`\`\`bash
aws lambda invoke \
  --function-name image-generation-lambda \
  --payload '{"imageData":"base64data","style":"realistic"}' \
  response.json
\`\`\`

Test via API Gateway:
\`\`\`bash
curl -X POST https://[your-api-url]/prod/generate \
  -H "Content-Type: application/json" \
  -d '{"imageData":"base64data","style":"realistic"}'
\`\`\`

## Monitoring

- View Lambda logs in CloudWatch
- Monitor API Gateway metrics in the console
- Set up CloudWatch alarms for errors

## Cost Optimization

- Lambda: First 1M requests/month are free
- API Gateway: First 1M requests/month are free
- S3: Pay for storage and data transfer
- Consider using Lambda reserved concurrency for predictable workloads
