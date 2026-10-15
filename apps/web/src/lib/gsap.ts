"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// Register React plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

export { gsap, useGSAP };
