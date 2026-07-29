import { describe, expect, it } from "vitest";
import {
  MAX_RECEIPT_FILE_BYTES,
  MAX_RECEIPT_FILES,
  planReceiptImage,
  receiptFileKey,
  selectReceiptFiles,
} from "@/lib/receipt-images";

const imageFile = (
  name: string,
  options: { type?: string; size?: number; lastModified?: number } = {},
) => {
  const size = options.size ?? 12;
  return new File([new Uint8Array(size)], name, {
    type: options.type ?? "image/png",
    lastModified: options.lastModified ?? 1,
  });
};

describe("receipt file selection", () => {
  it("accepts common screenshots and removes duplicate selections", () => {
    const first = imageFile("careem-order.png");
    const duplicate = imageFile("careem-order.png");
    const jpeg = imageFile("instashop.jpg", { type: "image/jpeg", lastModified: 2 });

    const result = selectReceiptFiles([duplicate, jpeg], [first]);

    expect(result.accepted).toEqual([jpeg]);
    expect(result.rejected).toEqual([]);
    expect(receiptFileKey(first)).toBe(receiptFileKey(duplicate));
  });

  it("rejects unsupported and oversized files with useful reasons", () => {
    const pdf = imageFile("receipt.pdf", { type: "application/pdf" });
    const huge = imageFile("receipt.png", {
      size: MAX_RECEIPT_FILE_BYTES + 1,
    });

    const result = selectReceiptFiles([pdf, huge]);

    expect(result.accepted).toEqual([]);
    expect(result.rejected.map((entry) => entry.reason)).toEqual([
      "Choose a JPG, PNG, WebP, HEIC, or HEIF image.",
      "Each receipt image must be 15 MB or smaller.",
    ]);
  });

  it("limits a single receipt to six selected images", () => {
    const files = Array.from({ length: MAX_RECEIPT_FILES + 2 }, (_, index) =>
      imageFile(`page-${index}.png`, { lastModified: index }),
    );

    const result = selectReceiptFiles(files);

    expect(result.accepted).toHaveLength(MAX_RECEIPT_FILES);
    expect(result.rejected).toHaveLength(2);
  });
});

describe("receipt image planning", () => {
  it("keeps a normal phone screenshot at full readable width", () => {
    expect(planReceiptImage(1170, 2532)).toEqual({
      width: 1170,
      height: 2532,
      scale: 1,
      segments: [{ startY: 0, height: 2532 }],
    });
  });

  it("scales a large camera photo by width rather than longest edge", () => {
    const plan = planReceiptImage(3024, 4032);

    expect(plan.width).toBe(1800);
    expect(plan.height).toBe(2400);
    expect(plan.segments).toEqual([{ startY: 0, height: 2400 }]);
  });

  it("splits a long app screenshot into overlapping readable sections", () => {
    const plan = planReceiptImage(1170, 8000);

    expect(plan.width).toBe(1170);
    expect(plan.segments).toEqual([
      { startY: 0, height: 3000 },
      { startY: 2840, height: 3000 },
      { startY: 5680, height: 2320 },
    ]);
    expect(plan.segments.at(-1)!.startY + plan.segments.at(-1)!.height).toBe(
      plan.height,
    );
  });

  it("rejects invalid dimensions", () => {
    expect(() => planReceiptImage(0, 100)).toThrow(
      "Receipt image dimensions are invalid.",
    );
  });
});
