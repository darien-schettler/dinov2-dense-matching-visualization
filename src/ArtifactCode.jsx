import React, { useState, useRef, useEffect } from 'react';
import { Upload } from 'lucide-react';

const ImageRGBAnalyzer = () => {
  const [rgb, setRgb] = useState({ r: 0, g: 0, b: 0 });
  const [activeCanvas, setActiveCanvas] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [images, setImages] = useState([null, null, null, null]);
  const [range, setRange] = useState(3);
  const [opacity, setOpacity] = useState(0.5);
  const canvasRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const originalImageData = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const resizeImage = (img) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const MAX_SIZE = 300;
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > MAX_SIZE) {
        height *= MAX_SIZE / width;
        width = MAX_SIZE;
      }
    } else {
      if (height > MAX_SIZE) {
        width *= MAX_SIZE / height;
        height = MAX_SIZE;
      }
    }

    canvas.width = MAX_SIZE;
    canvas.height = MAX_SIZE;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, MAX_SIZE, MAX_SIZE);

    const x = (MAX_SIZE - width) / 2;
    const y = (MAX_SIZE - height) / 2;

    ctx.drawImage(img, x, y, width, height);
    
    return canvas;
  };

  useEffect(() => {
    images.forEach((image, index) => {
      if (image) {
        const canvas = canvasRefs[index].current;
        const ctx = canvas.getContext('2d');
        const resizedCanvas = resizeImage(image);
        canvas.width = resizedCanvas.width;
        canvas.height = resizedCanvas.height;
        ctx.drawImage(resizedCanvas, 0, 0);
        originalImageData[index].current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    });
  }, [images]);

  const handleImageUpload = (index) => (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImages(prevImages => {
            const newImages = [...prevImages];
            newImages[index] = img;
            return newImages;
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const isColorInRange = (color1, color2, range) => {
    return Math.abs(color1.r - color2.r) <= range &&
           Math.abs(color1.g - color2.g) <= range &&
           Math.abs(color1.b - color2.b) <= range;
  };

  const handleMouseMove = (canvasIndex) => (e) => {
    if (!images[canvasIndex]) return;
    const canvas = canvasRefs[canvasIndex].current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);
    const ctx = canvas.getContext('2d');

    // Reset all images to original state
    canvasRefs.forEach((canvasRef, index) => {
      if (images[index]) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.putImageData(originalImageData[index].current, 0, 0);
      }
    });

    // Get RGB of current pixel
    const imageData = ctx.getImageData(x, y, 1, 1);
    const data = imageData.data;
    const currentRGB = { r: data[0], g: data[1], b: data[2] };
    setRgb(currentRGB);
    setPosition({ x, y });
    setActiveCanvas(canvasIndex);

    // Highlight matching pixels in all images
    canvasRefs.forEach((canvasRef, index) => {
      if (images[index]) {
        const ctx = canvasRef.current.getContext('2d');
        const fullImageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        for (let i = 0; i < fullImageData.data.length; i += 4) {
          const pixelRGB = {
            r: fullImageData.data[i],
            g: fullImageData.data[i + 1],
            b: fullImageData.data[i + 2]
          };
          if (isColorInRange(currentRGB, pixelRGB, range)) {
            fullImageData.data[i] = Math.round(fullImageData.data[i] * (1 - opacity) + 255 * opacity);
            fullImageData.data[i + 1] = Math.round(fullImageData.data[i + 1] * (1 - opacity) + 255 * opacity);
            fullImageData.data[i + 2] = Math.round(fullImageData.data[i + 2] * (1 - opacity) + 255 * opacity);
          }
        }
        ctx.putImageData(fullImageData, 0, 0);
      }
    });
  };

  const handleMouseLeave = () => {
    canvasRefs.forEach((canvasRef, index) => {
      if (images[index]) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.putImageData(originalImageData[index].current, 0, 0);
      }
    });
    setActiveCanvas(null);
  };

  const handleRangeChange = (e) => {
    setRange(Number(e.target.value));
  };

  const handleOpacityChange = (e) => {
    setOpacity(Number(e.target.value));
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Quad Image RGB Analyzer</h2>
      <div className="mb-4 flex flex-wrap gap-4">
        {[0, 1, 2, 3].map(index => (
          <div key={index}>
            <label htmlFor={`image-upload-${index}`} className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              <Upload className="mr-2" size={20} />
              Upload Image {index + 1}
            </label>
            <input
              id={`image-upload-${index}`}
              type="file"
              accept="image/*"
              onChange={handleImageUpload(index)}
              className="hidden"
            />
          </div>
        ))}
      </div>
      <div className="mb-4">
        <label htmlFor="range-input" className="block mb-2">
          Color Match Range: {range}
        </label>
        <input
          id="range-input"
          type="range"
          min="0"
          max="255"
          value={range}
          onChange={handleRangeChange}
          className="w-full"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="opacity-input" className="block mb-2">
          Highlight Opacity: {opacity.toFixed(2)}
        </label>
        <input
          id="opacity-input"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={opacity}
          onChange={handleOpacityChange}
          className="w-full"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="relative inline-block">
            <canvas
              ref={canvasRefs[index]}
              onMouseMove={handleMouseMove(index)}
              onMouseLeave={handleMouseLeave}
              className="border border-gray-300"
              width="300"
              height="300"
            />
            {images[index] && activeCanvas === index && (
              <div
                className="absolute bg-white border border-gray-300 p-2 rounded shadow-md"
                style={{ left: position.x + 10, top: position.y + 10 }}
              >
                RGB: ({rgb.r}, {rgb.g}, {rgb.b})
              </div>
            )}
          </div>
        ))}
      </div>
      {images.some(img => !img) && (
        <p className="mt-4">
          Please upload all four images to begin analysis. Images will be resized to fit within 300x300 squares.
        </p>
      )}
      {images.every(img => img) && (
        <p className="mt-4">
          Hover over any image to see RGB values. Pixels with similar RGB values (within the specified range) will be highlighted with adjustable opacity in all images.
        </p>
      )}
    </div>
  );
};

export default ImageRGBAnalyzer;
