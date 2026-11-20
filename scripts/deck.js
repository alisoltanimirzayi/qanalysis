(() => {
  const slides = Array.from(document.querySelectorAll("[data-slide]"));
  const mainSlides = slides.filter(slide => !slide.hasAttribute("data-branch-slide"));
  const controls = document.querySelector(".controls");
  const previous = controls.querySelector('[data-step="-1"]');
  const next = controls.querySelector('[data-step="1"]');
  const counter = controls.querySelector(".counter");
  const fullscreen = controls.querySelector(".fullscreen");
  const digits = new Intl.NumberFormat("fa-IR");
  const allowMotion = window.matchMedia("screen and (prefers-reduced-motion: no-preference)");
  const clusterSlide = document.getElementById("engagement-chart");
  const clusterArt = clusterSlide.querySelector(".cluster-art");
  const clusterImage = clusterArt.querySelector("img");
  const clusterLayer = clusterArt.querySelector(".cluster-hotspots");
  const clusterProfile = clusterArt.querySelector(".cluster-profile");
  const clusterPlot = clusterProfile.querySelector(".cluster-profile-plot");
  const clusterIsolate = clusterArt.querySelector(".cluster-isolate");
  const clusters = globalThis.clusterHotspots;
  const clusterProfiles = globalThis.clusterProfiles;
  const clusterPercentage = new Intl.NumberFormat("fa-IR", { style: "percent", maximumFractionDigits: 2 });
  const categoryColors = ["#23776a", "#b98032", "#6d598c", "#b65b49", "#59768c", "#827c70", "#687c44"];
  const responseColors = ["#23776a", "#aba394"];
  const findingColors = ["#b98032", "#d5d0c3"];
  const featureGroups = [
    {
      title: "ترکیب جمعیتی",
      features: [
        { id: "gender", label: "جنسیت", categories: ["مرد", "زن"] },
        { id: "age", label: "سن", categories: ["زیر ۲۵ سال", "۲۵ سال و بیشتر"] },
        { id: "residence", label: "محل سکونت", categories: ["مرکز استان", "شهر غیرمرکز استان", "روستا"] },
        { id: "education", label: "تحصیلات", categories: ["بی‌سواد", "دیپلم و زیر دیپلم", "دانشگاهی یا حوزوی"] },
        { id: "marital", label: "وضعیت تأهل", categories: ["مجرد", "متأهل"] },
        { id: "activity", label: "وضعیت فعالیت", categories: ["شاغل", "بیکار", "خانه‌دار", "سایر وضعیت‌ها"], colors: ["#23776a", "#b65b49", "#b98032", "#827c70"] }
      ]
    },
    {
      title: "ارتباط با برنامه‌ها",
      features: [
        { id: "mahfelAwareness", label: "آشنایی با محفل", categories: ["آشنا", "ناآشنا"], colors: responseColors },
        { id: "watch", label: "تماشای محفل", categories: ["تماشا کرده‌اند", "تماشا نکرده‌اند"], colors: responseColors },
        { id: "watchingMode", label: "شیوه‌ی تماشای محفل", categories: ["اتفاقی از تلویزیون", "چند قسمت", "همه‌ی قسمت‌ها", "بخش‌هایی در شبکه‌های اجتماعی"], note: "رنگ نقطه‌ها سهم هر شیوه را در میان تماشاگران محفل نشان می‌دهد." },
        { id: "campaign", label: "آشنایی با پویش", categories: ["آشنا", "ناآشنا"], colors: responseColors },
        { id: "contest", label: "شرکت در مسابقات", categories: ["شرکت کرده‌اند", "شرکت نکرده‌اند"], colors: responseColors }
      ]
    },
    {
      title: "رفتارهای دینی",
      features: [
        { id: "verses", label: "آشنایی با آیات قرآن", note: "درصد آیاتی که اعضای خوشه با آن‌ها آشنا بودند." },
        { id: "gatherings", label: "حضور در محافل قرآنی", categories: ["سابقه‌ی حضور دارند", "سابقه‌ی حضور ندارند"], colors: responseColors },
        { id: "reading", label: "میزان قرآن‌خواندن", categories: ["تقریباً هر روز", "هفته‌ای چند بار", "ماهی چند بار", "مناسبت‌های خاص", "تقریباً نمی‌خوانم"] },
        { id: "quranContact", label: "راه‌های ارتباط با قرآن", categories: ["قرآن کاغذی", "برنامه‌های قرآنی موبایل", "تلویزیون یا رادیو", "صفحات و کانال‌های مجازی", "مدرسه، مسجد یا هیئت", "بدون ارتباط", "سایر"], note: "رنگ نقطه‌ها توزیع راه‌های گزارش‌شده‌ی ارتباط با قرآن را نشان می‌دهد." },
        { id: "prayer", label: "نمازهای روزانه", categories: ["هیچ‌وقت", "به‌ندرت", "گاهی", "اکثر اوقات", "همیشه"] }
      ]
    }
  ];
  let current = -1;
  let stopAnimation;
  let isolatedCluster;

  function trackTransition(animations, restore, last = animations.at(-1)) {
    stopAnimation = () => {
      last.onfinish = null;
      animations.forEach(animation => animation.cancel());
      restore();
      stopAnimation = undefined;
    };
    last.onfinish = stopAnimation;
  }

  function turnPage(outgoing, forward) {
    const transformOrigin = forward ? "right center" : "left center";
    const endAngle = forward ? "-90deg" : "90deg";
    outgoing.classList.add("is-turning");
    outgoing.inert = true;
    outgoing.hidden = false;

    const animation = outgoing.animate([
      { transform: "perspective(2200px) rotateY(0deg)", transformOrigin, filter: "brightness(1)" },
      { transform: `perspective(2200px) rotateY(${endAngle})`, transformOrigin, filter: "brightness(.72)" }
    ], { duration: 460, easing: "cubic-bezier(.48, .12, .34, 1)", fill: "forwards" });

    trackTransition([animation], () => {
      outgoing.hidden = true;
      outgoing.inert = false;
      outgoing.classList.remove("is-turning");
    });
  }

  function resizeCharts(outgoing, incoming) {
    const expanding = incoming.hasAttribute("data-expanded-charts");
    const expanded = expanding ? incoming : outgoing;
    const compact = expanding ? outgoing : incoming;
    if (!expanding) {
      compact.hidden = true;
      expanded.inert = true;
      expanded.hidden = false;
    }

    expanded.classList.add("is-resizing-charts");
    const compactPlots = compact.querySelectorAll(".overview-chart img");
    const animations = Array.from(expanded.querySelectorAll(".overview-chart-window"), (window, index) => {
      const { width, height } = window.getBoundingClientRect();
      const compactPlot = compactPlots[index];
      const compactHeight = width * Number(compactPlot.getAttribute("height")) / Number(compactPlot.getAttribute("width"));
      const frames = [{ height: `${compactHeight}px` }, { height: `${height}px` }];
      return window.animate(expanding ? frames : frames.reverse(), {
        duration: 560, easing: "cubic-bezier(.33, 1, .68, 1)", fill: "both"
      });
    });

    trackTransition(animations, () => {
      expanded.classList.remove("is-resizing-charts");
      if (!expanding) {
        expanded.hidden = true;
        expanded.inert = false;
        compact.hidden = false;
      }
    });
  }

  function audienceFrame(slide) {
    const plot = slide.querySelector(".unfamiliar-plot");
    const note = slide.querySelector(".finding-reading");
    const slideBounds = slide.getBoundingClientRect();
    const measure = element => {
      const { left, top, width, height } = element.getBoundingClientRect();
      return { left: left - slideBounds.left, top: top - slideBounds.top, width, height };
    };
    return { plot, note, plotBounds: measure(plot), noteBounds: measure(note) };
  }

  function animateAudienceFocus(from, incoming) {
    const to = audienceFrame(incoming);
    const bounds = from.plotBounds;
    const oldChart = from.plot.querySelector("img").cloneNode();
    oldChart.classList.add("audience-plot-preview");
    oldChart.alt = "";
    oldChart.setAttribute("aria-hidden", "true");
    to.plot.append(oldChart);

    const oldNote = from.note.cloneNode(true);
    oldNote.classList.add("audience-note-preview");
    oldNote.setAttribute("aria-hidden", "true");
    Object.assign(oldNote.style, {
      left: `${from.noteBounds.left}px`,
      top: `${from.noteBounds.top}px`,
      width: `${from.noteBounds.width}px`
    });
    incoming.append(oldNote);

    const target = to.plotBounds;
    const move = [bounds.left - target.left, bounds.top - target.top];
    const scale = [bounds.width / target.width, bounds.height / target.height];
    const duration = Math.abs(bounds.width - target.width) > 1 ? 420 : 0;
    const timings = { fill: "both", easing: "ease-in-out" };
    const animations = [];
    if (duration) {
      animations.push(to.plot.animate([
        { transformOrigin: "top left", transform: `translate(${move[0]}px, ${move[1]}px) scale(${scale[0]}, ${scale[1]})` },
        { transformOrigin: "top left", transform: "none" }
      ], { ...timings, duration }));
    }
    animations.push(oldChart.animate([{ opacity: 1 }, { opacity: 0 }], { ...timings, delay: duration, duration: 250 }));
    const textTiming = { ...timings, delay: duration + 250, duration: 210 };
    animations.push(oldNote.animate([{ opacity: 1 }, { opacity: 0 }], textTiming));
    animations.push(to.note.animate([{ opacity: 0 }, { opacity: 1 }], textTiming));

    trackTransition(animations, () => {
      oldChart.remove();
      oldNote.remove();
    });
  }

  function slidePreview(outgoing, incoming) {
    const preview = outgoing.cloneNode(true);
    preview.removeAttribute("id");
    preview.removeAttribute("data-slide");
    preview.removeAttribute("aria-labelledby");
    preview.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
    preview.classList.add("media-exit-preview");
    preview.setAttribute("aria-hidden", "true");
    preview.inert = true;
    preview.hidden = false;
    incoming.append(preview);
    return preview;
  }

  function revealMediaChart(outgoing, incoming, from) {
    const previousSlide = slidePreview(outgoing, incoming);
    const oldRow = from.plot.querySelector("img").cloneNode();
    oldRow.src = oldRow.src.replace(/#.*$/, "#wave-five-only");
    oldRow.alt = "";
    oldRow.classList.add("media-row-preview");
    oldRow.setAttribute("aria-hidden", "true");
    const origin = from.plotBounds;
    Object.assign(oldRow.style, {
      left: `${origin.left}px`, top: `${origin.top}px`, width: `${origin.width}px`, height: `${origin.height}px`
    });

    const token = document.createElement("span");
    token.className = "media-token-preview";
    token.setAttribute("aria-hidden", "true");
    const swatch = incoming.querySelector(".media-key-low .media-swatch");
    const { left, top, width, height } = swatch.getBoundingClientRect();
    const stage = incoming.getBoundingClientRect();
    const goal = { left: left - stage.left, top: top - stage.top };
    Object.assign(token.style, {
      left: `${goal.left}px`, top: `${goal.top}px`, width: `${width}px`, height: `${height}px`
    });
    incoming.append(oldRow, token);

    const animations = [];
    const play = (node, frames, duration, delay = 0, easing = "ease-in-out") => {
      const animation = node.animate(frames, { duration, delay, easing, fill: "both" });
      animations.push(animation);
      return animation;
    };
    const appear = (node, delay, duration = 190) => play(node, [{ opacity: 0 }, { opacity: 1 }], duration, delay);
    const disappear = (node, delay, duration) => play(node, [{ opacity: 1 }, { opacity: 0 }], duration, delay);
    disappear(previousSlide, 0, 195);
    disappear(oldRow, 225, 205);
    appear(incoming.querySelector(".finding-header"), 95, 245);
    const startX = origin.left + origin.width * 243.536 / 820 - goal.left - width / 2;
    const startY = origin.top + origin.height * 345 / 455 - goal.top - height / 2;
    play(token, [
      { opacity: 0, transform: `translate(${startX}px, ${startY}px) scale(.8)` },
      { opacity: 1, offset: 0.24 },
      { opacity: 1, transform: "none" }
    ], 420, 175, "cubic-bezier(.32, .12, .32, 1)");
    appear(incoming.querySelector(".media-key-low"), 515);
    appear(incoming.querySelector(".media-key-viewers"), 555);
    incoming.querySelectorAll(".media-cloud").forEach(cloud => appear(cloud, 510, 170));
    const order = ["tv", "online", "outdoor", "social", "sms"];
    incoming.querySelectorAll(".media-bubble").forEach(bubble => {
      const begin = 610 + order.indexOf(bubble.dataset.channel) * 69;
      play(bubble, [{ opacity: 0, scale: ".62" }, { opacity: 1, scale: "1" }], 240, begin, "cubic-bezier(.2, .65, .35, 1)");
    });
    appear(incoming.querySelector(".media-context"), 895, 210);
    appear(incoming.querySelector(".media-cloud-key"), 978, 170);

    trackTransition(animations, () => {
      previousSlide.remove();
      oldRow.remove();
      token.remove();
    });
  }

  function returnFromMedia(outgoing, incoming) {
    const preview = slidePreview(outgoing, incoming);
    const fade = preview.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: "ease-out", fill: "both" });
    trackTransition([fade], () => preview.remove());
  }

  function clusterFrame(slide) {
    const bounds = slide.getBoundingClientRect();
    const chart = slide.querySelector(".chart img");
    const box = chart.getBoundingClientRect();
    const viewWidth = Number(chart.getAttribute("width"));
    const viewHeight = Number(chart.getAttribute("height"));
    const note = slide.querySelector(".finding-reading");
    const noteBounds = note?.getBoundingClientRect();
    return {
      motionTarget: chart.closest(".cluster-art") ?? chart,
      x: box.left + box.width / 2 - bounds.left,
      y: box.top + box.height / 2 - bounds.top,
      scale: Math.min(box.width / viewWidth, box.height / viewHeight),
      sourceCenterX: Number(chart.dataset.chartOriginX ?? 0) + viewWidth / 2,
      sourceCenterY: Number(chart.dataset.chartOriginY ?? 0) + viewHeight / 2,
      note,
      noteBounds: noteBounds && { left: noteBounds.left - bounds.left, top: noteBounds.top - bounds.top, width: noteBounds.width }
    };
  }

  function centerClusterChart(from, incoming) {
    const to = clusterFrame(incoming);
    const movingToCenter = !to.note;
    const options = { fill: "both", easing: "cubic-bezier(.33, 1, .68, 1)" };
    const startX = from.x + (to.sourceCenterX - from.sourceCenterX) * from.scale - to.x;
    const startY = from.y + (to.sourceCenterY - from.sourceCenterY) * from.scale - to.y;
    const shift = to.motionTarget.animate([
      { transform: `translate(${startX}px, ${startY}px) scale(${from.scale / to.scale})` },
      { transform: "none" }
    ], { ...options, duration: 420, delay: movingToCenter ? 75 : 0 });

    let preview;
    let fade;
    if (movingToCenter) {
      preview = from.note.cloneNode(true);
      preview.classList.add("cluster-note-preview");
      preview.setAttribute("aria-hidden", "true");
      const { left, top, width } = from.noteBounds;
      Object.assign(preview.style, { left: `${left}px`, top: `${top}px`, width: `${width}px` });
      incoming.append(preview);
      fade = preview.animate([{ opacity: 1 }, { opacity: 0 }], { ...options, duration: 180 });
    } else {
      fade = to.note.animate([{ opacity: 0 }, { opacity: 1 }], { ...options, duration: 180, delay: 290 });
    }

    trackTransition([shift, fade], () => preview?.remove(), movingToCenter ? shift : fade);
  }

  function mainNeighbor(step) {
    let target = current + step;
    while (slides[target]?.hasAttribute("data-branch-slide")) target += step;
    return slides[target] ? target : current;
  }

  function svgElement(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }

  function bindClusterButton(button, activate) {
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
    button.addEventListener("click", activate);
    button.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!event.repeat) activate();
    });
  }

  function restoreClusterChart() {
    if (!isolatedCluster) return;
    stopAnimation?.();
    const key = isolatedCluster;
    isolatedCluster = undefined;
    clusterArt.classList.remove("is-isolated");
    clusterImage.removeAttribute("aria-hidden");
    clusterLayer.removeAttribute("hidden");
    clusterProfile.hidden = true;
    clusterIsolate.replaceChildren();
    controls.hidden = false;
    return key;
  }

  function returnToClusterChart() {
    if (history.state?.clusterFromChart) {
      history.back();
    } else {
      history.replaceState(null, "", "#engagement-chart");
      showFromHash();
    }
  }

  function colorClusterDots(dots, values, colors) {
    const total = values.reduce((sum, value) => sum + value, 0);
    const groups = values.map(value => {
      const quota = dots.length * value / total;
      const count = Math.floor(quota);
      return { count, remainder: quota - count };
    });
    const unassigned = dots.length - groups.reduce((sum, group) => sum + group.count, 0);
    [...groups].sort((a, b) => b.remainder - a.remainder).slice(0, unassigned).forEach(group => { group.count += 1; });

    let start = 0;
    groups.forEach(({ count }, index) => {
      const end = start + count;
      for (; start < end; start += 1) dots[start].setAttribute("fill", colors[index]);
    });
  }

  function comparisonMarkers(svg) {
    const count = 200;
    const angleStep = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i += 1) {
      const radius = 106 * Math.sqrt((i + 0.5) / count);
      const dot = svgElement("circle");
      dot.setAttribute("cx", 116 + radius * Math.cos(i * angleStep));
      dot.setAttribute("cy", 116 + radius * Math.sin(i * angleStep));
      dot.setAttribute("r", 4.1);
      svg.append(dot);
    }
    return [...svg.children].sort((a, b) => b.cx.baseVal.value - a.cx.baseVal.value);
  }

  function drawClusterScales(panel, rows, format, formatTick = format) {
    panel.replaceChildren();
    for (const [label, value] of rows) {
      const name = document.createElement("span");
      name.textContent = label;
      const track = document.createElement("span");
      track.className = "cluster-scale-track";
      track.style.setProperty("--level", `${value}%`);
      track.setAttribute("aria-hidden", "true");
      const level = document.createElement("strong");
      level.textContent = format(value);
      panel.append(name, track, level);
    }

    const axis = document.createElement("span");
    axis.className = "cluster-scale-axis";
    axis.setAttribute("aria-hidden", "true");
    for (const value of [0, 100]) {
      const tick = document.createElement("span");
      tick.textContent = formatTick(value);
      axis.append(tick);
    }
    panel.append(axis);
  }

  function drawAgeScales(panel, [mean, median], format) {
    drawClusterScales(panel, [["میانگین سن", mean], ["میانه‌ی سن", median]], format, digits.format);
  }

  function fillClusterDashboard(wave, cluster, dots) {
    const profile = clusterProfiles[`${wave}-${cluster}`];
    clusterProfile.querySelector("#cluster-profile-id").textContent = `موج ${digits.format(wave)}، خوشه‌ی ${digits.format(cluster)}`;
    const features = clusterProfile.querySelector(".cluster-features");
    const title = clusterProfile.querySelector("#cluster-feature-title");
    const legend = clusterProfile.querySelector(".cluster-profile-legend");
    const note = clusterProfile.querySelector(".cluster-profile-note");
    const ageScales = clusterProfile.querySelector(".cluster-age-scales");
    const indexPanel = clusterProfile.querySelector(".cluster-index-panel");
    const findingButton = clusterProfile.querySelector(".cluster-finding-button");
    const compareButton = clusterProfile.querySelector(".cluster-compare-button");
    const comparison = clusterProfile.querySelector(".cluster-comparison");
    const { feature, category, title: headline } = profile.finding;
    const featured = featureGroups.flatMap(group => group.features).find(item => item.id === feature);
    let activeFeature = featured;
    let spotlight = true;
    const quotedShare = value => clusterPercentage.format(value / 100);
    const quotedAge = value => `${digits.format(value)} سال`;
    const sortedDots = [...dots.children].sort((a, b) => b.cx.baseVal.value - a.cx.baseVal.value || a.cy.baseVal.value - b.cy.baseVal.value);
    drawAgeScales(ageScales, profile.ageStats, quotedAge);
    drawClusterScales(indexPanel.querySelector(".cluster-scales"), [["آیات آشنا", profile.verses]], quotedShare);

    function legendItem(label, color, value, highlighted = false) {
      const item = document.createElement("li");
      const swatch = document.createElement("span");
      swatch.className = "cluster-swatch";
      swatch.style.backgroundColor = color;
      item.append(swatch, label);
      if (value !== undefined) {
        const share = document.createElement("strong");
        share.textContent = quotedShare(value);
        item.append(share);
      }
      item.classList.toggle("is-highlighted", highlighted);
      return item;
    }

    function renderFeature() {
      const { id, label, categories, colors = categoryColors } = activeFeature;
      const values = profile[id];
      const showIndex = id === "verses";
      const comparing = !comparison.hidden;
      title.textContent = spotlight ? headline : label;
      note.textContent = activeFeature.note ?? "رنگ نقطه‌ها سهم‌ها را در کل خوشه نشان می‌دهد.";
      indexPanel.hidden = comparing || !showIndex;
      legend.hidden = showIndex;
      ageScales.hidden = comparing || spotlight || id !== "age";
      clusterIsolate.toggleAttribute("hidden", showIndex || comparing);
      if (showIndex) {
        legend.replaceChildren();
      } else if (spotlight) {
        const share = values[category];
        if (!comparing) colorClusterDots(sortedDots, [share, 100 - share], findingColors);
        legend.replaceChildren(legendItem(categories[category], findingColors[0], comparing ? undefined : share, true));
      } else if (comparing) {
        legend.replaceChildren(...categories.map((name, index) => legendItem(name, colors[index])));
      } else {
        colorClusterDots(sortedDots, values, colors);
        legend.replaceChildren(...values.flatMap((value, index) => value === 0 ? [] : [legendItem(categories[index], colors[index], value)]));
      }
      findingButton.setAttribute("aria-pressed", String(spotlight));
      features.querySelectorAll("button").forEach(button => {
        button.setAttribute("aria-pressed", String(!spotlight && button.dataset.feature === id));
      });
      if (comparing) {
        drawComparison(id, categories, colors);
        comparison.scrollIntoView({ block: "nearest", behavior: allowMotion.matches ? "smooth" : "auto" });
      }
      positionIsolatedCluster();
    }

    function showComparison(open) {
      comparison.hidden = !open;
      compareButton.setAttribute("aria-pressed", String(open));
    }

    function drawComparison(id, categories, colors) {
      const sameWave = clusters.filter(group => group.wave === wave);
      comparison.dataset.count = sameWave.length;
      comparison.dataset.view = id === "verses" ? "index" : spotlight ? "finding" : "distribution";
      const cards = sameWave.map(({ cluster: number }) => {
        const group = clusterProfiles[`${wave}-${number}`];
        const values = group[id];
        const card = document.createElement("figure");
        card.className = "cluster-compare-card";
        card.classList.toggle("is-selected", cluster === number);
        const label = document.createElement("figcaption");
        label.textContent = `خوشه‌ی ${digits.format(number)}`;
        card.append(label);
        if (values === undefined) {
          const missing = document.createElement("p");
          missing.className = "cluster-compare-status";
          missing.textContent = "داده‌ای ثبت نشده";
          card.append(missing);
          return card;
        }
        if (id === "verses") {
          const scale = document.createElement("div");
          scale.className = "cluster-scales cluster-compare-index";
          drawClusterScales(scale, [["آیات آشنا", values]], quotedShare);
          card.append(scale);
          return card;
        }

        const plot = svgElement("svg");
        plot.setAttribute("viewBox", "0 0 232 232");
        plot.setAttribute("aria-hidden", "true");
        const markers = comparisonMarkers(plot);
        card.append(plot);
        if (spotlight) {
          const share = values[category];
          colorClusterDots(markers, [share, 100 - share], findingColors);
          const value = document.createElement("strong");
          value.className = "cluster-compare-share";
          value.textContent = quotedShare(share);
          card.append(value);
        } else {
          colorClusterDots(markers, values, colors);
          const details = document.createElement("div");
          details.className = "cluster-compare-details";
          const shares = document.createElement("ul");
          shares.className = "cluster-compare-values";
          for (const [index, value] of values.entries()) {
            const item = legendItem("", colors[index], value);
            item.title = `${categories[index]} ${quotedShare(value)}`;
            item.setAttribute("aria-label", item.title);
            shares.append(item);
          }
          details.append(shares);
          if (id === "age") {
            const age = document.createElement("div");
            age.className = "cluster-scales";
            drawAgeScales(age, group.ageStats, quotedAge);
            details.append(age);
          }
          card.append(details);
        }
        return card;
      });
      comparison.replaceChildren(...cards);
    }

    findingButton.onclick = () => {
      activeFeature = featured;
      spotlight = true;
      renderFeature();
    };
    compareButton.onclick = () => {
      stopAnimation?.();
      showComparison(comparison.hidden);
      renderFeature();
    };

    features.replaceChildren();
    for (const group of featureGroups) {
      const available = group.features.filter(feature => Object.hasOwn(profile, feature.id));
      if (!available.length) continue;
      const section = document.createElement("section");
      section.className = "cluster-feature-group";
      const heading = document.createElement("h3");
      heading.textContent = group.title;
      const buttons = document.createElement("div");
      buttons.className = "cluster-feature-buttons";
      for (const feature of available) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cluster-feature-button";
        button.dataset.feature = feature.id;
        button.textContent = feature.label;
        button.addEventListener("click", () => {
          activeFeature = feature;
          spotlight = false;
          renderFeature();
        });
        buttons.append(button);
      }
      section.append(heading, buttons);
      features.append(section);
    }
    showComparison(false);
    renderFeature();
  }

  function positionIsolatedCluster() {
    if (!isolatedCluster || clusterProfile.hidden || clusterIsolate.hasAttribute("hidden")) return;
    const selected = clusterIsolate.firstElementChild;
    const { x, y, width, height } = selected.querySelector("g").getBBox();
    const source = clusterLayer.viewBox.baseVal;
    const target = clusterIsolate.viewBox.baseVal;
    const image = clusterImage.getBoundingClientRect();
    const plot = clusterPlot.getBoundingClientRect();
    const plotScale = Math.min(plot.width / target.width, plot.height / target.height);
    if (!plotScale) return;
    const sourceScale = Math.min(image.width / source.width, image.height / source.height);
    const scale = 2 * sourceScale / plotScale;
    selected.setAttribute("transform",
      `translate(${target.width / 2} ${target.height / 2}) scale(${scale}) translate(${-x - width / 2} ${-y - height / 2})`);
  }

  function isolateCluster({ wave, cluster, color, outline, points }, animate) {
    const sourceMatrix = animate && clusterLayer.getScreenCTM();
    stopAnimation?.();

    isolatedCluster = `${wave}-${cluster}`;
    const selected = svgElement("g");
    selected.classList.add("cluster-return");
    selected.setAttribute("aria-label", `موج ${digits.format(wave)}، خوشه ${digits.format(cluster)}. بازگشت به نمودار`);
    bindClusterButton(selected, returnToClusterChart);

    const hitArea = svgElement("path");
    hitArea.setAttribute("d", outline);
    hitArea.setAttribute("fill", "transparent");
    hitArea.setAttribute("pointer-events", "fill");
    const dots = svgElement("g");
    dots.setAttribute("fill", color);
    for (const [x, y] of points) {
      const dot = svgElement("circle");
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", y);
      dot.setAttribute("r", 2.55);
      dot.setAttribute("opacity", 0.95);
      dots.append(dot);
    }
    selected.append(hitArea, dots);
    clusterIsolate.replaceChildren(selected);
    fillClusterDashboard(wave, cluster, dots);
    clusterProfile.classList.toggle("is-entering", Boolean(sourceMatrix));
    clusterProfile.hidden = false;
    clusterArt.classList.add("is-isolated");
    positionIsolatedCluster();
    clusterImage.setAttribute("aria-hidden", "true");
    clusterLayer.setAttribute("hidden", "");
    controls.hidden = true;
    clusterProfile.querySelector(".cluster-dashboard-back").focus({ preventScroll: true });
    if (!sourceMatrix) return;

    const box = dots.getBBox();
    const view = clusterIsolate.viewBox.baseVal;
    const targetMatrix = clusterIsolate.getScreenCTM();
    const source = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2).matrixTransform(sourceMatrix);
    const target = new DOMPoint(view.width / 2, view.height / 2).matrixTransform(targetMatrix);
    const { left, top } = clusterIsolate.getBoundingClientRect();
    const transformOrigin = `${target.x - left}px ${target.y - top}px`;
    const startScale = sourceMatrix.a / selected.getScreenCTM().a;
    const fade = clusterImage.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 125, easing: "ease-out", fill: "both"
    });
    const move = clusterIsolate.animate([
      { transform: `translate(${source.x - target.x}px, ${source.y - target.y}px) scale(${startScale})`, transformOrigin },
      { transform: "none", transformOrigin }
    ], { duration: 420, easing: "cubic-bezier(.33, 1, .68, 1)" });
    trackTransition([fade, move], () => {
      clusterProfile.classList.remove("is-entering");
    });
  }

  function setupClusterHotspots() {
    new ResizeObserver(positionIsolatedCluster).observe(clusterPlot);
    clusterProfile.querySelector(".cluster-dashboard-back").addEventListener("click", returnToClusterChart);
    clusters.forEach(group => {
      const { wave, cluster, outline } = group;
      const button = svgElement("g");
      const key = `${wave}-${cluster}`;
      const name = `موج ${digits.format(wave)}، خوشه ${digits.format(cluster)}`;
      button.classList.add("cluster-hotspot");
      button.dataset.clusterId = key;
      button.setAttribute("aria-label", name);
      const title = svgElement("title");
      title.textContent = name;
      const path = svgElement("path");
      path.classList.add("cluster-hit-area");
      path.setAttribute("d", outline);
      button.append(title, path);
      bindClusterButton(button, () => {
        history.pushState({ clusterFromChart: true }, "", `#cluster-${key}`);
        isolateCluster(group, allowMotion.matches);
      });
      clusterLayer.append(button);
    });
  }

  function show(index, updateHistory = false) {
    const target = Math.max(0, Math.min(index, slides.length - 1));
    if (target === current) return;

    restoreClusterChart();
    stopAnimation?.();
    const outgoing = slides[current];
    const incoming = slides[target];
    const animate = outgoing && allowMotion.matches && typeof outgoing.animate === "function";
    const fromAudience = animate && outgoing.hasAttribute("data-audience-sequence")
      && incoming.hasAttribute("data-audience-sequence") ? audienceFrame(outgoing) : null;
    const mediaSource = animate && outgoing.id === "least-familiar-wave-5" && incoming.id === "campaign-discovery"
      ? audienceFrame(outgoing) : null;
    const fromCluster = animate && outgoing.hasAttribute("data-cluster-sequence")
      && incoming.hasAttribute("data-cluster-sequence") ? clusterFrame(outgoing) : null;
    const forward = target > current;
    current = target;
    slides.forEach((slide, index) => { slide.hidden = index !== current; });
    previous.disabled = mainNeighbor(-1) === current;
    next.disabled = mainNeighbor(1) === current;
    const position = mainSlides.indexOf(incoming);
    counter.textContent = position < 0 ? "نمای تکمیلی" : `${digits.format(position + 1)} از ${digits.format(mainSlides.length)}`;
    if (updateHistory) {
      const hash = `#${slides[current].id}`;
      if (location.hash !== hash) history.pushState(null, "", hash);
      window.scrollTo(0, 0);
    }
    if (!animate) return;
    if (mediaSource) {
      revealMediaChart(outgoing, incoming, mediaSource);
    } else if (outgoing.id === "campaign-discovery" && incoming.id === "least-familiar-wave-5") {
      returnFromMedia(outgoing, incoming);
    } else if (fromAudience) {
      animateAudienceFocus(fromAudience, incoming);
    } else if (fromCluster) {
      centerClusterChart(fromCluster, incoming);
    } else if (incoming.dataset.chartSequence && incoming.dataset.chartSequence === outgoing.dataset.chartSequence) {
      resizeCharts(outgoing, incoming);
    } else {
      turnPage(outgoing, forward);
    }
  }

  function showFromHash() {
    const restored = restoreClusterChart();
    const group = clusters.find(({ wave, cluster }) => location.hash === `#cluster-${wave}-${cluster}`);
    if (group) {
      show(slides.indexOf(clusterSlide));
      isolateCluster(group, false);
      return;
    }
    show(slides.findIndex(slide => "#" + slide.id === location.hash));
    if (restored && slides[current] === clusterSlide) {
      clusterLayer.querySelector(`[data-cluster-id="${restored}"]`).focus({ preventScroll: true });
    }
  }

  function setFullscreenLabel() {
    fullscreen.textContent = document.fullscreenElement ? "خروج از تمام‌صفحه" : "تمام‌صفحه";
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      fullscreen.hidden = true;
    }
  }

  previous.addEventListener("click", () => show(mainNeighbor(-1), true));
  next.addEventListener("click", () => show(mainNeighbor(1), true));
  document.querySelectorAll("[data-slide-link]").forEach(link => {
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = slides.findIndex(slide => "#" + slide.id === link.hash);
      if (target < 0) return;
      event.preventDefault();
      show(target, true);
    });
  });
  fullscreen.hidden = !document.fullscreenEnabled;
  fullscreen.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", setFullscreenLabel);
  allowMotion.addEventListener("change", event => { if (!event.matches) stopAnimation?.(); });
  window.addEventListener("hashchange", showFromHash);
  document.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return;
    if (isolatedCluster && ["Escape", "ArrowRight", "PageUp"].includes(event.key)) {
      event.preventDefault();
      if (!event.repeat) returnToClusterChart();
      return;
    }
    if (event.target instanceof Element) {
      if (event.target.closest("input, select, textarea, [contenteditable]")) return;
      if (event.key === " " && event.target.closest("button, a")) return;
    }
    const destination = {
      ArrowLeft: mainNeighbor(1),
      PageDown: mainNeighbor(1),
      " ": mainNeighbor(1),
      ArrowRight: mainNeighbor(-1),
      PageUp: mainNeighbor(-1),
      Home: slides.indexOf(mainSlides[0]),
      End: slides.indexOf(mainSlides.at(-1))
    };
    if (Object.hasOwn(destination, event.key)) {
      event.preventDefault();
      show(destination[event.key], true);
    } else if (event.key.toLowerCase() === "f" && document.fullscreenEnabled) {
      event.preventDefault();
      toggleFullscreen();
    }
  });
  document.documentElement.classList.add("has-navigation");
  controls.hidden = false;
  setupClusterHotspots();
  showFromHash();
})();
