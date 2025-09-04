(function(){
  try {
    const originalWarn = console.warn;
    const pattern = /Scripts\s+"build\/three\.js"\s+and\s+"build\/three\.min\.js"\s+are\s+deprecated/i;
    console.warn = function(){
      try {
        const msg = arguments && arguments[0];
        if (typeof msg === 'string' && pattern.test(msg)) {
          return; // swallow deprecation warning
        }
      } catch(_){}
      return originalWarn.apply(console, arguments);
    };
  } catch(_){}
})();

