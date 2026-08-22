"use client";

import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MapPreviewProps {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  foundOnMaps?: boolean;
  mapsPhone?: string;
  mapsWebsite?: string;
  rating?: number;
  reviewCount?: number;
  businessStatus?: string;
}

export function MapPreview({
  address,
  city,
  state,
  zip,
  foundOnMaps,
  mapsPhone,
  mapsWebsite,
  rating,
  reviewCount,
  businessStatus,
}: MapPreviewProps) {
  const query = [address, city, state, zip].filter(Boolean).join(", ");

  return (
    <div className="space-y-4">
      {/* Embedded map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4" />
            Location Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          {query ? (
            <div className="rounded-lg overflow-hidden border border-slate-200 relative">
              <iframe
                title="Business location map"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
                className="w-full h-64"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No address available for this lead.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maps details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Google Maps Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Found on Maps</dt>
              <dd className="text-sm mt-0.5">{foundOnMaps === null || foundOnMaps === undefined ? "—" : foundOnMaps ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Status</dt>
              <dd className="text-sm mt-0.5">{businessStatus ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</dt>
              <dd className="text-sm mt-0.5">{mapsPhone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Website</dt>
              <dd className="text-sm mt-0.5">
                {mapsWebsite ? (
                  <a href={mapsWebsite} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {mapsWebsite}
                  </a>
                ) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rating</dt>
              <dd className="text-sm mt-0.5">
                {rating !== null && rating !== undefined ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="text-amber-500">★</span> {rating} / 5
                  </span>
                ) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reviews</dt>
              <dd className="text-sm mt-0.5">{reviewCount ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}