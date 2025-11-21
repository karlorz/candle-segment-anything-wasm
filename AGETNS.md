# Project Overview

This project is a web-based demonstration of the "Segment Anything Model (SAM)". It allows users to perform zero-shot image segmentation directly in their browser. The core logic is written in Rust and compiled to WebAssembly (WASM) using the Candle framework, enabling high-performance numerical operations on the client-side.

The application has a simple user interface where users can upload an image or select from predefined examples. By clicking on the image to place points, users can guide the model to generate a segmentation mask for the desired object. The model processing is handled in a separate web worker to ensure the UI remains responsive.

## Key Technologies

- **Frontend:** HTML, Tailwind CSS, Vanilla JavaScript
- **Core Logic:** Rust, compiled to WebAssembly (WASM)
- **Machine Learning Framework:** [Candle](https://github.com/huggingface/candle)
- **Model:** [Segment Anything Model (SAM)](https://segment-anything.com/)

# Building and Running

The project appears to be a static web application. The necessary WebAssembly binary (`m_bg.wasm`) and JavaScript bindings (`m.js`) are already present in the `build/` directory.

To run the project, you can serve the files using a simple local HTTP server. For example, using Python's built-in server:

```bash
python3 -m http.server
```

Or using `npx`:

```bash
npx serve
```

Then, open your web browser and navigate to the local server's address (e.g., `http://localhost:8000`).

# Deploying to GitHub Pages

The repository is ready to publish the static `index.html` via GitHub Pages:

1. Push the latest changes to the `main` branch (`git push origin main`).
2. In GitHub, open **Settings → Pages** and choose **Deploy from a branch** with **main** and the **/(root)** folder (already configured if you see the current screenshot).
3. Save the settings and wait for Pages to finish building (check the **Actions** tab for the `pages-build-deployment` workflow).
4. Once the deployment completes, your site will be available at `https://karlorz.github.io/candle-segment-anything-wasm/`.
5. Optional: add a `CNAME` file if you plan to use a custom domain.

# Development Conventions

The JavaScript code is written in a modular way, utilizing ES modules and a web worker (`samWorker.js`) to offload the heavy computation of the SAM model from the main UI thread. This prevents the browser from becoming unresponsive during model inference. The code is well-structured and includes clear functions for handling user interactions, image manipulation, and communication with the web worker.
