"use client";

import { useCallback, useEffect, useRef } from "react";

const morphTime = 1.5;
const cooldownTime = 0.5;

const useMorphingText = (texts) => {
  const textIndexRef = useRef(0);
  const morphRef = useRef(0);
  const cooldownRef = useRef(0);
  const timeRef = useRef(new Date());

  const text1Ref = useRef(null);
  const text2Ref = useRef(null);

  const setStyles = useCallback(
    (fraction) => {
      const [current1, current2] = [text1Ref.current, text2Ref.current];
      if (!current1 || !current2) return;

      current2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
      current2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

      const invertedFraction = 1 - fraction;
      current1.style.filter = `blur(${Math.min(8 / invertedFraction - 8, 100)}px)`;
      current1.style.opacity = `${Math.pow(invertedFraction, 0.4) * 100}%`;

      current1.textContent = texts[textIndexRef.current % texts.length];
      current2.textContent = texts[(textIndexRef.current + 1) % texts.length];
    },
    [texts],
  );

  const doMorph = useCallback(() => {
    morphRef.current -= cooldownRef.current;
    cooldownRef.current = 0;

    let fraction = morphRef.current / morphTime;

    if (fraction > 1) {
      cooldownRef.current = cooldownTime;
      fraction = 1;
    }

    setStyles(fraction);

    if (fraction === 1) {
      textIndexRef.current++;
    }
  }, [setStyles]);

  const doCooldown = useCallback(() => {
    morphRef.current = 0;
    const [current1, current2] = [text1Ref.current, text2Ref.current];
    if (current1 && current2) {
      current2.style.filter = "none";
      current2.style.opacity = "100%";
      current1.style.filter = "none";
      current1.style.opacity = "0%";
    }
  }, []);

  useEffect(() => {
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const newTime = new Date();
      const dt = (newTime.getTime() - timeRef.current.getTime()) / 1000;
      timeRef.current = newTime;

      cooldownRef.current -= dt;

      if (cooldownRef.current <= 0) doMorph();
      else doCooldown();
    };

    animate();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [doMorph, doCooldown]);

  return { text1Ref, text2Ref };
};

const Texts = ({ texts }) => {
  const { text1Ref, text2Ref } = useMorphingText(texts);
  return (
    <>
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          margin: 'auto',
          display: 'inline-block',
          width: '100%'
        }}
        ref={text1Ref}
      />
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          margin: 'auto',
          display: 'inline-block',
          width: '100%'
        }}
        ref={text2Ref}
      />
    </>
  );
};

const SvgFilters = () => (
  <svg id="filters" style={{ display: 'none' }} preserveAspectRatio="xMidYMid slice">
    <defs>
      <filter id="threshold">
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 255 -140"
        />
      </filter>
    </defs>
  </svg>
);

const MorphingText = ({ texts, className = "", style = {} }) => (
  <div
    style={{
      position: 'relative',
      margin: '0 auto',
      height: '4rem',
      width: '100%',
      maxWidth: '100%',
      textAlign: 'center',
      fontFamily: 'sans-serif',
      fontSize: 'clamp(3rem, 7vw, 5rem)',
      fontWeight: 800,
      lineHeight: 1,
      filter: 'url(#threshold) blur(0.6px)',
      ...style
    }}
    className={className}
  >
    <Texts texts={texts} />
    <SvgFilters />
  </div>
);

export { MorphingText };
