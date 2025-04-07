# 빌드 스테이지
FROM node:20-alpine AS build

WORKDIR /app

# 패키지 파일 복사 및 종속성 설치
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# 소스 코드 복사 및 빌드
COPY . .
RUN yarn build

# 프로덕션 스테이지
FROM node:20-alpine AS production

WORKDIR /app

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=4000

# 빌드 결과물 및 필요한 파일 복사
COPY --from=build /app/package.json ./
COPY --from=build /app/yarn.lock ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules

# 보안을 위한 비루트 사용자 설정
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app
USER nextjs

# 서버 실행
EXPOSE 4000
CMD ["yarn", "start"] 