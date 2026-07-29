export const MAX_RECEIPT_FILES = 6;
export const MAX_RECEIPT_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_PREPARED_RECEIPT_IMAGES = 10;
export const MAX_RECEIPT_PAYLOAD_CHARS = 18_000_000;

export const RECEIPT_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif";

const MAX_RENDERED_WIDTH = 1800;
const MAX_SEGMENT_HEIGHT = 3000;
const SEGMENT_OVERLAP = 160;

const supportedExtensions = /\.(jpe?g|png|webp|heic|heif)$/i;
const supportedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export interface ReceiptImageSegment {
  startY: number;
  height: number;
}

export interface ReceiptImagePlan {
  width: number;
  height: number;
  scale: number;
  segments: ReceiptImageSegment[];
}

export interface ReceiptFileSelection {
  accepted: File[];
  rejected: Array<{ file: File; reason: string }>;
}

export interface PreparedReceiptImage {
  base64: string;
  mime: "image/jpeg";
  sourceIndex: number;
  part: number;
  totalParts: number;
}

export const receiptFileKey = (file: File) =>
  `${file.name}:${file.size}:${file.lastModified}`;

export const isSupportedReceiptImage = (file: File) =>
  supportedMimeTypes.has(file.type.toLowerCase()) ||
  (!file.type && supportedExtensions.test(file.name));

export const selectReceiptFiles = (
  incoming: File[],
  existing: File[] = [],
): ReceiptFileSelection => {
  const rejected: ReceiptFileSelection["rejected"] = [];
  const accepted: File[] = [];
  const seen = new Set(existing.map(receiptFileKey));
  let remaining = Math.max(0, MAX_RECEIPT_FILES - existing.length);

  for (const file of incoming) {
    if (!isSupportedReceiptImage(file)) {
      rejected.push({
        file,
        reason: "Choose a JPG, PNG, WebP, HEIC, or HEIF image.",
      });
      continue;
    }
    if (file.size > MAX_RECEIPT_FILE_BYTES) {
      rejected.push({
        file,
        reason: "Each receipt image must be 15 MB or smaller.",
      });
      continue;
    }

    const key = receiptFileKey(file);
    if (seen.has(key)) continue;
    if (remaining === 0) {
      rejected.push({
        file,
        reason: `A receipt can include up to ${MAX_RECEIPT_FILES} images.`,
      });
      continue;
    }

    seen.add(key);
    accepted.push(file);
    remaining -= 1;
  }

  return { accepted, rejected };
};

/**
 * Receipt screenshots are often very tall. Scaling solely by the longest edge
 * can turn legible app text into a narrow blur, so width is preserved and long
 * images are split into slightly overlapping vertical sections instead.
 */
export const planReceiptImage = (
  sourceWidth: number,
  sourceHeight: number,
): ReceiptImagePlan => {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    throw new Error("Receipt image dimensions are invalid.");
  }

  const scale = Math.min(1, MAX_RENDERED_WIDTH / sourceWidth);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  if (height <= MAX_SEGMENT_HEIGHT) {
    return { width, height, scale, segments: [{ startY: 0, height }] };
  }

  const segments: ReceiptImageSegment[] = [];
  const stride = MAX_SEGMENT_HEIGHT - SEGMENT_OVERLAP;
  let startY = 0;

  while (startY < height) {
    const segmentHeight = Math.min(MAX_SEGMENT_HEIGHT, height - startY);
    segments.push({ startY, height: segmentHeight });
    if (startY + segmentHeight >= height) break;
    startY += stride;
  }

  return { width, height, scale, segments };
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          `Couldn't open ${file.name}. Try using a screenshot, JPG, or PNG instead.`,
        ),
      );
    };
    image.src = objectUrl;
  });

const renderSegment = (
  image: HTMLImageElement,
  plan: ReceiptImagePlan,
  segment: ReceiptImageSegment,
): string => {
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = segment.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image preparation is not available in this browser.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const sourceY = segment.startY / plan.scale;
  const sourceHeight = segment.height / plan.scale;
  context.drawImage(
    image,
    0,
    sourceY,
    image.naturalWidth,
    sourceHeight,
    0,
    0,
    plan.width,
    segment.height,
  );

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Couldn't prepare this receipt image.");
  return base64;
};

export const prepareReceiptImages = async (
  files: File[],
): Promise<PreparedReceiptImage[]> => {
  const prepared: PreparedReceiptImage[] = [];

  for (const [sourceIndex, file] of files.entries()) {
    const image = await loadImage(file);
    const plan = planReceiptImage(image.naturalWidth, image.naturalHeight);

    if (prepared.length + plan.segments.length > MAX_PREPARED_RECEIPT_IMAGES) {
      throw new Error(
        "These screenshots are too long to read together. Try fewer images or crop out non-receipt sections.",
      );
    }

    for (const [index, segment] of plan.segments.entries()) {
      const base64 = renderSegment(image, plan, segment);
      const payloadSize =
        prepared.reduce((total, preparedImage) => total + preparedImage.base64.length, 0) +
        base64.length;
      if (payloadSize > MAX_RECEIPT_PAYLOAD_CHARS) {
        throw new Error(
          "These images are too large to read together. Try fewer screenshots or crop out non-receipt sections.",
        );
      }

      prepared.push({
        base64,
        mime: "image/jpeg",
        sourceIndex,
        part: index + 1,
        totalParts: plan.segments.length,
      });
    }
  }

  return prepared;
};
