import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Browser-tab mark. Generated so there is no binary asset to keep in sync. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F172A",
          color: "#fff",
          fontSize: 21,
          fontWeight: 700,
          borderRadius: 7,
        }}
      >
        B
      </div>
    ),
    size
  );
}
