import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlantImage } from "@/components/plant-image";
import { PLANT_PLACEHOLDER } from "@/lib/images/cloudinary-loader";

describe("PlantImage", () => {
  it("renders the placeholder when there is no image", () => {
    render(<PlantImage src={null} alt="No image product" width={200} height={250} />);
    const img = screen.getByAltText("No image product") as HTMLImageElement;
    expect(img.getAttribute("src")).toContain("plant-placeholder");
  });

  it("uses the Cloudinary resizing loader for Cloudinary URLs", () => {
    render(
      <PlantImage
        src="https://res.cloudinary.com/demo-cloud/image/upload/v1/planthaat/products/a.webp"
        alt="Cloudinary product"
        width={200}
        height={250}
      />,
    );
    const img = screen.getByAltText("Cloudinary product") as HTMLImageElement;
    expect(img.getAttribute("src")).toContain("f_auto,q_auto,c_limit,w_");
  });

  it("keeps the placeholder path as a constant", () => {
    expect(PLANT_PLACEHOLDER).toBe("/placeholders/plant-placeholder.webp");
  });
});
