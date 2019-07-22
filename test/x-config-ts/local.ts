import { deferConfig as defer } from '../../lib/defer';
import { Config } from './types';

const localConfig: Config = {
 siteTitle : 'New Instance!',
};

localConfig['map'] = {
  centerPoint :  { lat: 3, lon: 4 },
};

localConfig['original'] = {
  // An original value passed to deferred function
  original: defer((cfg, original) => original),

  // This deferred function "skips" the previous one
  deferredOriginal: defer((cfg, original) => original),
};

export default localConfig;
