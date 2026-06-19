/** 출판사 상세 페이지 로딩 스켈레톤.
 *  App Router가 이 파일을 Suspense 폴백으로 사용 →
 *  카드 클릭 즉시 이 화면으로 전환되고, 서버 렌더 완료 시 교체된다.
 */
export default function PublisherDetailLoading() {
  return (
    <div className="bg-brand-panel">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        {/* 뒤로가기 버튼 */}
        <div className="mb-4">
          <div className="h-8 w-20 animate-pulse bg-brand-surface" />
        </div>

        <div className="grid gap-4">
          {/* 헤더 카드 */}
          <article className="border border-border bg-white">
            <div className="grid gap-3 border-b border-border p-4">
              {/* 배지 행 */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-6 w-12 animate-pulse bg-brand-surface" />
                <div className="h-6 w-10 animate-pulse bg-brand-surface" />
              </div>
              {/* 출판사명 */}
              <div className="h-7 w-48 animate-pulse bg-brand-surface" />
              {/* 영문명 */}
              <div className="h-4 w-32 animate-pulse bg-brand-surface" />
              {/* 카테고리 태그 */}
              <div className="flex flex-wrap gap-1.5">
                {[60, 72, 56, 80].map((w) => (
                  <div
                    key={w}
                    className="h-6 animate-pulse bg-brand-surface"
                    style={{ width: w }}
                  />
                ))}
              </div>
            </div>

            {/* 소개 영역 */}
            <div className="p-4">
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse bg-brand-surface" />
                <div className="h-4 w-5/6 animate-pulse bg-brand-surface" />
                <div className="h-4 w-4/6 animate-pulse bg-brand-surface" />
              </div>
            </div>
          </article>

          {/* 후기 섹션 */}
          <section className="border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <div className="h-5 w-24 animate-pulse bg-brand-surface" />
            </div>
            <div className="p-4">
              <div className="h-4 w-40 animate-pulse bg-brand-surface" />
            </div>
          </section>

          {/* 후기 작성 폼 */}
          <div className="border border-border bg-white p-4">
            <div className="h-5 w-28 animate-pulse bg-brand-surface" />
          </div>
        </div>
      </div>
    </div>
  );
}
