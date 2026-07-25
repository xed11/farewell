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

    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let axis = null; // "x" | "y" | null
    let tracking = false;

    const onStart = (clientX, clientY) => {
      tracking = true;
      axis = null;
      startX = clientX;
      startY = clientY;
      deltaX = 0;
      messageList.classList.add("is-dragging");
      messageDeck.classList.add("is-dragging");
    };

    const onMove = (clientX, clientY, event) => {
      if (!tracking) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

      if (axis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }

      if (axis === "x") {
        if (event && event.cancelable) event.preventDefault();
        deltaX = dx;
        const width = deckViewport.clientWidth || 1;
        const offset = (-currentIndex * 100) + (dx / width) * 100;
        messageList.style.transform = `translate3d(${offset}%, 0, 0)`;
      }
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      messageList.classList.remove("is-dragging");
      messageDeck.classList.remove("is-dragging");

      if (axis === "x" && Math.abs(deltaX) > 45) {
        if (deltaX < 0) goTo(currentIndex + 1);
        else goTo(currentIndex - 1);
      } else {
        goTo(currentIndex);
      }

      axis = null;
      deltaX = 0;
    };

    deckViewport.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.touches[0];
        onStart(touch.clientX, touch.clientY);
      },
      { passive: true }
    );

    deckViewport.addEventListener(
      "touchmove",
      (event) => {
        const touch = event.touches[0];
        onMove(touch.clientX, touch.clientY, event);
      },
      { passive: false }
    );

    deckViewport.addEventListener("touchend", onEnd, { passive: true });
    deckViewport.addEventListener("touchcancel", onEnd, { passive: true });

    // Mouse drag for desktop preview
    deckViewport.addEventListener("mousedown", (event) => {
      onStart(event.clientX, event.clientY);
    });

    window.addEventListener("mousemove", (event) => {
      if (!tracking) return;
      onMove(event.clientX, event.clientY, event);
    });

    window.addEventListener("mouseup", onEnd);
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
    if (!layer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (layer.dataset.active === "true") return;

    layer.dataset.active = "true";
    layer.innerHTML = "";

    const colors = ["#e88aaa", "#f0b4c8", "#d46b8c", "#ffc2d8", "#f7a0bc", "#ffd0e0"];
    const kinds = ["heart", "petal", "star"];

    // Hearts, petals, and soft stars falling from above
    for (let i = 0; i < 24; i += 1) {
      const wrap = document.createElement("div");
      wrap.className = "celebration__item is-fall";
      wrap.style.setProperty("--x", `${3 + Math.random() * 94}%`);
      wrap.style.setProperty("--delay", `${Math.random() * 8}s`);
      wrap.style.setProperty("--dur", `${7 + Math.random() * 5}s`);
      wrap.style.setProperty("--drift", `${-55 + Math.random() * 110}px`);
      wrap.style.setProperty("--spin", `${120 + Math.random() * 260}deg`);

      const kind = kinds[i % kinds.length];
      const shape = document.createElement("span");
      shape.className = `celebration__${kind}`;
      shape.style.setProperty("--c", colors[i % colors.length]);
      if (kind === "heart") {
        const size = Math.round(14 + Math.random() * 12);
        shape.style.width = `${size}px`;
        shape.style.height = `${size}px`;
      }
      wrap.appendChild(shape);
      layer.appendChild(wrap);
    }

    // A few hearts / petals / stars also drifting gently upward
    for (let i = 0; i < 10; i += 1) {
      const wrap = document.createElement("div");
      wrap.className = "celebration__item is-balloon";
      wrap.style.setProperty("--x", `${6 + Math.random() * 88}%`);
      wrap.style.setProperty("--delay", `${Math.random() * 9}s`);
      wrap.style.setProperty("--dur", `${9 + Math.random() * 5}s`);
      wrap.style.setProperty("--drift", `${-45 + Math.random() * 90}px`);
      wrap.style.setProperty("--spin", `${-24 + Math.random() * 48}deg`);

      const kind = kinds[i % kinds.length];
      const shape = document.createElement("span");
      shape.className = `celebration__${kind}`;
      shape.style.setProperty("--c", colors[(i + 2) % colors.length]);
      wrap.appendChild(shape);
      layer.appendChild(wrap);
    }

    // A few circular balloons rising (1–3 at a time)
    const balloonColors = [
      "#e88aaa",
      "#ff8fb5",
      "#9ec9ff",
      "#c5a3ff",
      "#7fd6c2",
      "#ffb347",
    ];
    for (let i = 0; i < 3; i += 1) {
      const size = Math.round(60 + Math.random() * 40); // 60–100px
      const wrap = document.createElement("div");
      wrap.className = "celebration__item is-balloon";
      wrap.style.setProperty("--x", `${12 + i * 28 + Math.random() * 10}%`);
      wrap.style.setProperty("--delay", `${i * 3.4 + Math.random() * 1.2}s`);
      wrap.style.setProperty("--dur", `${11 + Math.random() * 3}s`);
      wrap.style.setProperty("--drift", `${-40 + Math.random() * 80}px`);
      wrap.style.setProperty("--spin", `${-5 + Math.random() * 10}deg`);

      const balloon = document.createElement("span");
      balloon.className = "celebration__balloon";
      balloon.style.setProperty("--c", balloonColors[i % balloonColors.length]);
      balloon.style.setProperty("--size", `${size}px`);
      balloon.style.width = `${size}px`;
      balloon.style.height = `${size}px`;
      wrap.appendChild(balloon);
      layer.appendChild(wrap);
    }
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

  function setupParallax() {
    const media = document.querySelector(".hero__photo");
    if (!media || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = Math.min(window.scrollY, 420);
          media.style.transform = `scale(1.08) translate3d(0, ${y * 0.12}px, 0)`;
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  async function init() {
    setupHeroPhotoFallback();
    setupAudio();
    setupParallax();
    setupLightbox();
    renderMessages();

    const photos = await discoverGroupPhotos();
    renderPhotos(photos);
    requestAnimationFrame(setupReveals);
  }

  init();
})();
