import { describe, expect, it } from "vitest";

import cloudinaryLoader, {
  cloudinaryBlur,
  cloudinaryUrl,
  isCloudinaryUrl,
  PLANT_PLACEHOLDER,
} from "@/lib/images/cloudinary-loader";

const CLOUD = "https://res.cloudinary.com/demo-cloud/image/upload/v179/planthaat/products/a.webp";

describe("cloudinary loader", () => {
  it("detects Cloudinary delivery URLs only", () => {
    expect(isCloudinaryUrl(CLOUD)).toBe(true);
    expect(isCloudinaryUrl("http://localhost:5000/uploads/images/x.webp")).toBe(false);
    expect(isCloudinaryUrl(PLANT_PLACEHOLDER)).toBe(false);
    expect(isCloudinaryUrl(null)).toBe(false);
  });

  it("inserts f_auto,q_auto,c_limit,w_<width> after /upload/", () => {
    expect(cloudinaryUrl(CLOUD, 2000)).toBe(
      "https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_2000/v179/planthaat/products/a.webp",
    );
    expect(cloudinaryUrl(CLOUD, 160, 80)).toContain("q_80,c_limit,w_160");
  });

  it("builds the tiny blur placeholder", () => {
    expect(cloudinaryBlur(CLOUD)).toContain("e_blur:1000,q_1,w_20");
    expect(cloudinaryBlur("/placeholders/plant-placeholder.webp")).toBeUndefined();
  });

  it("falls back to the default /_next/image optimizer for non-Cloudinary URLs", () => {
    const url = cloudinaryLoader({ src: "/placeholders/plant-placeholder.webp", width: 640, quality: 75 });
    expect(url).toBe("/_next/image?url=%2Fplaceholders%2Fplant-placeholder.webp&w=640&q=75");
  });

  it("passes Cloudinary URLs through the resizing loader", () => {
    const url = cloudinaryLoader({ src: CLOUD, width: 384 });
    expect(url).toContain("f_auto,q_auto,c_limit,w_384");
    expect(url).not.toContain("/_next/image");
  });
});
