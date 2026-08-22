"use client";

import { Globe, RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WebsitePreviewProps {
  demoSlug?: string;
  siteGenerated?: boolean;
  onGenerate: () => void;
  generating?: boolean;
}

export function WebsitePreview({ demoSlug, siteGenerated, onGenerate, generating }: WebsitePreviewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4" />
            Website Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {siteGenerated && demoSlug ? (
            <div>
              {/* Browser chrome mockup */}
              <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 border-b border-slate-200">
                  <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 flex items-center gap-1 bg-white rounded-md px-2 py-0.5 text-xs text-muted-foreground border border-slate-200">
                    <Lock className="w-3 h-3" />
                    buildittoday.ai/demo/{demoSlug}
                  </div>
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <iframe
                  title="Generated website preview"
                  src={`/demo/${demoSlug}`}
                  className="w-full h-96 bg-white"
                  loading="lazy"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <a href={`/demo/${demoSlug}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Open demo in new tab →
                </a>
              </p>
            </div>
          ) : (
            <div className="py-10 text-center">
              <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">No website generated yet</p>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                Generate a demo website for this lead to preview it here.
              </p>
              <Button onClick={onGenerate} disabled={generating}>
                {generating ? "Generating..." : "Generate Site"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}