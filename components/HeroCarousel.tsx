import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Platform, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * Carrusel principal del Home (docs/UX.md §16): cuatro banners entregados por
 * diseño, tal cual, sin textos, botones ni logos encima. Una imagen a la vez,
 * deslizable, con indicadores discretos y avance automático que se pausa
 * mientras la persona interactúa.
 */
const SLIDES = [
  { source: require('../assets/images/hero/slide-1.jpg'), alt: 'Crea tu alter ego digital Weë. World Encode Entity.' },
  { source: require('../assets/images/hero/slide-2.jpg'), alt: 'La IA está al alcance de todos. Crea sin ser experto.' },
  { source: require('../assets/images/hero/slide-3.jpg'), alt: 'Convierte tus ideas en realidad. Imágenes, videos, textos y mucho más.' },
  { source: require('../assets/images/hero/slide-4.jpg'), alt: 'Imagina. Crea. Comparte. Evoluciona. Bienvenido a una nueva forma de crear.' },
];

/** Proporción de los banners (≈ 1080 × 517): el marco la respeta para no recortar ni deformar. */
const ASPECT_RATIO = 2.08;
const AUTOPLAY_MS = 5500;
const PAUSE_AFTER_INTERACTION_MS = 8000;

const isWeb = Platform.OS === 'web';

const HeroCarousel: React.FC = () => {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const pausedUntil = useRef(0);
  const hovering = useRef(false);

  const goTo = useCallback(
    (target: number, animated = true) => {
      if (!width) return;
      const next = ((target % SLIDES.length) + SLIDES.length) % SLIDES.length;
      scrollRef.current?.scrollTo({ x: next * width, animated });
      indexRef.current = next;
      setIndex(next);
    },
    [width]
  );

  // Avance automático lento; se detiene mientras la persona toca, arrastra o pasa el cursor
  useEffect(() => {
    if (!width) return;
    const timer = setInterval(() => {
      if (hovering.current || Date.now() < pausedUntil.current) return;
      goTo(indexRef.current + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [width, goTo]);

  const pause = () => {
    pausedUntil.current = Date.now() + PAUSE_AFTER_INTERACTION_MS;
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const current = Math.round(event.nativeEvent.contentOffset.x / width);
    if (current !== indexRef.current && current >= 0 && current < SLIDES.length) {
      indexRef.current = current;
      setIndex(current);
    }
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next && next !== width) {
      setWidth(next);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: indexRef.current * next, animated: false }));
    }
  };

  const hoverProps = isWeb
    ? ({
        onPointerEnter: () => {
          hovering.current = true;
        },
        onPointerLeave: () => {
          hovering.current = false;
        },
      } as any)
    : {};

  return (
    <View style={styles.wrapper}>
      <View style={[styles.frame, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]} onLayout={onLayout} {...hoverProps}>
        {width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onScrollBeginDrag={pause}
            onTouchStart={pause}
            decelerationRate="fast"
            style={{ width }}
          >
            {SLIDES.map((slide, i) => (
              <View
                key={i}
                style={[{ width, aspectRatio: ASPECT_RATIO }, isWeb && ({ scrollSnapAlign: 'start' } as any)]}
                accessibilityRole="image"
                accessibilityLabel={slide.alt}
              >
                <Image source={slide.source} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" cachePolicy="memory-disk" transition={250} />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={{ width: '100%', aspectRatio: ASPECT_RATIO }} />
        )}
      </View>

      {/* Indicadores: ● ○ ○ ○ */}
      <View style={styles.dots} accessibilityRole="tablist">
        {SLIDES.map((_, i) => {
          const active = i === index;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => {
                pause();
                goTo(i);
              }}
              hitSlop={8}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Banner ${i + 1} de ${SLIDES.length}`}
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.dot, { backgroundColor: active ? theme.colors.accent : theme.colors.border }, active && styles.dotActive]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  frame: {
    width: '100%',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(6),
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  dotActive: {
    width: scale(18),
  },
});

export default HeroCarousel;
