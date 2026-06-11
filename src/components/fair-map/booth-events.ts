export type BoothEvent = {
  time?: string;
  period?: string;
  category: string;
  title: string;
  content: string;
  sourceName: string;
  instagramUrl?: string;
  imageUrl?: string;
};

// NOTE: 하드코딩 mock — 데이터 갱신 시 이 파일을 직접 수정할 것 (CLAUDE.md 도메인 gotcha 참고)
export function getBoothEvents(booth: string): BoothEvent[] {
  if (booth === 'A1703') {
    return [
      {
        period: '06.01-06.14',
        category: '댓글이벤트',
        title: '[#서울국제도서전] 티켓 증정 댓글이벤트',
        content: `올해 예스24 부스 컨셉은 YES24 BASE CAMP입니다.

예스24 부스 방문 전, 꿀팁 3가지 확인하고 서울국제도서전 티켓 받아가세요. 지금 댓글로 참여하세요.

참여 방법
1. 예스24(@yes24_official) 팔로우
2. 도서전 함께 가고 싶은 친구 태그
3. 예스24 부스 방문의 기대감을 이모지로 댓글 작성

이벤트 정보
참여 기간: 2026년 6월 1일 ~ 6월 14일
당첨 인원: 30명
당첨 경품: 서울국제도서전 티켓 1인 1매 제공
당첨자 발표: 6월 15일
초대권 발송: 6월 19일, 카카오톡 알림톡 발송

#예스24 #예스24베이스캠프 #리딩런`,
        sourceName: 'YES24 Instagram',
        instagramUrl: 'https://www.instagram.com/yes24_official/',
      },
    ];
  }

  return [
    {
      time: '10:30-11:00',
      category: '사인회',
      title: `${booth} 작가 사인회`,
      content:
        '부스에서 신간 구매자를 대상으로 진행되는 현장 사인회입니다. 대기 상황에 따라 조기 마감될 수 있습니다.',
      sourceName: 'Instagram',
      instagramUrl: 'https://www.instagram.com/ghost__books/',
    },
    {
      time: '13:20-14:00',
      category: '토크',
      title: '오늘의 책을 고르는 대화',
      content: '출판사가 고른 대표 도서와 제작 이야기를 짧게 나누는 미니 토크입니다.',
      sourceName: 'Instagram',
      instagramUrl: 'https://www.instagram.com/ghost__books/',
    },
    {
      time: '16:00-16:30',
      category: '이벤트',
      title: '현장 한정 굿즈 증정',
      content: '부스 방문 및 SNS 팔로우 인증 시 한정 수량 굿즈를 증정합니다.',
      sourceName: 'Instagram',
      instagramUrl: 'https://www.instagram.com/ghost__books/',
    },
  ] satisfies BoothEvent[];
}

export function getEventScheduleLabel(event: BoothEvent) {
  return event.period ?? event.time ?? '상시';
}
