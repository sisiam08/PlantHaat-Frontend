"use client";

import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

export interface LightboxSlide {
  src: string;
  alt?: string;
}

export function ProductLightbox({
  slides,
  index,
  onClose,
}: {
  slides: LightboxSlide[];
  index: number;
  onClose: () => void;
}) {
  return (
    <Lightbox
      open
      close={onClose}
      slides={slides}
      index={index}
      plugins={[Zoom]}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      carousel={{ finite: false, padding: 0 }}
      animation={{ fade: 200, swipe: 250 }}
      styles={{ container: { backgroundColor: "rgba(7, 20, 16, 0.96)" } }}
    />
  );
}
