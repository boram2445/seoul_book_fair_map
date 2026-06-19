"use client";

import { useEffect } from "react";

/**
 * 카카오톡 인앱 브라우저(WebView) 등에서 발생하는 dvh 오측정 보정.
 *
 * 첫 페인트 시 툴바 애니메이션 때문에 dvh가 실제 가시 높이보다 크게 잡히는
 * 문제를 해결하기 위해 실제 가시 높이를 측정해 --app-h CSS 변수를 갱신한다.
 * SSR/첫 페인트 기본값은 globals.css의 `--app-h: 100dvh`.
 */
export function ViewportHeightFix() {
  useEffect(() => {
    let rafId: number | null = null;

    function update() {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-h", `${h}px`);
    }

    // 마운트 즉시 1차 측정
    update();

    // 툴바 애니메이션이 끝난 직후 재측정 (인앱 브라우저 안정화 타이밍)
    rafId = requestAnimationFrame(() => {
      update();
      rafId = null;
    });

    // visualViewport resize (iOS Safari, 인앱 브라우저 툴바 토글 등)
    window.visualViewport?.addEventListener("resize", update);

    // orientationchange + resize (화면 회전, 키보드 등)
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    // load 완료 후 최종 확정 (리소스 로드 시 레이아웃 shift 보정)
    window.addEventListener("load", update);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("load", update);
    };
  }, []);

  return null;
}
