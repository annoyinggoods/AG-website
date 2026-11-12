import { initMenuData } from "./menu-data.js";
import { initPageState } from "./page-state.js";
import { initMenuTree } from "./menu-tree.js";
import { initMenuSearch } from "./menu-search.js";
import { initMenuDim } from "./menu-dim.js";
import { initMenuBubble } from "./menu-bubble.js";
import { initTransitions } from "./transitions.js";
import { initLens } from "./lens.js";
import { initGlow } from "./glow.js";
import { initLightbox } from "./lightbox.js";
import { initCarousel } from "./carousel.js";
import { initCookies } from "./cookies.js";
import { initTheme } from "./theme.js";
import { initForms } from "./forms.js";
import { initHeroSpider } from "./hero-spider.js";
import { initErr404 } from "./err404.js";
import { initEntryReader } from "./entry-reader.js";
function initDemoChartLazy() {
    if (!document.querySelector("[data-demo-chart]")) {
        return;
    }
    void import("./demo-chart.js").then(function (mod) {
        mod.initDemoChart();
    }).catch(function (err) {
        console.error("Annoying Goods chart module failed to load", err);
    });
}
const MODULES = [
    { name: "menu-data", init: initMenuData },
    { name: "menu-tree", init: initMenuTree },
    { name: "page-state", init: initPageState },
    { name: "menu-search", init: initMenuSearch },
    { name: "menu-dim", init: initMenuDim },
    { name: "menu-bubble", init: initMenuBubble },
    { name: "transitions", init: initTransitions },
    { name: "lens", init: initLens },
    { name: "glow", init: initGlow },
    { name: "lightbox", init: initLightbox },
    { name: "carousel", init: initCarousel },
    { name: "cookies", init: initCookies },
    { name: "theme", init: initTheme },
    { name: "forms", init: initForms },
    { name: "hero-spider", init: initHeroSpider },
    { name: "err404", init: initErr404 },
    { name: "demo-chart", init: initDemoChartLazy },
    { name: "entry-reader", init: initEntryReader },
];
function boot() {
    for (let i = 0; i < MODULES.length; i = i + 1) {
        const module = MODULES[i];
        if (!module) {
            continue;
        }
        try {
            module.init();
        }
        catch (err) {
            console.error("Annoying Goods module failed: " + module.name, err);
        }
    }
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
}
else {
    boot();
}
//# sourceMappingURL=main.js.map