const MODEL_BASEURL = "https://huggingface.co/lmz/candle-sam/resolve/main/";

const MODELS = {
  sam_mobile_tiny: {
    url: "mobile_sam-tiny-vitt.safetensors",
  },
  sam_base: {
    url: "sam_vit_b_01ec64.safetensors",
  },
};

const samWorker = new Worker("./samWorker.js", { type: "module" });

const clearBtn = document.querySelector("#clear-btn");
const maskBtn = document.querySelector("#mask-btn");
const undoBtn = document.querySelector("#undo-btn");
const downloadBtn = document.querySelector("#download-btn");
const canvas = document.querySelector("#canvas");
const mask = document.querySelector("#mask");
const ctxCanvas = canvas.getContext("2d");
const ctxMask = mask.getContext("2d");
const fileUpload = document.querySelector("#file-upload");
const dropArea = document.querySelector("#drop-area");
const dropButtons = document.querySelector("#drop-buttons");
const imagesExamples = document.querySelector("#image-select");
const modelSelection = document.querySelector("#model");
const statusOutput = document.querySelector("#output-status");

let copyMaskURL = null;
let copyImageURL = null;
let hasImage = false;
let isSegmenting = false;
let isEmbedding = false;
let currentImageURL = "";
let pointArr = [];
let bgPointMode = false;

function updateStatus(statusMessage) {
  if (!statusMessage) {
    statusOutput.innerText = "";
    return;
  }
  statusOutput.innerText = statusMessage.message ?? "";
}

async function segmentPoints(modelURL, modelID, imageURL, points) {
  return new Promise((resolve, reject) => {
    const messageHandler = (event) => {
      if ("status" in event.data) {
        updateStatus(event.data);
      }
      if ("error" in event.data) {
        samWorker.removeEventListener("message", messageHandler);
        reject(new Error(event.data.error));
      }
      if (event.data.status === "complete-embedding") {
        samWorker.removeEventListener("message", messageHandler);
        resolve();
      }
      if (event.data.status === "complete") {
        samWorker.removeEventListener("message", messageHandler);
        resolve(event.data.output);
      }
    };

    samWorker.addEventListener("message", messageHandler);
    samWorker.postMessage({
      modelURL,
      modelID,
      imageURL,
      points,
    });
  });
}

function togglePointMode(mode) {
  bgPointMode = mode === undefined ? !bgPointMode : mode;

  maskBtn.querySelector("span").innerText = bgPointMode
    ? "Background Point"
    : "Mask Point";
  if (bgPointMode) {
    maskBtn.querySelector("#mask-circle").setAttribute("hidden", "");
    maskBtn.querySelector("#unmask-circle").removeAttribute("hidden");
  } else {
    maskBtn.querySelector("#mask-circle").removeAttribute("hidden");
    maskBtn.querySelector("#unmask-circle").setAttribute("hidden", "");
  }
}

async function getSegmentationMask(points) {
  const modelID = modelSelection.value;
  const modelURL = MODEL_BASEURL + MODELS[modelID].url;
  const imageURL = currentImageURL;
  return segmentPoints(modelURL, modelID, imageURL, points);
}

async function setImageEmbeddings(imageURL) {
  if (isEmbedding) {
    return;
  }
  canvas.classList.remove("cursor-pointer");
  canvas.classList.add("cursor-wait");
  clearBtn.disabled = true;
  const modelID = modelSelection.value;
  const modelURL = MODEL_BASEURL + MODELS[modelID].url;
  isEmbedding = true;
  await segmentPoints(modelURL, modelID, imageURL);
  canvas.classList.remove("cursor-wait");
  canvas.classList.add("cursor-pointer");
  clearBtn.disabled = false;
  isEmbedding = false;
  currentImageURL = imageURL;
}

function clearImageCanvas() {
  ctxCanvas.clearRect(0, 0, canvas.width, canvas.height);
  ctxMask.clearRect(0, 0, canvas.width, canvas.height);
  hasImage = false;
  isEmbedding = false;
  isSegmenting = false;
  currentImageURL = "";
  pointArr = [];
  copyMaskURL = null;
  copyImageURL = null;
  clearBtn.disabled = true;
  undoBtn.disabled = true;
  downloadBtn.disabled = true;
  canvas.parentElement.style.height = "auto";
  dropButtons.classList.remove("invisible");
}

function drawMask(maskURL, points) {
  if (!maskURL) {
    throw new Error("No mask URL provided");
  }

  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    mask.width = canvas.width;
    mask.height = canvas.height;
    ctxMask.save();
    ctxMask.drawImage(canvas, 0, 0);
    ctxMask.globalCompositeOperation = "source-atop";
    ctxMask.fillStyle = "rgba(255, 0, 0, 0.6)";
    ctxMask.fillRect(0, 0, canvas.width, canvas.height);
    ctxMask.globalCompositeOperation = "destination-in";
    ctxMask.drawImage(img, 0, 0);
    ctxMask.globalCompositeOperation = "source-over";
    for (const pt of points) {
      ctxMask.fillStyle = pt[2]
        ? "rgba(0, 255, 255, 1)"
        : "rgba(255, 255, 0, 1)";
      ctxMask.beginPath();
      ctxMask.arc(pt[0] * canvas.width, pt[1] * canvas.height, 3, 0, 2 * Math.PI);
      ctxMask.fill();
    }
    ctxMask.restore();
  };
  img.src = maskURL;
}

function drawImageCanvas(imgURL) {
  if (!imgURL) {
    throw new Error("No image URL provided");
  }

  ctxCanvas.clearRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctxCanvas.drawImage(img, 0, 0);
    canvas.parentElement.style.height = `${canvas.offsetHeight}px`;
    hasImage = true;
    clearBtn.disabled = false;
    dropButtons.classList.add("invisible");
  };
  img.src = imgURL;
}

async function undoPoint() {
  if (!hasImage || isEmbedding || isSegmenting) {
    return;
  }
  if (pointArr.length === 0) {
    return;
  }
  pointArr.pop();
  if (pointArr.length === 0) {
    ctxMask.clearRect(0, 0, canvas.width, canvas.height);
    undoBtn.disabled = true;
    downloadBtn.disabled = true;
    return;
  }
  isSegmenting = true;
  try {
    const { maskURL } = await getSegmentationMask(pointArr);
    copyMaskURL = maskURL;
    drawMask(maskURL, pointArr);
  } finally {
    isSegmenting = false;
  }
}

function handleCanvasClick(event) {
  if (!hasImage || isEmbedding || isSegmenting) {
    return;
  }
  const backgroundMode = event.shiftKey ? !bgPointMode : bgPointMode;
  const targetBox = event.target.getBoundingClientRect();
  const x = (event.clientX - targetBox.left) / targetBox.width;
  const y = (event.clientY - targetBox.top) / targetBox.height;
  const ptsToRemove = [];
  for (const [idx, pts] of pointArr.entries()) {
    const d = Math.sqrt((pts[0] - x) ** 2 + (pts[1] - y) ** 2);
    if (d < 6 / targetBox.width) {
      ptsToRemove.push(idx);
    }
  }
  if (ptsToRemove.length > 0) {
    pointArr = pointArr.filter((_, idx) => !ptsToRemove.includes(idx));
  } else {
    pointArr = [...pointArr, [x, y, !backgroundMode]];
  }
  undoBtn.disabled = pointArr.length === 0;
  downloadBtn.disabled = pointArr.length === 0;
  if (pointArr.length === 0) {
    ctxMask.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  isSegmenting = true;
  getSegmentationMask(pointArr)
    .then(({ maskURL }) => {
      copyMaskURL = maskURL;
      drawMask(maskURL, pointArr);
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      isSegmenting = false;
    });
}

function registerEventListeners() {
  fileUpload.addEventListener("input", (e) => {
    const target = e.target;
    if (target.files.length > 0) {
      const href = URL.createObjectURL(target.files[0]);
      clearImageCanvas();
      copyImageURL = href;
      drawImageCanvas(href);
      setImageEmbeddings(href);
      togglePointMode(false);
    }
  });

  dropArea.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dropArea.classList.add("border-blue-700");
  });
  dropArea.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropArea.classList.remove("border-blue-700");
  });
  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("border-blue-700");
    const url = e.dataTransfer.getData("text/uri-list");
    const files = e.dataTransfer.files;

    if (files.length > 0) {
      const href = URL.createObjectURL(files[0]);
      clearImageCanvas();
      copyImageURL = href;
      drawImageCanvas(href);
      setImageEmbeddings(href);
      togglePointMode(false);
    } else if (url) {
      clearImageCanvas();
      copyImageURL = url;
      drawImageCanvas(url);
      setImageEmbeddings(url);
      togglePointMode(false);
    }
  });

  imagesExamples.addEventListener("click", (e) => {
    if (isEmbedding || isSegmenting) {
      return;
    }
    const target = e.target;
    if (target.nodeName === "IMG") {
      const href = target.src;
      clearImageCanvas();
      drawImageCanvas(href);
      setImageEmbeddings(href);
      copyImageURL = href;
    }
  });

  maskBtn.addEventListener("click", () => {
    togglePointMode();
  });

  clearBtn.addEventListener("click", () => {
    clearImageCanvas();
    togglePointMode(false);
    pointArr = [];
  });

  undoBtn.addEventListener("click", () => {
    void undoPoint();
  });

  downloadBtn.addEventListener("click", async () => {
    const loadImageAsync = (imageURL) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.crossOrigin = "anonymous";
        img.src = imageURL;
      });

    const [originalImage, maskImage] = await Promise.all([
      loadImageAsync(copyImageURL),
      loadImageAsync(copyMaskURL),
    ]);

    const resultCanvas = document.createElement("canvas");
    const ctx = resultCanvas.getContext("2d");
    resultCanvas.width = originalImage.width;
    resultCanvas.height = originalImage.height;

    ctx.drawImage(maskImage, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(originalImage, 0, 0);

    const blob = await new Promise((resolve) => {
      resultCanvas.toBlob(resolve);
    });
    const resultURL = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = resultURL;
    link.download = "cutout.png";
    link.click();
  });

  canvas.addEventListener("click", handleCanvasClick);

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === canvas) {
        canvas.parentElement.style.height = `${canvas.offsetHeight}px`;
      }
    }
  });
  observer.observe(canvas);
}

clearImageCanvas();
registerEventListeners();
