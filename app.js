(function () {
  const messages = window.FAREWELL_MESSAGES || [];
  const photoCaptions = window.FAREWELL_PHOTO_CAPTIONS || {};

  const messageList = document.getElementById("messageList");
  const messageDeck = document.getElementById("messageDeck");
  const messageEmpty = document.getElementById("messageEmpty");
  const deckViewport = document.getElementById("deckViewport");
  const deckCounter = document.getElementById("deckCounter");
  const deckProgress = document.getElementById("deckProgress");
  const deckHint = document.getElementById("deckHint");
  const deckPrev = document.getElementById("deckPrev");
  const deckNext = document.getElementById("deckNext");
  const photoRail = document.getElementById("photoRail");
  const audio = document.getElementById("bgMusic");
  const audioToggle = document.getElementById("audioToggle");
  const jessicaPhoto = document.getElementById("jessicaPhoto");
  const lightbox = document.getElementById("lightbox");
  const lightboxTrack = document.getElementById("lightboxTrack");
  const lightboxViewport = document.getElementById("lightboxViewport");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxCounter = document.getElementById("lightboxCounter");
  const lightboxCaption = document.getElementById("lightboxCaption");

  let currentIndex = 0;
  let galleryPhotos = [];
  let lightboxIndex = 0;
  let lightboxWidth = 0;

  function initials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function imageExists(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  /**
   * Loads images/group-1.jpg, group-2.jpg, ... with no fixed limit.
   * Also accepts .jpeg / .png / .webp. Stops after a few missing numbers in a row.
   */
  async function discoverGroupPhotos() {
    const found = [];
    const extensions = ["jpg", "jpeg", "png", "webp"];
    let misses = 0;
    const stopAfterMisses = 3;
    const safetyCap = 200;

    for (let n = 1; n <= safetyCap && misses < stopAfterMisses; n += 1) {
      let src = null;

      for (const ext of extensions) {
        const candidate = `images/group-${n}.${ext}`;
        // eslint-disable-next-line no-await-in-loop
        if (await imageExists(candidate)) {
          src = candidate;
          break;
        }
      }

      if (src) {
        misses = 0;
        found.push({
          src,
          alt: photoCaptions[n] || `Group photo ${n}`,
          caption: photoCaptions[n] || `Moment ${n}`,
        });
      } else {
        misses += 1;
      }
    }

    return found;
  }

  function renderMessages() {
    if (!messageList || !messageDeck || !messageEmpty) return;

    if (!messages.length) {
      messageDeck.hidden = true;
      messageEmpty.hidden = false;
      return;
    }

    messageEmpty.hidden = true;
    messageDeck.hidden = false;

    messageList.innerHTML = messages
      .map(
        (msg, index) => `
      <article
        class="message-card"
        lang="${msg.lang || "en"}"
        data-index="${index}"
        aria-roledescription="slide"
        aria-label="Message ${index + 1} of ${messages.length}"
      >
        <header class="message-card__header">
          <div class="message__avatar" aria-hidden="true">${initials(msg.name)}</div>
          <div class="message-card__header-text">
            <h3 class="message__name">${escapeHtml(msg.name)}</h3>
          </div>
        </header>
        <div class="message-card__body">
          <p class="message__text">${escapeHtml(msg.text)}</p>
        </div>
        <footer class="message-card__footer" aria-hidden="true">
          <svg class="message-card__flourish" viewBox="0 0 120 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 14 C 18 4, 28 22, 42 12 S 62 2, 78 14 S 98 24, 116 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="60" cy="12" r="2.2" fill="currentColor"/>
          </svg>
        </footer>
      </article>`
      )
      .join("");

    setupMessageDeck();
  }

  function updateDeckUI(index) {
    const total = messages.length;
    currentIndex = Math.max(0, Math.min(index, total - 1));

    if (deckCounter) {
      deckCounter.textContent = `${currentIndex + 1} / ${total}`;
    }

    if (deckProgress) {
      const pct = total <= 1 ? 100 : (currentIndex / (total - 1)) * 100;
      deckProgress.style.width = `${pct}%`;
    }

    if (deckPrev) deckPrev.disabled = currentIndex === 0;
    if (deckNext) deckNext.disabled = currentIndex >= total - 1;

    if (deckHint) {
      if (currentIndex >= total - 1) {
        deckHint.textContent = "Last message";
      } else if (currentIndex === 0) {
        deckHint.textContent = "Swipe for next";
      } else {
        deckHint.textContent = "Keep swiping";
      }
    }

    if (messageList) {
      messageList.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;
    }

    messageList.querySelectorAll(".message-card").forEach((card, i) => {
      card.setAttribute("aria-hidden", i === currentIndex ? "false" : "true");
      card.classList.toggle("is-active", i === currentIndex);
    });
  }

  function goTo(index) {
    const clamped = Math.max(0, Math.min(index, messages.length - 1));
    updateDeckUI(clamped);
  }

  function setupMessageDeck() {
    if (!deckViewport || !messageList || !messages.length) return;

    updateDeckUI(0);

    deckPrev?.addEventListener("click", () => goTo(currentIndex - 1));
    deckNext?.addEventListener("click", () => goTo(currentIndex + 1));

    deckViewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(currentIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(currentIndex - 1);
      }
    });

    // Touchend-only swipe detection. No touchmove handlers and no live
    // dragging — those interrupt native momentum and nudge the scrollbar
    // after the page should have stopped.
    let startX = 0;
    let startY = 0;
    let tracking = false;

    deckViewport.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        tracking = true;
        startX = touch.clientX;
        startY = touch.clientY;
      },
      { passive: true }
    );

    const finishSwipe = (clientX, clientY) => {
      if (!tracking) return;
      tracking = false;

      const dx = clientX - startX;
      const dy = clientY - startY;

      // Only change cards on a clear horizontal flick.
      if (Math.abs(dx) < 56) return;
      if (Math.abs(dx) <= Math.abs(dy) * 1.25) return;

      if (dx < 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    };

    deckViewport.addEventListener(
      "touchend",
      (event) => {
        const touch = event.changedTouches[0];
        if (!touch) {
          tracking = false;
          return;
        }
        finishSwipe(touch.clientX, touch.clientY);
      },
      { passive: true }
    );

    deckViewport.addEventListener(
      "touchcancel",
      () => {
        tracking = false;
      },
      { passive: true }
    );

    // Desktop: click-drag still works via mouse, evaluated on mouseup only.
    let mouseTracking = false;
    let mouseStartX = 0;
    let mouseStartY = 0;

    deckViewport.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      mouseTracking = true;
      mouseStartX = event.clientX;
      mouseStartY = event.clientY;
    });

    window.addEventListener("mouseup", (event) => {
      if (!mouseTracking) return;
      mouseTracking = false;
      const dx = event.clientX - mouseStartX;
      const dy = event.clientY - mouseStartY;
      if (Math.abs(dx) < 56) return;
      if (Math.abs(dx) <= Math.abs(dy) * 1.25) return;
      if (dx < 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    });
  }

  function renderPhotos(photos) {
    if (!photoRail) return;

    galleryPhotos = photos;

    if (!photos.length) {
      photoRail.innerHTML =
        '<p class="empty-note reveal">Add photos as images/group-1.jpg, group-2.jpg, and so on.</p>';
      return;
    }

    photoRail.innerHTML = photos
      .map(
        (photo, index) => `
      <button
        type="button"
        class="photo-card reveal"
        role="listitem"
        style="--delay: ${index * 60}ms"
        data-index="${index}"
        aria-label="Open photo: ${escapeHtml(photo.caption || photo.alt || `Photo ${index + 1}`)}"
      >
        <img
          src="${photo.src}"
          alt="${escapeHtml(photo.alt || "")}"
          loading="lazy"
        />
        <span class="photo-card__caption">${escapeHtml(photo.caption || "")}</span>
      </button>`
      )
      .join("");

    photoRail.querySelectorAll(".photo-card").forEach((card) => {
      card.addEventListener("click", () => {
        const index = Number(card.getAttribute("data-index")) || 0;
        openLightbox(index);
      });
    });
  }

  function measureLightbox() {
    if (!lightboxViewport) return;
    lightboxWidth = lightboxViewport.clientWidth;
  }

  function updateLightboxUI(index) {
    const total = galleryPhotos.length;
    lightboxIndex = Math.max(0, Math.min(index, total - 1));

    if (lightboxCounter) {
      lightboxCounter.textContent = `${lightboxIndex + 1} / ${total}`;
    }

    if (lightboxCaption) {
      const photo = galleryPhotos[lightboxIndex];
      lightboxCaption.textContent = photo?.caption || photo?.alt || "";
    }
  }

  function goToLightbox(index, smooth = true) {
    measureLightbox();
    if (!lightboxViewport || !lightboxWidth) return;
    const clamped = Math.max(0, Math.min(index, galleryPhotos.length - 1));
    lightboxViewport.scrollTo({
      left: clamped * lightboxWidth,
      behavior: smooth ? "smooth" : "auto",
    });
    updateLightboxUI(clamped);
  }

  function openLightbox(index) {
    if (!lightbox || !lightboxTrack || !galleryPhotos.length) return;

    lightboxTrack.innerHTML = galleryPhotos
      .map(
        (photo) => `
      <div class="lightbox__slide">
        <img src="${photo.src}" alt="${escapeHtml(photo.alt || "")}" />
      </div>`
      )
      .join("");

    lightbox.hidden = false;
    document.body.classList.add("is-lightbox-open");
    requestAnimationFrame(() => {
      measureLightbox();
      goToLightbox(index, false);
      lightboxClose?.focus();
    });
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.classList.remove("is-lightbox-open");
  }

  function setupLightbox() {
    if (!lightbox || !lightboxViewport) return;

    lightboxClose?.addEventListener("click", closeLightbox);

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    let scrollTick = false;
    lightboxViewport.addEventListener(
      "scroll",
      () => {
        if (scrollTick) return;
        scrollTick = true;
        requestAnimationFrame(() => {
          if (!lightboxWidth) measureLightbox();
          if (lightboxWidth) {
            const index = Math.round(lightboxViewport.scrollLeft / lightboxWidth);
            if (index !== lightboxIndex) updateLightboxUI(index);
          }
          scrollTick = false;
        });
      },
      { passive: true }
    );

    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowRight") goToLightbox(lightboxIndex + 1);
      if (event.key === "ArrowLeft") goToLightbox(lightboxIndex - 1);
    });

    window.addEventListener("resize", () => {
      if (lightbox.hidden) return;
      measureLightbox();
      goToLightbox(lightboxIndex, false);
    });
  }

  function setupReveals() {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
    );

    items.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
      if (inView) {
        el.classList.add("is-visible");
      } else {
        observer.observe(el);
      }
    });
  }

  function playCelebration() {
    const layer = document.getElementById("celebration");
    const canvas = document.getElementById("celebrationCanvas");
    if (!layer || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (layer.dataset.active === "true") return;

    layer.dataset.active = "true";
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const colors = ["#e88aaa", "#f0b4c8", "#d46b8c", "#ffc2d8", "#f7a0bc", "#ffd0e0"];
    const balloonColors = [
      "#e88aaa",
      "#ff8fb5",
      "#9ec9ff",
      "#c5a3ff",
      "#7fd6c2",
      "#ffb347",
    ];
    const kinds = ["heart", "petal", "star"];

    let width = 0;
    let height = 0;
    let dpr = 1;
    let lastW = 0;

    const syncSize = () => {
      // Size from layout width; keep a stable tall buffer so mobile browser
      // chrome show/hide does not resize the particle world mid-flight.
      const nextW = Math.max(1, Math.round(window.innerWidth));
      const nextH = Math.max(
        Math.round(window.innerHeight),
        Math.round(window.screen?.height || window.innerHeight),
        640
      );
      if (nextW === lastW && canvas.width) return;
      lastW = nextW;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = nextW;
      height = nextH;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncSize();
    window.addEventListener("resize", syncSize, { passive: true });

    const particles = [];

    // Random size band: small / medium / big (with a little jitter inside each).
    const pickSize = (isBalloon) => {
      const band = Math.floor(Math.random() * 3); // 0 small, 1 medium, 2 big
      if (isBalloon) {
        if (band === 0) return 42 + Math.random() * 14; // ~42–56
        if (band === 1) return 64 + Math.random() * 16; // ~64–80
        return 88 + Math.random() * 22; // ~88–110
      }
      if (band === 0) return 7 + Math.random() * 4; // ~7–11
      if (band === 1) return 13 + Math.random() * 5; // ~13–18
      return 20 + Math.random() * 8; // ~20–28
    };

    const makeFalling = (i) => {
      const kind = kinds[i % kinds.length];
      const size = pickSize(false);
      return {
        kind,
        color: colors[i % colors.length],
        x: Math.random() * width,
        y: -20 - Math.random() * height,
        vx: -18 + Math.random() * 36,
        // Bigger pieces drift a touch slower.
        vy: (42 + Math.random() * 55) * (size < 12 ? 1.08 : size > 19 ? 0.88 : 1),
        rot: Math.random() * Math.PI * 2,
        vr: (-1.2 + Math.random() * 2.4) * (Math.PI / 180) * 60,
        size,
        alpha: 0,
        life: Math.random(),
      };
    };

    const makeRising = (i, isBalloon) => {
      const kind = isBalloon ? "balloon" : kinds[i % kinds.length];
      const size = pickSize(isBalloon);
      return {
        kind,
        color: isBalloon
          ? balloonColors[i % balloonColors.length]
          : colors[(i + 2) % colors.length],
        x: Math.random() * width,
        y: height + 30 + Math.random() * height * 0.4,
        vx: -14 + Math.random() * 28,
        vy: isBalloon
          ? -(22 + Math.random() * 28) * (size < 55 ? 1.1 : size > 85 ? 0.85 : 1)
          : -(28 + Math.random() * 40) * (size < 12 ? 1.08 : size > 19 ? 0.88 : 1),
        rot: isBalloon ? 0 : Math.random() * Math.PI * 2,
        vr: isBalloon
          ? 0
          : (-0.8 + Math.random() * 1.6) * (Math.PI / 180) * 60,
        size,
        alpha: 0,
        life: Math.random(),
      };
    };

    for (let i = 0; i < 24; i += 1) particles.push(makeFalling(i));
    for (let i = 0; i < 10; i += 1) particles.push(makeRising(i, false));
    for (let i = 0; i < 3; i += 1) particles.push(makeRising(i, true));

    const drawHeart = (x, y, size, color, rot) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = color;
      ctx.beginPath();
      const s = size / 2;
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(0, s * -0.3, s * -1.1, s * -0.3, s * -1.1, s * 0.25);
      ctx.bezierCurveTo(s * -1.1, s * 0.75, 0, s * 1.15, 0, s * 1.45);
      ctx.bezierCurveTo(0, s * 1.15, s * 1.1, s * 0.75, s * 1.1, s * 0.25);
      ctx.bezierCurveTo(s * 1.1, s * -0.3, 0, s * -0.3, 0, s * 0.35);
      ctx.fill();
      ctx.restore();
    };

    const drawPetal = (x, y, size, color, rot) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.35, size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawStar = (x, y, size, color, rot) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = color;
      ctx.beginPath();
      const spikes = 5;
      const outer = size * 0.55;
      const inner = size * 0.22;
      for (let i = 0; i < spikes * 2; i += 1) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (i * Math.PI) / spikes - Math.PI / 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawBalloon = (x, y, size, color, rot, life = 0) => {
      const neckY = size * 0.48;
      const stringLen = size * 0.75 + 28;
      // Sway left/right only — string always hangs toward the bottom of the screen.
      const sway = Math.sin(life * 2.4) * 10;
      const sway2 = Math.sin(life * 2.4 + 1.1) * 7;
      const startX = x;
      const startY = y + neckY;
      const endX = x + sway * 0.85;
      const endY = startY + stringLen;

      // Soft ribbon / string (world space, always downward)
      ctx.save();
      ctx.strokeStyle = "rgba(110, 65, 85, 0.55)";
      ctx.lineWidth = 1.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(
        startX + sway * 0.35,
        startY + stringLen * 0.28,
        startX - sway2 * 0.55,
        startY + stringLen * 0.62,
        endX,
        endY
      );
      ctx.stroke();

      // Tiny curl at the free end
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.quadraticCurveTo(endX + sway * 0.25, endY + 7, endX - 3, endY + 11);
      ctx.stroke();
      ctx.restore();

      // Balloon body + knot (may tilt slightly; string stays down)
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);

      ctx.fillStyle = "#8a3d58";
      ctx.beginPath();
      ctx.moveTo(-4.5, neckY - 1);
      ctx.lineTo(4.5, neckY - 1);
      ctx.lineTo(0, neckY + 7);
      ctx.closePath();
      ctx.fill();

      const grad = ctx.createRadialGradient(
        -size * 0.2,
        -size * 0.2,
        size * 0.05,
        0,
        0,
        size * 0.55
      );
      grad.addColorStop(0, "#fff");
      grad.addColorStop(0.18, color);
      grad.addColorStop(1, "#b24f6f");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const recycle = (p) => {
      const isBalloon = p.kind === "balloon";
      p.size = pickSize(isBalloon);
      if (isBalloon || p.vy < 0) {
        p.x = Math.random() * width;
        p.y = height + 40 + Math.random() * 80;
        p.vy = isBalloon
          ? -(22 + Math.random() * 28) *
            (p.size < 55 ? 1.1 : p.size > 85 ? 0.85 : 1)
          : -(28 + Math.random() * 40) *
            (p.size < 12 ? 1.08 : p.size > 19 ? 0.88 : 1);
        p.life = 0;
        p.alpha = 0;
      } else {
        p.x = Math.random() * width;
        p.y = -30 - Math.random() * 60;
        p.vy =
          (42 + Math.random() * 55) *
          (p.size < 12 ? 1.08 : p.size > 19 ? 0.88 : 1);
        p.life = 0;
        p.alpha = 0;
      }
    };

    let last = performance.now();
    const tick = (now) => {
      // Particle motion is time-based only — never reads scroll position.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;

        if (p.life < 0.45) p.alpha = Math.min(1, p.life / 0.45);
        else if (p.kind === "balloon" ? p.y < height * 0.12 : p.y > height * 0.88) {
          p.alpha = Math.max(0, p.alpha - dt * 1.4);
        } else {
          p.alpha = 0.92;
        }

        const off =
          p.y > height + 80 ||
          p.y < -80 ||
          p.x < -80 ||
          p.x > width + 80 ||
          p.alpha <= 0;
        if (off) {
          recycle(p);
          continue;
        }

        ctx.globalAlpha = p.alpha;
        if (p.kind === "heart") drawHeart(p.x, p.y, p.size, p.color, p.rot);
        else if (p.kind === "petal") drawPetal(p.x, p.y, p.size, p.color, p.rot);
        else if (p.kind === "star") drawStar(p.x, p.y, p.size, p.color, p.rot);
        else drawBalloon(p.x, p.y, p.size, p.color, p.rot, p.life);
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  function setupAudio() {
    if (!audio || !audioToggle) return;

    const welcomeGate = document.getElementById("welcomeGate");
    const welcomeOpen = document.getElementById("welcomeOpen");

    const setPlaying = (playing) => {
      audioToggle.setAttribute("aria-pressed", playing ? "true" : "false");
      audioToggle.setAttribute("aria-label", playing ? "Pause music" : "Play music");
      audioToggle.classList.toggle("is-playing", playing);
    };

    const hideGate = () => {
      if (!welcomeGate || welcomeGate.hidden) return;
      welcomeGate.classList.add("is-hiding");
      window.setTimeout(() => {
        welcomeGate.hidden = true;
      }, 450);
    };

    const showGate = () => {
      if (!welcomeGate) return;
      welcomeGate.hidden = false;
      welcomeGate.classList.remove("is-hiding");
    };

    const startMusic = async () => {
      try {
        audio.volume = 1;
        await audio.play();
        setPlaying(true);
        hideGate();
        return true;
      } catch (error) {
        setPlaying(false);
        return false;
      }
    };

    audioToggle.addEventListener("click", async () => {
      try {
        if (audio.paused) {
          await audio.play();
          setPlaying(true);
          hideGate();
        } else {
          audio.pause();
          setPlaying(false);
        }
      } catch (error) {
        audioToggle.classList.add("is-error");
        audioToggle.setAttribute(
          "aria-label",
          "Add audio/jessica.mp3 to enable music"
        );
        showGate();
      }
    });

    welcomeOpen?.addEventListener("click", async () => {
      playCelebration();
      await startMusic();
      hideGate();
    });

    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("ended", () => setPlaying(false));
    audio.addEventListener("pause", () => {
      if (!audio.ended) setPlaying(false);
    });

    // Try autoplay as soon as the page opens.
    // Phones often block this — if blocked, show a one-tap gate so music starts.
    startMusic().then((started) => {
      if (!started) showGate();
    });
  }

  function setupHeroPhotoFallback() {
    if (!jessicaPhoto) return;

    const applyFallback = () => {
      const fallback = jessicaPhoto.getAttribute("data-fallback");
      if (
        fallback &&
        jessicaPhoto.getAttribute("src") !== fallback &&
        !jessicaPhoto.src.endsWith(fallback.replace(/^\.\//, ""))
      ) {
        jessicaPhoto.src = fallback;
        return;
      }
      if (!jessicaPhoto.naturalWidth) {
        jessicaPhoto.classList.add("is-missing");
        jessicaPhoto.removeAttribute("src");
        jessicaPhoto.alt = "Add images/jessica.jpg";
      }
    };

    jessicaPhoto.addEventListener("error", applyFallback);

    if (jessicaPhoto.complete && !jessicaPhoto.naturalWidth) {
      applyFallback();
    }
  }

  async function init() {
    setupHeroPhotoFallback();
    setupAudio();
    setupLightbox();
    renderMessages();

    const photos = await discoverGroupPhotos();
    renderPhotos(photos);
    requestAnimationFrame(setupReveals);
  }

  init();
})();
