import { initBag } from './bag';
import {
  initAmbientVideo,
  initAmbientToggles,
  initFilm,
  initFourLights,
  initGallery,
  initLazyPosters,
  initHeader,
  initLightbox,
  initMenu,
  initMotionToggle,
  initNewsletter,
  initPdpBar,
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
initFourLights();
initGallery();
initVariantPicker();
initPdpBar();
initLightbox();
initAmbientToggles();
initMotionToggle();

if (!reducedMotion()) {
  import('./motion')
    .then((m) => m.initMotion())
    .catch(() => document.documentElement.classList.remove('motion'));
}
