import React, { useRef, useState, useEffect } from "react";
import "./slackphoto.css";

export default function SlackPhotoApp() {
  const [image, setImage] = useState(null);
  const [anchor, setAnchor] = useState("top-left");
  const [dims, setDims] = useState({ width: 300, height: 300 });
  const [cropDims, setCropDims] = useState(null);
  const [highlightedArea, setHighlightedArea] = useState(null);
  const [showExtras, setShowExtras] = useState(false);
  const [mode, setMode] = useState("profile");
  const [permalinkCopied, setPermalinkCopied] = useState(false);
  const [mirrored, setMirrored] = useState(false); // New state for mirror option
  const [showDownloadModal, setShowDownloadModal] = useState(false); // New state for download modal
  const [downloadImageURL, setDownloadImageURL] = useState(null); // To store the download image URL
  const imgRef = useRef();
  const containerRef = useRef();

  // Parse URL parameters on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Set mode if specified in URL
    if (params.has("mode")) {
      const urlMode = params.get("mode");
      if (["profile", "zoom"].includes(urlMode)) {
        setMode(urlMode);
      }
    }
    // Set anchor position if specified in URL
    if (params.has("anchor")) {
      const urlAnchor = params.get("anchor");
      if (
        ["top-left", "top-right", "bottom-left", "bottom-right"].includes(
          urlAnchor
        )
      ) {
        setAnchor(urlAnchor);
      }
    }
    // Set mirrored state if specified in URL
    if (params.has("mirror")) {
      setMirrored(params.get("mirror") === "true");
    }
  }, []);

  // Update URL when settings change
  useEffect(() => {
    if (mode === "zoom") {
      const url = new URL(window.location);
      url.searchParams.set("mode", mode);
      url.searchParams.set("anchor", anchor);
      url.searchParams.set("mirror", mirrored.toString());
      window.history.replaceState({}, "", url);
    } else {
      // Clear parameters when not in zoom mode
      if (window.location.search) {
        const url = new URL(window.location);
        url.search = "";
        window.history.replaceState({}, "", url);
      }
    }
  }, [mode, anchor, mirrored]);

  const generateAvatarSVG = (seed) => {
    const randomColor = () =>
      `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`;
    const bgColor = randomColor();
    const bustColor = randomColor();
    const size = 100;
    const cellSize = size / 8;

    let pattern = "";
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (Math.random() > 0.5) {
          pattern += `\n            <rect x="${x * cellSize}" y="${
            y * cellSize
          }" width="${cellSize}" height="${cellSize}" fill="${randomColor()}" />\n          `;
        }
      }
    }

    const avatar = `\n      <rect x="${2.5 * cellSize}" y="${
      3 * cellSize
    }" width="${3 * cellSize}" height="${
      3 * cellSize
    }" fill="${bustColor}" />\n      <rect x="${3.25 * cellSize}" y="${
      6 * cellSize
    }" width="${1.5 * cellSize}" height="${
      0.75 * cellSize
    }" fill="${bustColor}" />\n      <rect x="${1 * cellSize}" y="${
      6.75 * cellSize
    }" width="${6 * cellSize}" height="${
      2.25 * cellSize
    }" fill="${bustColor}" />\n    `;

    return `\n      <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${size}\" height=\"${size}\" viewBox=\"0 0 ${size} ${size}\">\n        <rect width=\"${size}\" height=\"${size}\" fill=\"${bgColor}\" />\n        ${pattern}\n        ${avatar}\n      </svg>\n    `;
  };

  const generateDefaultAvatars = () => {
    return Array.from({ length: 6 }, () => {
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      return {
        seed,
        data: `data:image/svg+xml;base64,${btoa(generateAvatarSVG(seed))}`,
      };
    });
  };

  const defaultAvatarsRef = useRef(null);

  if (!defaultAvatarsRef.current) {
    const avatars = generateDefaultAvatars();
    defaultAvatarsRef.current = avatars;
  }

  useEffect(() => {
    // Set the default avatar as the initial image
    setImage(defaultAvatarsRef.current[0].data);
    setDims({ width: 300, height: 300 });
  }, []);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // Reset dimensions based on mode
    if (newMode === "profile") {
      if (image) {
        const img = new Image();
        img.onload = () => {
          const isSquare = img.width === img.height;
          const maxW = 300;
          const scale = Math.min(1, maxW / img.width);
          setDims({ width: img.width * scale, height: img.height * scale });
          setCropDims(
            isSquare ? { width: img.width, height: img.height } : null
          );
        };
        img.src = image;
      } else {
        setDims({ width: 300, height: 300 });
      }
    } else {
      // Zoom background (16:9 aspect ratio) - fixed size for preview
      setDims({ width: 400, height: 225 });
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        if (mode === "profile") {
          const isSquare = img.width === img.height;
          const maxW = 300;
          const scale = Math.min(1, maxW / img.width);
          setDims({ width: img.width * scale, height: img.height * scale });
          setImage(evt.target.result);
          setCropDims(
            isSquare ? { width: img.width, height: img.height } : null
          );
        } else {
          // Zoom background mode
          const maxW = 400;
          const scale = Math.min(1, maxW / img.width);
          setDims({ width: img.width * scale, height: img.height * scale });
          setImage(evt.target.result);
        }
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCrop = () => {
    if (!image) return;
    // use the rendered <img> element to get true pixel dimensions
    const imgEl = imgRef.current;
    if (!imgEl) {
      console.error("Image element is missing.");
      return;
    }
    const { naturalWidth: width, naturalHeight: height } = imgEl;
    const size = Math.min(width, height);
    const offsetX = (width - size) / 2;
    const offsetY = (height - size) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgEl, offsetX, offsetY, size, size, 0, 0, size, size);
    const croppedImage = canvas.toDataURL("image/png");
    setImage(croppedImage);
    setDims({ width: size, height: size });
    setCropDims({ width: size, height: size });
  };

  const downloadImage = () => {
    if (!imgRef.current) {
      console.error("Image element is missing.");
      return;
    }
    const canvas = document.createElement("canvas");
    if (mode === "profile") {
      // Profile photo (square)
      const targetSize = 1024;
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext("2d");
      const img = imgRef.current;
      const frame = new Image();
      frame.src = `/slackphoto/${anchor}.png`; // Adjusted for Astro public path
      frame.onload = () => {
        ctx.drawImage(img, 0, 0, targetSize, targetSize);
        ctx.drawImage(frame, 0, 0, targetSize, targetSize);
        const imageDataURL = canvas.toDataURL("image/png");
        const fileName = `framed-profile-${Math.random()
          .toString(36)
          .substr(2, 6)}.png`;
        try {
          const link = document.createElement("a");
          link.download = fileName;
          link.href = imageDataURL;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
          }, 100);
          if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            setDownloadImageURL(imageDataURL);
            setShowDownloadModal(true);
          }
        } catch (error) {
          console.error("Download failed, showing fallback modal", error);
          setDownloadImageURL(imageDataURL);
          setShowDownloadModal(true);
        }
      };
      frame.onerror = () => {
        console.error("Failed to load the frame image.");
      };
    } else {
      // Zoom background (16:9)
      const targetWidth = 1920;
      const targetHeight = 1080;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = image;
      const frame = new Image();
      frame.src = `/slackphoto/${anchor}.png`;
      img.onload = () => {
        frame.onload = () => {
          // compute how the source image should fill the canvas
          const imgAspect = img.width / img.height;
          const canvasAspect = targetWidth / targetHeight;
          let drawWidth, drawHeight, drawX, drawY;
          if (imgAspect > canvasAspect) {
            drawHeight = targetHeight;
            drawWidth = drawHeight * imgAspect;
            drawX = (targetWidth - drawWidth) / 2;
            drawY = 0;
          } else {
            drawWidth = targetWidth;
            drawHeight = drawWidth / imgAspect;
            drawX = 0;
            drawY = (targetHeight - drawHeight) / 2;
          }
          // offscreen canvas to composite background + frame
          const tmp = document.createElement("canvas");
          tmp.width = targetWidth;
          tmp.height = targetHeight;
          const tctx = tmp.getContext("2d");
          // draw background
          tctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
          // draw frame at same relative size as preview (45% of width)
          const frameSize = targetWidth * 0.45;
          const frameX = anchor.includes("left") ? 0 : targetWidth - frameSize;
          const frameY = anchor.includes("top") ? 0 : targetHeight - frameSize;
          tctx.drawImage(frame, frameX, frameY, frameSize, frameSize);
          // now draw the tmp onto real canvas, mirrored or not
          if (mirrored) {
            ctx.save();
            ctx.translate(targetWidth, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(tmp, 0, 0);
            ctx.restore();
          } else {
            ctx.drawImage(tmp, 0, 0);
          }
          const imageDataURL = canvas.toDataURL("image/png");
          const fileName = `zoom-background-${Math.random()
            .toString(36)
            .slice(2, 8)}.png`;
          try {
            const link = document.createElement("a");
            link.download = fileName;
            link.href = imageDataURL;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
            }, 100);
            if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
              setDownloadImageURL(imageDataURL);
              setShowDownloadModal(true);
            }
          } catch (error) {
            console.error("Download failed, showing fallback modal", error);
            setDownloadImageURL(imageDataURL);
            setShowDownloadModal(true);
          }
        };
        frame.onerror = () => {
          console.error("Failed to load the frame image.");
        };
      };
    }
  };

  const handleDefaultAvatarSelect = (avatar) => {
    setImage(avatar);
    setCropDims(null);
  };

  const handleFramePositionTap = (region) => {
    setAnchor(region);
    setHighlightedArea(region);
    setTimeout(() => setHighlightedArea(null), 300);
  };

  const copyPermalink = () => {
    const url = new URL(window.location);
    url.searchParams.set("mode", "zoom");
    url.searchParams.set("anchor", anchor);
    url.searchParams.set("mirror", mirrored.toString());
    navigator.clipboard
      .writeText(url.toString())
      .then(() => {
        setPermalinkCopied(true);
        setTimeout(() => setPermalinkCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy permalink: ", err);
      });
  };

  const renderPreviewWithRegions = () => {
    const containerStyle =
      mode === "profile"
        ? {
            width: dims.width,
            height: dims.height,
            borderRadius: "clamp(6px, min(22.222%, 12px), 12px)",
          }
        : {
            width: "400px",
            height: "225px",
            borderRadius: "4px",
          };
    return (
      <div
        className="relative mx-auto overflow-hidden"
        style={{
          ...containerStyle,
          transform: mirrored && mode === "zoom" ? "scaleX(-1)" : "none",
        }}
      >
        <img
          ref={imgRef}
          src={image}
          alt="Preview"
          className="size-full object-cover"
        />
        {mode === "profile" ? (
          <img
            src={`/slackphoto/${anchor}.png`}
            alt="Frame"
            className="absolute top-0 left-0 frame size-full"
          />
        ) : (
          <div
            className={`absolute ${
              anchor.includes("top") ? "top-0" : "bottom-0"
            } ${anchor.includes("left") ? "left-0" : "right-0"}`}
            style={{
              width: "45%",
              height: "auto",
              aspectRatio: "1/1",
            }}
          >
            <img
              src={`/slackphoto/${anchor}.png`}
              alt="Frame"
              className="size-full"
            />
          </div>
        )}
        {["top-left", "top-right", "bottom-left", "bottom-right"].map(
          (region) => (
            <div
              key={region}
              onClick={() => handleFramePositionTap(region)}
              className={`absolute cursor-pointer w-1/2 h-1/2 transition-colors duration-300 ${
                highlightedArea === region ? "bg-blue-500/50" : "bg-transparent"
              } ${region.includes("top") ? "top-0" : "bottom-0"} ${
                region.includes("left") ? "left-0" : "right-0"
              }`}
            />
          )
        )}
      </div>
    );
  };

  const DownloadModal = ({ imageURL, onClose }) => {
    if (!imageURL) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg max-w-lg w-full p-6 relative">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
            onClick={onClose}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <h3 className="text-xl font-bold mb-4 font-mono">Save Your Image</h3>
          <p className="mb-4 font-mono text-sm">
            We couldn't automatically download your image. Please follow these
            steps:
          </p>
          <ol className="list-decimal list-inside mb-4 font-mono text-sm space-y-2">
            <li>Press and hold on the image below</li>
            <li>Select "Save Image" or "Download Image" from the menu</li>
          </ol>
          <div className="border border-gray-700 rounded overflow-hidden mb-4">
            <img
              src={imageURL}
              alt="Your generated image"
              className="w-full h-auto"
            />
          </div>
          <button
            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-mono"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center subpixel-antialiased">
      <h1 className="my-6 font-bold text-2xl font-mono">Add some flair!</h1>
      <div className="mb-6 flex gap-4">
        <button
          className={`cursor-pointer  px-4 py-2 rounded-lg font-mono ${
            mode === "profile" ? "bg-blue-600" : "bg-gray-700"
          }`}
          onClick={() => handleModeChange("profile")}
        >
          Profile Photo
        </button>
        <button
          className={`cursor-pointer px-4 py-2 rounded-lg font-mono ${
            mode === "zoom" ? "bg-blue-600" : "bg-gray-700"
          }`}
          onClick={() => handleModeChange("zoom")}
        >
          Zoom Background
        </button>
      </div>
      <div className="container mx-auto flex flex-col items-center gap-8">
        <div>
          <label className="block font-mono mb-4">
            1. Upload your{" "}
            {mode === "profile" ? "profile photo" : "background image"} <br />
            {mode === "profile" && "or choose a random generated one! :)"}
          </label>
          <button
            className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded font-mono"
            onClick={() => document.getElementById("uploader").click()}
          >
            Choose File
          </button>
          <input
            id="uploader"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
        {showExtras && mode === "profile" && (
          <div>
            <label className="block font-mono mb-4">
              Or choose a default avatar
            </label>
            <div className="grid grid-cols-3 gap-3">
              {defaultAvatarsRef.current.map((avatar) => (
                <img
                  key={avatar.seed}
                  src={avatar.data}
                  alt="Default Avatar"
                  className="w-20 h-20 rounded cursor-pointer border-2 border-transparent hover:border-blue-500"
                  onClick={() => handleDefaultAvatarSelect(avatar.data)}
                />
              ))}
            </div>
          </div>
        )}
        {image && mode === "zoom" && (
          <div>
            <label className="inline-flex items-center gap-2 cursor-pointer font-mono">
              <input
                type="checkbox"
                checked={mirrored}
                onChange={() => setMirrored(!mirrored)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-700 peer-checked:bg-blue-500 rounded-full transition-colors">
                <span
                  className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out"
                  style={{
                    transform: mirrored ? "translateX(20px)" : "translateX(0)",
                  }}
                ></span>
              </div>
              <span className="font-mono">
                Mirror background image {mirrored ? "(On)" : "(Off)"}
              </span>
            </label>
          </div>
        )}
        {image && (
          <div>
            <label className="block font-mono mb-4">
              2. Tap a corner to place your flair.
            </label>
            <div className="border border-gray-700 rounded overflow-hidden mb-4 contents">
              {renderPreviewWithRegions()}
            </div>
            {mode === "profile" && !cropDims && dims.width !== dims.height && (
              <button
                className="cursor-pointer  w-full bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded font-mono mt-4"
                onClick={handleCrop}
              >
                Crop to Square
              </button>
            )}
          </div>
        )}
        {image && (
          <div>
            <label className="block font-mono mb-4">
              3. Download your{" "}
              {mode === "profile" ? "new profile photo" : "zoom background"}
            </label>
            <div className="flex gap-2 w-full">
              <button
                className="cursor-pointer grow bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-mono"
                onClick={downloadImage}
              >
                Download
              </button>
            </div>
          </div>
        )}
      </div>
      {showDownloadModal && (
        <DownloadModal
          imageURL={downloadImageURL}
          onClose={() => setShowDownloadModal(false)}
        />
      )}
    </div>
  );
}
