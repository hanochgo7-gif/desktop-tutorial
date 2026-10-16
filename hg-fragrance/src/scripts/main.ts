import { initBag } from './bag';
import {
  initAmbientVideo,
  initAmbientToggles,
  initChapters,
  initFilm,
  initFilters,
  initFourLights,
  initGallery,
  initGlass,
  initLazyPosters,
  initHeader,
  initLightbox,
  initMenu,
  initMotionToggle,
  initNewsletter,
  initPdpBar,
  initPointer,
  initVariantPicker,
} from './ui';
import { reducedMotion } from './boot';

initLazyPosters();
initHeader();
initMenu();
initBag();
initFilm();
initAmbientVideo();
initNewsletter();
initChapters();
initFourLights();
initGlass();
initGallery();
initVariantPicker();
initPdpBar();
initFilters();
initLightbox();
initAmbientToggles();
initPointer();
initMotionToggle();

if (!reducedMotion()) {
  import('./motion')
    .then((m) => m.initMotion())
    .catch(() => document.documentElement.classList.remove('motion'));
}
