"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const demos = [
  { id: "1", name: "Sunny's Hair Salon", industry: "Beauty", emoji: "💇" },
  { id: "2", name: "QuickFix Plumbing", industry: "Plumbing", emoji: "🔧" },
  { id: "3", name: "Miami Bites Restaurant", industry: "Restaurant", emoji: "🍽️" },
  { id: "4", name: "Sparkle Cleaners", industry: "Cleaning", emoji: "✨" },
  { id: "5", name: "Dr. Smith Dental", industry: "Dental", emoji: "🦷" },
  { id: "6", name: "Sunshine Landscaping", industry: "Landscaping", emoji: "🌿" },
  { id: "7", name: "Paws Pet Grooming", industry: "Pet Care", emoji: "🐾" },
  { id: "8", name: "Elite Auto Repair", industry: "Auto Repair", emoji: "🔩" },
];

export default function DemoIndex() {
  return (
    <div className="min-h-screen section-padding">
      <div className="container-max">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">View Our Demo Websites</h1>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Click any demo to see a fully built website for a small business. These are examples of what we build for our customers.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {demos.map((demo) => (
            <Link key={demo.id} href={`/demo/${demo.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="pt-8 text-center">
                  <div className="text-5xl mb-4">{demo.emoji}</div>
                  <h3 className="font-semibold text-lg">{demo.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{demo.industry}</p>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    View Demo
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}