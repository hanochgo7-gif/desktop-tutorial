import { initBag } from './bag';
import {
  initAmbientVideo,
  initAmbientToggles,
  initChapters,
  initFilm,
  initFilters,
  initGallery,
  initHeader,
  initLightbox,
  initMenu,
  initNewsletter,
  initPointer,
  initVariantPicker,
} from './ui';
import { reducedMotion } from './boot';

initHeader();
initMenu();
initBag();
initFilm();
initAmbientVideo();
initNewsletter();
initChapters();
initGallery();
initVariantPicker();
initFilters();
initLightbox();
initAmbientToggles();
initPointer();

if (!reducedMotion()) {
  import('./motion')
    .then((m) => m.initMotion())
    .catch(() => document.documentElement.classList.remove('motion'));
}
