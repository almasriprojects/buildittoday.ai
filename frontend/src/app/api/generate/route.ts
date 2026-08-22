import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

// POST - Generate a website for a customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      businessName,
      industry,
      phone,
      email,
      address,
    } = body;

    if (!businessName || !industry) {
      return NextResponse.json(
        { error: "Business name and industry are required" },
        { status: 400 }
      );
    }

    // In production, this would:
    // 1. Call Claude API to analyze competitors
    // 2. Generate HTML/React components
    // 3. Deploy to Vercel
    // 4. Return the deployed URL

    // For now, return mock data
    const demoUrl = `/demo/${customerId || Math.random().toString(36).substring(7)}`;

    return NextResponse.json({
      success: true,
      deploymentId: Math.random().toString(36).substring(7),
      demoUrl,
      status: "generating",
      message: "Website generation started. This typically takes 2-3 minutes.",
      estimatedCompletion: "180 seconds",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Check generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deploymentId = searchParams.get("deploymentId");

    if (!deploymentId) {
      return NextResponse.json(
        { error: "Deployment ID is required" },
        { status: 400 }
      );
    }

    // In production, check Supabase for deployment status
    return NextResponse.json({
      deploymentId,
      status: "building",
      progress: 45,
      estimatedTimeRemaining: "90 seconds",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}