"use strict";

(function initPublishedViewer() {
  const dom = {
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    pageIndicator: document.getElementById("pageIndicator"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomResetBtn: document.getElementById("zoomResetBtn"),
    fullscreenBtn: document.getElementById("fullscreenBtn"),
    bookViewport: document.getElementById("bookViewport"),
    closedCoverBtn: document.getElementById("closedCoverBtn"),
    closedCoverPage: document.getElementById("closedCoverPage"),
    flipbookRoot: document.getElementById("flipbookRoot"),
    loadingOverlay: document.getElementById("loadingOverlay"),
    loadingMessage: document.getElementById("loadingMessage"),
    progressBar: document.getElementById("progressBar"),
    pageTemplate: document.getElementById("bookPageTemplate"),
  };

  const state = {
    pageFlip: null,
    renderedPages: [],
    totalPages: 0,
    pagesPerSpread: 2,
    zoom: 1,
    minZoom: 0.8,
    maxZoom: 1.6,
    rendering: false,
    resizeTimer: null,
    bookClosed: false,
  };

  if (!window.pdfjsLib || !window.St || !window.St.PageFlip) {
    showError("Viewer libraries failed to load.");
    return;
  }

  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";

  wireEvents();
  updateZoomUI();
  updateNavigationUI();
  loadPublishedPdf();

  function wireEvents() {
    dom.prevBtn.addEventListener("click", () => {
      if (!state.bookClosed) {
        state.pageFlip?.flipPrev();
      }
    });
    dom.nextBtn.addEventListener("click", () => {
      if (state.bookClosed) {
        openClosedBook();
      } else {
        state.pageFlip?.flipNext();
      }
    });
    dom.closedCoverBtn.addEventListener("click", openClosedBook);
    dom.zoomOutBtn.addEventListener("click", () => setZoom(state.zoom - 0.1));
    dom.zoomInBtn.addEventListener("click", () => setZoom(state.zoom + 0.1));
    dom.zoomResetBtn.addEventListener("click", () => setZoom(1));
    dom.fullscreenBtn.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("resize", scheduleRebuild);

    document.addEventListener("keydown", (event) => {
      if (!state.pageFlip && !state.bookClosed) {
        return;
      }
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        if (state.bookClosed) {
          openClosedBook();
        } else {
          state.pageFlip.flipNext();
        }
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        if (!state.bookClosed) {
          state.pageFlip.flipPrev();
        }
      } else if (event.key === "Home") {
        event.preventDefault();
        if (!state.bookClosed) {
          state.pageFlip.turnToPage(0);
        }
      } else if (event.key === "End") {
        event.preventDefault();
        if (!state.bookClosed) {
          state.pageFlip.turnToPage(state.pageFlip.getPageCount() - 1);
        }
      }
    });
  }

  async function loadPublishedPdf() {
    state.rendering = true;
    showLoading("Loading PDF...", 8);
    try {
      const response = await fetch("book.pdf");
      if (!response.ok) {
        throw new Error(`book.pdf not found (${response.status})`);
      }
      const bytes = await response.arrayBuffer();
      const pdfDoc = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      state.totalPages = pdfDoc.numPages;
      if (state.totalPages < 1) {
        throw new Error("PDF has no pages.");
      }
      showLoading("Rendering pages 0%", 12);
      state.renderedPages = await renderPdfPages(pdfDoc);
      state.pagesPerSpread = detectPagesPerSpread(state.renderedPages[0]);
      await nextFrame();
      showClosedCover(state.renderedPages[0]);
      setZoom(1);
      updateNavigationUI();
    } catch (error) {
      console.error(error);
      showError("Could not load book.pdf for this eBook.");
    } finally {
      hideLoading();
      state.rendering = false;
    }
  }

  async function renderPdfPages(pdfDoc) {
    const pages = [];
    const renderScale = 1.8;
    const pixelRatio = window.devicePixelRatio || 1;

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum += 1) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: renderScale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = "100%";
      canvas.style.height = "100%";

      await page.render({
        canvasContext: context,
        viewport,
        transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : null,
      }).promise;

      pages.push({
        pageNum,
        canvas,
        width: viewport.width,
        height: viewport.height,
      });

      const percent = Math.round((pageNum / pdfDoc.numPages) * 100);
      showLoading(`Rendering pages ${percent}%`, Math.max(percent, 12));
    }

    if (pages.length % 2 !== 0) {
      const fallback = pages[0];
      const blank = document.createElement("canvas");
      blank.width = fallback.canvas.width;
      blank.height = fallback.canvas.height;
      blank.style.width = "100%";
      blank.style.height = "100%";
      const ctx = blank.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, blank.width, blank.height);
      pages.push({
        pageNum: pages.length + 1,
        canvas: blank,
        width: fallback.width,
        height: fallback.height,
        isPadPage: true,
      });
    }

    return pages;
  }

  function buildFlipbook(pageIndex = 0) {
    if (!state.renderedPages.length) {
      return;
    }
    if (state.pageFlip) {
      state.pageFlip.destroy();
      state.pageFlip = null;
    }

    state.bookClosed = false;
    dom.closedCoverBtn.classList.add("hidden");
    dom.flipbookRoot.classList.remove("hidden");
    dom.flipbookRoot.replaceChildren();

    state.renderedPages.forEach((pageInfo) => {
      const pageNode = dom.pageTemplate.content.firstElementChild.cloneNode(true);
      const canvasWrap = pageNode.querySelector(".page-canvas-wrap");
      const pageNo = pageNode.querySelector(".page-no");
      pageNo.textContent = pageInfo.isPadPage ? "" : `Page ${pageInfo.pageNum}`;
      canvasWrap.appendChild(pageInfo.canvas);
      dom.flipbookRoot.appendChild(pageNode);
    });

    const pagesPerSpread = state.pagesPerSpread;
    const layout = computeBookLayout(state.renderedPages[0], pagesPerSpread);
    dom.flipbookRoot.style.width = `${layout.pageWidth * pagesPerSpread}px`;
    dom.flipbookRoot.style.height = `${layout.pageHeight}px`;
    state.pageFlip = new window.St.PageFlip(dom.flipbookRoot, {
      width: layout.pageWidth,
      height: layout.pageHeight,
      size: "fixed",
      maxShadowOpacity: 0.42,
      showCover: false,
      drawShadow: true,
      flippingTime: 900,
      mobileScrollSupport: false,
      startPage: 0,
      usePortrait: pagesPerSpread === 1,
    });

    state.pageFlip.loadFromHTML(dom.flipbookRoot.querySelectorAll(".book-page"));
    state.pageFlip.turnToPage(clamp(pageIndex, 0, state.pageFlip.getPageCount() - 1));
    state.pageFlip.on("flip", updateNavigationUI);
    state.pageFlip.on("changeOrientation", updateNavigationUI);
    state.pageFlip.on("init", updateNavigationUI);
    updateNavigationUI();
  }

  function showClosedCover(firstPage) {
    if (!firstPage) {
      return;
    }
    state.bookClosed = true;
    if (state.pageFlip) {
      state.pageFlip.destroy();
      state.pageFlip = null;
    }
    dom.flipbookRoot.classList.add("hidden");
    dom.closedCoverPage.replaceChildren();
    dom.closedCoverBtn.classList.remove("hidden");

    const coverLayout = computeBookLayout(firstPage, 1);
    dom.closedCoverBtn.style.width = `${coverLayout.pageWidth}px`;
    dom.closedCoverBtn.style.height = `${coverLayout.pageHeight}px`;

    const coverCanvas = cloneCanvas(firstPage.canvas);
    coverCanvas.style.width = "100%";
    coverCanvas.style.height = "100%";
    dom.closedCoverPage.appendChild(coverCanvas);
    updateNavigationUI();
  }

  function openClosedBook() {
    if (!state.bookClosed || !state.renderedPages.length) {
      return;
    }
    buildFlipbook(0);
  }

  function updateNavigationUI() {
    if (state.bookClosed) {
      dom.pageIndicator.textContent = `Cover / ${state.totalPages}`;
      dom.prevBtn.disabled = true;
      dom.nextBtn.disabled = false;
      return;
    }
    if (!state.pageFlip) {
      dom.pageIndicator.textContent = "Page 0 / 0";
      dom.prevBtn.disabled = true;
      dom.nextBtn.disabled = true;
      return;
    }

    if (state.pagesPerSpread === 1) {
      const index = state.pageFlip.getCurrentPageIndex();
      const currentPage = clamp(index + 1, 1, Math.max(1, state.totalPages));
      dom.pageIndicator.textContent = `Page ${currentPage} / ${state.totalPages}`;
      dom.prevBtn.disabled = index <= 0;
      dom.nextBtn.disabled = index >= state.pageFlip.getPageCount() - 1;
      return;
    }

    const index = state.pageFlip.getCurrentPageIndex();
    const leftPage = Math.max(1, Math.min(state.totalPages, index + 1));
    const rightPage = Math.max(leftPage, Math.min(state.totalPages, leftPage + 1));
    dom.pageIndicator.textContent =
      leftPage === rightPage
        ? `Page ${leftPage} / ${state.totalPages}`
        : `Pages ${leftPage}-${rightPage} / ${state.totalPages}`;
    dom.prevBtn.disabled = index <= 0;
    dom.nextBtn.disabled = index >= state.pageFlip.getPageCount() - 1;
  }

  function setZoom(nextZoom) {
    state.zoom = clamp(nextZoom, state.minZoom, state.maxZoom);
    dom.bookViewport.style.setProperty("--zoom", state.zoom.toFixed(2));
    updateZoomUI();
  }

  function updateZoomUI() {
    const percent = Math.round(state.zoom * 100);
    dom.zoomResetBtn.textContent = `${percent}%`;
    dom.zoomOutBtn.disabled = state.zoom <= state.minZoom;
    dom.zoomInBtn.disabled = state.zoom >= state.maxZoom;
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error(error);
    }
  }

  function onFullscreenChange() {
    dom.fullscreenBtn.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
    scheduleRebuild();
  }

  function scheduleRebuild() {
    if (!state.renderedPages.length || state.rendering) {
      return;
    }
    if (state.resizeTimer) {
      clearTimeout(state.resizeTimer);
    }
    state.resizeTimer = setTimeout(() => {
      if (state.bookClosed) {
        showClosedCover(state.renderedPages[0]);
      } else {
        const currentIndex = state.pageFlip ? state.pageFlip.getCurrentPageIndex() : 0;
        buildFlipbook(currentIndex);
      }
    }, 140);
  }

  function computeBookLayout(samplePage, pagesPerSpread = 2) {
    const ratio = samplePage.height / samplePage.width;
    const viewportWidth = dom.bookViewport.clientWidth || Math.floor(window.innerWidth * 0.92);
    const viewportHeight = dom.bookViewport.clientHeight || Math.floor(window.innerHeight * 0.72);
    const availableWidth = Math.max(220, viewportWidth - 36);
    const availableHeight = Math.max(280, viewportHeight - 28);
    const widthLimit = availableWidth / Math.max(1, pagesPerSpread);
    const pageWidth = clamp(Math.floor(Math.min(widthLimit, availableHeight / ratio)), 140, 1200);
    const pageHeight = Math.floor(pageWidth * ratio);
    return { pageWidth, pageHeight };
  }

  function detectPagesPerSpread(samplePage) {
    if (!samplePage || !Number.isFinite(samplePage.width) || !Number.isFinite(samplePage.height)) {
      return 2;
    }
    return samplePage.width > samplePage.height ? 1 : 2;
  }

  function showLoading(message, progress) {
    dom.loadingMessage.textContent = message;
    dom.progressBar.style.width = `${clamp(progress, 4, 100)}%`;
    dom.loadingOverlay.classList.remove("hidden");
  }

  function hideLoading() {
    dom.loadingOverlay.classList.add("hidden");
  }

  function showError(message) {
    window.alert(message);
  }

  function nextFrame() {
    return new Promise((resolve) => window.requestAnimationFrame(resolve));
  }

  function cloneCanvas(sourceCanvas) {
    const clone = document.createElement("canvas");
    clone.width = sourceCanvas.width;
    clone.height = sourceCanvas.height;
    const ctx = clone.getContext("2d");
    if (ctx) {
      ctx.drawImage(sourceCanvas, 0, 0);
    }
    return clone;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
